import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { JsonDataLakeService } from '../modules/storage/json-data-lake.service';
import { LoanRecord, MerchantRecord, NotificationRecord, UserRecord } from '@bnpl/shared';

async function main() {
  const storage = new JsonDataLakeService(new ConfigService());
  await storage.onModuleInit();
  const passwordHash = await bcrypt.hash('DemoPass123!', 12);
  const user = await storage.create<UserRecord>('users', {
    id: 'user_demo_amira',
    email: 'amira@example.tn',
    phone: '+21620111222',
    fullName: 'Amira Ben Youssef',
    passwordHash,
    state: 'active',
    kycState: 'approved',
    roles: ['customer', 'admin'],
    creditLimit: { amount: 700, currency: 'TND' },
    availableCredit: { amount: 612.5, currency: 'TND' },
    riskFlags: []
  });
  const merchant = await storage.create<MerchantRecord>('merchants', {
    id: 'merchant_tunistech',
    legalName: 'TunisTech SARL',
    displayName: 'TunisTech Store',
    state: 'approved',
    settlementIban: 'TN5900000000000000000000',
    category: 'electronics',
    riskTier: 'low'
  });
  await storage.create<LoanRecord>('loans', {
    id: 'loan_demo_001',
    userId: user.id,
    merchantId: merchant.id,
    principal: { amount: 350, currency: 'TND' },
    outstanding: { amount: 87.5, currency: 'TND' },
    state: 'active',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    installments: [1, 2, 3, 4].map((week) => ({ id: `inst_demo_${week}`, amount: { amount: 87.5, currency: 'TND' }, dueDate: new Date(Date.now() + week * 7 * 86400000).toISOString(), state: week === 1 ? 'pending' : 'pending' })),
    lateFees: { amount: 0, currency: 'TND' }
  });
  await storage.create<NotificationRecord>('notifications', { userId: user.id, channel: 'in_app', title: 'KYC approved', body: 'Your BNPL account is active with a 700 TND limit.' });
  console.log('Seed data created in JSON data lake');
}

void main();
