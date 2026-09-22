import { Module } from "@nestjs/common";
import { InstitutionController } from "./institution.controller";
import { InstitutionService } from "./institution.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [InstitutionController],
  providers: [InstitutionService],
  exports: [InstitutionService],
})
export class InstitutionModule {}
