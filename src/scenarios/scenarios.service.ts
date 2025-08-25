import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SkusService, CogsMonthlyBreakdown } from "../skus/skus.service";

export interface RevenueSku {
  sku_id: string;
  sku_name: string;
  description?: string;
  upfront_deposit: number;
  selection_period_months: number;
  active_revenue_start_month: number;
  active_revenue_end_month?: number;
  monthly_revenue: number;
  deposit_refund_month?: number;
  created_at: string;
}

export interface WaterfallScenario {
  month: number;
  skuCount: number;
}

@Injectable()
export class ScenariosService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly skusService: SkusService
  ) {}

  async getR10RevenueSku(): Promise<RevenueSku> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("revenue_skus")
      .select("*")
      .eq("sku_id", "R10")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException("R10 revenue SKU not found");
      }
      throw new Error(`Failed to fetch R10 revenue SKU: ${error.message}`);
    }

    return data;
  }

  calculateDepositRevenue(skuCount: number, depositAmount: number): number {
    return skuCount * depositAmount;
  }

  calculateMonthlyRevenue(
    skuCount: number,
    monthlyRevenueAmount: number
  ): number {
    return skuCount * monthlyRevenueAmount;
  }

  calculateDepositRefund(skuCount: number, depositAmount: number): number {
    return skuCount * depositAmount;
  }

  calculateWaterfallRevenue(
    scenarios: WaterfallScenario[],
    revenueSku: RevenueSku,
    totalMonths: number = 7
  ): number[] {
    const monthlyTotals: number[] = new Array(totalMonths).fill(0);

    scenarios.forEach((scenario) => {
      const { month: startMonth, skuCount } = scenario;

      for (let month = 1; month <= totalMonths; month++) {
        if (month < startMonth) continue;

        const monthsFromStart = month - startMonth + 1;

        if (monthsFromStart === 1) {
          monthlyTotals[month - 1] += this.calculateDepositRevenue(
            skuCount,
            revenueSku.upfront_deposit
          );
        }

        if (monthsFromStart >= revenueSku.active_revenue_start_month) {
          if (
            !revenueSku.active_revenue_end_month ||
            monthsFromStart <= revenueSku.active_revenue_end_month
          ) {
            monthlyTotals[month - 1] += this.calculateMonthlyRevenue(
              skuCount,
              revenueSku.monthly_revenue
            );
          }
        }

        if (
          revenueSku.deposit_refund_month &&
          monthsFromStart === revenueSku.deposit_refund_month
        ) {
          monthlyTotals[month - 1] -= this.calculateDepositRefund(
            skuCount,
            revenueSku.upfront_deposit
          );
        }
      }
    });

    return monthlyTotals;
  }

  async calculateWaterfallCogs(
    scenarios: WaterfallScenario[],
    revenueSkuId: string,
    totalMonths: number = 36
  ): Promise<number[]> {
    // Get COGS breakdown for the revenue SKU
    const cogsBreakdown = await this.skusService.getCogsBreakdownForRevenueSku(
      revenueSkuId
    );

    // Create aggregated COGS by month
    const cogsByMonth: { [month: number]: number } = {};
    cogsBreakdown.forEach((breakdown) => {
      cogsByMonth[breakdown.month_number] = breakdown.cogs_amount;
    });

    const monthlyCogsTotals: number[] = new Array(totalMonths).fill(0);

    scenarios.forEach((scenario) => {
      const { month: startMonth, skuCount } = scenario;

      for (let month = 1; month <= totalMonths; month++) {
        if (month < startMonth) continue;

        const monthsFromStart = month - startMonth + 1;

        // Add COGS for this SKU count based on the month from start
        if (cogsByMonth[monthsFromStart]) {
          monthlyCogsTotals[month - 1] +=
            skuCount * cogsByMonth[monthsFromStart];
        }
      }
    });

    return monthlyCogsTotals;
  }

  async calculateWaterfallScenario(): Promise<{
    monthlyDetails: Array<{
      month: number;
      total: number;
      formattedTotal: string;
    }>;
    monthlyCogsDetails: Array<{
      month: number;
      total: number;
      formattedTotal: string;
    }>;
    monthlyGrossIncomeDetails: Array<{
      month: number;
      total: number;
      formattedTotal: string;
    }>;
    monthlyProfitMarginDetails: Array<{
      month: number;
      marginPercent: number;
      formattedMargin: string;
    }>;
    monthlyCumulativeGrossProfitDetails: Array<{
      month: number;
      total: number;
      formattedTotal: string;
    }>;
  }> {
    const revenueSku = await this.getR10RevenueSku();

    const scenarios: WaterfallScenario[] = [
      { month: 1, skuCount: 10 },
      { month: 2, skuCount: 20 },
      { month: 3, skuCount: 0 },
      { month: 4, skuCount: 40 },
    ];

    // Calculate revenue totals
    const monthlyTotals = this.calculateWaterfallRevenue(
      scenarios,
      revenueSku,
      36
    );

    const monthlyDetails = monthlyTotals.map((total, index) => ({
      month: index + 1,
      total,
      formattedTotal: `$${total.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    }));

    // Calculate COGS totals
    const monthlyCogsTotals = await this.calculateWaterfallCogs(
      scenarios,
      revenueSku.sku_id,
      36
    );

    const monthlyCogsDetails = monthlyCogsTotals.map((total, index) => ({
      month: index + 1,
      total,
      formattedTotal: `$${total.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    }));

    // Calculate gross income totals (revenue - COGS)
    const monthlyGrossIncomeTotals = monthlyTotals.map(
      (revenue, index) => revenue - monthlyCogsTotals[index]
    );

    const monthlyGrossIncomeDetails = monthlyGrossIncomeTotals.map(
      (total, index) => ({
        month: index + 1,
        total,
        formattedTotal: `$${total.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      })
    );

    // Calculate profit margin percentages (gross income / revenue * 100)
    const monthlyProfitMargins = monthlyTotals.map((revenue, index) => {
      if (revenue === 0) {
        // Handle division by zero - if no revenue, margin is undefined/null
        return revenue === monthlyCogsTotals[index] ? 0 : null;
      }
      return (monthlyGrossIncomeTotals[index] / revenue) * 100;
    });

    const monthlyProfitMarginDetails = monthlyProfitMargins.map(
      (margin, index) => ({
        month: index + 1,
        marginPercent: margin,
        formattedMargin: margin === null ? "N/A" : `${margin.toFixed(2)}%`,
      })
    );

    // Calculate cumulative gross profit (running total of gross income)
    let cumulativeTotal = 0;
    const monthlyCumulativeGrossProfitDetails = monthlyGrossIncomeTotals.map(
      (grossIncome, index) => {
        cumulativeTotal += grossIncome;
        return {
          month: index + 1,
          total: cumulativeTotal,
          formattedTotal: `$${cumulativeTotal.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        };
      }
    );

    return {
      monthlyDetails,
      monthlyCogsDetails,
      monthlyGrossIncomeDetails,
      monthlyProfitMarginDetails,
      monthlyCumulativeGrossProfitDetails,
    };
  }
}
