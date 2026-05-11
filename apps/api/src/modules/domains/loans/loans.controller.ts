import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateLoanDto, RepayLoanDto } from './dto';
import { LoansService } from './loans.service';

@ApiTags('loans')
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}
  @Get() list() { return this.loans.list(); }
  @Post() create(@Body() dto: CreateLoanDto) { return this.loans.create(dto); }
  @Post(':id/repay') repay(@Param('id') id: string, @Body() dto: RepayLoanDto) { return this.loans.repay(id, dto.amount); }
}
