import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ScenariosService, RevenueSku, WaterfallScenario } from './scenarios.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SkusService, CogsMonthlyBreakdown } from "../skus/skus.service";

describe('ScenariosService', () => {
  let service: ScenariosService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let skusService: jest.Mocked<SkusService>;

  const mockR10Sku: RevenueSku = {
    sku_id: "R10",
    sku_name: "Premium Nurse Placement with Deposit",
    description: null,
    upfront_deposit: 10000,
    selection_period_months: 3,
    active_revenue_start_month: 4,
    active_revenue_end_month: 39,
    monthly_revenue: 2513,
    deposit_refund_month: 40,
    created_at: "2025-08-24T18:03:06.349862",
  };

  beforeEach(async () => {
    const mockSingle = jest.fn();
    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: mockSingle,
            }),
          }),
        }),
      }),
    };

    const mockSkusService = {
      getCogsBreakdownForRevenueSku: jest.fn(),
      getAllCogsSkus: jest.fn(),
      getAllRevenueSkus: jest.fn(),
      getCogsBreakdownWithDetailsForRevenueSku: jest.fn(),
      getAggregatedCogsForRevenueSku: jest.fn(),
      getCogsBreakdownByPhaseForRevenueSku: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScenariosService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: SkusService,
          useValue: mockSkusService,
        },
      ],
    }).compile();

    service = module.get<ScenariosService>(ScenariosService);
    supabaseService = module.get(SupabaseService);
    skusService = module.get(SkusService);
  });

  describe("Helper Functions", () => {
    describe("calculateDepositRevenue", () => {
      it("should calculate deposit revenue correctly", () => {
        expect(service.calculateDepositRevenue(10, 10000)).toBe(100000);
        expect(service.calculateDepositRevenue(20, 10000)).toBe(200000);
        expect(service.calculateDepositRevenue(0, 10000)).toBe(0);
        expect(service.calculateDepositRevenue(5, 5000)).toBe(25000);
      });

      it("should handle decimal deposits", () => {
        expect(service.calculateDepositRevenue(10, 1500.5)).toBe(15005);
      });
    });

    describe("calculateMonthlyRevenue", () => {
      it("should calculate monthly revenue correctly", () => {
        expect(service.calculateMonthlyRevenue(10, 2470)).toBe(24700);
        expect(service.calculateMonthlyRevenue(20, 2470)).toBe(49400);
        expect(service.calculateMonthlyRevenue(0, 2470)).toBe(0);
        expect(service.calculateMonthlyRevenue(30, 1000)).toBe(30000);
      });

      it("should handle decimal monthly revenue", () => {
        expect(service.calculateMonthlyRevenue(10, 123.45)).toBe(1234.5);
      });
    });

    describe("calculateDepositRefund", () => {
      it("should calculate deposit refund correctly", () => {
        expect(service.calculateDepositRefund(10, 10000)).toBe(100000);
        expect(service.calculateDepositRefund(5, 5000)).toBe(25000);
        expect(service.calculateDepositRefund(0, 10000)).toBe(0);
      });
    });
  });

  describe("calculateWaterfallRevenue", () => {
    const testScenarios: WaterfallScenario[] = [
      { month: 1, skuCount: 10 },
      { month: 2, skuCount: 20 },
      { month: 3, skuCount: 30 },
      { month: 4, skuCount: 40 },
    ];

    it("should calculate the complete waterfall scenario correctly", () => {
      const testScenariosUpdated: WaterfallScenario[] = [
        { month: 1, skuCount: 10 },
        { month: 2, skuCount: 20 },
        { month: 3, skuCount: 0 },
        { month: 4, skuCount: 40 },
      ];
      const result = service.calculateWaterfallRevenue(
        testScenariosUpdated,
        mockR10Sku,
        36
      );

      expect(result).toHaveLength(36);

      // Test first 7 months specifically (using correct values from endpoint)
      const expectedFirst7 = [100000, 200000, 0, 425130, 75390, 75390, 175910];
      expect(result.slice(0, 7)).toEqual(expectedFirst7);
    });

    it("should handle single scenario correctly", () => {
      const singleScenario: WaterfallScenario[] = [{ month: 1, skuCount: 10 }];
      const result = service.calculateWaterfallRevenue(
        singleScenario,
        mockR10Sku,
        7
      );

      const expected = [100000, 0, 0, 25130, 25130, 25130, 25130];
      expect(result).toEqual(expected);
    });

    it("should handle scenarios starting in later months", () => {
      const laterScenarios: WaterfallScenario[] = [{ month: 3, skuCount: 10 }];
      const result = service.calculateWaterfallRevenue(
        laterScenarios,
        mockR10Sku,
        7
      );

      const expected = [0, 0, 100000, 0, 0, 25130, 25130];
      expect(result).toEqual(expected);
    });

    it("should handle different total months", () => {
      const result = service.calculateWaterfallRevenue(
        testScenarios,
        mockR10Sku,
        5
      );

      const expected = [100000, 200000, 300000, 425130, 75390];
      expect(result).toEqual(expected);
    });

    it("should handle revenue with end month", () => {
      const skuWithEndMonth: RevenueSku = {
        ...mockR10Sku,
        active_revenue_end_month: 6,
      };

      const singleScenario: WaterfallScenario[] = [{ month: 1, skuCount: 10 }];
      const result = service.calculateWaterfallRevenue(
        singleScenario,
        skuWithEndMonth,
        8
      );

      const expected = [100000, 0, 0, 25130, 25130, 25130, 0, 0];
      expect(result).toEqual(expected);
    });

    it("should handle deposit refunds", () => {
      const skuWithRefund: RevenueSku = {
        ...mockR10Sku,
        deposit_refund_month: 6,
      };

      const singleScenario: WaterfallScenario[] = [{ month: 1, skuCount: 10 }];
      const result = service.calculateWaterfallRevenue(
        singleScenario,
        skuWithRefund,
        7
      );

      const expected = [100000, 0, 0, 25130, 25130, -74870, 25130];
      expect(result).toEqual(expected);
    });

    it("should handle empty scenarios", () => {
      const result = service.calculateWaterfallRevenue([], mockR10Sku, 5);
      expect(result).toEqual([0, 0, 0, 0, 0]);
    });

    it("should handle zero SKU counts", () => {
      const zeroScenarios: WaterfallScenario[] = [{ month: 1, skuCount: 0 }];
      const result = service.calculateWaterfallRevenue(
        zeroScenarios,
        mockR10Sku,
        5
      );
      expect(result).toEqual([0, 0, 0, 0, 0]);
    });
  });

  describe("getR10RevenueSku", () => {
    it("should return R10 SKU data successfully", async () => {
      const mockClient = supabaseService.getClient();
      const mockSingle = mockClient
        .from("revenue_skus")
        .select("*")
        .eq("sku_id", "R10").single as jest.Mock;
      mockSingle.mockResolvedValue({ data: mockR10Sku, error: null });

      const result = await service.getR10RevenueSku();

      expect(result).toEqual(mockR10Sku);
      expect(mockClient.from).toHaveBeenCalledWith("revenue_skus");
    });

    it("should throw NotFoundException when R10 SKU not found", async () => {
      const mockClient = supabaseService.getClient();
      const mockSingle = mockClient
        .from("revenue_skus")
        .select("*")
        .eq("sku_id", "R10").single as jest.Mock;
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      await expect(service.getR10RevenueSku()).rejects.toThrow(
        NotFoundException
      );
      await expect(service.getR10RevenueSku()).rejects.toThrow(
        "R10 revenue SKU not found"
      );
    });

    it("should throw generic error for other database errors", async () => {
      const mockClient = supabaseService.getClient();
      const mockSingle = mockClient
        .from("revenue_skus")
        .select("*")
        .eq("sku_id", "R10").single as jest.Mock;
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "OTHER_ERROR", message: "Database connection failed" },
      });

      await expect(service.getR10RevenueSku()).rejects.toThrow(
        "Failed to fetch R10 revenue SKU: Database connection failed"
      );
    });
  });

  describe("calculateWaterfallScenario", () => {
    const mockCogsBreakdown: CogsMonthlyBreakdown[] = [
      {
        breakdown_id: 1,
        sku_id: "COGS001",
        month_number: 1,
        cogs_amount: 500,
        phase: "training",
      },
      {
        breakdown_id: 2,
        sku_id: "COGS001",
        month_number: 2,
        cogs_amount: 300,
        phase: "training",
      },
      {
        breakdown_id: 3,
        sku_id: "COGS001",
        month_number: 4,
        cogs_amount: 200,
        phase: "onboarding",
      },
    ];

    beforeEach(() => {
      const mockClient = supabaseService.getClient();
      const mockSingle = mockClient
        .from("revenue_skus")
        .select("*")
        .eq("sku_id", "R10").single as jest.Mock;
      mockSingle.mockResolvedValue({ data: mockR10Sku, error: null });

      skusService.getCogsBreakdownForRevenueSku.mockResolvedValue(
        mockCogsBreakdown
      );
    });

    it("should return complete waterfall calculation with formatting and COGS", async () => {
      const result = await service.calculateWaterfallScenario();

      // Test that all detail arrays have 36 months
      expect(result.monthlyDetails).toHaveLength(36);
      expect(result.monthlyCogsDetails).toHaveLength(36);
      expect(result.monthlyGrossIncomeDetails).toHaveLength(36);
      expect(result.monthlyProfitMarginDetails).toHaveLength(36);
      expect(result.monthlyCumulativeGrossProfitDetails).toHaveLength(36);

      // Test first 7 months of detailed data
      expect(result.monthlyDetails.slice(0, 7)).toEqual([
        { month: 1, total: 100000, formattedTotal: "$100,000.00" },
        { month: 2, total: 200000, formattedTotal: "$200,000.00" },
        { month: 3, total: 0, formattedTotal: "$0.00" },
        { month: 4, total: 425130, formattedTotal: "$425,130.00" },
        { month: 5, total: 75390, formattedTotal: "$75,390.00" },
        { month: 6, total: 75390, formattedTotal: "$75,390.00" },
        { month: 7, total: 175910, formattedTotal: "$175,910.00" },
      ]);

      expect(result.monthlyCogsDetails.slice(0, 7)).toEqual([
        { month: 1, total: 5000, formattedTotal: "$5,000.00" },
        { month: 2, total: 13000, formattedTotal: "$13,000.00" },
        { month: 3, total: 6000, formattedTotal: "$6,000.00" },
        { month: 4, total: 22000, formattedTotal: "$22,000.00" },
        { month: 5, total: 16000, formattedTotal: "$16,000.00" },
        { month: 6, total: 0, formattedTotal: "$0.00" },
        { month: 7, total: 8000, formattedTotal: "$8,000.00" },
      ]);

      expect(result.monthlyGrossIncomeDetails.slice(0, 7)).toEqual([
        { month: 1, total: 95000, formattedTotal: "$95,000.00" },
        { month: 2, total: 187000, formattedTotal: "$187,000.00" },
        { month: 3, total: -6000, formattedTotal: "$-6,000.00" },
        { month: 4, total: 403130, formattedTotal: "$403,130.00" },
        { month: 5, total: 59390, formattedTotal: "$59,390.00" },
        { month: 6, total: 75390, formattedTotal: "$75,390.00" },
        { month: 7, total: 167910, formattedTotal: "$167,910.00" },
      ]);

      expect(result.monthlyProfitMarginDetails.slice(0, 7)).toEqual([
        { month: 1, marginPercent: 95, formattedMargin: "95.00%" },
        { month: 2, marginPercent: 93.5, formattedMargin: "93.50%" },
        { month: 3, marginPercent: null, formattedMargin: "N/A" },
        {
          month: 4,
          marginPercent: 94.8251123185849,
          formattedMargin: "94.83%",
        },
        {
          month: 5,
          marginPercent: 78.77702613078658,
          formattedMargin: "78.78%",
        },
        { month: 6, marginPercent: 100, formattedMargin: "100.00%" },
        {
          month: 7,
          marginPercent: 95.45221988516856,
          formattedMargin: "95.45%",
        },
      ]);

      // Test cumulative gross profit (running total)
      // Month 1: 95000
      // Month 2: 95000 + 187000 = 282000
      // Month 3: 282000 + (-6000) = 276000
      // Month 4: 276000 + 403130 = 679130
      // Month 5: 679130 + 59390 = 738520
      // Month 6: 738520 + 75390 = 813910
      // Month 7: 813910 + 167910 = 981820
      expect(result.monthlyCumulativeGrossProfitDetails.slice(0, 7)).toEqual([
        { month: 1, total: 95000, formattedTotal: "$95,000.00" },
        { month: 2, total: 282000, formattedTotal: "$282,000.00" },
        { month: 3, total: 276000, formattedTotal: "$276,000.00" },
        { month: 4, total: 679130, formattedTotal: "$679,130.00" },
        { month: 5, total: 738520, formattedTotal: "$738,520.00" },
        { month: 6, total: 813910, formattedTotal: "$813,910.00" },
        { month: 7, total: 981820, formattedTotal: "$981,820.00" },
      ]);

      // Test that month numbers are correct for all 36 months
      result.monthlyDetails.forEach((detail, index) => {
        expect(detail.month).toBe(index + 1);
      });
      result.monthlyCogsDetails.forEach((detail, index) => {
        expect(detail.month).toBe(index + 1);
      });
      result.monthlyGrossIncomeDetails.forEach((detail, index) => {
        expect(detail.month).toBe(index + 1);
      });
      result.monthlyProfitMarginDetails.forEach((detail, index) => {
        expect(detail.month).toBe(index + 1);
      });
      result.monthlyCumulativeGrossProfitDetails.forEach((detail, index) => {
        expect(detail.month).toBe(index + 1);
      });
    });

    it("should handle database errors during calculation", async () => {
      const mockClient = supabaseService.getClient();
      const mockSingle = mockClient
        .from("revenue_skus")
        .select("*")
        .eq("sku_id", "R10").single as jest.Mock;
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "No rows found" },
      });

      await expect(service.calculateWaterfallScenario()).rejects.toThrow(
        NotFoundException
      );
    });

    it("should handle COGS service errors", async () => {
      const mockClient = supabaseService.getClient();
      const mockSingle = mockClient
        .from("revenue_skus")
        .select("*")
        .eq("sku_id", "R10").single as jest.Mock;
      mockSingle.mockResolvedValue({ data: mockR10Sku, error: null });

      skusService.getCogsBreakdownForRevenueSku.mockRejectedValue(
        new Error("COGS service error")
      );

      await expect(service.calculateWaterfallScenario()).rejects.toThrow(
        "COGS service error"
      );
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle very large numbers', () => {
      const result = service.calculateDepositRevenue(1000000, 10000);
      expect(result).toBe(10000000000);
    });

    it('should handle negative numbers gracefully', () => {
      expect(service.calculateDepositRevenue(-10, 1000)).toBe(-10000);
      expect(service.calculateMonthlyRevenue(10, -500)).toBe(-5000);
    });

    it('should handle floating point precision', () => {
      const result = service.calculateMonthlyRevenue(3, 33.33);
      expect(result).toBeCloseTo(99.99, 2);
    });

    it('should validate waterfall with complex revenue structure', () => {
      const complexSku: RevenueSku = {
        ...mockR10Sku,
        upfront_deposit: 5000,
        monthly_revenue: 1000,
        active_revenue_start_month: 2,
        active_revenue_end_month: 5,
        deposit_refund_month: 3,
      };

      const scenarios: WaterfallScenario[] = [{ month: 1, skuCount: 10 }];
      const result = service.calculateWaterfallRevenue(scenarios, complexSku, 6);
      
      const expected = [50000, 10000, -40000, 10000, 10000, 0];
      expect(result).toEqual(expected);
    });
  });
});
