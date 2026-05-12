import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PaginatedResult, QueryOptions, StorageRecord, WriteOptions } from './types';

type CollectionName = 'users' | 'loans' | 'transactions' | 'merchants' | 'products' | 'credit_scores' | 'notifications' | 'kyc_cases' | 'sessions';

type CollectionIndex = Record<string, { path: string; updatedAt: string; deletedAt?: string | null; fields: Record<string, unknown> }>;

@Injectable()
export class JsonDataLakeService implements OnModuleInit {
  private readonly root: string;
  private readonly cache = new Map<string, unknown>();
  private readonly queues = new Map<string, Promise<unknown>>();
  private readonly collections: CollectionName[] = ['users', 'loans', 'transactions', 'merchants', 'products', 'credit_scores', 'notifications', 'kyc_cases', 'sessions'];

  constructor(config: ConfigService) {
    this.root = resolve(process.cwd(), config.get<string>('DATA_LAKE_ROOT', '../../data'));
  }

  async onModuleInit() {
    await Promise.all([
      ...this.collections.map((collection) => mkdir(this.collectionPath(collection), { recursive: true })),
      mkdir(this.indexPath(), { recursive: true }),
      mkdir(join(this.root, 'audit'), { recursive: true }),
      mkdir(join(this.root, 'clients'), { recursive: true }),
      mkdir(join(this.root, 'transactions_log'), { recursive: true }),
      mkdir(join(this.root, 'uploads', 'kyc'), { recursive: true }),
      mkdir(join(this.root, 'uploads', 'contracts'), { recursive: true })
    ]);
    await Promise.all(this.collections.map((collection) => this.ensureIndex(collection)));
  }

  async findById<T extends StorageRecord>(collection: CollectionName, id: string): Promise<T | null> {
    const key = this.cacheKey(collection, id);
    if (this.cache.has(key)) return this.cache.get(key) as T;
    const index = await this.readIndex(collection);
    const entry = index[id];
    if (!entry || entry.deletedAt) return null;
    const record = await this.readJson<T>(join(this.root, entry.path));
    this.cache.set(key, record);
    return record;
  }

