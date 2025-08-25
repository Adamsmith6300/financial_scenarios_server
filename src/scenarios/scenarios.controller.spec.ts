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
    monthlyDetails: [
      { month: 1, total: 100000, formattedTotal: "$100,000.00" },
      { month: 2, total: 200000, formattedTotal: "$200,000.00" },
      { month: 3, total: 0, formattedTotal: "$0.00" },
      { month: 4, total: 424700, formattedTotal: "$424,700.00" },
      { month: 5, total: 74100, formattedTotal: "$74,100.00" },
      { month: 6, total: 74100, formattedTotal: "$74,100.00" },
      { month: 7, total: 172900, formattedTotal: "$172,900.00" },
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
    monthlyGrossIncomeDetails: [
      { month: 1, total: 95000, formattedTotal: "$95,000.00" },
      { month: 2, total: 187000, formattedTotal: "$187,000.00" },
      { month: 3, total: -6000, formattedTotal: "-$6,000.00" },
      { month: 4, total: 403130, formattedTotal: "$403,130.00" },
      { month: 5, total: 59390, formattedTotal: "$59,390.00" },
      { month: 6, total: 75390, formattedTotal: "$75,390.00" },
      { month: 7, total: 167910, formattedTotal: "$167,910.00" },
    ],
    monthlyProfitMarginDetails: [
      { month: 1, marginPercent: 95, formattedMargin: "95.00%" },
      { month: 2, marginPercent: 93.5, formattedMargin: "93.50%" },
      { month: 3, marginPercent: null, formattedMargin: "N/A" },
      { month: 4, marginPercent: 94.8251123185849, formattedMargin: "94.83%" },
      { month: 5, marginPercent: 78.77702613078658, formattedMargin: "78.78%" },
      { month: 6, marginPercent: 100, formattedMargin: "100.00%" },
      { month: 7, marginPercent: 95.45221988516856, formattedMargin: "95.45%" },
    ],
    monthlyCumulativeGrossProfitDetails: [
      { month: 1, total: 95000, formattedTotal: "$95,000.00" },
      { month: 2, total: 282000, formattedTotal: "$282,000.00" },
      { month: 3, total: 276000, formattedTotal: "$276,000.00" },
      { month: 4, total: 679130, formattedTotal: "$679,130.00" },
      { month: 5, total: 738520, formattedTotal: "$738,520.00" },
      { month: 6, total: 813910, formattedTotal: "$813,910.00" },
      { month: 7, total: 981820, formattedTotal: "$981,820.00" },
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
        monthlyDetails: new Array(36).fill(null).map((_, i) => ({
          month: i + 1,
          total:
            i < 7 ? mockWaterfallResult.monthlyDetails[i]?.total || 0 : 175910,
          formattedTotal:
            i < 7
              ? mockWaterfallResult.monthlyDetails[i]?.formattedTotal || "$0.00"
              : "$175,910.00",
        })),
        monthlyCogsDetails: new Array(36).fill(null).map((_, i) => ({
          month: i + 1,
          total:
            i < 7 ? mockWaterfallResult.monthlyCogsDetails[i]?.total || 0 : 0,
          formattedTotal:
            i < 7
              ? mockWaterfallResult.monthlyCogsDetails[i]?.formattedTotal ||
                "$0.00"
              : "$0.00",
        })),
        monthlyGrossIncomeDetails: new Array(36).fill(null).map((_, i) => ({
          month: i + 1,
          total:
            i < 7
              ? mockWaterfallResult.monthlyGrossIncomeDetails[i]?.total || 0
              : 0,
          formattedTotal:
            i < 7
              ? mockWaterfallResult.monthlyGrossIncomeDetails[i]
                  ?.formattedTotal || "$0.00"
              : "$0.00",
        })),
        monthlyProfitMarginDetails: new Array(36).fill(null).map((_, i) => ({
          month: i + 1,
          marginPercent:
            i < 7
              ? mockWaterfallResult.monthlyProfitMarginDetails[i]
                  ?.marginPercent || 0
              : 0,
          formattedMargin:
            i < 7
              ? mockWaterfallResult.monthlyProfitMarginDetails[i]
                  ?.formattedMargin || "0.00%"
              : "0.00%",
        })),
        monthlyCumulativeGrossProfitDetails: new Array(36)
          .fill(null)
          .map((_, i) => ({
            month: i + 1,
            total:
              i < 7
                ? mockWaterfallResult.monthlyCumulativeGrossProfitDetails[i]
                    ?.total || 0
                : 0,
            formattedTotal:
              i < 7
                ? mockWaterfallResult.monthlyCumulativeGrossProfitDetails[i]
                    ?.formattedTotal || "$0.00"
                : "$0.00",
          })),
      };

      service.calculateWaterfallScenario.mockResolvedValue(mockResult36Months);

      const result = await controller.getWaterfall();

      expect(result.monthlyDetails).toHaveLength(36);
      expect(result.monthlyCogsDetails).toHaveLength(36);
      expect(result.monthlyGrossIncomeDetails).toHaveLength(36);
      expect(result.monthlyProfitMarginDetails).toHaveLength(36);
      expect(result.monthlyCumulativeGrossProfitDetails).toHaveLength(36);
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
        monthlyDetails: [
          { month: 1, total: 50000, formattedTotal: "$50,000.00" },
          { month: 2, total: 100000, formattedTotal: "$100,000.00" },
        ],
        monthlyCogsDetails: [
          { month: 1, total: 2500, formattedTotal: "$2,500.00" },
          { month: 2, total: 5000, formattedTotal: "$5,000.00" },
        ],
        monthlyGrossIncomeDetails: [
          { month: 1, total: 47500, formattedTotal: "$47,500.00" },
          { month: 2, total: 95000, formattedTotal: "$95,000.00" },
        ],
        monthlyProfitMarginDetails: [
          { month: 1, marginPercent: 95, formattedMargin: "95.00%" },
          { month: 2, marginPercent: 95, formattedMargin: "95.00%" },
        ],
        monthlyCumulativeGrossProfitDetails: [
          { month: 1, total: 47500, formattedTotal: "$47,500.00" },
          { month: 2, total: 142500, formattedTotal: "$142,500.00" },
        ],
      };

      service.calculateWaterfallScenario.mockResolvedValue(customResult);

      const result = await controller.getWaterfall();

      expect(result.monthlyDetails).toEqual([
        { month: 1, total: 50000, formattedTotal: "$50,000.00" },
        { month: 2, total: 100000, formattedTotal: "$100,000.00" },
      ]);
      expect(result.monthlyCogsDetails).toEqual([
        { month: 1, total: 2500, formattedTotal: "$2,500.00" },
        { month: 2, total: 5000, formattedTotal: "$5,000.00" },
      ]);
      expect(result.monthlyGrossIncomeDetails).toEqual([
        { month: 1, total: 47500, formattedTotal: "$47,500.00" },
        { month: 2, total: 95000, formattedTotal: "$95,000.00" },
      ]);
      expect(result.monthlyProfitMarginDetails).toEqual([
        { month: 1, marginPercent: 95, formattedMargin: "95.00%" },
        { month: 2, marginPercent: 95, formattedMargin: "95.00%" },
      ]);
      expect(result.monthlyCumulativeGrossProfitDetails).toEqual([
        { month: 1, total: 47500, formattedTotal: "$47,500.00" },
        { month: 2, total: 142500, formattedTotal: "$142,500.00" },
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
