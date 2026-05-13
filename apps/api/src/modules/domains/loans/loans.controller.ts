import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CheckoutProductDto, CreateLoanDto, RepayLoanDto } from './dto';
import { LoansService } from './loans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('loans')
@Controller('loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoansController {
  constructor(private readonly loans: LoansService) {}
  @Get() list() { return this.loans.list(); }
  @Post() create(@Body() dto: CreateLoanDto) { return this.loans.create(dto); }
  @Post('checkout') checkout(@Body() dto: CheckoutProductDto) { return this.loans.checkoutProduct(dto.userId, dto.productId); }
  @Post(':id/repay') repay(@Param('id') id: string, @Body() dto: RepayLoanDto) { return this.loans.repay(id, dto.amount); }
}
