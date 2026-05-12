import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMerchantDto {
  @IsString() legalName!: string;
  @IsString() displayName!: string;
  @IsString() category!: string;
}

export class CreateProductDto {
  @IsString() merchantId!: string;
  @IsString() name!: string;
  @IsString() description!: string;
  @IsNumber() @Min(10) price!: number;
  @IsNumber() @Min(0) stock!: number;
  @IsOptional() @IsString() imageUrl?: string;
}
