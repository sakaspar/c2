import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateMerchantDto, CreateProductDto } from './dto';
import { MerchantsService } from './merchants.service';

@ApiTags('merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}
  @Get() list() { return this.merchants.list(); }
  @Post() create(@Body() dto: CreateMerchantDto) { return this.merchants.create(dto); }
  @Get('products') products() { return this.merchants.products(); }
  @Post('products') createProduct(@Body() dto: CreateProductDto) { return this.merchants.createProduct(dto); }
  @Patch(':id/approve') approve(@Param('id') id: string) { return this.merchants.approve(id); }
}
