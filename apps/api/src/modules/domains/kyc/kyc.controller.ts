import { Body, Controller, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { RejectKycDto, SubmitKycDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OwnershipGuard } from '../auth/guards/ownership.guard';

@ApiTags('kyc')
@Controller('kyc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KycController {
  constructor(private readonly kyc: KycService) {}
  @Post(':userId/submit') @UseGuards(OwnershipGuard) submit(@Param('userId') userId: string, @Body() dto: SubmitKycDto) { return this.kyc.submit(userId, dto); }
  @Patch('applications/:applicationId/approve') @Roles('admin') approve(@Param('applicationId') applicationId: string) { return this.kyc.approve(applicationId); }
  @Patch('applications/:applicationId/reject') @Roles('admin') reject(@Param('applicationId') applicationId: string, @Body() dto: RejectKycDto) { return this.kyc.reject(applicationId, dto.reason); }

  @Post(':userId/upload')
  @UseGuards(OwnershipGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(@Param('userId') userId: string, @UploadedFile() file: { originalname: string; buffer: Buffer; mimetype: string } | undefined, @Body() body: any) {
    return this.kyc.uploadDocument(userId, body?.type, file);
  }
}
