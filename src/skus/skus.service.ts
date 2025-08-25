import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SkusService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getAllCogsSkus() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('cogs_skus')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch COGS SKUs: ${error.message}`);
    }

    return data;
  }

  async getAllRevenueSkus() {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('revenue_skus')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch Revenue SKUs: ${error.message}`);
    }

    return data;
  }
}
