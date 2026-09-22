import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import {
  AnalyticsStatsDto,
  PublicationYearTrendDto,
  TopicTrendDto,
} from "@repo/contracts";

@ApiTags("Analytics")
@Controller("v1")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get research summary metrics" })
  async getStats(): Promise<AnalyticsStatsDto> {
    return this.analyticsService.getStats();
  }

  @Get("trends")
  @ApiOperation({ summary: "Get publication and citation trends by year" })
  async getTrends(): Promise<PublicationYearTrendDto[]> {
    return this.analyticsService.getTrends();
  }

  @Get("topics")
  @ApiOperation({ summary: "Get top research topics breakdown" })
  async getTopics(): Promise<TopicTrendDto[]> {
    return this.analyticsService.getTopics();
  }
}
