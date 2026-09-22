import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ResearchersService } from "./researchers.service";
import { PaginatedResult, ResearcherDto } from "@repo/contracts";

@ApiTags("Researchers")
@Controller("v1/researchers")
export class ResearchersController {
  constructor(private readonly researchersService: ResearchersService) {}

  @Get()
  @ApiOperation({ summary: "Search and paginate UIUC faculty researchers" })
  @ApiQuery({ name: "query", required: false, type: String })
  @ApiQuery({ name: "department", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(
    @Query("query") query?: string,
    @Query("department") department?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ): Promise<PaginatedResult<ResearcherDto>> {
    return this.researchersService.findAll({ query, department, page, limit });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get researcher profile by ID" })
  async findById(@Param("id") id: string): Promise<ResearcherDto> {
    return this.researchersService.findById(id);
  }
}
