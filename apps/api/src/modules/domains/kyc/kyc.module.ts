import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { CreditModule } from '../credit/credit.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({ imports: [StorageModule, CreditModule], controllers: [KycController], providers: [KycService] })
export class KycModule {}
