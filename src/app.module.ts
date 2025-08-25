import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from "./supabase/supabase.module";
import { SkusModule } from "./skus/skus.module";
import { ScenariosModule } from "./scenarios/scenarios.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    SkusModule,
    ScenariosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
