import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageModule } from '../../storage/storage.module';
import { CreditModule } from '../credit/credit.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [
    StorageModule,
    CreditModule,
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } })
  ],
  controllers: [KycController],
  providers: [KycService]
})
export class KycModule {}
