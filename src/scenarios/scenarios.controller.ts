import { Controller, Get } from '@nestjs/common';
import { ScenariosService } from './scenarios.service';

@Controller('scenarios')
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get('waterfall')
  async getWaterfall() {
    return this.scenariosService.calculateWaterfallScenario();
  }
}
