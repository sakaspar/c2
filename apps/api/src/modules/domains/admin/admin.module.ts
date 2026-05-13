import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { KycModule } from '../kyc/kyc.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { AdminController } from './admin.controller';

@Module({ imports: [StorageModule, KycModule, MerchantsModule], controllers: [AdminController] })
export class AdminModule {}
