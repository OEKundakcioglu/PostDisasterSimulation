// types/kpiTypes.ts

export interface CampKPI {
  deprivationCost: Record<string, number>;
  replenishmentCost: Record<string, number>;
  holdingCost: Record<string, number>;
  referralCost: Record<string, number>;
  orderingCost: Record<string, number>;
  deprivedPopulation: number;
  referralPopulation: number;
  averageDeprivationTime: Record<string, number>;
}

export interface GlobalKPIs {
  totalReplenishmentCostSummation: number;
  totalOrderingCostSummation: number;
  totalDeprivationCostSummation: number;
  totalReferralCostSummation: number;
  totalHoldingCostSummation: number;
  totalDeprivedPopulation: number;
  totalReferralPopulation: number;
  totalFundingSpent: number;
}

export interface KPIData {
  camps: Record<string, CampKPI>;
  globalKPIs: GlobalKPIs;
}
