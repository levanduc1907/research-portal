import { Module } from "@nestjs/common";
import { ResearchersController } from "./researchers.controller";
import { ResearchersService } from "./researchers.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [ResearchersController],
  providers: [ResearchersService],
  exports: [ResearchersService],
})
export class ResearcherModule {}
