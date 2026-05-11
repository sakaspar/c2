import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KycApplicationRecord, KycDocumentType, UserRecord } from '@bnpl/shared';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { SubmitKycDto } from './dto';

@Injectable()
export class KycService {
  constructor(private readonly storage: JsonDataLakeService) {}

  async submit(userId: string, dto: SubmitKycDto) {
    const user = await this.storage.findById<UserRecord>('users', userId);
    if (!user) throw new NotFoundException('User not found');
    const required = this.requiredDocuments(dto.employmentStatus);
    const uploaded = new Set(dto.documents.map((document) => document.type));
    const missingDocuments = required.filter((document) => !uploaded.has(document));
    if (missingDocuments.length) throw new BadRequestException({ message: 'Missing required KYC documents', missingDocuments });
    const documents = dto.documents.map((document) => ({ ...document, storagePath: this.storage.clientKycDocumentPath(user.fullName, document.fileName), uploadedAt: new Date().toISOString() }));
    const application = await this.storage.create<KycApplicationRecord>('kyc_cases', {
      userId,
      employmentStatus: dto.employmentStatus,
      employerName: dto.employerName,
      monthlyIncomeTnd: dto.monthlyIncomeTnd,
      state: 'under_review',
      documents,
      missingDocuments,
      submittedAt: new Date().toISOString()
    });
    const updatedUser = await this.storage.update<UserRecord>('users', userId, { kycState: 'under_review', state: 'pending_kyc' });
    await this.storage.writeClientProfile(user.fullName, {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      state: updatedUser.state,
      kycState: updatedUser.kycState,
      employmentStatus: dto.employmentStatus,
      employerName: dto.employerName,
      monthlyIncomeTnd: dto.monthlyIncomeTnd,
      latestKycApplicationId: application.id,
      documents,
      updatedAt: updatedUser.updatedAt
    });
    return application;
  }

  async approve(applicationId: string, reviewedBy = 'admin') {
    const application = await this.storage.findById<KycApplicationRecord>('kyc_cases', applicationId);
    if (!application) throw new NotFoundException('KYC application not found');
    const reviewedAt = new Date().toISOString();
    const updated = await this.storage.update<KycApplicationRecord>('kyc_cases', applicationId, { state: 'approved', reviewedAt, reviewedBy });
    const user = await this.storage.update<UserRecord>('users', application.userId, { kycState: 'approved', state: 'active' });
    await this.storage.writeClientProfile(user.fullName, { ...user, latestKycApplicationId: application.id, employmentStatus: application.employmentStatus, documents: application.documents });
    return updated;
  }

  async reject(applicationId: string, reason: string, reviewedBy = 'admin') {
    const application = await this.storage.findById<KycApplicationRecord>('kyc_cases', applicationId);
    if (!application) throw new NotFoundException('KYC application not found');
    const reviewedAt = new Date().toISOString();
    const updated = await this.storage.update<KycApplicationRecord>('kyc_cases', applicationId, { state: 'rejected', reviewedAt, reviewedBy, rejectionReason: reason });
    const user = await this.storage.update<UserRecord>('users', application.userId, { kycState: 'rejected', state: 'pending_kyc', riskFlags: ['kyc_rejected'] });
    await this.storage.writeClientProfile(user.fullName, { ...user, latestKycApplicationId: application.id, employmentStatus: application.employmentStatus, documents: application.documents, rejectionReason: reason });
    return updated;
  }

  requiredDocuments(employmentStatus: 'employed' | 'unemployed'): KycDocumentType[] {
    const base: KycDocumentType[] = ['cin_front', 'cin_back', 'selfie', 'proof_of_address'];
    return employmentStatus === 'employed' ? [...base, 'bank_statement_month_1', 'bank_statement_month_2', 'bank_statement_month_3'] : base;
  }
}
