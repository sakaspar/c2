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

    it('should use optimistic locking when updating user credit', async () => {
      const mockUser = { id: 'u1', state: 'active', kycState: 'approved', availableCredit: { amount: 500 }, version: 5 };
      mockStorage.findById.mockResolvedValue(mockUser);
      mockStorage.create.mockResolvedValue({ id: 'loan1', principal: { amount: 100 } });

      await service.create({ userId: 'u1', merchantId: 'm1', amount: 100 });

      expect(mockStorage.update).toHaveBeenCalledWith(
        'users',
        'u1',
        { availableCredit: { amount: 400, currency: 'TND' } },
        { expectedVersion: 5 }
      );
    });
  });

  describe('repay', () => {
    it('should restore available credit with optimistic locking', async () => {
      const mockLoan = { id: 'l1', userId: 'u1', outstanding: { amount: 100 }, state: 'active' };
      const mockUser = { id: 'u1', availableCredit: { amount: 500 }, creditLimit: { amount: 1000 }, version: 10 };

      mockStorage.findById
        .mockResolvedValueOnce(mockLoan)
        .mockResolvedValueOnce(mockUser);

      await service.repay('l1', 40);

      expect(mockStorage.update).toHaveBeenCalledWith(
        'users',
        'u1',
        {
          availableCredit: { amount: 540, currency: 'TND' }
        },
        { expectedVersion: 10 }
      );
    });
  });
});
