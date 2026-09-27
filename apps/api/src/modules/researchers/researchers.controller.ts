import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ResearchersService } from "./researchers.service";
import {
  PaginatedResult,
  ResearcherDto,
  ResearcherPaperDto,
} from "@repo/contracts";
import {
  DepartmentQuery,
  ResearcherPaperQuery,
  ResearcherQuery,
} from "./researcher-query.dto";
import { ResourceIdParam } from "../security/resource-id.dto";

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
    @Query() query: ResearcherQuery,
  ): Promise<PaginatedResult<ResearcherDto>> {
    return this.researchersService.findAll(query);
  }

  @Get("departments")
  @ApiOperation({
    summary: "List departments available for researcher filtering",
  })
  @ApiQuery({
    name: "query",
    required: false,
    type: String,
    description: "Filter departments by name",
  })
  async findDepartments(@Query() query: DepartmentQuery): Promise<string[]> {
    return this.researchersService.findDepartments(query.query);
  }

  @Get(":id/papers")
  @ApiOperation({
    summary: "List papers linked to a researcher or OpenAlex author",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findPapers(
    @Param() params: ResourceIdParam,
    @Query() query: ResearcherPaperQuery,
  ): Promise<PaginatedResult<ResearcherPaperDto>> {
    return this.researchersService.findPapers(params.id, query);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get researcher profile by researcher, author, or OpenAlex ID",
  })
  async findById(@Param() params: ResourceIdParam): Promise<ResearcherDto> {
    return this.researchersService.findById(params.id);
  }
}
