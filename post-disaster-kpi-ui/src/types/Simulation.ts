/* Global data models for Post‑Disaster Simulation UI */

export interface SimulationConfig {
  seedDemandTime: string;
  seedDemandQuantity: string;
  seedItemDuration: string;
  seedSupplyDisruptionTime: string;
  seedSupplyDisruptionDuration: string;
  seedMigrationTime: string;
  seedMigrationQuantity: string;
  seedFundingTime: string;
  seedFundingAmount: string;
  seedReplenishmentTime: string;
  seedTransferTime: string;
  seedTransshipmentTime: string;
  planningHorizon: string;
  reportEvents: boolean;
  reportKPIs: boolean;
  fileName: string;
  campBuffer: string;
  centralBuffer: string;
}

export interface LeadTime {
  distributionType: string;
  distParameters: {
    min?: string;
    mode?: string;
    max?: string;
  };
}

export interface DurationData {
  distributionType: string;
  distParameters: {
    min: string;
    max: string;
  };
}

export interface Item {
  name: string;
  isPerishable: boolean;
  price: string;
  orderingCost: string;
  holdingCost: string;
  deprivationRate: string;
  deprivationCoefficient: string;
  referralCost: string;
  durationData?: DurationData;
  leadTimeData: LeadTime;
}

export interface CampDemand {
  item: string;
  demandTimingType: string;
  demandQuantityType: string;
  arrivalData: {
    distributionType: string;
    distParameters: { mean?: string };
  };
  leadTimeData?: {
    distributionType: string;
    distParameters: { min?: string; mode?: string; max?: string; mean?: string };
  };
  internalRatio: string;
  externalRatio: string;
}

export interface Camp {
  name: string;
  demands: CampDemand[];
  campExternalDemandSatisfactionType: string;
  populationType: string;
  initialInternalPopulation: string;
  initialExternalPopulation: string;
}

export interface AgencyFunding {
  fundingType: string;
  arrivalData: {
    distributionType: string;
    distParameters: {
      mean?: string;
      arrivalInterval?: string;
      initialArrival?: boolean;
    };
  };
  amountData: {
    distributionType: string;
    distParameters: { mean?: string };
  };
}

export interface Agency {
  name: string;
  fundingArray: AgencyFunding[];
}

export interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
  arrivalData: {
    distributionType: string;
    distParameters: { mean?: string };
  };
  migrationRatio: number;
}

export type InventoryPolicyType = "ORDER_UP_TO" | "TARGET_LEVEL";

export interface OrderUpToPolicy {
  policyType: "ORDER_UP_TO";
  inventoryControlPeriod: string;
  bufferRatios: Record<string, Record<string, string>>;
  centralBufferRatios: Record<string, string>;
  periodicCounts: Record<string, Record<string, string>>;
  centralPeriodicCounts: Record<string, string>;
}

export type TargetLevelValue =
  | string
  | {
      internal: string;
      external: string;
    };

export interface TargetLevelPolicy {
  policyType: "TARGET_LEVEL";
  inventoryControlPeriod: string;
  targetLevels: Record<string, Record<string, TargetLevelValue>>;
  centralTargetLevels: Record<string, string>;
  thresholdRatios: Record<string, Record<string, string>>;
  centralThresholdRatios: Record<string, string>;
}

export type InventoryPolicy = OrderUpToPolicy | TargetLevelPolicy;

export interface InitialState {
  availableFunds: string;
  initialInventory: Record<string, Record<string, string>>;
  initialCentralWarehouseInventory: Record<string, string>;
  earmarkedFunds: Record<string, string>;
  initialEarmarkedInKind: Record<string, Record<string, string>>;
  isItemAvailable: Record<string, boolean>;
}

export interface DistributionParameters {
  min?: string;
  mode?: string;
  max?: string;
  mean?: string;
  stdDev?: string;
  arrivalInterval?: string;
  initialArrival?: boolean;
}

export interface DistributionBlock {
  distributionType: string;
  distParameters: DistributionParameters;
}

export interface SupplyDisruption {
  item: string;
  disruptionArrivalData: DistributionBlock;
  recoveryArrivalData: DistributionBlock;
}
