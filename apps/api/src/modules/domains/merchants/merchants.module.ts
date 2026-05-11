import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';

@Module({ imports: [StorageModule], controllers: [MerchantsController], providers: [MerchantsService], exports: [MerchantsService] })
export class MerchantsModule {}
