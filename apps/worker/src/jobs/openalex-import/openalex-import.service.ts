import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OpenAlexAuthorEntityRaw,
  OpenAlexClient,
  OpenAlexWorkRaw,
  mapOpenAlexAuthor,
  mapOpenAlexAuthorIdentity,
  mapOpenAlexWork,
  NormalizedWork,
  inferResearcherDepartment,
} from "@repo/openalex";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { PrismaService } from "../../database/prisma.service";
import {
  Prisma,
  researcherSlugSuffix,
  slugifyResearcherName,
} from "@repo/database";

type ImportResult = {
  totalFetched: number;
  totalImported: number;
  status: "COMPLETED" | "FAILED";
};

type ResearcherWorkCheckpoint = {
  lastCompletedResearcherId: string | null;
  activeResearcherId: string | null;
  worksCursor: string;
};

type ResearcherIdentityAuditRow = {
  researcherId: string;
  slug: string;
  portalName: string;
  email: string;
  profileUrl: string;
  openalexId: string;
  openalexName: string;
  nameScore: number | null;
  nameStatus: "UNLINKED" | "HIGH_RISK" | "REVIEW" | "STRONG" | "EXACT";
  hasUiucAffiliation: boolean | null;
  uiucYears: string;
  issues: string;
};

type CuratedResearcherIdentity = {
  researcherId: string;
  portalName: string;
  openalexId: string;
};

type ResearcherIdentity = {
  id: string;
  name: string;
  email: string | null;
  openalexId: string | null;
  profileUrl: string | null;
  department?: string | null;
  keywords?: Array<{ keyword: string }>;
  author: { openalexId: string } | null;
};

type OpenAlexInstitutionRaw = {
  id: string;
  display_name?: string | null;
  display_name_acronyms?: string[];
  ror?: string | null;
  ids?: { ror?: string | null };
  country_code?: string | null;
  type?: string | null;
  homepage_url?: string | null;
  image_url?: string | null;
  image_thumbnail_url?: string | null;
  works_count?: number;
  cited_by_count?: number;
  summary_stats?: {
    h_index?: number;
    i10_index?: number;
    "2yr_mean_citedness"?: number;
  } | null;
  geo?: Record<string, unknown> | null;
};

