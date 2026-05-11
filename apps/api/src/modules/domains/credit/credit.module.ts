import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { CreditController } from './credit.controller';
import { CreditService } from './credit.service';

@Module({ imports: [StorageModule], controllers: [CreditController], providers: [CreditService], exports: [CreditService] })
export class CreditModule {}
