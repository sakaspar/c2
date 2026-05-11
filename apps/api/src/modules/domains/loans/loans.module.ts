import { Module } from '@nestjs/common';
import { StorageModule } from '../../storage/storage.module';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({ imports: [StorageModule], controllers: [LoansController], providers: [LoansService] })
export class LoansModule {}
