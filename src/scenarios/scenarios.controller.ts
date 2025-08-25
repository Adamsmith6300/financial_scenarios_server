import { Controller, Get, Post, Body } from "@nestjs/common";
import { ScenariosService } from "./scenarios.service";

export interface GenerateScenarioRequest {
  name: string;
  skuItems: Array<{
    skuId: string;
    startMonth: number;
    quantity: number;
    growthType: "percentage" | "increment" | "none";
    growthValue?: number;
  }>;
}

@Controller("scenarios")
export class ScenariosController {
  constructor(private readonly scenariosService: ScenariosService) {}

  @Get("waterfall")
  async getWaterfall() {
    return this.scenariosService.calculateWaterfallScenario();
  }

  @Post("generate")
  async generateScenario(@Body() request: GenerateScenarioRequest) {
    return this.scenariosService.calculateDynamicScenario(request);
  }
}
