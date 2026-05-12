import { IsNumber, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @IsString() userId!: string;
  @IsString() merchantId!: string;
  @IsNumber() @Min(10) amount!: number;
}

export class RepayLoanDto {
  @IsNumber() @Min(1) amount!: number;
}

export class CheckoutProductDto {
  @IsString() userId!: string;
  @IsString() productId!: string;
}