@Injectable()
export class OpenAlexImportService {
  private readonly logger = new Logger(OpenAlexImportService.name);
  private readonly client: OpenAlexClient;
  private uiucInstitutionDatabaseId?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.client = new OpenAlexClient({
      baseUrl: config.get<string>("OPENALEX_BASE_URL"),
      email: config.get<string>("OPENALEX_CONTACT_EMAIL"),
      apiKey: config.get<string>("OPENALEX_API_KEY"),
    });
  }

  private positiveInt(
    value: number | string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? Math.floor(parsed)
      : fallback;
  }

  private csvCell(value: string | number | boolean | null): string {
    const text = value === null ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  private identityAuditCsv(rows: ResearcherIdentityAuditRow[]): string {
    const keys: Array<keyof ResearcherIdentityAuditRow> = [
      "researcherId",
      "slug",
      "portalName",
      "email",
      "profileUrl",
      "openalexId",
      "openalexName",
      "nameScore",
      "nameStatus",
      "hasUiucAffiliation",
      "uiucYears",
      "issues",
    ];
    return [
      keys.join(","),
      ...rows.map((row) =>
        keys.map((key) => this.csvCell(row[key])).join(","),
      ),
    ].join("\n");
  }

  private canonicalOpenAlexAuthorId(value: string): string | null {
    const match = value.trim().match(/(?:^|\/)(A\d+)\/?$/i);
    return match ? `https://openalex.org/${match[1].toUpperCase()}` : null;
  }

  private async readCuratedResearcherIdentities(
    filePath: string,
  ): Promise<{ rows: CuratedResearcherIdentity[]; skipped: number }> {
    const input = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    });
    let headers: string[] | null = null;
    const rows: CuratedResearcherIdentity[] = [];
    let skipped = 0;

    for await (const line of input) {
      if (!headers) {
        headers = this.parseDelimitedLine(line, ",").map((value) =>
          value.replace(/^\uFEFF/, "").trim(),
        );
        continue;
      }
      if (!line.trim()) continue;
      const values = this.parseDelimitedLine(line, ",");
      const record = new Map(
        headers.map((header, index) => [header, values[index]?.trim() || ""]),
      );
      const rawRealId = record.get("real_id") || "";
      if (!rawRealId || rawRealId.toUpperCase() === "NULL") {
        skipped++;
        continue;
      }
      const openalexId = this.canonicalOpenAlexAuthorId(rawRealId);
      const researcherId = record.get("researcherId") || "";
      if (!openalexId || !researcherId) {
        throw new Error(
          `Invalid curated identity row for ${record.get("portalName") || researcherId || "unknown researcher"}: real_id=${rawRealId}`,
        );
      }
      rows.push({
        researcherId,
        portalName: record.get("portalName") || "",
        openalexId,
      });
    }

    if (!headers?.includes("researcherId") || !headers.includes("real_id")) {
      throw new Error(
        "Identity review CSV must contain researcherId and real_id columns",
      );
    }
    return { rows, skipped };
  }

  async applyResearcherIdentityReview(filePath: string): Promise<{
    researcherIds: string[];
    requested: number;
    applied: number;
    changed: number;
    unchanged: number;
    skipped: number;
    failed: number;
    failures: string[];
  }> {
    const { rows, skipped } =
      await this.readCuratedResearcherIdentities(filePath);
    const duplicateOpenAlexIds = new Set<string>();
    const owners = new Map<string, string>();
    for (const row of rows) {
      const owner = owners.get(row.openalexId);
      if (owner && owner !== row.researcherId) {
        duplicateOpenAlexIds.add(row.openalexId);
      } else {
        owners.set(row.openalexId, row.researcherId);
      }
    }

    const remoteAuthors = await this.client.getAuthorsByIds(
      rows
        .filter((row) => !duplicateOpenAlexIds.has(row.openalexId))
        .map((row) => row.openalexId),
    );
    const remoteById = new Map(
      remoteAuthors.map((author) => [author.id.toUpperCase(), author]),
    );
    const missingIds = [
      ...new Set(
        rows
          .map((row) => row.openalexId)
          .filter((id) => !remoteById.has(id.toUpperCase())),
      ),
    ];
    for (let index = 0; index < missingIds.length; index += 5) {
      const batch = missingIds.slice(index, index + 5);
      const results = await Promise.allSettled(
        batch.map((id) => this.client.getAuthor(id)),
      );
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          remoteById.set(result.value.id.toUpperCase(), result.value);
        }
      });
    }

    let applied = 0;
    let changed = 0;
    let unchanged = 0;
    const failures: string[] = [];
    const researcherIds: string[] = [];
    for (const row of rows) {
      try {
        if (duplicateOpenAlexIds.has(row.openalexId)) {
          throw new Error("duplicate real_id in review CSV");
        }
        const remote = remoteById.get(row.openalexId.toUpperCase());
        if (!remote) throw new Error("OpenAlex Author does not exist");
        const researcher = await this.prisma.researcher.findUnique({
          where: { id: row.researcherId },
          select: { id: true, authorId: true, openalexId: true, name: true },
        });
        if (!researcher) throw new Error("researcher does not exist");

        const normalized = mapOpenAlexAuthorIdentity(remote);
        const author = await this.prisma.author.upsert({
          where: { openalexId: normalized.openalexId },
          update: {
            displayName: normalized.displayName,
            orcid: normalized.orcid,
          },
          create: normalized,
          select: { id: true },
        });
        const conflictingResearcher = await this.prisma.researcher.findFirst({
          where: {
            id: { not: researcher.id },
            OR: [
              { authorId: author.id },
              { openalexId: normalized.openalexId },
            ],
          },
          select: { id: true, name: true },
        });
        if (conflictingResearcher) {
          throw new Error(
            `real_id is already linked to ${conflictingResearcher.name} (${conflictingResearcher.id})`,
          );
        }

        const identityChanged =
          researcher.authorId !== author.id ||
          researcher.openalexId !== normalized.openalexId;
        await this.prisma.$transaction(async (transaction) => {
          if (identityChanged) {
            await transaction.researcherTopic.deleteMany({
              where: { researcherId: researcher.id },
            });
          }
          await transaction.researcher.update({
            where: { id: researcher.id },
            data: {
              authorId: author.id,
              openalexId: normalized.openalexId,
              worksCount: Math.max(0, remote.works_count || 0),
              citedByCount: Math.max(0, remote.cited_by_count || 0),
            },
          });
        });
        this.authorCache.set(normalized.openalexId, author.id);
        researcherIds.push(researcher.id);
        applied++;
        if (identityChanged) changed++;
        else unchanged++;
        this.logger.log(
          `Curated identity ${identityChanged ? "updated" : "confirmed"}: ${researcher.name} -> ${normalized.displayName} (${normalized.openalexId})`,
        );
      } catch (error) {
        failures.push(
          `${row.portalName || row.researcherId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    if (failures.length) {
      this.logger.error(
        `Curated identity import had ${failures.length} failure(s): ${failures.slice(0, 20).join(" | ")}`,
      );
    }
    return {
      researcherIds,
      requested: rows.length,
      applied,
      changed,
      unchanged,
      skipped,
      failed: failures.length,
      failures,
    };
  }

  async reviewedResearcherIds(filePath: string): Promise<string[]> {
    const { rows } = await this.readCuratedResearcherIdentities(filePath);
    return rows.map((row) => row.researcherId);
  }

  async researcherIdsFromCsv(filePath: string): Promise<string[]> {
    const input = createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity,
    });
    const researcherIds: string[] = [];
    for await (const line of input) {
      if (!line.trim()) continue;
      const firstCell = this.parseDelimitedLine(line, ",")[0]
        ?.replace(/^\uFEFF/, "")
        .trim();
      if (!firstCell || /^(researcher_?id|id)$/i.test(firstCell)) continue;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstCell)) {
        throw new Error(`Invalid researcher ID in CSV: ${firstCell}`);
      }
      researcherIds.push(firstCell);
    }
    return [...new Set(researcherIds)];
  }

  async auditResearcherIdentities(outputDirectory?: string): Promise<{
    total: number;
    linked: number;
    unlinked: number;
    review: number;
    highRisk: number;
    missingUiucAffiliation: number;
    fullReportPath: string;
    reviewReportPath: string;
  }> {
    const uiucId = "https://openalex.org/I157725225";
    const researchers = await this.prisma.researcher.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        email: true,
        profileUrl: true,
        openalexId: true,
        author: { select: { openalexId: true } },
      },
    });
    const requestedIds = researchers.flatMap((researcher) => {
      const id = researcher.author?.openalexId || researcher.openalexId;
      return id ? [id] : [];
    });
    const remoteAuthors = await this.client.getAuthorsByIds(requestedIds);
    const remoteById = new Map(
      remoteAuthors.map((author) => [author.id.toUpperCase(), author]),
    );
    // Author list queries omit some hidden/merged profiles. Confirm every
    // missing linked ID against the detail endpoint before reporting it as
    // unavailable, so the review CSV does not contain batch-query artifacts.
    const missingIds = [
      ...new Set(
        requestedIds.filter((id) => !remoteById.has(id.toUpperCase())),
      ),
    ];
    for (let index = 0; index < missingIds.length; index += 5) {
      const batch = missingIds.slice(index, index + 5);
      const results = await Promise.allSettled(
        batch.map((id) => this.client.getAuthor(id)),
      );
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          remoteById.set(result.value.id.toUpperCase(), result.value);
        }
      });
    }

    const rows: ResearcherIdentityAuditRow[] = researchers.map((researcher) => {
      const linkedId = researcher.author?.openalexId || researcher.openalexId;
      const remote = linkedId
        ? remoteById.get(linkedId.toUpperCase())
        : undefined;
      if (!linkedId || !remote) {
        return {
          researcherId: researcher.id,
          slug: researcher.slug,
          portalName: researcher.name,
          email: researcher.email || "",
          profileUrl: researcher.profileUrl || "",
          openalexId: linkedId || "",
          openalexName: "",
          nameScore: null,
          nameStatus: "UNLINKED",
          hasUiucAffiliation: null,
          uiucYears: "",
          issues: linkedId ? "OPENALEX_RECORD_NOT_FOUND" : "NO_AUTHOR_LINK",
        };
      }

      const score = this.authorNameScore(researcher.name, remote);
      const nameStatus =
        score >= 98
          ? "EXACT"
          : score >= 88
            ? "STRONG"
            : score >= 75
              ? "REVIEW"
              : "HIGH_RISK";
      const uiucAffiliations = (remote.affiliations || []).filter(
        ({ institution }) => institution?.id === uiucId,
      );
      const years = [
        ...new Set(uiucAffiliations.flatMap(({ years }) => years || [])),
      ].sort((left, right) => right - left);
      const issues = [
        nameStatus === "REVIEW" || nameStatus === "HIGH_RISK"
          ? `NAME_${nameStatus}`
          : "",
        uiucAffiliations.length ? "" : "NO_UIUC_AFFILIATION",
      ].filter(Boolean);

      return {
        researcherId: researcher.id,
        slug: researcher.slug,
        portalName: researcher.name,
        email: researcher.email || "",
        profileUrl: researcher.profileUrl || "",
        openalexId: remote.id,
        openalexName: remote.display_name?.trim() || "",
        nameScore: score,
        nameStatus,
        hasUiucAffiliation: uiucAffiliations.length > 0,
        uiucYears: years.join("|"),
        issues: issues.join("|"),
      };
    });

    const reviewRows = rows.filter((row) => row.issues.length > 0);
    const targetDirectory = resolve(
      outputDirectory || process.env.INIT_CWD || process.cwd(),
      outputDirectory ? "" : "reports",
    );
    await mkdir(targetDirectory, { recursive: true });
    const fullReportPath = resolve(
      targetDirectory,
      "researcher-openalex-identity-audit.csv",
    );
    const reviewReportPath = resolve(
      targetDirectory,
      "researcher-openalex-identity-review.csv",
    );
    await Promise.all([
      writeFile(fullReportPath, `${this.identityAuditCsv(rows)}\n`, "utf8"),
      writeFile(
        reviewReportPath,
        `${this.identityAuditCsv(reviewRows)}\n`,
        "utf8",
      ),
    ]);

    return {
      total: rows.length,
      linked: rows.filter((row) => row.nameStatus !== "UNLINKED").length,
      unlinked: rows.filter((row) => row.nameStatus === "UNLINKED").length,
      review: rows.filter((row) => row.nameStatus === "REVIEW").length,
      highRisk: rows.filter((row) => row.nameStatus === "HIGH_RISK").length,
      missingUiucAffiliation: rows.filter(
        (row) => row.hasUiucAffiliation === false,
      ).length,
      fullReportPath,
      reviewReportPath,
    };
  }

  async syncInstitutionProfile(
    institutionId: string = "I157725225",
  ): Promise<ImportResult> {
    try {
      const raw = (await this.client.getInstitution(
        institutionId,
      )) as OpenAlexInstitutionRaw;
      const summaryStats = raw.summary_stats ?? null;
      const data = {
        displayName:
          raw.display_name || "University of Illinois Urbana-Champaign",
        acronym: raw.display_name_acronyms?.[0] || "UIUC",
        ror: raw.ror || raw.ids?.ror || null,
        countryCode: raw.country_code || null,
        type: raw.type || null,
        homepageUrl: raw.homepage_url || "https://illinois.edu",
        imageUrl: raw.image_url || raw.image_thumbnail_url || null,
        worksCount: raw.works_count || 0,
        citedByCount: raw.cited_by_count || 0,
        hIndex: summaryStats?.h_index ?? null,
        i10Index: summaryStats?.i10_index ?? null,
        twoYearMeanCite: summaryStats?.["2yr_mean_citedness"] ?? null,
        ...(raw.geo ? { geo: raw.geo as Prisma.InputJsonValue } : {}),
        ...(summaryStats
          ? { summaryStats: summaryStats as Prisma.InputJsonValue }
          : {}),
      };
      await this.prisma.institution.upsert({
        where: { openalexId: raw.id },
        update: data,
        create: {
          openalexId: raw.id,
          ...data,
        },
      });
      this.logger.log(
        `Synced institution profile: ${data.displayName} (${data.worksCount} works, ${data.citedByCount} citations)`,
      );
      return { totalFetched: 1, totalImported: 1, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Institution profile sync failed: ${message}`);
      return { totalFetched: 1, totalImported: 0, status: "FAILED" };
    }
  }

  private async getUiucInstitutionDatabaseId(): Promise<string> {
    if (this.uiucInstitutionDatabaseId) {
      return this.uiucInstitutionDatabaseId;
    }
    const existing = await this.prisma.institution.findFirst({
      where: { openalexId: { contains: "I157725225" } },
      select: { id: true },
    });
    const institution =
      existing ||
      (await this.prisma.institution.create({
        data: {
          openalexId: "https://openalex.org/I157725225",
          displayName: "University of Illinois Urbana-Champaign",
          acronym: "UIUC",
          countryCode: "US",
          type: "education",
          homepageUrl: "https://illinois.edu",
        },
        select: { id: true },
      }));
    this.uiucInstitutionDatabaseId = institution.id;
    return institution.id;
  }

  private async linkAuthorToUiuc(authorId: string): Promise<void> {
    const institutionId = await this.getUiucInstitutionDatabaseId();
    await this.prisma.authorAffiliation.upsert({
      where: { authorId_institutionId: { authorId, institutionId } },
      update: { source: "RESEARCHER_PROFILE", isCurrent: true },
      create: {
        authorId,
        institutionId,
        source: "RESEARCHER_PROFILE",
        isCurrent: true,
      },
    });
  }

  async syncResearcherAuthorAffiliations(): Promise<ImportResult> {
    const researchers = await this.prisma.researcher.findMany({
      where: { authorId: { not: null } },
      select: { authorId: true },
    });
    const authorIds = [
      ...new Set(
        researchers.flatMap(({ authorId }) => (authorId ? [authorId] : [])),
      ),
    ];
    for (const authorId of authorIds) {
      await this.linkAuthorToUiuc(authorId);
    }
    this.logger.log(
      `Linked ${authorIds.length} researcher authors to the UIUC institution`,
    );
    return {
      totalFetched: researchers.length,
      totalImported: authorIds.length,
      status: "COMPLETED",
    };
  }

  private async uniqueResearcherSlug(
    name: string,
    email: string | null,
    discriminator?: string,
  ): Promise<string> {
    const base = slugifyResearcherName(name.replace(/^(dr|prof)\.?\s+/i, ""));
    const baseConflict = await this.prisma.researcher.findUnique({
      where: { slug: base },
      select: { id: true },
    });
    if (!baseConflict) return base;

    const suffix =
      researcherSlugSuffix(email) ||
      slugifyResearcherName(discriminator || "researcher");
    let candidate = `${base}-${suffix}`;
    let sequence = 2;
    while (
      await this.prisma.researcher.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base}-${suffix}-${sequence}`;
      sequence++;
    }
    return candidate;
  }

  private parseDelimitedLine(line: string, delimiter: string): string[] {
    const values: string[] = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          value += '"';
          index++;
        } else {
          quoted = !quoted;
        }
      } else if (char === delimiter && !quoted) {
        values.push(value.trim());
        value = "";
      } else {
        value += char;
      }
    }
    values.push(value.trim());
    return values;
  }

  private parseKeywords(value: string, limit: number): string[] {
    const content = value.trim().replace(/^\{/, "").replace(/\}$/, "");
    if (!content) return [];
    return [
      ...new Set(
        this.parseDelimitedLine(content, ",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ].slice(0, limit);
  }

  private async createRun(source: string, resume: boolean) {
    const previous = resume
      ? await this.prisma.importRun.findFirst({
          where: {
            source,
            status: { in: ["FAILED", "RUNNING"] },
            cursor: { not: null },
          },
          orderBy: { updatedAt: "desc" },
        })
      : null;
    await this.prisma.importRun.updateMany({
      where: { source, status: "RUNNING" },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage:
          "Superseded by a new import process; resume from its checkpoint.",
      },
    });
    return this.prisma.importRun.create({
      data: {
        source,
        status: "RUNNING",
        startedAt: new Date(),
        cursor: previous?.cursor || "*",
        totalFetched: previous?.totalFetched || 0,
        importedCount: previous?.importedCount || 0,
      },
    });
  }

  private readonly topicCache = new Map<string, string>();
  private readonly authorCache = new Map<string, string>();
  private readonly topicUpserts = new Map<string, Promise<string | null>>();
  private readonly authorUpserts = new Map<string, Promise<string | null>>();

  private normalizePersonName(value: string): string {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^(dr|prof)\.?\s+/i, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .trim()
      .toLowerCase();
  }

  private buildNameSearchVariants(value: string): string[] {
    const original = value.replace(/\s+/g, " ").trim();
    const words = original.split(" ").filter(Boolean);
    const variants: string[] = [original];
    const add = (candidate: string) => {
      const normalized = candidate.replace(/\s+/g, " ").trim();
      if (
        normalized &&
        !variants.some(
          (item) => item.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
        )
      ) {
        variants.push(normalized);
      }
    };

    if (words.length > 2) {
      // OpenAlex search is often literal enough that a full middle name does
      // not find an indexed initial (Amy Jaye -> Amy J.) or an omitted middle
      // name (Theresa Ann -> Theresa). Try both representations explicitly.
      for (let index = 1; index < words.length - 1; index++) {
        const initial = words[index].replace(/[^\p{L}\p{N}]/gu, "")[0];
        if (initial) {
          const abbreviated = [...words];
          abbreviated[index] = `${initial}.`;
          add(abbreviated.join(" "));
        }

        add(words.filter((_, wordIndex) => wordIndex !== index).join(" "));
      }
      add(`${words[0]} ${words.at(-1)}`);

      // Some directory records contain a legal first name while publications
      // use a preferred middle name (Mark Daniel -> Dan).
      for (const middleName of words.slice(1, -1)) {
        add(`${middleName} ${words.at(-1)}`);
        for (const alias of this.givenNameAliases(middleName)) {
          add(`${alias} ${words.at(-1)}`);
        }
      }
    }

    const firstName = words[0];
    const familyName = words.at(-1);
    if (firstName && familyName) {
      for (const alias of this.givenNameAliases(firstName)) {
        add(`${alias} ${familyName}`);
      }
      if (/^de[a-z]{4,}$/i.test(familyName)) {
        add(`${firstName} de ${familyName.slice(2)}`);
        add(`${firstName} ${familyName.slice(2)}`);
      }

      // This is intentionally last. A surname-only OpenAlex query is broad,
      // but the candidate still has to pass name, e-mail and research-context
      // checks before it can be linked.
      add(familyName);
    }

    add(this.normalizePersonName(original));
    return variants.slice(0, 20);
  }

  private compatibleNameToken(left: string, right: string): boolean {
    return (
      left === right ||
      (left[0] === right[0] && (left.length === 1 || right.length === 1))
    );
  }

  private givenNameAliases(value: string): Set<string> {
    const groups = [
      ["alex", "alexander", "aleksandr", "alexandra", "alexandre", "alexandru"],
      ["becky", "rebecca"],
      ["bob", "robert"],
      ["chris", "christopher", "christine", "christina"],
      ["cindy", "cynthia"],
      ["dan", "daniel"],
      ["jaki", "jacquelyn", "jackie", "jacqueline"],
      ["jeff", "jeffrey", "jefferson"],
      ["joe", "joseph"],
      ["kate", "kathleen", "katherine", "kathryn"],
      ["laurie", "lauretta"],
      ["matt", "matthew"],
      ["pat", "patricia"],
      ["trish", "patricia"],
      ["ted", "theodore", "edward", "william"],
    ];
    const normalized = this.normalizePersonName(value);
    const group = groups.find((items) => items.includes(normalized));
    return new Set(group || [normalized]);
  }

  private compatibleGivenName(left: string, right: string): boolean {
    if (this.compatibleNameToken(left, right)) return true;
    const leftAliases = this.givenNameAliases(left);
    const rightAliases = this.givenNameAliases(right);
    return [...leftAliases].some((value) => rightAliases.has(value));
  }

  private compatibleFamilyName(left: string[], right: string[]): boolean {
    const leftLast = left.at(-1) || "";
    const rightLast = right.at(-1) || "";
    if (leftLast === rightLast) return true;

    const leftFamily = left.slice(1);
    const rightFamily = right.slice(1);
    const leftCompact = leftFamily.join("");
    const rightCompact = rightFamily.join("");
    if (leftCompact && leftCompact === rightCompact) return true;

    // OpenAlex may retain or omit a compound/maiden family name, for example
    // Nickols vs Nickols-Richardson or Chamorro Chavez vs Chamorro.
    return (
      leftLast.length >= 4 &&
      rightLast.length >= 4 &&
      (rightFamily.includes(leftLast) || leftFamily.includes(rightLast))
    );
  }

  private middleNameMatchCount(left: string[], right: string[]): number {
    // Treat a hyphenated or split middle name as equivalent to its compact
    // directory spelling (for example, Chenchuan vs Chen-Chuan).
    if (
      left.length > 0 &&
      right.length > 0 &&
      left.join("") === right.join("")
    ) {
      return Math.max(left.length, right.length);
    }

    const rows = left.length + 1;
    const columns = right.length + 1;
    const scores = Array.from({ length: rows }, () =>
      Array<number>(columns).fill(0),
    );
    for (let row = 1; row < rows; row++) {
      for (let column = 1; column < columns; column++) {
        scores[row][column] = this.compatibleNameToken(
          left[row - 1],
          right[column - 1],
        )
          ? scores[row - 1][column - 1] + 1
          : Math.max(scores[row - 1][column], scores[row][column - 1]);
      }
    }
    return scores[left.length][right.length];
  }

  private personNameScore(expected: string, candidate: string): number {
    const expectedTokens = this.normalizePersonName(expected)
      .split(" ")
      .filter(Boolean);
    const candidateTokens = this.normalizePersonName(candidate)
      .split(" ")
      .filter(Boolean);
    if (!expectedTokens.length || !candidateTokens.length) return 0;
    if (expectedTokens.join(" ") === candidateTokens.join(" ")) return 100;
    if (
      expectedTokens.length === candidateTokens.length &&
      [...expectedTokens].sort().join(" ") ===
        [...candidateTokens].sort().join(" ")
    ) {
      return 98;
    }
    const expectedFirst = expectedTokens[0] || "";
    const candidateFirst = candidateTokens[0] || "";
    const expectedLast = expectedTokens.at(-1) || "";
    const candidateLast = candidateTokens.at(-1) || "";
    if (!this.compatibleFamilyName(expectedTokens, candidateTokens)) return 0;
    const firstNameExact = expectedFirst === candidateFirst;
    const firstNameCompatible = this.compatibleGivenName(
      expectedFirst,
      candidateFirst,
    );
    const preferredMiddleName = expectedTokens
      .slice(1, -1)
      .some((token) => this.compatibleGivenName(token, candidateFirst));
    if (!firstNameCompatible && !preferredMiddleName) return 0;

    const expectedMiddle = expectedTokens.slice(1, -1);
    const candidateMiddle = candidateTokens.slice(1, -1);
    const middleMatches = this.middleNameMatchCount(
      expectedMiddle,
      candidateMiddle,
    );
    if (
      expectedMiddle.length > 0 &&
      candidateMiddle.length > 0 &&
      middleMatches === 0
    ) {
      return 0;
    }

    const base = firstNameExact ? 88 : firstNameCompatible ? 80 : 76;
    return Math.min(97, base + Math.min(9, middleMatches * 4));
  }

  private researchContextScore(
    researcher: Pick<ResearcherIdentity, "department" | "keywords">,
    candidate: OpenAlexAuthorEntityRaw,
  ): number {
    const sourcePhrases = [
      researcher.department,
      ...(researcher.keywords || []).map(({ keyword }) => keyword),
    ]
      .filter((value): value is string => Boolean(value))
      .map((value) => this.normalizePersonName(value))
      .filter(Boolean);
    if (!sourcePhrases.length) return 0;

    const sourceSet = new Set(sourcePhrases);
    const sourceTokens = new Set(
      sourcePhrases.flatMap((phrase) =>
        phrase.split(" ").filter((token) => token.length >= 4),
      ),
    );
    let exactMatches = 0;
    let tokenMatches = 0;
    for (const topic of candidate.topics || []) {
      const phrase = this.normalizePersonName(topic.display_name || "");
      if (!phrase) continue;
      if (sourceSet.has(phrase)) exactMatches++;
      tokenMatches += phrase
        .split(" ")
        .filter((token) => token.length >= 4 && sourceTokens.has(token)).length;
    }
    return Math.min(30, exactMatches * 10 + Math.min(15, tokenMatches * 2));
  }

  private authorNameScore(
    expectedName: string,
    candidate: OpenAlexAuthorEntityRaw,
  ): number {
    if (
      candidate.display_name &&
      this.hasExplicitMiddleNameConflict(expectedName, candidate.display_name)
    ) {
      return 0;
    }
    return Math.max(
      0,
      ...[
        candidate.display_name,
        ...(candidate.display_name_alternatives || []),
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => this.personNameScore(expectedName, value)),
    );
  }

  private hasExplicitMiddleNameConflict(
    expectedName: string,
    candidateName: string,
  ): boolean {
    const expected = this.normalizePersonName(expectedName)
      .split(" ")
      .filter(Boolean);
    const candidate = this.normalizePersonName(candidateName)
      .split(" ")
      .filter(Boolean);
    if (expected.length < 3 || candidate.length < 3) return false;
    if (expected[0] !== candidate[0] || expected.at(-1) !== candidate.at(-1)) {
      return false;
    }
    return (
      this.middleNameMatchCount(
        expected.slice(1, -1),
        candidate.slice(1, -1),
      ) === 0
    );
  }

  private pickLocalAuthor(
    researcher: { name: string; email: string | null },
    candidates: Array<{
      id: string;
      openalexId: string;
      displayName: string;
    }>,
    unavailableAuthorIds: Set<string>,
  ) {
    const ranked = candidates
      .filter((candidate) => !unavailableAuthorIds.has(candidate.id))
      .map((candidate) => {
        const nameScore = this.personNameScore(
          researcher.name,
          candidate.displayName,
        );
        const emailScore = this.emailIdentityScore(
          researcher.email,
          candidate.displayName,
        );
        return { candidate, nameScore, score: nameScore + emailScore };
      })
      .filter(
        ({ nameScore, score }) =>
          nameScore >= 92 || (nameScore >= 88 && score >= 100),
      )
      .sort((left, right) => right.score - left.score);
    if (!ranked.length) return null;
    if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null;
    return ranked[0].candidate;
  }

  private emailIdentityScore(
    email: string | null,
    candidateName: string,
  ): number {
    if (!email) return 0;
    const localPart = email.split("@")[0] || "";
    const normalizedLocal = this.normalizePersonName(localPart);
    const normalizedCandidate = this.normalizePersonName(candidateName);
    if (!normalizedLocal || !normalizedCandidate) return 0;

    const compactLocal = normalizedLocal.replace(/\s+/g, "");
    const candidateTokens = normalizedCandidate.split(" ").filter(Boolean);
    const compactCandidate = candidateTokens.join("");
    if (compactLocal === compactCandidate) return 20;

    const first = candidateTokens[0] || "";
    const last = candidateTokens.at(-1) || "";
    if (
      last.length >= 3 &&
      compactLocal.includes(last) &&
      first[0] &&
      compactLocal.includes(first[0])
    ) {
      return 15;
    }

    const matchedTokens = candidateTokens.filter(
      (token) => token.length >= 3 && compactLocal.includes(token),
    ).length;
    return Math.min(12, matchedTokens * 6);
  }

  private pickOpenAlexAuthor(
    researcher: Pick<
      ResearcherIdentity,
      "name" | "email" | "department" | "keywords"
    >,
    candidates: OpenAlexAuthorEntityRaw[],
    requireEmailSignal = false,
  ): OpenAlexAuthorEntityRaw | null {
    const ranked = candidates
      .map((candidate) => {
        const nameScore = this.authorNameScore(researcher.name, candidate);
        const primaryNameScore = candidate.display_name
          ? this.personNameScore(researcher.name, candidate.display_name)
          : 0;
        const emailScore = candidate.display_name
          ? this.emailIdentityScore(researcher.email, candidate.display_name)
          : 0;
        const contextScore = this.researchContextScore(researcher, candidate);
        return {
          candidate,
          nameScore,
          primaryNameScore,
          emailScore,
          contextScore,
          score: nameScore + emailScore + contextScore,
        };
      })
      .filter(
        ({ nameScore, primaryNameScore, emailScore, contextScore, score }) =>
          nameScore >= 75 &&
          score >= 85 &&
          // OpenAlex alternatives occasionally contain a different person
          // after an author merge. A compatible primary display name is
          // mandatory; e-mail and broad research topics cannot make a
          // conflicting primary identity safe.
          primaryNameScore >= 75 &&
          (!requireEmailSignal || emailScore >= 12 || contextScore >= 12),
      )
      .sort(
        (left, right) =>
          right.score - left.score ||
          (right.candidate.works_count || 0) -
            (left.candidate.works_count || 0),
      );

    if (!ranked.length) return null;
    const topWorks = ranked[0].candidate.works_count || 0;
    const secondWorks = ranked[1]?.candidate.works_count || 0;
    if (
      ranked.length > 1 &&
      ranked[0].score - ranked[1].score < 5 &&
      ranked[0].candidate.id !== ranked[1].candidate.id &&
      topWorks < secondWorks * 2 + 20
    ) {
      return null;
    }
    return ranked[0].candidate;
  }

  private async searchOpenAlexAuthor(
    researcher: Pick<
      ResearcherIdentity,
      "name" | "email" | "department" | "keywords"
    >,
    institutionId: string,
  ): Promise<OpenAlexAuthorEntityRaw | null> {
    const nameVariants = this.buildNameSearchVariants(researcher.name);
    for (const search of nameVariants) {
      const institutionMatches = await this.client.getAuthors({
        institutionId,
        search,
        perPage: 25,
      });
      const institutionCandidate = this.pickOpenAlexAuthor(
        researcher,
        institutionMatches.results,
      );
      if (institutionCandidate) {
        if (search !== researcher.name) {
          this.logger.log(
            `Resolved ${researcher.name} with OpenAlex name variant "${search}" (${institutionCandidate.display_name || institutionCandidate.id})`,
          );
        }
        return institutionCandidate;
      }
    }

    const emailLocalPart = researcher.email
      ?.split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .trim();
    if (emailLocalPart) {
      const emailMatches = await this.client.getAuthors({
        institutionId,
        search: emailLocalPart,
        perPage: 25,
      });
      const emailCandidate = this.pickOpenAlexAuthor(
        researcher,
        emailMatches.results,
      );
      if (emailCandidate) return emailCandidate;
    }

    const fromAffiliatedWorks = await this.searchAuthorFromAffiliatedWorks(
      researcher,
      institutionId,
      nameVariants,
    );
    if (fromAffiliatedWorks) return fromAffiliatedWorks;

    // Some former UIUC researchers no longer have UIUC in their current
    // affiliation search index. A global fallback is accepted only when the
    // email local-part independently agrees with the candidate name.
    if (researcher.email) {
      for (const search of nameVariants) {
        const globalMatches = await this.client.getAuthors({
          institutionId: null,
          search,
          perPage: 25,
        });
        const candidate = this.pickOpenAlexAuthor(
          researcher,
          globalMatches.results,
          true,
        );
        if (candidate) return candidate;
      }
    }

    return null;
  }

  private async searchAuthorFromAffiliatedWorks(
    researcher: Pick<
      ResearcherIdentity,
      "name" | "email" | "department" | "keywords"
    >,
    institutionId: string,
    nameVariants: string[] = this.buildNameSearchVariants(researcher.name),
  ): Promise<OpenAlexAuthorEntityRaw | null> {
    const cleanInstitutionId = institutionId.replace(
      "https://openalex.org/",
      "",
    );
    const candidates = new Map<
      string,
      { id: string; displayName: string; score: number; workIds: Set<string> }
    >();

    for (const rawAuthorName of nameVariants) {
      const response = await this.client.getWorks({
        institutionId,
        rawAuthorName,
        perPage: 100,
      });
      for (const work of response.results) {
        for (const authorship of work.authorships || []) {
          const isUiucAuthorship = (authorship.institutions || []).some(
            ({ id }) =>
              id?.replace("https://openalex.org/", "") === cleanInstitutionId,
          );
          if (!isUiucAuthorship || !authorship.author?.id) continue;
          const candidateName =
            authorship.raw_author_name || authorship.author.display_name;
          const nameScore = this.personNameScore(
            researcher.name,
            candidateName,
          );
          const score =
            nameScore +
            this.emailIdentityScore(researcher.email, candidateName);
          if (nameScore < 80 || score < 85) continue;

          const current = candidates.get(authorship.author.id);
          const workIds = current?.workIds || new Set<string>();
          workIds.add(work.id);
          candidates.set(authorship.author.id, {
            id: authorship.author.id,
            displayName: authorship.author.display_name || candidateName,
            score: Math.max(score, current?.score || 0),
            workIds,
          });
        }
      }
    }

    const ranked = [...candidates.values()].sort(
      (left, right) =>
        right.workIds.size - left.workIds.size || right.score - left.score,
    );
    if (!ranked.length) return null;
    const hydratedCandidates = await Promise.all(
      ranked
        .slice(0, 8)
        .map((candidate) => this.client.getAuthor(candidate.id)),
    );
    const selected = this.pickOpenAlexAuthor(researcher, hydratedCandidates);
    if (!selected) return null;
    const selectedEvidence = candidates.get(selected.id);
    this.logger.log(
      `Resolved ${researcher.name} through ${selectedEvidence?.workIds.size || 0} UIUC-affiliated work bylines (${selected.display_name || selected.id})`,
    );
    return selected;
  }

  private async upsertOpenAlexAuthor(
    raw: OpenAlexAuthorEntityRaw,
  ): Promise<string> {
    const author = mapOpenAlexAuthorIdentity(raw);
    const record = await this.prisma.author.upsert({
      where: { openalexId: author.openalexId },
      update: { displayName: author.displayName, orcid: author.orcid },
      create: author,
    });
    this.authorCache.set(author.openalexId, record.id);
    return record.id;
  }

  private async resolveOpenAlexAuthor(
    name: string,
    openalexId?: string,
    institutionId: string = "I157725225",
    email: string | null = null,
  ): Promise<OpenAlexAuthorEntityRaw> {
    if (openalexId) {
      return this.client.getAuthor(openalexId);
    }
    const candidate = await this.searchOpenAlexAuthor(
      { name, email, department: null, keywords: [] },
      institutionId,
    );
    if (!candidate) {
      throw new Error(
        `Cannot uniquely resolve an OpenAlex UIUC author for "${name}" with a safe name score`,
      );
    }
    return candidate;
  }

  private async upsertTopic(
    topic: NormalizedWork["topics"][number],
  ): Promise<string | null> {
    if (!topic || !topic.openalexId) return null;
    const cached = this.topicCache.get(topic.openalexId);
    if (cached) return cached;
    const pending = this.topicUpserts.get(topic.openalexId);
    if (pending) return pending;

    const topicData = {
      displayName: topic.displayName,
      subfieldId: topic.subfieldId,
      subfieldName: topic.subfieldName,
      fieldId: topic.fieldId,
      fieldName: topic.fieldName,
      domainId: topic.domainId,
      domainName: topic.domainName,
    };
    const operation = this.prisma.topic
      .upsert({
        where: { openalexId: topic.openalexId },
        update: topicData,
        create: {
          openalexId: topic.openalexId,
          ...topicData,
        },
      })
      .then((record) => {
        this.topicCache.set(topic.openalexId, record.id);
        return record.id;
      });
    this.topicUpserts.set(topic.openalexId, operation);
    try {
      return await operation;
    } finally {
      this.topicUpserts.delete(topic.openalexId);
    }
  }

  private async upsertAuthor(
    item: NormalizedWork["authors"][number],
  ): Promise<string | null> {
    if (!item || !item.openalexId) return null;
    const cached = this.authorCache.get(item.openalexId);
    if (cached) return cached;
    const pending = this.authorUpserts.get(item.openalexId);
    if (pending) return pending;

    const operation = this.prisma.author
      .upsert({
        where: { openalexId: item.openalexId },
        update: {
          displayName: item.displayName,
          ...(item.orcid ? { orcid: item.orcid } : {}),
        },
        create: {
          openalexId: item.openalexId,
          displayName: item.displayName,
          orcid: item.orcid,
        },
      })
      .then((author) => {
        this.authorCache.set(item.openalexId, author.id);
        return author.id;
      });
    this.authorUpserts.set(item.openalexId, operation);
    try {
      return await operation;
    } finally {
      this.authorUpserts.delete(item.openalexId);
    }
  }

  private async persistWork(
    normalized: NormalizedWork,
    canonicalAuthorId?: string,
  ): Promise<void> {
    const topicIds = new Map<string, string>();
    for (const topic of normalized.topics) {
      if (!topic?.openalexId) continue;
      const topicId = await this.upsertTopic(topic);
      if (topicId) {
        topicIds.set(topic.openalexId, topicId);
      }
    }

    const primaryTopic = normalized.topics.find((topic) => topic.isPrimary);
    const primaryTopicId = primaryTopic?.openalexId
      ? topicIds.get(primaryTopic.openalexId) || null
      : null;
    const paper = await this.prisma.paper.upsert({
      where: { openalexId: normalized.paper.openalexId },
      update: { ...normalized.paper, primaryTopicId },
      create: { ...normalized.paper, primaryTopicId },
    });
    const embeddingContent = [
      `Title: ${normalized.paper.title}`,
      primaryTopic?.displayName
        ? `Primary topic: ${primaryTopic.displayName}`
        : "",
      normalized.paper.abstract ? `Abstract: ${normalized.paper.abstract}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 24_000);
    const contentHash = createHash("sha256")
      .update(embeddingContent)
      .digest("hex");
    await this.prisma.embeddingRecord.updateMany({
      where: {
        paperId: paper.id,
        contentHash: { not: contentHash },
      },
      data: { status: "PENDING", errorMessage: null },
    });
    await this.prisma.embeddingRecord.createMany({
      data: [
        {
          paperId: paper.id,
          embeddingVersion: "v1",
          model:
            this.config.get<string>("LOCAL_EMBEDDING_MODEL") ||
            "Xenova/multilingual-e5-small",
          contentHash,
          status: "PENDING",
        },
      ],
      skipDuplicates: true,
    });

    for (const topic of normalized.topics) {
      if (!topic?.openalexId) continue;
      const topicId = topicIds.get(topic.openalexId);
      if (!topicId) continue;
      await this.prisma.paperTopic.upsert({
        where: { paperId_topicId: { paperId: paper.id, topicId } },
        update: { score: topic.score, isPrimary: topic.isPrimary },
        create: {
          paperId: paper.id,
          topicId,
          score: topic.score,
          isPrimary: topic.isPrimary,
        },
      });
    }

    const uniqueAuthors = new Map<string, NormalizedWork["authors"][number]>();
    for (const item of normalized.authors) {
      if (item?.openalexId && !uniqueAuthors.has(item.openalexId)) {
        uniqueAuthors.set(item.openalexId, item);
      }
    }

    for (const item of uniqueAuthors.values()) {
      const authorId = await this.upsertAuthor(item);
      if (!authorId) continue;
      await this.prisma.paperAuthor.upsert({
        where: { paperId_authorId: { paperId: paper.id, authorId } },
        update: {
          authorPosition: item.position,
          isCorresponding: item.isCorresponding,
        },
        create: {
          paperId: paper.id,
          authorId,
          authorPosition: item.position,
          isCorresponding: item.isCorresponding,
        },
      });
    }

    // OpenAlex can return a work from an `authorships.author.id` filter even
    // when the canonical author is absent from the response authorship array
    // (usually after an author merge or very large collaboration cleanup).
    // The filtered result is still part of that author's works collection, so
    // preserve the canonical relation used to request the page.
    if (canonicalAuthorId) {
      await this.prisma.paperAuthor.upsert({
        where: {
          paperId_authorId: { paperId: paper.id, authorId: canonicalAuthorId },
        },
        update: {},
        create: {
          paperId: paper.id,
          authorId: canonicalAuthorId,
          authorPosition: "middle",
          isCorresponding: false,
        },
      });
    }
  }

  private async persistWorkPage(
    rows: OpenAlexWorkRaw[],
    concurrency: number,
    canonicalAuthorId?: string,
  ): Promise<void> {
    for (let index = 0; index < rows.length; index += concurrency) {
      await Promise.all(
        rows
          .slice(index, index + concurrency)
          .map((rawWork) =>
            this.persistWork(mapOpenAlexWork(rawWork), canonicalAuthorId),
          ),
      );
    }
  }

  async runImport(
    params: {
      institutionId?: string;
      fromYear?: number;
      toYear?: number;
      fromDate?: string;
      toDate?: string;
      targetCount?: number;
      perPage?: number;
      resume?: boolean;
    } = {},
  ): Promise<ImportResult> {
    const fromDate =
      params.fromDate ||
      this.config.get<string>("IMPORT_FROM_DATE") ||
      process.env.IMPORT_FROM_DATE ||
      undefined;
    const toDate =
      params.toDate ||
      this.config.get<string>("IMPORT_TO_DATE") ||
      process.env.IMPORT_TO_DATE ||
      undefined;
    const fromYear = fromDate
      ? undefined
      : this.positiveInt(
          params.fromYear ||
            this.config.get("IMPORT_FROM_YEAR") ||
            process.env.IMPORT_FROM_YEAR,
          2024,
        );
    const toYear = toDate
      ? undefined
      : this.positiveInt(
          params.toYear ||
            this.config.get("IMPORT_TO_YEAR") ||
            process.env.IMPORT_TO_YEAR,
          2026,
        );
    const targetCount = this.positiveInt(
      params.targetCount ||
        this.config.get("IMPORT_PAPER_TARGET") ||
        process.env.IMPORT_PAPER_TARGET,
      100_000,
    );
    const perPage = Math.min(
      this.positiveInt(
        params.perPage ||
          this.config.get("IMPORT_BATCH_SIZE") ||
          process.env.IMPORT_BATCH_SIZE,
        100,
      ),
      100,
    );
    const institutionId =
      params.institutionId ||
      this.config.get<string>("UIUC_OPENALEX_INSTITUTION_ID") ||
      process.env.UIUC_OPENALEX_INSTITUTION_ID ||
      "I157725225";
    const run = await this.createRun("openalex_works", params.resume !== false);
    let cursor = run.cursor || "*";
    let totalFetched = run.totalFetched;
    let totalImported = run.importedCount;
    const rangeDescription =
      fromDate || toDate
        ? `${fromDate || "beginning"} to ${toDate || "now"}`
        : `${fromYear}-${toYear}`;
    this.logger.log(
      `Importing up to ${targetCount} UIUC papers (${rangeDescription}), ${perPage} per batch.`,
    );

    try {
      while (cursor && totalFetched < targetCount) {
        const response = await this.client.getWorks({
          institutionId,
          cursor,
          perPage,
          fromYear,
          toYear,
          fromDate,
          toDate,
        });
        const rows = response.results.slice(0, targetCount - totalFetched);
        if (!rows.length) break;
        for (const raw of rows) {
          await this.persistWork(mapOpenAlexWork(raw));
          totalImported++;
        }
        totalFetched += rows.length;
        cursor = response.meta.next_cursor || "";
        await this.prisma.importRun.update({
          where: { id: run.id },
          data: { cursor, totalFetched, importedCount: totalImported },
        });
        this.logger.log(`Papers: ${totalImported}/${targetCount}`);
      }
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date(), cursor },
      });
      return { totalFetched, totalImported, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
          cursor,
        },
      });
      this.logger.error(
        `Paper import failed after ${totalImported} records: ${message}`,
      );
      return { totalFetched, totalImported, status: "FAILED" };
    }
  }

  async runFacultyImport(
    params: {
      institutionId?: string;
      targetCount?: number;
      perPage?: number;
      resume?: boolean;
    } = {},
  ): Promise<ImportResult> {
    const targetCount = this.positiveInt(
      params.targetCount || process.env.IMPORT_FACULTY_TARGET,
      1_000,
    );
    const perPage = Math.min(
      this.positiveInt(params.perPage || process.env.IMPORT_BATCH_SIZE, 100),
      100,
    );
    const institutionId =
      params.institutionId ||
      process.env.UIUC_OPENALEX_INSTITUTION_ID ||
      "I157725225";
    const run = await this.createRun(
      "openalex_faculty",
      params.resume !== false,
    );
    let cursor = run.cursor || "*";
    let totalFetched = run.totalFetched;
    let totalImported = run.importedCount;
    this.logger.log(
      `Importing up to ${targetCount} UIUC researchers, ${perPage} per batch.`,
    );

    try {
      while (cursor && totalFetched < targetCount) {
        const response = await this.client.getAuthors({
          institutionId,
          cursor,
          perPage,
        });
        const rows = response.results.slice(0, targetCount - totalFetched);
        if (!rows.length) break;
        for (const raw of rows) {
          const item = mapOpenAlexAuthor(raw);
          const authorId = await this.upsertOpenAlexAuthor(raw);
          const { keywords, ...researcherData } = item;
          const slug = await this.uniqueResearcherSlug(
            item.name,
            null,
            item.openalexId,
          );
          const researcher = await this.prisma.researcher.upsert({
            where: { authorId },
            update: { ...researcherData, authorId },
            create: { ...researcherData, slug, authorId },
          });
          await this.linkAuthorToUiuc(authorId);
          await this.prisma.researcherKeyword.deleteMany({
            where: { researcherId: researcher.id },
          });
          if (keywords.length) {
            await this.prisma.researcherKeyword.createMany({
              data: keywords.map((keyword) => ({
                researcherId: researcher.id,
                keyword,
              })),
            });
          }
          totalImported++;
        }
        totalFetched += rows.length;
        cursor = response.meta.next_cursor || "";
        await this.prisma.importRun.update({
          where: { id: run.id },
          data: { cursor, totalFetched, importedCount: totalImported },
        });
        this.logger.log(`Researchers: ${totalImported}/${targetCount}`);
      }
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", completedAt: new Date(), cursor },
      });
      return { totalFetched, totalImported, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
          cursor,
        },
      });
      this.logger.error(
        `Faculty import failed after ${totalImported} records: ${message}`,
      );
      return { totalFetched, totalImported, status: "FAILED" };
    }
  }

  async runFacultyCsvImport(filePath: string): Promise<ImportResult> {
    const keywordLimit = this.positiveInt(
      process.env.IMPORT_KEYWORDS_LIMIT,
      40,
    );
    const run = await this.prisma.importRun.create({
      data: { source: "faculty_csv", status: "RUNNING", startedAt: new Date() },
    });
    let totalFetched = 0;
    let totalImported = 0;

    try {
      const input = createInterface({
        input: createReadStream(filePath),
        crlfDelay: Infinity,
      });
      let headers: string[] | null = null;
      let delimiter = ",";

      for await (const rawLine of input) {
        const line = rawLine.trim();
        if (!line) continue;
        if (!headers) {
          delimiter = rawLine.includes("\t") ? "\t" : ",";
          headers = this.parseDelimitedLine(
            rawLine.replace(/^\uFEFF/, ""),
            delimiter,
          ).map((header) => header.toLowerCase());
          const required = [
            "email",
            "name",
            "photo_url",
            "position",
            "keywords",
          ];
          const missing = required.filter(
            (column) => !headers?.includes(column),
          );
          if (missing.length)
            throw new Error(
              `Faculty file is missing columns: ${missing.join(", ")}`,
            );
          continue;
        }

        const values = this.parseDelimitedLine(rawLine, delimiter);
        const row = Object.fromEntries(
          headers.map((header, index) => [header, values[index] || ""]),
        );
        if (!row.email && !row.name) continue;
        totalFetched++;
        if (!row.email || !row.name) {
          throw new Error(
            `Invalid faculty row ${totalFetched + 1}: email and name are required`,
          );
        }

        const keywords = this.parseKeywords(row.keywords, keywordLimit);
        const department =
          row.department?.trim() ||
          inferResearcherDepartment(row.position, keywords);

        const openAlexAuthor = await this.resolveOpenAlexAuthor(
          row.name,
          row.openalex_id || undefined,
        );
        const authorId = await this.upsertOpenAlexAuthor(openAlexAuthor);
        const existingResearcher = await this.prisma.researcher.findUnique({
          where: { email: row.email },
        });
        const researcher = existingResearcher
          ? await this.prisma.researcher.update({
              where: { id: existingResearcher.id },
              data: {
                authorId,
                openalexId: openAlexAuthor.id,
                name: row.name,
                photoUrl: row.photo_url || null,
                title: row.position || null,
                department,
              },
            })
          : await this.prisma.researcher.create({
              data: {
                slug: await this.uniqueResearcherSlug(
                  row.name,
                  row.email,
                  openAlexAuthor.id,
                ),
                authorId,
                openalexId: openAlexAuthor.id,
                email: row.email,
                name: row.name,
                photoUrl: row.photo_url || null,
                title: row.position || null,
                department,
              },
            });
        await this.linkAuthorToUiuc(authorId);
        await this.prisma.researcherKeyword.deleteMany({
          where: { researcherId: researcher.id },
        });
        if (keywords.length) {
          await this.prisma.researcherKeyword.createMany({
            data: keywords.map((keyword) => ({
              researcherId: researcher.id,
              keyword,
            })),
          });
        }
        totalImported++;

        if (totalImported % 100 === 0) {
          await this.prisma.importRun.update({
            where: { id: run.id },
            data: { totalFetched, importedCount: totalImported },
          });
          this.logger.log(`CSV researchers: ${totalImported}`);
        }
      }

      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          totalFetched,
          importedCount: totalImported,
          completedAt: new Date(),
        },
      });
      return { totalFetched, totalImported, status: "COMPLETED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          totalFetched,
          importedCount: totalImported,
          errorMessage: message,
          completedAt: new Date(),
        },
      });
      this.logger.error(
        `Faculty CSV import failed after ${totalImported} records: ${message}`,
      );
      return { totalFetched, totalImported, status: "FAILED" };
    }
  }

  async linkExistingResearchersToAuthors(): Promise<ImportResult> {
    const researchers = await this.prisma.researcher.findMany({
      where: { authorId: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        openalexId: true,
        profileUrl: true,
        department: true,
        keywords: { select: { keyword: true } },
        author: { select: { openalexId: true } },
      },
    });
    let totalImported = 0;
    const failures: string[] = [];

    try {
      const authors = await this.prisma.author.findMany({
        select: { id: true, openalexId: true, displayName: true },
      });
      const authorsByName = new Map<string, typeof authors>();
      const authorsByLastName = new Map<string, typeof authors>();
      for (const author of authors) {
        const normalized = this.normalizePersonName(author.displayName);
        authorsByName.set(normalized, [
          ...(authorsByName.get(normalized) || []),
          author,
        ]);
        const lastName = normalized.split(" ").at(-1);
        if (lastName) {
          authorsByLastName.set(lastName, [
            ...(authorsByLastName.get(lastName) || []),
            author,
          ]);
        }
      }
      const unavailableAuthorIds = new Set(
        (
          await this.prisma.researcher.findMany({
            where: { authorId: { not: null } },
            select: { authorId: true },
          })
        ).flatMap(({ authorId }) => (authorId ? [authorId] : [])),
      );
      const researcherNameCounts = new Map<string, number>();
      for (const researcher of researchers) {
        const normalized = this.normalizePersonName(researcher.name);
        researcherNameCounts.set(
          normalized,
          (researcherNameCounts.get(normalized) || 0) + 1,
        );
      }

      const unresolved = [] as typeof researchers;
      for (const researcher of researchers) {
        const normalized = this.normalizePersonName(researcher.name);
        const localMatches = authorsByName.get(normalized) || [];
        if (
          localMatches.length === 1 &&
          researcherNameCounts.get(normalized) === 1
        ) {
          const author = localMatches[0];
          await this.prisma.researcher.update({
            where: { id: researcher.id },
            data: { authorId: author.id, openalexId: author.openalexId },
          });
          await this.linkAuthorToUiuc(author.id);
          unavailableAuthorIds.add(author.id);
          totalImported++;
        } else {
          unresolved.push(researcher);
        }
      }

      const remotelyUnresolved = [] as typeof researchers;
      let fuzzyLocalMatches = 0;
      for (const researcher of unresolved) {
        const normalized = this.normalizePersonName(researcher.name);
        const lastName = normalized.split(" ").at(-1);
        const author = lastName
          ? this.pickLocalAuthor(
              researcher,
              authorsByLastName.get(lastName) || [],
              unavailableAuthorIds,
            )
          : null;
        if (!author) {
          remotelyUnresolved.push(researcher);
          continue;
        }
        await this.prisma.researcher.update({
          where: { id: researcher.id },
          data: { authorId: author.id, openalexId: author.openalexId },
        });
        await this.linkAuthorToUiuc(author.id);
        unavailableAuthorIds.add(author.id);
        totalImported++;
        fuzzyLocalMatches++;
        this.logger.log(
          `Linked ${researcher.name} to local OpenAlex author ${author.displayName}`,
        );
      }
      this.logger.log(
        `Linked ${totalImported} researchers from local OpenAlex authors (${fuzzyLocalMatches} fuzzy); resolving ${remotelyUnresolved.length} through OpenAlex.`,
      );

      const concurrency = 5;
      for (
        let index = 0;
        index < remotelyUnresolved.length;
        index += concurrency
      ) {
        const batch = remotelyUnresolved.slice(index, index + concurrency);
        const results = await Promise.allSettled(
          batch.map(async (researcher) => {
            const raw = await this.resolveAndLinkResearcherAuthor(researcher);
            if (!raw) {
              throw new Error(
                "No unique high-confidence OpenAlex author match",
              );
            }
          }),
        );
        results.forEach((result, resultIndex) => {
          if (result.status === "fulfilled") {
            totalImported++;
          } else {
            failures.push(
              `${batch[resultIndex].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
            );
          }
        });
        const budgetFailure = results.find(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof Error &&
            result.reason.message.includes("rate limit budget is exhausted"),
        );
        if (budgetFailure?.status === "rejected") {
          throw budgetFailure.reason;
        }
        if ((index + batch.length) % 25 === 0) {
          this.logger.log(
            `Researcher-author backfill: ${totalImported}/${researchers.length}`,
          );
        }
      }

      const unlinkedCount = await this.prisma.researcher.count({
        where: { authorId: null },
      });
      if (unlinkedCount !== 0) {
        throw new Error(
          `${unlinkedCount} researchers remain without an OpenAlex author. ${failures.slice(0, 10).join(" | ")}`,
        );
      }

      return {
        totalFetched: researchers.length,
        totalImported,
        status: "COMPLETED",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Researcher-author linking failed: ${message}`);
      return {
        totalFetched: researchers.length,
        totalImported,
        status: "FAILED",
      };
    }
  }

  async syncResearcherMetrics(): Promise<
    ImportResult & { changed: number; failed: number }
  > {
    const researchers = await this.prisma.researcher.findMany({
      where: { authorId: { not: null } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        openalexId: true,
        worksCount: true,
        citedByCount: true,
        author: { select: { openalexId: true } },
      },
    });
    let totalImported = 0;
    let changed = 0;
    let failed = 0;
    const failures: string[] = [];
    const concurrency = 5;

    for (let index = 0; index < researchers.length; index += concurrency) {
      const batch = researchers.slice(index, index + concurrency);
      const results = await Promise.allSettled(
        batch.map(async (researcher) => {
          const openalexId =
            researcher.author?.openalexId || researcher.openalexId;
          if (!openalexId) {
            throw new Error("Linked author has no OpenAlex ID");
          }

          // Author singleton is the canonical citation source. The works list
          // meta.count is used for works because author search/singleton counts
          // can lag after OpenAlex merges.
          const [author, works] = await Promise.all([
            this.client.getAuthor(openalexId),
            this.client.getWorks({
              authorId: openalexId,
              institutionId: null,
              perPage: 1,
            }),
          ]);
          const worksCount = works.meta.count;
          const citedByCount = author.cited_by_count || 0;
          const isChanged =
            researcher.openalexId !== author.id ||
            researcher.worksCount !== worksCount ||
            researcher.citedByCount !== citedByCount;
          if (isChanged) {
            await this.prisma.researcher.update({
              where: { id: researcher.id },
              data: {
                openalexId: author.id,
                worksCount,
                citedByCount,
              },
            });
          }
          return isChanged;
        }),
      );

      results.forEach((result, resultIndex) => {
        if (result.status === "fulfilled") {
          totalImported++;
          if (result.value) changed++;
        } else {
          failed++;
          failures.push(
            `${batch[resultIndex].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
          );
        }
      });

      if ((index + batch.length) % 100 === 0) {
        this.logger.log(
          `Researcher metrics: ${index + batch.length}/${researchers.length} checked, ${changed} corrected, ${failed} failed`,
        );
      }
    }

    if (failures.length) {
      this.logger.error(
        `Researcher metrics completed with ${failed} failure(s): ${failures.slice(0, 10).join(" | ")}`,
      );
    }
    return {
      totalFetched: researchers.length,
      totalImported,
      changed,
      failed,
      status: failed ? "FAILED" : "COMPLETED",
    };
  }

  async syncResearcherTopics(
    researcherId?: string,
    onlyMissing = false,
  ): Promise<ImportResult & { failed: number }> {
    const researchers = await this.prisma.researcher.findMany({
      where: researcherId
        ? { id: researcherId, authorId: { not: null } }
        : {
            authorId: { not: null },
            ...(onlyMissing ? { topics: { none: {} } } : {}),
          },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        openalexId: true,
        author: { select: { openalexId: true } },
      },
    });
    let totalImported = 0;
    let failed = 0;
    const failures: string[] = [];
    const concurrency = 5;
    // OpenAlex fetches can run concurrently, but topic rows are shared by many
    // researchers. Serialize database writes to prevent cross-author deadlocks.
    let writeQueue: Promise<void> = Promise.resolve();

    for (let index = 0; index < researchers.length; index += concurrency) {
      const batch = researchers.slice(index, index + concurrency);
      const results = await Promise.allSettled(
        batch.map(async (researcher) => {
          const openalexId =
            researcher.author?.openalexId || researcher.openalexId;
          if (!openalexId) {
            throw new Error("Linked author has no OpenAlex ID");
          }

          // The Author object exposes only its five headline topics. Aggregate
          // across all works instead so the relation represents every OpenAlex
          // topic attached to this author's publication history.
          const authorTopics = await this.client.getAuthorTopics(openalexId);
          const uniqueTopics = new Map<
            string,
            { displayName: string; worksCount: number; rank: number }
          >();
          for (const [index, topic] of authorTopics.entries()) {
            const topicId = topic.key?.trim();
            const displayName = topic.key_display_name?.trim();
            if (!topicId || !displayName || uniqueTopics.has(topicId)) continue;
            uniqueTopics.set(topicId, {
              displayName,
              worksCount: Math.max(0, topic.count || 0),
              rank: index + 1,
            });
          }

          const writeOperation = writeQueue.then(async () => {
            const topicRows = await Promise.all(
              [...uniqueTopics.entries()]
                .sort(([left], [right]) => left.localeCompare(right))
                .map(async ([openalexTopicId, topic]) => ({
                  topic,
                  record: await this.prisma.topic.upsert({
                    where: { openalexId: openalexTopicId },
                    update: { displayName: topic.displayName },
                    create: {
                      openalexId: openalexTopicId,
                      displayName: topic.displayName,
                    },
                  }),
                })),
            );

            for (const { topic, record } of topicRows) {
              await this.prisma.researcherTopic.upsert({
                where: {
                  researcherId_topicId: {
                    researcherId: researcher.id,
                    topicId: record.id,
                  },
                },
                update: {
                  worksCount: topic.worksCount,
                  rank: topic.rank,
                },
                create: {
                  researcherId: researcher.id,
                  topicId: record.id,
                  worksCount: topic.worksCount,
                  rank: topic.rank,
                },
              });
            }

            const validTopicIds = topicRows.map(({ record }) => record.id);
            await this.prisma.researcherTopic.deleteMany({
              where: {
                researcherId: researcher.id,
                ...(validTopicIds.length
                  ? { topicId: { notIn: validTopicIds } }
                  : {}),
              },
            });
            return topicRows.length;
          });
          writeQueue = writeOperation.then(
            () => undefined,
            () => undefined,
          );
          return writeOperation;
        }),
      );

      results.forEach((result, resultIndex) => {
        if (result.status === "fulfilled") {
          totalImported++;
          this.logger.debug(
            `Researcher topics: ${batch[resultIndex].name} linked to ${result.value} OpenAlex topic(s)`,
          );
        } else {
          failed++;
          failures.push(
            `${batch[resultIndex].name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
          );
        }
      });

      if ((index + batch.length) % 100 === 0) {
        this.logger.log(
          `Researcher topics: ${index + batch.length}/${researchers.length} checked, ${totalImported} synced, ${failed} failed`,
        );
      }
    }

    if (failures.length) {
      this.logger.error(
        `Researcher topic sync completed with ${failed} failure(s): ${failures.slice(0, 10).join(" | ")}`,
      );
    }
    return {
      totalFetched: researchers.length,
      totalImported,
      failed,
      status: failed ? "FAILED" : "COMPLETED",
    };
  }

  private parseResearcherWorkCheckpoint(
    value: string | null,
  ): ResearcherWorkCheckpoint {
    const initial: ResearcherWorkCheckpoint = {
      lastCompletedResearcherId: null,
      activeResearcherId: null,
      worksCursor: "*",
    };
    if (!value || value === "*") return initial;
    try {
      const parsed = JSON.parse(value) as Partial<ResearcherWorkCheckpoint>;
      return {
        lastCompletedResearcherId:
          typeof parsed.lastCompletedResearcherId === "string"
            ? parsed.lastCompletedResearcherId
            : null,
        activeResearcherId:
          typeof parsed.activeResearcherId === "string"
            ? parsed.activeResearcherId
            : null,
        worksCursor:
          typeof parsed.worksCursor === "string" && parsed.worksCursor
            ? parsed.worksCursor
            : "*",
      };
    } catch {
      return initial;
    }
  }

  private async resolveAndLinkResearcherAuthor(
    researcher: ResearcherIdentity,
  ): Promise<OpenAlexAuthorEntityRaw | null> {
    const institutionId =
      this.config.get<string>("UIUC_OPENALEX_INSTITUTION_ID") ||
      process.env.UIUC_OPENALEX_INSTITUTION_ID ||
      "I157725225";
    const knownOpenAlexId =
      researcher.author?.openalexId || researcher.openalexId || undefined;
    let raw: OpenAlexAuthorEntityRaw | null = null;

    if (knownOpenAlexId) {
      try {
        raw = await this.client.getAuthor(knownOpenAlexId);
        const storedPrimaryScore = raw.display_name
          ? this.personNameScore(researcher.name, raw.display_name)
          : 0;
        const storedWorksCount = raw.works_count || 0;
        const mayBeFragmentedAuthor = storedWorksCount <= 10;
        // A previously linked author with a strong name match is already a
        // trusted identity. Re-running paid Author Search for every harmless
        // middle-name or initial variation burns the daily OpenAlex budget
        // without improving the link. Search again only for a genuinely weak
        // match or a suspiciously small OpenAlex author fragment.
        if (storedPrimaryScore < 75 || mayBeFragmentedAuthor) {
          const searched = await this.searchOpenAlexAuthor(
            researcher,
            institutionId,
          );
          const searchedPrimaryScore = searched?.display_name
            ? this.personNameScore(researcher.name, searched.display_name)
            : 0;
          const searchedWorksCount = searched?.works_count || 0;
          const shouldReplaceStoredAuthor =
            searched &&
            (searchedPrimaryScore > storedPrimaryScore ||
              (mayBeFragmentedAuthor &&
                searchedPrimaryScore === storedPrimaryScore &&
                searchedWorksCount > storedWorksCount));
          if (shouldReplaceStoredAuthor) {
            this.logger.warn(
              `Replaced stored OpenAlex author ${raw.id} (${storedWorksCount} works) for ${researcher.name} with ${searched.id} (${searchedWorksCount} works)`,
            );
            raw = searched;
          } else if (storedPrimaryScore < 75) {
            raw = searched;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("404")) throw error;
        this.logger.warn(
          `Stored OpenAlex author ID is invalid for ${researcher.name}; searching again`,
        );
      }
    }
    raw ||= await this.searchOpenAlexAuthor(researcher, institutionId);
    if (!raw) return null;

    const normalizedKnownOpenAlexId = knownOpenAlexId?.replace(
      "https://openalex.org/",
      "",
    );
    const normalizedResolvedOpenAlexId = raw.id.replace(
      "https://openalex.org/",
      "",
    );
    if (normalizedResolvedOpenAlexId !== normalizedKnownOpenAlexId) {
      // Search responses are sufficient for identity ranking, but the
      // singleton is the canonical source for the latest author-level counts.
      raw = await this.client.getAuthor(raw.id);
    }

    const authorId = await this.upsertOpenAlexAuthor(raw);
    const conflictingResearcher = await this.prisma.researcher.findFirst({
      where: { authorId, id: { not: researcher.id } },
      select: { id: true, name: true },
    });
    if (conflictingResearcher) {
      this.logger.warn(
        `OpenAlex author ${raw.id} is already linked to ${conflictingResearcher.name}; skipped ${researcher.name}`,
      );
      return null;
    }

    const normalized = mapOpenAlexAuthor(raw);
    await this.prisma.researcher.update({
      where: { id: researcher.id },
      data: {
        authorId,
        openalexId: raw.id,
        profileUrl: researcher.profileUrl || normalized.profileUrl,
        worksCount: normalized.worksCount,
        citedByCount: normalized.citedByCount,
      },
    });
    await this.linkAuthorToUiuc(authorId);
    return raw;
  }

  async runResearcherPaperBackfill(
    params: {
      researcherId?: string;
      researcherIds?: string[];
      perPage?: number;
      maxResearchers?: number;
      resume?: boolean;
      trustLinkedIdentity?: boolean;
    } = {},
  ): Promise<
    ImportResult & { researchersProcessed: number; unresolved: number }
  > {
    const selectedResearcherIds = params.researcherIds?.length
      ? [...new Set(params.researcherIds)].sort()
      : params.researcherId
        ? [params.researcherId]
        : [];
    const source = selectedResearcherIds.length
      ? `openalex_researcher_works:${createHash("sha256").update(selectedResearcherIds.join(",")).digest("hex").slice(0, 16)}`
      : "openalex_researcher_works";
    const run = await this.createRun(source, params.resume !== false);
    const checkpoint = this.parseResearcherWorkCheckpoint(run.cursor);
    const perPage = Math.min(
      this.positiveInt(
        params.perPage ||
          this.config.get("RESEARCHER_PAPER_IMPORT_BATCH_SIZE") ||
          process.env.RESEARCHER_PAPER_IMPORT_BATCH_SIZE,
        100,
      ),
      100,
    );
    const maxResearchers = params.maxResearchers
      ? this.positiveInt(params.maxResearchers, Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
    const persistConcurrency = Math.min(
      this.positiveInt(
        this.config.get("RESEARCHER_PAPER_PERSIST_CONCURRENCY") ||
          process.env.RESEARCHER_PAPER_PERSIST_CONCURRENCY,
        8,
      ),
      20,
    );
    const researchers = await this.prisma.researcher.findMany({
      // A paper scan requires a verified OpenAlex identity. Global backfills
      // deliberately skip unresolved researchers instead of spending author
      // search quota or risking a guessed identity; they can be linked by the
      // dedicated researcher-author job first.
      where: selectedResearcherIds.length
        ? { id: { in: selectedResearcherIds } }
        : { authorId: { not: null } },
      orderBy: { id: "asc" },
      select: {
        id: true,
        authorId: true,
        name: true,
        email: true,
        openalexId: true,
        profileUrl: true,
        department: true,
        keywords: { select: { keyword: true } },
        author: { select: { openalexId: true } },
      },
    });
    if (selectedResearcherIds.length && !researchers.length) {
      const message = `None of the selected researchers were found`;
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
        },
      });
      return {
        totalFetched: 0,
        totalImported: 0,
        researchersProcessed: 0,
        unresolved: 1,
        status: "FAILED",
      };
    }

    let startIndex = 0;
    if (checkpoint.activeResearcherId) {
      const activeIndex = researchers.findIndex(
        ({ id }) => id === checkpoint.activeResearcherId,
      );
      if (activeIndex >= 0) startIndex = activeIndex;
    } else if (checkpoint.lastCompletedResearcherId) {
      const nextIndex = researchers.findIndex(
        ({ id }) => id > checkpoint.lastCompletedResearcherId!,
      );
      startIndex = nextIndex >= 0 ? nextIndex : researchers.length;
    }

    let totalFetched = run.totalFetched;
    let totalImported = run.importedCount;
    let researchersProcessed = 0;
    const unresolved: string[] = [];
    this.logger.log(
      `Backfilling all OpenAlex papers for ${Math.min(researchers.length - startIndex, maxResearchers)} researcher(s), ${perPage} works per page`,
    );

    try {
      for (
        let index = startIndex;
        index < researchers.length && researchersProcessed < maxResearchers;
        index++
      ) {
        const researcher = researchers[index];
        const resumingActive = checkpoint.activeResearcherId === researcher.id;
        checkpoint.activeResearcherId = researcher.id;
        if (!resumingActive) checkpoint.worksCursor = "*";
        await this.prisma.importRun.update({
          where: { id: run.id },
          data: { cursor: JSON.stringify(checkpoint) },
        });

        let openAlexAuthor: OpenAlexAuthorEntityRaw | null = null;
        let linkedAuthorId: string | null = researcher.authorId;
        if (researcher.author?.openalexId && linkedAuthorId) {
          openAlexAuthor = await this.client.getAuthor(
            researcher.author.openalexId,
          );
          const primaryNameScore = openAlexAuthor.display_name
            ? this.personNameScore(researcher.name, openAlexAuthor.display_name)
            : 0;
          if (primaryNameScore < 75 && !params.trustLinkedIdentity) {
            this.logger.warn(
              `Existing author link for ${researcher.name} is not safe enough for paper sync (${openAlexAuthor.display_name || openAlexAuthor.id}); skipped without changing author_id`,
            );
            openAlexAuthor = null;
          }
        } else if (selectedResearcherIds.length === 1) {
          // An explicitly targeted run may resolve a missing identity. Global
          // paper backfills never change researcher-author ownership.
          openAlexAuthor =
            await this.resolveAndLinkResearcherAuthor(researcher);
          linkedAuthorId = openAlexAuthor
            ? this.authorCache.get(openAlexAuthor.id) || null
            : null;
        }
        if (!openAlexAuthor) {
          unresolved.push(`${researcher.id}:${researcher.name}`);
          checkpoint.lastCompletedResearcherId = researcher.id;
          checkpoint.activeResearcherId = null;
          checkpoint.worksCursor = "*";
          researchersProcessed++;
          await this.prisma.importRun.update({
            where: { id: run.id },
            data: { cursor: JSON.stringify(checkpoint) },
          });
          this.logger.warn(
            `No unique OpenAlex author match for ${researcher.name}; skipped without guessing`,
          );
          continue;
        }

        if (!linkedAuthorId) {
          throw new Error(
            `Local author link was not created for ${researcher.name}`,
          );
        }
        let worksCursor = checkpoint.worksCursor || "*";
        const isFullScan = worksCursor === "*";
        let researcherPaperCount = 0;
        let expectedWorks: number | null = null;
        const fetchedOpenAlexIds = new Set<string>();
        while (worksCursor) {
          const response = await this.client.getWorks({
            authorId: openAlexAuthor.id,
            institutionId: null,
            cursor: worksCursor,
            perPage,
          });
          expectedWorks ??= response.meta.count;
          if (!response.results.length) break;

          for (const work of response.results) {
            fetchedOpenAlexIds.add(work.id);
          }

          await this.persistWorkPage(
            response.results,
            persistConcurrency,
            linkedAuthorId,
          );
          totalImported += response.results.length;
          researcherPaperCount += response.results.length;
          totalFetched += response.results.length;
          const nextCursor = response.meta.next_cursor || "";
          if (nextCursor && nextCursor === worksCursor) {
            throw new Error(
              `OpenAlex returned a repeated works cursor for ${researcher.name}`,
            );
          }
          worksCursor = nextCursor;
          checkpoint.worksCursor = worksCursor;
          await this.prisma.importRun.update({
            where: { id: run.id },
            data: {
              cursor: JSON.stringify(checkpoint),
              totalFetched,
              importedCount: totalImported,
            },
          });
        }

        if (isFullScan) {
          const currentOpenAlexIds = [...fetchedOpenAlexIds];
          const removed = await this.prisma.paperAuthor.deleteMany({
            where: {
              authorId: linkedAuthorId,
              ...(currentOpenAlexIds.length
                ? {
                    paper: {
                      openalexId: { notIn: currentOpenAlexIds },
                    },
                  }
                : {}),
            },
          });
          if (removed.count > 0) {
            this.logger.log(
              `Removed ${removed.count} stale paper relation(s) for ${researcher.name}`,
            );
          }
        }

        const linkedPaperCount = await this.prisma.paperAuthor.count({
          where: { authorId: linkedAuthorId },
        });
        if (expectedWorks !== null && linkedPaperCount !== expectedWorks) {
          throw new Error(
            `Incomplete paper sync for ${researcher.name}: ${linkedPaperCount}/${expectedWorks} linked papers after the final cursor`,
          );
        }

        const canonicalAuthor = mapOpenAlexAuthor(openAlexAuthor);
        await this.prisma.researcher.update({
          where: { id: researcher.id },
          data: {
            openalexId: canonicalAuthor.openalexId,
            authorId: linkedAuthorId,
            // The works endpoint count is verified against the persisted join
            // table after the final cursor and can be fresher than the Author
            // search document immediately after an OpenAlex author merge.
            worksCount: expectedWorks ?? linkedPaperCount,
            citedByCount: canonicalAuthor.citedByCount,
          },
        });

        checkpoint.lastCompletedResearcherId = researcher.id;
        checkpoint.activeResearcherId = null;
        checkpoint.worksCursor = "*";
        researchersProcessed++;
        await this.prisma.importRun.update({
          where: { id: run.id },
          data: {
            cursor: JSON.stringify(checkpoint),
            totalFetched,
            importedCount: totalImported,
          },
        });
        this.logger.log(
          `Researcher papers ${researchersProcessed}/${Math.min(researchers.length - startIndex, maxResearchers)}: ${researcher.name} (${researcherPaperCount} fetched, ${linkedPaperCount}/${expectedWorks ?? "unknown"} linked)`,
        );
      }

      const warning = unresolved.length
        ? `${unresolved.length} researcher(s) could not be matched safely: ${unresolved.slice(0, 20).join(" | ")}`
        : null;
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          cursor: JSON.stringify(checkpoint),
          totalFetched,
          importedCount: totalImported,
          errorMessage: warning,
        },
      });
      if (warning) this.logger.warn(warning);
      return {
        totalFetched,
        totalImported,
        researchersProcessed,
        unresolved: unresolved.length,
        status: "COMPLETED",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          errorMessage: message,
          completedAt: new Date(),
          cursor: JSON.stringify(checkpoint),
          totalFetched,
          importedCount: totalImported,
        },
      });
      this.logger.error(
        `Researcher paper backfill failed after ${researchersProcessed} researcher(s): ${message}`,
      );
      return {
        totalFetched,
        totalImported,
        researchersProcessed,
        unresolved: unresolved.length,
        status: "FAILED",
      };
    }
  }

  async backfillResearcherDepartments(): Promise<ImportResult> {
    const researchers = await this.prisma.researcher.findMany({
      where: { department: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        keywords: { select: { keyword: true } },
      },
    });
    let totalImported = 0;

    try {
      for (let index = 0; index < researchers.length; index += 100) {
        const batch = researchers.slice(index, index + 100);
        const updates = batch.flatMap((researcher) => {
          const department = inferResearcherDepartment(
            researcher.title,
            researcher.keywords.map(({ keyword }) => keyword),
          );
          return department
            ? [
                this.prisma.researcher.update({
                  where: { id: researcher.id },
                  data: { department },
                }),
              ]
            : [];
        });
        if (updates.length) {
          await this.prisma.$transaction(updates);
          totalImported += updates.length;
        }
        this.logger.log(
          `Researcher department backfill: ${Math.min(index + batch.length, researchers.length)}/${researchers.length}`,
        );
      }

      return {
        totalFetched: researchers.length,
        totalImported,
        status: "COMPLETED",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Researcher department backfill failed: ${message}`);
      return {
        totalFetched: researchers.length,
        totalImported,
        status: "FAILED",
      };
    }
  }
}
