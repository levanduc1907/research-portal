import { Module } from "@nestjs/common";
import { PapersController } from "./papers.controller";
import { PapersService } from "./papers.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [PapersController],
  providers: [PapersService],
  exports: [PapersService],
})
export class PaperModule {}
