import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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
  constructor(private readonly supabaseService: SupabaseService) {}

  async getR10RevenueSku(): Promise<RevenueSku> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('revenue_skus')
      .select('*')
      .eq('sku_id', 'R10')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('R10 revenue SKU not found');
      }
      throw new Error(`Failed to fetch R10 revenue SKU: ${error.message}`);
    }

    return data;
  }

  calculateDepositRevenue(skuCount: number, depositAmount: number): number {
    return skuCount * depositAmount;
  }

  calculateMonthlyRevenue(skuCount: number, monthlyRevenueAmount: number): number {
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
    
    scenarios.forEach(scenario => {
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
          if (!revenueSku.active_revenue_end_month || 
              monthsFromStart <= revenueSku.active_revenue_end_month) {
            monthlyTotals[month - 1] += this.calculateMonthlyRevenue(
              skuCount, 
              revenueSku.monthly_revenue
            );
          }
        }
        
        if (revenueSku.deposit_refund_month && 
            monthsFromStart === revenueSku.deposit_refund_month) {
          monthlyTotals[month - 1] -= this.calculateDepositRefund(
            skuCount, 
            revenueSku.upfront_deposit
          );
        }
      }
    });
    
    return monthlyTotals;
  }

  async calculateWaterfallScenario(): Promise<{
    monthlyTotals: number[];
    formattedTotals: string[];
    monthlyDetails: Array<{ month: number; total: number; formattedTotal: string }>;
    revenueSku: RevenueSku;
  }> {
    const revenueSku = await this.getR10RevenueSku();
    
    const scenarios: WaterfallScenario[] = [
      { month: 1, skuCount: 10 },
      { month: 2, skuCount: 20 },
      { month: 3, skuCount: 0 },
      { month: 4, skuCount: 40 }
    ];
    
    const monthlyTotals = this.calculateWaterfallRevenue(scenarios, revenueSku, 36);
    const formattedTotals = monthlyTotals.map(total => 
      `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    );
    
    const monthlyDetails = monthlyTotals.map((total, index) => ({
      month: index + 1,
      total,
      formattedTotal: `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }));
    
    return {
      monthlyTotals,
      formattedTotals,
      monthlyDetails,
      revenueSku
    };
  }
}
