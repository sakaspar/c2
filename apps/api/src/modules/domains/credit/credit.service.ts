import { Injectable } from '@nestjs/common';
import { CreditScoreRecord, UserRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';

@Injectable()
export class CreditService {
  constructor(private readonly storage: JsonDataLakeService) {}

  async calculate(userId: string) {
    const user = await this.storage.findById<UserRecord>('users', userId);
    if (!user) throw new Error('User not found');
    const kyc = user.kycState === 'approved' ? 180 : user.kycState === 'submitted' ? 80 : 20;
    const fraudPenalty = user.riskFlags.length * -60;
    const base = 420 + kyc + fraudPenalty;
    const score = Math.max(250, Math.min(850, base));
    const amount = score >= 700 ? 1200 : score >= 620 ? 700 : score >= 520 ? 300 : 100;
    const record = await this.storage.create<CreditScoreRecord>('credit_scores', { userId, score, limit: { amount, currency: 'TND' }, factors: { kyc, fraudPenalty, base }, manualAdjustment: 0 });
    await this.storage.update<UserRecord>('users', userId, { creditLimit: record.limit, availableCredit: record.limit });
    return record;
  }
}
