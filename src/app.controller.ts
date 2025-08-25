import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { SupabaseService } from "./supabase/supabase.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly supabaseService: SupabaseService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("health")
  getHealth(): object {
    return this.appService.getHealth();
  }

  @Get("db-status")
  async getDatabaseStatus(): Promise<object> {
    const connectionTest = await this.supabaseService.testConnection();
    return {
      database: connectionTest.connected ? "connected" : "disconnected",
      error: connectionTest.error || null,
      timestamp: new Date().toISOString(),
    };
  }
}
