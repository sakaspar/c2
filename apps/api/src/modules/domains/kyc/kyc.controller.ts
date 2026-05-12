import { Body, Controller, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { RejectKycDto, SubmitKycDto } from './dto';

@ApiTags('kyc')
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}
  @Post(':userId/submit') submit(@Param('userId') userId: string, @Body() dto: SubmitKycDto) { return this.kyc.submit(userId, dto); }
  @Patch('applications/:applicationId/approve') approve(@Param('applicationId') applicationId: string) { return this.kyc.approve(applicationId); }
  @Patch('applications/:applicationId/reject') reject(@Param('applicationId') applicationId: string, @Body() dto: RejectKycDto) { return this.kyc.reject(applicationId, dto.reason); }

  @Post(':userId/upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('userId') userId: string, @UploadedFile() file: any, @Body() body: any) {
    return this.kyc.uploadDocument(userId, body?.type, file);
  }
}
