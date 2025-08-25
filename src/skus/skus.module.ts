import { Module } from '@nestjs/common';
import { SkusController } from './skus.controller';
import { SkusService } from './skus.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [SkusController],
  providers: [SkusService],
})
export class SkusModule {}
