import { Injectable } from '@nestjs/common';
import { StorageRecord } from '../storage/types';
import { JsonDataLakeService } from '../storage/json-data-lake.service';

export type CollectionName = 'users' | 'loans' | 'transactions' | 'merchants' | 'credit_scores' | 'notifications' | 'kyc_cases' | 'sessions';

@Injectable()
export class BaseRepository<T extends StorageRecord> {
  constructor(private readonly storage: JsonDataLakeService, private readonly collection: CollectionName) {}

  findById(id: string) {
    return this.storage.findById<T>(this.collection, id);
  }

  list(options = {}) {
    return this.storage.query<T>(this.collection, options);
  }

  create(input: Omit<T, 'id' | 'version' | 'createdAt' | 'updatedAt'> & Partial<StorageRecord>, actorId?: string) {
    return this.storage.create<T>(this.collection, input, { actorId });
  }

  update(id: string, patch: Partial<T>, actorId?: string, expectedVersion?: number) {
    return this.storage.update<T>(this.collection, id, patch, { actorId, expectedVersion });
  }

  softDelete(id: string, actorId?: string) {
    return this.storage.softDelete<T>(this.collection, id, { actorId });
  }
}
