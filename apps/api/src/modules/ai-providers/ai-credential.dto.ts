import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from "class-validator";

const PROVIDERS = ["OPENAI", "GEMINI", "OPENAI_COMPATIBLE"] as const;

export class CreateAiCredentialRequest {
  @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsIn(PROVIDERS) provider!: (typeof PROVIDERS)[number];
  @IsString() @MinLength(8) @MaxLength(2_048) apiKey!: string;
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2_048)
  baseUrl?: string;
  @IsString() @IsNotEmpty() @MaxLength(200) defaultModel!: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateAiCredentialRequest {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(2_048) apiKey?: string;
  @IsOptional() @IsUrl({ require_tld: false }) @MaxLength(2_048) baseUrl?:
    | string
    | null;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) defaultModel?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
