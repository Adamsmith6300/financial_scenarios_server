import { Module } from '@nestjs/common';
import { ScenariosController } from './scenarios.controller';
import { ScenariosService } from './scenarios.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { SkusModule } from "../skus/skus.module";

@Module({
  imports: [SupabaseModule, SkusModule],
  controllers: [ScenariosController],
  providers: [ScenariosService],
})
export class ScenariosModule {}
