import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../database/prisma.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Process liveness check" })
  live() {
    return {
      status: "ok",
      service: "uiuc-research-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("live")
  @ApiOperation({ summary: "Process liveness check" })
  liveness() {
    return this.live();
  }

  @Get("ready")
  @ApiOperation({ summary: "Dependency readiness check" })
  async readiness() {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException(
        "Service dependencies are not ready",
      );
    }

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "uiuc-research-api",
      database: "ok",
    };
  }
}
