import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './domains/admin/admin.module';
import { AuthModule } from './domains/auth/auth.module';
import { CreditModule } from './domains/credit/credit.module';
import { KycModule } from './domains/kyc/kyc.module';
import { LoansModule } from './domains/loans/loans.module';
import { MerchantsModule } from './domains/merchants/merchants.module';
import { NotificationsModule } from './domains/notifications/notifications.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    StorageModule,
    AuthModule,
    KycModule,
    CreditModule,
    LoansModule,
    MerchantsModule,
    NotificationsModule,
    AdminModule
  ]
})
export class AppModule {}
