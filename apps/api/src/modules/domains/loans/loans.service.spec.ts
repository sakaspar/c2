import { Test, TestingModule } from '@nestjs/testing';
import { LoansService } from './loans.service';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';
import { BadRequestException } from '@nestjs/common';

describe('LoansService', () => {
  let service: LoansService;
  let storage: JsonDataLakeService;

  const mockStorage = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        { provide: JsonDataLakeService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    storage = module.get<JsonDataLakeService>(JsonDataLakeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw BadRequestException if user is not active', async () => {
      mockStorage.findById.mockResolvedValue({ state: 'pending_kyc', kycState: 'approved' });
      await expect(service.create({ userId: '1', merchantId: 'm1', amount: 100 }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user available credit is insufficient', async () => {
      mockStorage.findById.mockResolvedValue({ state: 'active', kycState: 'approved', availableCredit: { amount: 50 } });
      await expect(service.create({ userId: '1', merchantId: 'm1', amount: 100 }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('repay', () => {
    it('should restore available credit', async () => {
      const mockLoan = { id: 'l1', userId: 'u1', outstanding: { amount: 100 }, state: 'active' };
      const mockUser = { id: 'u1', availableCredit: { amount: 500 }, creditLimit: { amount: 1000 } };

      mockStorage.findById
        .mockResolvedValueOnce(mockLoan)
        .mockResolvedValueOnce(mockUser);

      await service.repay('l1', 40);

      expect(mockStorage.update).toHaveBeenCalledWith('users', 'u1', {
        availableCredit: { amount: 540, currency: 'TND' }
      });
    });
  });
});
