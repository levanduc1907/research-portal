import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { PapersService } from "./papers.service";
import { PaginatedResult, PaperDto, PaperListQueryDto } from "@repo/contracts";

@ApiTags("Papers")
@Controller("v1/papers")
export class PapersController {
  constructor(private readonly papersService: PapersService) {}

  @Get()
  @ApiOperation({ summary: "Search, filter, sort and paginate UIUC papers" })
  @ApiQuery({ name: "query", required: false, type: String })
  @ApiQuery({ name: "topic", required: false, type: String })
  @ApiQuery({ name: "year", required: false, type: Number })
  @ApiQuery({ name: "sort", required: false, enum: ["citations", "date"] })
  @ApiQuery({ name: "order", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(@Query() query: PaperListQueryDto): Promise<PaginatedResult<PaperDto>> {
    return this.papersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get detailed paper metadata by ID or OpenAlex ID" })
  async findById(@Param("id") id: string): Promise<PaperDto> {
    return this.papersService.findById(id);
  }
}
