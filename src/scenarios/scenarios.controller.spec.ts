import { Test, TestingModule } from '@nestjs/testing';
import { ScenariosController } from './scenarios.controller';
import { ScenariosService, RevenueSku } from './scenarios.service';

describe('ScenariosController', () => {
  let controller: ScenariosController;
  let service: jest.Mocked<ScenariosService>;

  const mockR10Sku: RevenueSku = {
    sku_id: 'R10',
    sku_name: 'Premium Nurse Placement with Deposit',
    description: null,
    upfront_deposit: 10000,
    selection_period_months: 3,
    active_revenue_start_month: 4,
    active_revenue_end_month: 39,
    monthly_revenue: 2513,
    deposit_refund_month: 40,
    created_at: '2025-08-24T18:03:06.349862',
  };

  const mockWaterfallResult = {
    monthlyTotals: [100000, 200000, 0, 424700, 74100, 74100, 172900],
    formattedTotals: [
      "$100,000.00",
      "$200,000.00",
      "$0.00",
      "$424,700.00",
      "$74,100.00",
      "$74,100.00",
      "$172,900.00",
    ],
    monthlyDetails: [
      { month: 1, total: 100000, formattedTotal: "$100,000.00" },
      { month: 2, total: 200000, formattedTotal: "$200,000.00" },
      { month: 3, total: 0, formattedTotal: "$0.00" },
      { month: 4, total: 424700, formattedTotal: "$424,700.00" },
      { month: 5, total: 74100, formattedTotal: "$74,100.00" },
      { month: 6, total: 74100, formattedTotal: "$74,100.00" },
      { month: 7, total: 172900, formattedTotal: "$172,900.00" },
    ],
    monthlyCogsTotals: [5000, 13000, 6000, 22000, 16000, 0, 8000],
    formattedCogsTotals: [
      "$5,000.00",
      "$13,000.00",
      "$6,000.00",
      "$22,000.00",
      "$16,000.00",
      "$0.00",
      "$8,000.00",
    ],
    monthlyCogsDetails: [
      { month: 1, total: 5000, formattedTotal: "$5,000.00" },
      { month: 2, total: 13000, formattedTotal: "$13,000.00" },
      { month: 3, total: 6000, formattedTotal: "$6,000.00" },
      { month: 4, total: 22000, formattedTotal: "$22,000.00" },
      { month: 5, total: 16000, formattedTotal: "$16,000.00" },
      { month: 6, total: 0, formattedTotal: "$0.00" },
      { month: 7, total: 8000, formattedTotal: "$8,000.00" },
    ],
  };

  beforeEach(async () => {
    const mockScenariosService = {
      calculateWaterfallScenario: jest.fn(),
      getR10RevenueSku: jest.fn(),
      calculateDepositRevenue: jest.fn(),
      calculateMonthlyRevenue: jest.fn(),
      calculateDepositRefund: jest.fn(),
      calculateWaterfallRevenue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScenariosController],
      providers: [
        {
          provide: ScenariosService,
          useValue: mockScenariosService,
        },
      ],
    }).compile();

    controller = module.get<ScenariosController>(ScenariosController);
    service = module.get(ScenariosService);
  });

  describe("getWaterfall", () => {
    it("should return waterfall calculation results", async () => {
      const mockResult36Months = {
        ...mockWaterfallResult,
        monthlyTotals: new Array(36)
          .fill(0)
          .map((_, i) =>
            i < 7 ? mockWaterfallResult.monthlyTotals[i] || 0 : 175910
          ),
        formattedTotals: new Array(36)
          .fill("$0.00")
          .map((_, i) =>
            i < 7
              ? mockWaterfallResult.formattedTotals[i] || "$0.00"
              : "$175,910.00"
          ),
        monthlyDetails: new Array(36).fill(null).map((_, i) => ({
          month: i + 1,
          total: i < 7 ? mockWaterfallResult.monthlyTotals[i] || 0 : 175910,
          formattedTotal:
            i < 7
              ? mockWaterfallResult.formattedTotals[i] || "$0.00"
              : "$175,910.00",
        })),
        monthlyCogsTotals: new Array(36)
          .fill(0)
          .map((_, i) =>
            i < 7 ? mockWaterfallResult.monthlyCogsTotals[i] || 0 : 0
          ),
        formattedCogsTotals: new Array(36)
          .fill("$0.00")
          .map((_, i) =>
            i < 7
              ? mockWaterfallResult.formattedCogsTotals[i] || "$0.00"
              : "$0.00"
          ),
        monthlyCogsDetails: new Array(36).fill(null).map((_, i) => ({
          month: i + 1,
          total: i < 7 ? mockWaterfallResult.monthlyCogsTotals[i] || 0 : 0,
          formattedTotal:
            i < 7
              ? mockWaterfallResult.formattedCogsTotals[i] || "$0.00"
              : "$0.00",
        })),
      };

      service.calculateWaterfallScenario.mockResolvedValue(mockResult36Months);

      const result = await controller.getWaterfall();

      expect(result.monthlyTotals).toHaveLength(36);
      expect(result.formattedTotals).toHaveLength(36);
      expect(result.monthlyDetails).toHaveLength(36);
      expect(result.monthlyCogsTotals).toHaveLength(36);
      expect(result.formattedCogsTotals).toHaveLength(36);
      expect(result.monthlyCogsDetails).toHaveLength(36);
      expect(service.calculateWaterfallScenario).toHaveBeenCalledTimes(1);
    });

    it("should handle service errors", async () => {
      const error = new Error("Database connection failed");
      service.calculateWaterfallScenario.mockRejectedValue(error);

      await expect(controller.getWaterfall()).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should pass through all service response data", async () => {
      const customResult = {
        ...mockWaterfallResult,
        monthlyTotals: [50000, 100000],
        formattedTotals: ["$50,000.00", "$100,000.00"],
        monthlyDetails: [
          { month: 1, total: 50000, formattedTotal: "$50,000.00" },
          { month: 2, total: 100000, formattedTotal: "$100,000.00" },
        ],
        monthlyCogsTotals: [2500, 5000],
        formattedCogsTotals: ["$2,500.00", "$5,000.00"],
        monthlyCogsDetails: [
          { month: 1, total: 2500, formattedTotal: "$2,500.00" },
          { month: 2, total: 5000, formattedTotal: "$5,000.00" },
        ],
      };

      service.calculateWaterfallScenario.mockResolvedValue(customResult);

      const result = await controller.getWaterfall();

      expect(result.monthlyTotals).toEqual([50000, 100000]);
      expect(result.formattedTotals).toEqual(["$50,000.00", "$100,000.00"]);
      expect(result.monthlyDetails).toEqual([
        { month: 1, total: 50000, formattedTotal: "$50,000.00" },
        { month: 2, total: 100000, formattedTotal: "$100,000.00" },
      ]);
      expect(result.monthlyCogsTotals).toEqual([2500, 5000]);
      expect(result.formattedCogsTotals).toEqual(["$2,500.00", "$5,000.00"]);
      expect(result.monthlyCogsDetails).toEqual([
        { month: 1, total: 2500, formattedTotal: "$2,500.00" },
        { month: 2, total: 5000, formattedTotal: "$5,000.00" },
      ]);
    });
  });

  describe('Controller Integration', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have the correct route handler', () => {
      expect(controller.getWaterfall).toBeDefined();
      expect(typeof controller.getWaterfall).toBe('function');
    });
  });
});
