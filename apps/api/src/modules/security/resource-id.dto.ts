import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class ResourceIdParam {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  id!: string;
}
