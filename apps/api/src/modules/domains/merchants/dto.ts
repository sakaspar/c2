import { IsString } from 'class-validator';

export class CreateMerchantDto {
  @IsString() legalName!: string;
  @IsString() displayName!: string;
  @IsString() category!: string;
}
