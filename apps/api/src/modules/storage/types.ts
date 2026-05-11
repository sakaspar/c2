export interface StorageRecord {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface QueryOptions<T> {
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
  where?: Partial<T>;
  sortBy?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface WriteOptions {
  actorId?: string;
  reason?: string;
  expectedVersion?: number;
}
