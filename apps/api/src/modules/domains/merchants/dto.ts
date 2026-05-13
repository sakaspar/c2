import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMerchantDto {
  @IsString() legalName!: string;
  @IsString() displayName!: string;
  @IsString() category!: string;
  @IsOptional() @IsString() settlementIban?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
}

export class GoogleMerchantLoginDto {
  @IsString() idToken!: string;
}

export class UpdateMerchantDto {
  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() settlementIban?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
}

export class KybDocumentDto {
  @IsString() type!: string;
  @IsString() fileName!: string;
  @IsOptional() @IsString() storagePath?: string;
}

export class SubmitKybDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => KybDocumentDto) documents!: KybDocumentDto[];
}

export class CreateProductDto {
  @IsString() merchantId!: string;
  @IsString() name!: string;
  @IsString() description!: string;
  @IsNumber() @Min(10) price!: number;
  @IsNumber() @Min(0) stock!: number;
  @IsOptional() @IsString() imageUrl?: string;
}
