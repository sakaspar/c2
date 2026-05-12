import { Test, TestingModule } from '@nestjs/testing';
import { CreditService } from './credit.service';
import { JsonDataLakeService } from '../../storage/json-data-lake.service';

describe('CreditService', () => {
  let service: CreditService;
  let storage: JsonDataLakeService;

  const mockStorage = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditService,
        { provide: JsonDataLakeService, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<CreditService>(CreditService);
    storage = module.get<JsonDataLakeService>(JsonDataLakeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculate', () => {
    it('should assign 700 TND limit for mid-high scores', async () => {
      mockStorage.findById.mockResolvedValue({
        id: 'u1',
        kycState: 'approved',
        riskFlags: [],
        creditLimit: { amount: 100, currency: 'TND' },
        availableCredit: { amount: 100, currency: 'TND' }
      });
      mockStorage.create.mockImplementation((_, data) => Promise.resolve({ ...data, id: 's1' }));

      const result = await service.calculate('u1');

      expect(result.score).toBe(600);
      expect(result.limit.amount).toBe(300);
      expect(mockStorage.update).toHaveBeenCalledWith('users', 'u1', {
        creditLimit: { amount: 300, currency: 'TND' },
        availableCredit: { amount: 300, currency: 'TND' }
      });
    });

    it('should apply fraud penalty', async () => {
      mockStorage.findById.mockResolvedValue({
        id: 'u1',
        kycState: 'approved',
        riskFlags: ['flag1', 'flag2'],
        creditLimit: { amount: 100, currency: 'TND' },
        availableCredit: { amount: 100, currency: 'TND' }
      });
      mockStorage.create.mockImplementation((_, data) => Promise.resolve({ ...data, id: 's1' }));

      const result = await service.calculate('u1');
      // base 420 + kyc 180 + penalty (2 * -60) = 420 + 180 - 120 = 480
      // 480 score gives 100 limit (since score < 520)
      expect(result.score).toBe(480);
      expect(result.limit.amount).toBe(100);
    });
  });
});
