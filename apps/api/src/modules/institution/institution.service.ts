import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { InstitutionDto } from "@repo/contracts";

const FALLBACK_INSTITUTION: InstitutionDto = {
  id: "uiuc-default",
  openalexId: "https://openalex.org/I157725225",
  displayName: "University of Illinois Urbana-Champaign",
  acronym: "UIUC",
  ror: "https://ror.org/047426m28",
  countryCode: "US",
  type: "education",
  homepageUrl: "https://illinois.edu",
  imageUrl:
    "https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/University%20of%20Illinois%20at%20Urbana%E2%80%93Champaign%20logo.svg&width=300",
  worksCount: 339538,
  citedByCount: 33098116,
  hIndex: 1413,
  i10Index: 385078,
  twoYearMeanCite: 3.769,
  geo: {
    city: "Urbana",
    region: "Illinois",
    country: "United States",
    latitude: 40.11059,
    longitude: -88.20727,
  },
};

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async getInstitution(): Promise<InstitutionDto> {
    try {
      const record = await this.prisma.institution.findFirst({
        where: {
          openalexId: {
            contains: "I157725225",
          },
        },
      });

      if (!record) {
        return FALLBACK_INSTITUTION;
      }

      return {
        id: record.id,
        openalexId: record.openalexId,
        displayName: record.displayName,
        acronym: record.acronym,
        ror: record.ror,
        countryCode: record.countryCode,
        type: record.type,
        homepageUrl: record.homepageUrl,
        imageUrl: record.imageUrl,
        worksCount: record.worksCount,
        citedByCount: record.citedByCount,
        hIndex: record.hIndex,
        i10Index: record.i10Index,
        twoYearMeanCite: record.twoYearMeanCite,
        geo: (record.geo as any) || FALLBACK_INSTITUTION.geo,
      };
    } catch {
      return FALLBACK_INSTITUTION;
    }
  }
}
