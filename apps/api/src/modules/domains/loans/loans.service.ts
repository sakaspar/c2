import { Injectable } from '@nestjs/common';
import { Installment, LoanRecord, UserRecord } from '@bnpl/shared';
import { randomUUID } from 'node:crypto';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { CreateLoanDto } from './dto';

@Injectable()
export class LoansService {
  constructor(private readonly storage: JsonDataLakeService) {}

  async create(dto: CreateLoanDto) {
    const user = await this.storage.findById<UserRecord>('users', dto.userId);
    if (!user || user.state !== 'active') throw new Error('User is not eligible for BNPL');
    if (user.availableCredit.amount < dto.amount) throw new Error('Insufficient credit limit');
    const now = new Date();
    const installments: Installment[] = Array.from({ length: 4 }).map((_, index) => ({ id: `inst_${randomUUID()}`, amount: { amount: Number((dto.amount / 4).toFixed(3)), currency: 'TND' }, dueDate: new Date(now.getTime() + (index + 1) * 7 * 86400000).toISOString(), state: 'pending' }));
    const loan = await this.storage.create<LoanRecord>('loans', { userId: dto.userId, merchantId: dto.merchantId, principal: { amount: dto.amount, currency: 'TND' }, outstanding: { amount: dto.amount, currency: 'TND' }, state: 'active', dueDate: installments[3].dueDate, installments, lateFees: { amount: 0, currency: 'TND' } });
    await this.storage.update<UserRecord>('users', user.id, { availableCredit: { amount: user.availableCredit.amount - dto.amount, currency: 'TND' } });
    return loan;
  }

  list() { return this.storage.query<LoanRecord>('loans', { pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' }); }

  async repay(id: string, amount: number) {
    const loan = await this.storage.findById<LoanRecord>('loans', id);
    if (!loan) throw new Error('Loan not found');
    const remaining = Math.max(0, loan.outstanding.amount - amount);
    return this.storage.update<LoanRecord>('loans', id, { outstanding: { amount: remaining, currency: 'TND' }, state: remaining === 0 ? 'paid' : loan.state });
  }
}
