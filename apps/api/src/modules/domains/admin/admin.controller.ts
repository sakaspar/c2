import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { KycApplicationRecord, LoanRecord, MerchantRecord, UserRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly storage: JsonDataLakeService) {}

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
}
