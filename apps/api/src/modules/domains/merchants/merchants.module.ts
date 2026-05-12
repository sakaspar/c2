import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageModule } from '../../storage/storage.module';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';

@Module({ imports: [StorageModule, MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } })], controllers: [MerchantsController], providers: [MerchantsService], exports: [MerchantsService] })
export class MerchantsModule {}
