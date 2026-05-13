import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { KybApplicationRecord, KybDocumentType, MerchantRecord, ProductRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { CreateMerchantDto, CreateProductDto, SubmitKybDto, UpdateMerchantDto } from './dto';

const REQUIRED_KYB_DOCS: KybDocumentType[] = ['commercial_register', 'tax_certificate', 'articles_of_association', 'bank_rib', 'representative_cin'];

@Injectable()
export class MerchantsService {
  private readonly googleClient: OAuth2Client;

  constructor(private readonly storage: JsonDataLakeService, private readonly config: ConfigService) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async register(dto: CreateMerchantDto) {
    return this.storage.create<MerchantRecord>('merchants', {
      legalName: dto.legalName,
      displayName: dto.displayName,
      category: dto.category,
      settlementIban: dto.settlementIban,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      state: 'pending',
      riskTier: 'medium'
    });
  }

  list() { return this.storage.query<MerchantRecord>('merchants', { pageSize: 100 }); }

  async googleLogin(idToken: string) {
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) throw new BadRequestException('Google merchant login is not configured');
    const ticket = await this.googleClient.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.name) throw new BadRequestException('Google merchant profile is incomplete');
    if (!payload.email_verified) throw new BadRequestException('Google email is not verified');

    let merchant = await this.storage.findOneByField<MerchantRecord>('merchants', 'googleSub', payload.sub);
    if (!merchant) merchant = await this.storage.findOneByField<MerchantRecord>('merchants', 'ownerEmail', payload.email);
    if (merchant) {
      const patch: Partial<MerchantRecord> = { googleSub: payload.sub, authProvider: 'google', ownerEmail: payload.email, ownerName: payload.name, contactEmail: merchant.contactEmail ?? payload.email };
      return this.storage.update<MerchantRecord>('merchants', merchant.id, patch);
    }

    return this.storage.create<MerchantRecord>('merchants', {
      legalName: payload.name,
      displayName: `${payload.name}'s Store`,
      category: 'other',
      contactEmail: payload.email,
      ownerEmail: payload.email,
      ownerName: payload.name,
      authProvider: 'google',
      googleSub: payload.sub,
      state: 'pending',
      riskTier: 'medium'
    });
  }

  async get(merchantId: string) {
    const merchant = await this.storage.findById<MerchantRecord>('merchants', merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async updateMerchant(merchantId: string, dto: UpdateMerchantDto) {
    await this.get(merchantId);
    return this.storage.update<MerchantRecord>('merchants', merchantId, dto as Partial<MerchantRecord>);
  }

  async latestKyb(merchantId: string) {
    const merchant = await this.get(merchantId);
    if (merchant.latestKybApplicationId) {
      const app = await this.storage.findById<KybApplicationRecord>('kyb_cases', merchant.latestKybApplicationId);
      if (app) return app;
    }
    const apps = await this.storage.query<KybApplicationRecord>('kyb_cases', { where: { merchantId } as Partial<KybApplicationRecord>, pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' });
    return apps.items[0] ?? null;
  }

  async uploadKybDocument(merchantId: string, type: string, file: { originalname: string; buffer: Buffer; mimetype: string } | undefined) {
    if (!file || !file.buffer) throw new BadRequestException('No file uploaded');
    if (!type) throw new BadRequestException('Document type is required');

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, PNG and PDF are allowed.');
    }

    const merchant = await this.storage.findById<MerchantRecord>('merchants', merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = this.storage.entityDocumentPath('merchants', merchantId, 'kyb', safeName);
    await this.storage.saveUploadedFile(storagePath, file.buffer);
    return { type, fileName: safeName, storagePath };
  }

  async submitKyb(merchantId: string, dto: SubmitKybDto) {
    const merchant = await this.storage.findById<MerchantRecord>('merchants', merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    const uploaded = new Set(dto.documents.map(d => d.type));
    const missingDocuments = REQUIRED_KYB_DOCS.filter(d => !uploaded.has(d));
    if (missingDocuments.length) throw new BadRequestException({ message: 'Missing required KYB documents', missingDocuments });
    const documents = dto.documents.map(d => ({
      type: d.type as KybDocumentType,
      fileName: d.fileName,
      storagePath: d.storagePath ?? this.storage.entityDocumentPath('merchants', merchantId, 'kyb', d.fileName),
      uploadedAt: new Date().toISOString()
    }));
    const application = await this.storage.create<KybApplicationRecord>('kyb_cases', {
      merchantId,
      state: 'under_review',
      documents,
      missingDocuments: [],
      submittedAt: new Date().toISOString()
    });
    await this.storage.update<MerchantRecord>('merchants', merchantId, { state: 'pending', latestKybApplicationId: application.id });
    return application;
  }

  async upsertKyb(merchantId: string, dto: SubmitKybDto) {
    const merchant = await this.storage.findById<MerchantRecord>('merchants', merchantId);
    if (!merchant) throw new NotFoundException('Merchant not found');
    const latest = await this.latestKyb(merchantId);
    const byType = new Map<KybDocumentType, KybApplicationRecord['documents'][number]>();
    for (const document of latest?.documents ?? []) byType.set(document.type, document);
    for (const document of dto.documents) {
      byType.set(document.type as KybDocumentType, {
        type: document.type as KybDocumentType,
        fileName: document.fileName,
        storagePath: document.storagePath ?? this.storage.entityDocumentPath('merchants', merchantId, 'kyb', document.fileName),
        uploadedAt: new Date().toISOString()
      });
    }
    const documents = Array.from(byType.values());
    const uploaded = new Set(documents.map((document) => document.type));
    const missingDocuments = REQUIRED_KYB_DOCS.filter((document) => !uploaded.has(document));
    const state = missingDocuments.length ? 'pending' : 'under_review';
    if (latest && latest.state !== 'approved') {
      return this.storage.update<KybApplicationRecord>('kyb_cases', latest.id, { state, documents, missingDocuments, submittedAt: new Date().toISOString(), reviewedAt: undefined, reviewedBy: undefined, rejectionReason: undefined });
    }
    const application = await this.storage.create<KybApplicationRecord>('kyb_cases', { merchantId, state, documents, missingDocuments, submittedAt: new Date().toISOString() });
    await this.storage.update<MerchantRecord>('merchants', merchantId, { state: 'pending', latestKybApplicationId: application.id });
    return application;
  }

  kybApplications() {
    return this.storage.query<KybApplicationRecord>('kyb_cases', { pageSize: 100, sortBy: 'createdAt', sortDirection: 'desc' });
  }

  async approveKyb(applicationId: string, reviewedBy = 'admin') {
    const app = await this.storage.findById<KybApplicationRecord>('kyb_cases', applicationId);
    if (!app) throw new NotFoundException('KYB application not found');
    const updated = await this.storage.update<KybApplicationRecord>('kyb_cases', applicationId, { state: 'approved', reviewedAt: new Date().toISOString(), reviewedBy });
    await this.storage.update<MerchantRecord>('merchants', app.merchantId, { state: 'approved', riskTier: 'low' });
    return updated;
  }

  async rejectKyb(applicationId: string, reason: string, reviewedBy = 'admin') {
    const app = await this.storage.findById<KybApplicationRecord>('kyb_cases', applicationId);
    if (!app) throw new NotFoundException('KYB application not found');
    const updated = await this.storage.update<KybApplicationRecord>('kyb_cases', applicationId, { state: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy, rejectionReason: reason });
    await this.storage.update<MerchantRecord>('merchants', app.merchantId, { state: 'rejected' });
    return updated;
  }

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

  async uploadProductImage(productId: string, file: { originalname: string; buffer: Buffer; mimetype: string } | undefined) {
    if (!file || !file.buffer) throw new BadRequestException('No file uploaded');
    const product = await this.storage.findById<ProductRecord>('products', productId);
    if (!product) throw new NotFoundException('Product not found');
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = this.storage.entityDocumentPath('products', productId, 'images', safeName);
    await this.storage.saveUploadedFile(storagePath, file.buffer);
    const imageUrl = `/api/v1/merchants/products/images/${productId}/${safeName}`;
    await this.storage.update<ProductRecord>('products', productId, { imageUrl });
    return { imageUrl };
  }
}
