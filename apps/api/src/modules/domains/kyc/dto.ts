import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentStatus, KycDocumentType } from '@bnpl/shared';

export class KycDocumentDto {
  @IsIn(['cin_front', 'cin_back', 'selfie', 'proof_of_address', 'bank_statement_month_1', 'bank_statement_month_2', 'bank_statement_month_3'])
  type!: KycDocumentType;

  @IsString()
  fileName!: string;

  @IsString()
  storagePath!: string;
}

export class SubmitKycDto {
  @IsIn(['employed', 'unemployed'])
  employmentStatus!: EmploymentStatus;

  @IsOptional()
  @IsString()
  employerName?: string;

  @IsOptional()
  @IsNumber()
  monthlyIncomeTnd?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KycDocumentDto)
  documents!: KycDocumentDto[];
}

export class RejectKycDto {
  @IsString()
  reason!: string;
}
