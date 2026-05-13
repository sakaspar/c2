import { Body, Controller, Get, NotFoundException, Param, Patch, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { KybApplicationRecord, KycApplicationRecord, LoanRecord, MerchantRecord, UserRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { KycService } from '../kyc/kyc.service';
import { MerchantsService } from '../merchants/merchants.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly storage: JsonDataLakeService,
    private readonly kyc: KycService,
    private readonly merchants: MerchantsService
  ) {}

  @Get('analytics')
  async analytics() {
    const [users, loans, merchants] = await Promise.all([
      this.storage.query<UserRecord>('users', { pageSize: 100 }),
      this.storage.query<LoanRecord>('loans', { pageSize: 100 }),
      this.storage.query<MerchantRecord>('merchants', { pageSize: 100 })
    ]);
    const issued = loans.items.reduce((sum, loan) => sum + loan.principal.amount, 0);
    const outstanding = loans.items.reduce((sum, loan) => sum + loan.outstanding.amount, 0);
    const paid = loans.items.filter((loan) => loan.state === 'paid').length;
    return {
      activeUsers: users.items.filter((user) => user.state === 'active').length,
      totalUsers: users.total,
      totalMerchants: merchants.total,
      approvedMerchants: merchants.items.filter((merchant) => merchant.state === 'approved').length,
      totalIssuedLoansTnd: issued,
      outstandingExposureTnd: outstanding,
      repaymentRate: loans.total ? Math.round((paid / loans.total) * 100) : 0,
      defaultRate: loans.total ? Math.round((loans.items.filter((loan) => loan.state === 'defaulted').length / loans.total) * 100) : 0
    };
  }

  @Get('clients')
  async clients() {
    const [users, directories] = await Promise.all([
      this.storage.query<UserRecord>('users', { pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' }),
      this.storage.listClientProfiles()
    ]);
    return { ...users, directories };
  }

  @Get('kyc-applications')
  kycApplications() {
    return this.storage.query<KycApplicationRecord>('kyc_cases', { pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' });
  }

  @Patch('kyc-applications/:applicationId/approve')
  approveKyc(@Param('applicationId') applicationId: string) {
    return this.kyc.approve(applicationId);
  }

  @Patch('kyc-applications/:applicationId/reject')
  rejectKyc(@Param('applicationId') applicationId: string, @Body('reason') reason: string) {
    return this.kyc.reject(applicationId, reason);
  }

  @Get('kyb-applications')
  kybApplications() {
    return this.storage.query<KybApplicationRecord>('kyb_cases', { pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' });
  }

  @Patch('kyb-applications/:applicationId/approve')
  approveKyb(@Param('applicationId') applicationId: string) {
    return this.merchants.approveKyb(applicationId);
  }

  @Patch('kyb-applications/:applicationId/reject')
  rejectKyb(@Param('applicationId') applicationId: string, @Body('reason') reason: string) {
    return this.merchants.rejectKyb(applicationId, reason);
  }

  @Get('kyb-documents/*')
  kybDocument(@Param('0') filePath: string, @Res({ passthrough: true }) res: Response) {
    const path = this.storage.resolveFilePath(filePath);
    if (!path) throw new NotFoundException('Document not found');
    const fileName = filePath.split('/').pop() ?? '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.set({ 'Content-Type': mime, 'Cache-Control': 'max-age=3600', 'Cross-Origin-Resource-Policy': 'cross-origin', 'Access-Control-Allow-Origin': '*' });
    return new StreamableFile(this.storage.getFileStream(path));
  }

  @Get('kyc-documents/*')
  kycDocument(@Param('0') filePath: string, @Res({ passthrough: true }) res: Response) {
    const path = this.storage.resolveFilePath(filePath);
    if (!path) throw new NotFoundException('Document not found');
    const fileName = filePath.split('/').pop() ?? '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mime = ext === 'pdf' ? 'application/pdf' : ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream';
    res.set({ 'Content-Type': mime, 'Cache-Control': 'max-age=3600', 'Cross-Origin-Resource-Policy': 'cross-origin', 'Access-Control-Allow-Origin': '*' });
    return new StreamableFile(this.storage.getFileStream(path));
  }
}
