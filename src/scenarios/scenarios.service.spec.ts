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

      // Test revenue data
      expect(result.monthlyTotals).toHaveLength(36);
      expect(result.formattedTotals).toHaveLength(36);
      expect(result.monthlyDetails).toHaveLength(36);

      // Test COGS data
      expect(result.monthlyCogsTotals).toHaveLength(36);
      expect(result.formattedCogsTotals).toHaveLength(36);
      expect(result.monthlyCogsDetails).toHaveLength(36);

      // Test first 7 months revenue specifically (using correct values from endpoint)
      expect(result.monthlyTotals.slice(0, 7)).toEqual([
        100000, 200000, 0, 425130, 75390, 75390, 175910,
      ]);
      expect(result.formattedTotals.slice(0, 7)).toEqual([
        "$100,000.00",
        "$200,000.00",
        "$0.00",
        "$425,130.00",
        "$75,390.00",
        "$75,390.00",
        "$175,910.00",
      ]);

      // Test first 7 months COGS specifically
      // Month 1: 10 SKUs * 500 = 5000
      // Month 2: 10 SKUs * 300 + 20 SKUs * 500 = 3000 + 10000 = 13000
      // Month 3: 20 SKUs * 300 = 6000 (month 2 SKUs incur month 2 COGS)
      // Month 4: 10 SKUs * 200 + 40 SKUs * 500 = 2000 + 20000 = 22000
      // Month 5: 20 SKUs * 200 + 40 SKUs * 300 = 4000 + 12000 = 16000
      // Month 6: 0 (no month 3 COGS available)
      // Month 7: 40 SKUs * 200 = 8000 (month 4 SKUs incur month 4 COGS)
      expect(result.monthlyCogsTotals.slice(0, 7)).toEqual([
        5000, 13000, 6000, 22000, 16000, 0, 8000,
      ]);

      // Test that month numbers are correct for all 36 months
      result.monthlyDetails.forEach((detail, index) => {
        expect(detail.month).toBe(index + 1);
      });
      result.monthlyCogsDetails.forEach((detail, index) => {
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
