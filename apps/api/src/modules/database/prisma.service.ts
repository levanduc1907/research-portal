import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@repo/database";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  public readonly client: PrismaClient = this;

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Connected to MySQL database successfully");
    } catch (err: any) {
      this.logger.warn(
        `Database connection postponed (MySQL offline or starting): ${err?.message || err}`
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // ignore
    }
  }
}
