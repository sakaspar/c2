import { BadRequestException, Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { CreateMerchantDto, CreateProductDto, SubmitKybDto } from './dto';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('merchants')
@Controller('merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService) {}
  @Get() @Roles('admin') list() { return this.merchants.list(); }
  @Post('register') register(@Body() dto: CreateMerchantDto) { return this.merchants.register(dto); }
  @Post(':merchantId/kyb/upload') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadKybDocument(@Param('merchantId') merchantId: string, @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string } | undefined, @Body('type') type: string) {
    return this.merchants.uploadKybDocument(merchantId, type, file);
  }
  @Post(':merchantId/kyb/submit') submitKyb(@Param('merchantId') merchantId: string, @Body() dto: SubmitKybDto) { return this.merchants.submitKyb(merchantId, dto); }
  @Get('kyb-applications') @Roles('admin') kybApplications() { return this.merchants.kybApplications(); }
  @Patch('kyb-applications/:applicationId/approve') @Roles('admin') approveKyb(@Param('applicationId') id: string) { return this.merchants.approveKyb(id); }
  @Patch('kyb-applications/:applicationId/reject') @Roles('admin') rejectKyb(@Param('applicationId') id: string, @Body('reason') reason: string) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
    return this.merchants.rejectKyb(id, reason);
  }
  @Get('products') products() { return this.merchants.products(); }
  @Post('products') createProduct(@Body() dto: CreateProductDto) { return this.merchants.createProduct(dto); }
  @Patch(':id/approve') @Roles('admin') approve(@Param('id') id: string) { return this.merchants.approve(id); }
}
