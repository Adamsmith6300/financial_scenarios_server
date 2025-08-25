import { Controller, Get } from '@nestjs/common';
import { SkusService } from './skus.service';

@Controller('skus')
export class SkusController {
  constructor(private readonly skusService: SkusService) {}

  @Get('cogs')
  async getAllCogsSkus() {
    return this.skusService.getAllCogsSkus();
  }

  @Get('revenue')
  async getAllRevenueSkus() {
    return this.skusService.getAllRevenueSkus();
  }
}
