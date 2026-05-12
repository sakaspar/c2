import { Injectable } from '@nestjs/common';
import { MerchantRecord, ProductRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { CreateMerchantDto, CreateProductDto } from './dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly storage: JsonDataLakeService) {}
  create(dto: CreateMerchantDto) { return this.storage.create<MerchantRecord>('merchants', { ...dto, state: 'pending', riskTier: 'medium' }); }
  list() { return this.storage.query<MerchantRecord>('merchants', { pageSize: 100 }); }
  async products() {
    const indexed = await this.storage.query<ProductRecord>('products', { pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' });
    const files = await this.storage.listCollectionFiles<ProductRecord>('products');
    const merged = new Map<string, ProductRecord>();
    files.forEach((product) => merged.set(product.id, product));
    indexed.items.forEach((product) => merged.set(product.id, product));
    return { ...indexed, items: Array.from(merged.values()), total: merged.size };
  }
  approve(id: string) { return this.storage.update<MerchantRecord>('merchants', id, { state: 'approved', riskTier: 'low' }); }
  async createProduct(dto: CreateProductDto) {
    const merchant = await this.storage.findById<MerchantRecord>('merchants', dto.merchantId);
    if (!merchant || merchant.state !== 'approved') throw new Error('Merchant is not approved');
    return this.storage.create<ProductRecord>('products', { merchantId: merchant.id, merchantName: merchant.displayName, name: dto.name, description: dto.description, price: { amount: dto.price, currency: 'TND' }, imageUrl: dto.imageUrl, state: 'active', stock: dto.stock });
  }
}
