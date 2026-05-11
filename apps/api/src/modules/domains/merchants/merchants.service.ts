import { Injectable } from '@nestjs/common';
import { MerchantRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { CreateMerchantDto } from './dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly storage: JsonDataLakeService) {}
  create(dto: CreateMerchantDto) { return this.storage.create<MerchantRecord>('merchants', { ...dto, state: 'pending', riskTier: 'medium' }); }
  list() { return this.storage.query<MerchantRecord>('merchants', { pageSize: 100 }); }
  approve(id: string) { return this.storage.update<MerchantRecord>('merchants', id, { state: 'approved', riskTier: 'low' }); }
}
