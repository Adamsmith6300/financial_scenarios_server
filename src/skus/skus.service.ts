import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

export interface CogsMonthlyBreakdown {
  breakdown_id: number;
  sku_id: string;
  month_number: number;
  cogs_amount: number;
  phase?: string;
}

export interface CogsBreakdownWithDetails extends CogsMonthlyBreakdown {
  cogs_sku_name?: string;
  cogs_sku_description?: string;
  revenue_sku_name?: string;
}

@Injectable()
export class SkusService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAllCogsSkus() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("cogs_skus")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch COGS SKUs: ${error.message}`);
    }

    return data;
  }

  async getAllRevenueSkus() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("revenue_skus")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch Revenue SKUs: ${error.message}`);
    }

    return data;
  }

  async getCogsBreakdownForRevenueSku(
    revenueSkuId: string
  ): Promise<CogsMonthlyBreakdown[]> {
    // First, get the COGS SKU ID associated with the revenue SKU
    const { data: revenueSkuData, error: revenueError } =
      await this.supabaseService
        .getClient()
        .from("revenue_skus")
        .select("cogs_sku_id")
        .eq("sku_id", revenueSkuId)
        .single();

    if (revenueError) {
      if (revenueError.code === "PGRST116") {
        throw new NotFoundException(`Revenue SKU not found: ${revenueSkuId}`);
      }
      throw new Error(
        `Failed to fetch revenue SKU ${revenueSkuId}: ${revenueError.message}`
      );
    }

    if (!revenueSkuData.cogs_sku_id) {
      throw new NotFoundException(
        `No COGS SKU associated with revenue SKU: ${revenueSkuId}`
      );
    }

    // Now get all COGS monthly breakdown entries for that COGS SKU
    const { data, error } = await this.supabaseService
      .getClient()
      .from("cogs_monthly_breakdown")
      .select("breakdown_id, sku_id, month_number, cogs_amount, phase")
      .eq("sku_id", revenueSkuData.cogs_sku_id)
      .order("month_number", { ascending: true });

    if (error) {
      throw new Error(
        `Failed to fetch COGS breakdown for revenue SKU ${revenueSkuId}: ${error.message}`
      );
    }

    return data || [];
  }

  async getCogsBreakdownWithDetailsForRevenueSku(
    revenueSkuId: string
  ): Promise<CogsBreakdownWithDetails[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from("revenue_skus")
      .select(
        `
        sku_id,
        sku_name,
        cogs_sku_id,
        cogs_skus!inner(
          sku_id,
          sku_name,
          description,
          cogs_monthly_breakdown(
            breakdown_id,
            sku_id,
            month_number,
            cogs_amount,
            phase
          )
        )
      `
      )
      .eq("sku_id", revenueSkuId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundException(`Revenue SKU not found: ${revenueSkuId}`);
      }
      throw new Error(
        `Failed to fetch COGS breakdown details for revenue SKU ${revenueSkuId}: ${error.message}`
      );
    }

    // Handle the case where data.cogs_skus might be an array or single object
    const cogsSkus = Array.isArray(data.cogs_skus)
      ? data.cogs_skus[0]
      : data.cogs_skus;

    if (!cogsSkus?.cogs_monthly_breakdown) {
      return [];
    }

    return cogsSkus.cogs_monthly_breakdown.map((breakdown: any) => ({
      breakdown_id: breakdown.breakdown_id,
      sku_id: breakdown.sku_id,
      month_number: breakdown.month_number,
      cogs_amount: breakdown.cogs_amount,
      phase: breakdown.phase,
      cogs_sku_name: cogsSkus.sku_name,
      cogs_sku_description: cogsSkus.description,
      revenue_sku_name: data.sku_name,
    }));
  }

  async getAggregatedCogsForRevenueSku(
    revenueSkuId: string
  ): Promise<{ [month: number]: number }> {
    const breakdownData = await this.getCogsBreakdownForRevenueSku(
      revenueSkuId
    );

    const aggregated: { [month: number]: number } = {};

    breakdownData.forEach((breakdown) => {
      if (!aggregated[breakdown.month_number]) {
        aggregated[breakdown.month_number] = 0;
      }
      aggregated[breakdown.month_number] += breakdown.cogs_amount;
    });

    return aggregated;
  }

  async getCogsBreakdownByPhaseForRevenueSku(
    revenueSkuId: string
  ): Promise<{ [phase: string]: CogsMonthlyBreakdown[] }> {
    const breakdownData = await this.getCogsBreakdownForRevenueSku(
      revenueSkuId
    );

    const byPhase: { [phase: string]: CogsMonthlyBreakdown[] } = {};

    breakdownData.forEach((breakdown) => {
      const phase = breakdown.phase || "unspecified";
      if (!byPhase[phase]) {
        byPhase[phase] = [];
      }
      byPhase[phase].push(breakdown);
    });

    return byPhase;
  }
}
