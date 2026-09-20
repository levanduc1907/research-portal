import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../database/prisma.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Health check status" })
  async check() {
    let dbStatus = "ok";
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch (e: any) {
      dbStatus = `unreachable (${e?.message || "error"})`;
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "uiuc-research-api",
      database: dbStatus,
      uptime: process.uptime(),
    };
  }
}
