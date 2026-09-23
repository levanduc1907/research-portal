import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { PaginatedResult, ResearcherDto } from "@repo/contracts";

const FALLBACK_RESEARCHERS: ResearcherDto[] = [
  {
    id: "r-1",
    openalexId: "https://openalex.org/A5012345671",
    name: "Dr. Jiawei Han",
    email: "hanj@illinois.edu",
    department: "Computer Science",
    title: "Michael Aiken Chair Professor",
    bio: "World-renowned pioneer in data mining, text mining, and information network analysis.",
    profileUrl:
      "https://siebelschool.illinois.edu/about/people/all-faculty/hanj",
    photoUrl: null,
    worksCount: 950,
    citedByCount: 198000,
    keywords: [
      "Data Mining",
      "Text Mining",
      "Information Networks",
      "LLM Extraction",
      "Knowledge Graphs",
    ],
  },
  {
    id: "r-2",
    openalexId: "https://openalex.org/A5012345672",
    name: "Dr. Sarita Adve",
    email: "sadve@illinois.edu",
    department: "Computer Science",
    title: "Richard T. Cheng Professor",
    bio: "Pioneering computer architect leading Illinois XR and memory consistency models research.",
    profileUrl:
      "https://siebelschool.illinois.edu/about/people/all-faculty/sadve",
    photoUrl: null,
    worksCount: 220,
    citedByCount: 24000,
    keywords: [
      "Computer Architecture",
      "Memory Consistency",
      "Extended Reality (XR)",
      "Parallel Computing",
    ],
  },
  {
    id: "r-3",
    openalexId: "https://openalex.org/A5012345673",
    name: "Dr. Marc Snir",
    email: "snir@illinois.edu",
    department: "Computer Science",
    title: "Professor Emeritus",
    bio: "Key contributor to the Message Passing Interface (MPI) standard and scalable supercomputing architecture.",
    profileUrl:
      "https://siebelschool.illinois.edu/about/people/all-faculty/snir",
    photoUrl: null,
    worksCount: 310,
    citedByCount: 29000,
    keywords: [
      "High Performance Computing",
      "MPI",
      "Supercomputing",
      "Parallel Algorithms",
    ],
  },
  {
    id: "r-4",
    openalexId: "https://openalex.org/A5012345674",
    name: "Dr. Nancy M. Amato",
    email: "namato@illinois.edu",
    department: "Computer Science",
    title: "Abel Bliss Professor & Department Head",
    bio: "Leading researcher in motion planning, robotics, computational biology, and parallel computing.",
    profileUrl:
      "https://siebelschool.illinois.edu/about/people/all-faculty/namato",
    photoUrl: null,
    worksCount: 380,
    citedByCount: 21500,
    keywords: [
      "Robotics",
      "Motion Planning",
      "Computational Biology",
      "Parallel Algorithms",
    ],
  },
  {
    id: "r-5",
    openalexId: "https://openalex.org/A5012345675",
    name: "Dr. Stephen Long",
    email: "slong@illinois.edu",
    department: "Crop Sciences & Plant Biology",
    title: "Ikenberry Endowed Chair",
    bio: "Pioneering research in improving crop photosynthetic efficiency for global food and bioenergy security.",
    profileUrl: "https://cropsciences.illinois.edu/directory/profile/slong",
    photoUrl: null,
    worksCount: 460,
    citedByCount: 45000,
    keywords: [
      "Photosynthesis",
      "Crop Yield",
      "Climate Change Mitigation",
      "Bioenergy Crops",
    ],
  },
];

@Injectable()
export class ResearchersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    query?: string;
    department?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<ResearcherDto>> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 12));
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (params.query) {
        where.OR = [
          { name: { contains: params.query } },
          { bio: { contains: params.query } },
          {
            keywords: {
              some: { keyword: { contains: params.query } },
            },
          },
        ];
      }

      if (params.department) {
        where.department = params.department;
      }

      const [total, records] = await Promise.all([
        this.prisma.researcher.count({ where }),
        this.prisma.researcher.findMany({
          where,
          skip,
          take: limit,
          orderBy: { citedByCount: "desc" },
          include: { keywords: true, author: true },
        }),
      ]);

      if (total === 0 && !params.query && !params.department) {
        return this.filterFallback(params, page, limit);
      }

      const data: ResearcherDto[] = records.map((r) => ({
        id: r.id,
        openalexId: r.author?.openalexId ?? r.openalexId,
        name: r.name,
        email: r.email,
        department: r.department,
        title: r.title,
        bio: r.bio,
        profileUrl: r.profileUrl,
        photoUrl: r.photoUrl,
        worksCount: r.worksCount,
        citedByCount: r.citedByCount,
        keywords: r.keywords.map((k) => k.keyword),
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch {
      return this.filterFallback(params, page, limit);
    }
  }

  async findDepartments(): Promise<string[]> {
    const records = await this.prisma.researcher.findMany({
      where: { department: { not: null } },
      distinct: ["department"],
      select: { department: true },
      orderBy: { department: "asc" },
    });

    return records
      .map((record) => record.department?.trim())
      .filter((department): department is string => Boolean(department));
  }

  async findById(id: string): Promise<ResearcherDto> {
    try {
      const record = await this.prisma.researcher.findUnique({
        where: { id },
        include: { keywords: true, author: true },
      });

      if (!record) {
        const fallback = FALLBACK_RESEARCHERS.find((r) => r.id === id);
        if (fallback) return fallback;
        throw new NotFoundException(`Researcher ${id} not found`);
      }

      return {
        id: record.id,
        openalexId: record.author?.openalexId ?? record.openalexId,
        name: record.name,
        email: record.email,
        department: record.department,
        title: record.title,
        bio: record.bio,
        profileUrl: record.profileUrl,
        photoUrl: record.photoUrl,
        worksCount: record.worksCount,
        citedByCount: record.citedByCount,
        keywords: record.keywords.map((k) => k.keyword),
      };
    } catch (e: any) {
      if (e instanceof NotFoundException) throw e;
      const fallback = FALLBACK_RESEARCHERS.find((r) => r.id === id);
      if (fallback) return fallback;
      throw new NotFoundException(`Researcher ${id} not found`);
    }
  }

  private filterFallback(
    params: { query?: string; department?: string },
    page: number,
    limit: number,
  ): PaginatedResult<ResearcherDto> {
    let filtered = [...FALLBACK_RESEARCHERS];

    if (params.query) {
      const q = params.query.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.bio && r.bio.toLowerCase().includes(q)) ||
          r.keywords.some((k) => k.toLowerCase().includes(q)),
      );
    }

    if (params.department) {
      const d = params.department.toLowerCase();
      filtered = filtered.filter(
        (r) => r.department && r.department.toLowerCase().includes(d),
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
