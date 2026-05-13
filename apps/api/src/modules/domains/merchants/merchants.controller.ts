import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { CreateMerchantDto, CreateProductDto, SubmitKybDto } from './dto';
import { MerchantsService } from './merchants.service';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('merchants')
@Controller('merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MerchantsController {
  constructor(private readonly merchants: MerchantsService, private readonly storage: JsonDataLakeService) {}
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

  @Post('products/:productId/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  uploadProductImage(@Param('productId') productId: string, @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string } | undefined) {
    return this.merchants.uploadProductImage(productId, file);
  }

  @Get('products/images/:productId/:fileName')
  async getProductImage(@Param('productId') productId: string, @Param('fileName') fileName: string, @Res({ passthrough: true }) res: any) {
    const path = this.storage.resolveFilePath(this.storage.entityDocumentPath('products', productId, 'images', fileName));
    if (!path) throw new NotFoundException('Image not found');
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    res.set({ 'Content-Type': mime, 'Cache-Control': 'max-age=86400' });
    return new StreamableFile(this.storage.getFileStream(path));
  }
}
