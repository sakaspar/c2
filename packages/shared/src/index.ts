export type UserState = 'pending_kyc' | 'active' | 'suspended' | 'blacklisted';
export type LoanState = 'pending' | 'active' | 'paid' | 'overdue' | 'defaulted';
export type KycState = 'not_started' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'flagged';
export type MerchantState = 'pending' | 'approved' | 'suspended' | 'rejected';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'reversed';
export type EmploymentStatus = 'employed' | 'unemployed';
export type KycDocumentType = 'cin_front' | 'cin_back' | 'selfie' | 'proof_of_address' | 'bank_statement_month_1' | 'bank_statement_month_2' | 'bank_statement_month_3';

export interface Money {
  amount: number;
  currency: 'TND';
}

export interface BaseRecord {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface UserRecord extends BaseRecord {
  email?: string;
  phone?: string;
  passwordHash: string;
  authProvider?: 'local' | 'google';
  googleSub?: string;
  fullName: string;
  state: UserState;
  kycState: KycState;
  roles: Array<'customer' | 'admin' | 'merchant_operator' | 'risk_analyst'>;
  creditLimit: Money;
  availableCredit: Money;
  riskFlags: string[];
}

export interface LoanRecord extends BaseRecord {
  userId: string;
  merchantId: string;
  principal: Money;
  outstanding: Money;
  state: LoanState;
  dueDate: string;
  installments: Installment[];
  lateFees: Money;
}

export interface Installment {
  id: string;
  amount: Money;
  dueDate: string;
  paidAt?: string;
  state: 'pending' | 'paid' | 'late';
}

export interface MerchantRecord extends BaseRecord {
  legalName: string;
  displayName: string;
  state: MerchantState;
  settlementIban?: string;
  category: string;
  riskTier: 'low' | 'medium' | 'high';
}

export interface ProductRecord extends BaseRecord {
  merchantId: string;
  merchantName: string;
  name: string;
  description: string;
  price: Money;
  imageUrl?: string;
  state: 'active' | 'inactive';
  stock: number;
}

export interface CreditScoreRecord extends BaseRecord {
  userId: string;
  score: number;
  limit: Money;
  factors: Record<string, number>;
  manualAdjustment: number;
}

export interface NotificationRecord extends BaseRecord {
  userId: string;
  channel: 'email' | 'sms' | 'in_app';
  title: string;
  body: string;
  readAt?: string;
}

export interface KycDocument {
  type: KycDocumentType;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
}

export interface KycApplicationRecord extends BaseRecord {
  userId: string;
  employmentStatus: EmploymentStatus;
  employerName?: string;
  monthlyIncomeTnd?: number;
  state: KycState;
  documents: KycDocument[];
  missingDocuments: KycDocumentType[];
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}
