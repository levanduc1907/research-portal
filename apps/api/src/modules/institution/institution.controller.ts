import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InstitutionService } from "./institution.service";
import { InstitutionDto } from "@repo/contracts";

@ApiTags("Institution")
@Controller("v1/institution")
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Get()
  @ApiOperation({ summary: "Get UIUC institution details and overall metrics" })
  async getInstitution(): Promise<InstitutionDto> {
    return this.institutionService.getInstitution();
  }
}