  async query<T extends StorageRecord>(collection: CollectionName, options: QueryOptions<T> = {}): Promise<PaginatedResult<T>> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 25));
    const index = await this.readIndex(collection);
    const matchedIds = Object.entries(index)
      .filter(([, entry]) => options.includeDeleted || !entry.deletedAt)
      .filter(([, entry]) => !options.where || Object.entries(options.where).every(([key, value]) => entry.fields[key] === value))
      .map(([id]) => id);
    const records = (await Promise.all(matchedIds.map((id) => this.findById<T>(collection, id)))).filter(Boolean) as T[];
    const sorted = options.sortBy
      ? records.sort((a, b) => String(a[options.sortBy!] ?? '').localeCompare(String(b[options.sortBy!] ?? '')) * (options.sortDirection === 'desc' ? -1 : 1))
      : records;
    const start = (page - 1) * pageSize;
    return { items: sorted.slice(start, start + pageSize), page, pageSize, total: sorted.length };
  }

  async create<T extends StorageRecord>(collection: CollectionName, input: Omit<T, 'id' | 'version' | 'createdAt' | 'updatedAt'> & Partial<StorageRecord>, options: WriteOptions = {}): Promise<T> {
    return this.enqueue(collection, async () => {
      const now = new Date().toISOString();
      const record = { ...input, id: input.id ?? `${collection.slice(0, -1)}_${randomUUID()}`, version: 1, createdAt: now, updatedAt: now, deletedAt: null } as T;
      await this.writeRecord(collection, record, options, 'create');
      return record;
    });
  }

  async update<T extends StorageRecord>(collection: CollectionName, id: string, patch: Partial<T>, options: WriteOptions = {}): Promise<T> {
    return this.enqueue(collection, async () => {
      const existing = await this.findById<T>(collection, id);
      if (!existing) throw new Error(`${collection}:${id} not found`);
      if (options.expectedVersion && existing.version !== options.expectedVersion) throw new Error(`optimistic lock failed for ${collection}:${id}`);
      const record = { ...existing, ...patch, id, version: existing.version + 1, updatedAt: new Date().toISOString() } as T;
      await this.writeRecord(collection, record, options, 'update');
      return record;
    });
  }

  async softDelete<T extends StorageRecord>(collection: CollectionName, id: string, options: WriteOptions = {}): Promise<T> {
    return this.update<T>(collection, id, { deletedAt: new Date().toISOString() } as Partial<T>, options);
  }

  async writeClientProfile(clientName: string, profile: unknown) {
    const clientPath = this.clientPath(clientName);
    await this.atomicWriteJson(join(clientPath, 'profile.json'), profile);
    await mkdir(join(clientPath, 'kyc'), { recursive: true });
    return clientPath;
  }

  clientKycDocumentPath(clientName: string, fileName: string) {
    return join('clients', this.slug(clientName), 'kyc', this.safeFileName(fileName)).replaceAll('\\', '/');
  }

  async listClientProfiles() {
    const clientsRoot = join(this.root, 'clients');
    await mkdir(clientsRoot, { recursive: true });
    const entries = await readdir(clientsRoot, { withFileTypes: true });
    const directoryProfiles = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
      try {
        const profile = await this.readJson<Record<string, unknown>>(join(clientsRoot, entry.name, 'profile.json'));
        return { directory: entry.name, profile };
      } catch {
        return { directory: entry.name, profile: null };
      }
    }));
    const fileProfiles = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map(async (entry) => {
      try {
        const profile = await this.readJson<Record<string, unknown>>(join(clientsRoot, entry.name));
        return { directory: entry.name, profile };
      } catch {
        return { directory: entry.name, profile: null };
      }
    }));
    return [...directoryProfiles, ...fileProfiles];
  }

  async listCollectionFiles<T>(collection: CollectionName): Promise<T[]> {
    const collectionRoot = this.collectionPath(collection);
    await mkdir(collectionRoot, { recursive: true });
    const entries = await readdir(collectionRoot, { withFileTypes: true });
    const records = await Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map(async (entry) => {
      try {
        return await this.readJson<T>(join(collectionRoot, entry.name));
      } catch {
        return null;
      }
    }));
    return records.filter(Boolean) as T[];
  }

  private async writeRecord<T extends StorageRecord>(collection: CollectionName, record: T, options: WriteOptions, action: string) {
    const relativePath = join(collection, `${record.id}.json`).replaceAll('\\', '/');
    const absolutePath = join(this.root, relativePath);
    await this.atomicWriteJson(absolutePath, record);
    const index = await this.readIndex(collection);
    index[record.id] = { path: relativePath, updatedAt: record.updatedAt, deletedAt: record.deletedAt, fields: this.indexFields(record as StorageRecord & Record<string, unknown>) };
    await this.atomicWriteJson(this.indexFile(collection), index);
    this.cache.set(this.cacheKey(collection, record.id), record);
    await this.appendAudit(collection, record.id, action, options);
  }

  private indexFields(record: StorageRecord & Record<string, unknown>) {
    const fields: Record<string, unknown> = {};
    for (const key of ['email', 'phone', 'state', 'userId', 'merchantId', 'kycState', 'riskTier', 'channel', 'username']) {
      if (record[key] !== undefined) fields[key] = record[key];
    }
    return fields;
  }

  private async appendAudit(collection: string, recordId: string, action: string, options: WriteOptions) {
    const entry = JSON.stringify({ id: randomUUID(), collection, recordId, action, actorId: options.actorId, reason: options.reason, occurredAt: new Date().toISOString() });
    const file = join(this.root, 'audit', `${new Date().toISOString().slice(0, 10)}.jsonl`);
    await this.enqueue(`audit:${file}`, async () => {
      let existing = '';
      try { existing = await readFile(file, 'utf8'); } catch { existing = ''; }
      await this.atomicWriteText(file, `${existing}${entry}\n`);
    });
  }

  private async ensureIndex(collection: CollectionName) {
    try { await readFile(this.indexFile(collection), 'utf8'); } catch { await this.atomicWriteJson(this.indexFile(collection), {}); }
  }

  private async readIndex(collection: CollectionName): Promise<CollectionIndex> {
    await this.ensureIndex(collection);
    return this.readJson<CollectionIndex>(this.indexFile(collection));
  }

  private async readJson<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  }

  private async atomicWriteJson(path: string, value: unknown) {
    await this.atomicWriteText(path, `${JSON.stringify(value, null, 2)}\n`);
  }

  private async atomicWriteText(path: string, value: string) {
    await mkdir(dirname(path), { recursive: true });
    const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, value, { encoding: 'utf8', flag: 'wx' });
    await rename(tempPath, path);
  }

  private enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const next = previous.then(operation, operation).finally(() => {
      if (this.queues.get(key) === next) this.queues.delete(key);
    });
    this.queues.set(key, next);
    return next;
  }

  private collectionPath(collection: CollectionName) { return join(this.root, collection); }
  private indexPath() { return join(this.root, 'indexes'); }
  private indexFile(collection: CollectionName) { return join(this.indexPath(), `${collection}_index.json`); }
  private cacheKey(collection: string, id: string) { return `${collection}:${id}`; }
  private clientPath(clientName: string) { return join(this.root, 'clients', this.slug(clientName)); }
  private slug(value: string) { return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'client'; }
  private safeFileName(value: string) { return value.replace(/[^a-zA-Z0-9._-]/g, '_'); }
}
