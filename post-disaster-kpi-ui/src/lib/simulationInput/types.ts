// Types extracted from the original InputParameters component
import { Item } from "@/types/Item";

export interface SimulationConfig {
  [key: string]: string | boolean;
}

export interface CampDemand {
  item: string;
  demandTimingType: string;
  demandQuantityType: string;
  arrivalData: { distributionType: string; distParameters: { mean?: string } };
  leadTimeData: {
    distributionType: string;
    distParameters: { min?: string; mode?: string; max?: string; mean?: string };
  };
  internalRatio: string;
  externalRatio: string;
}

export interface Camp {
  name: string;
  demands: CampDemand[];
  initialInternalPopulation: string;
  initialExternalPopulation: string;
}

export interface AgencyFunding {
  fundingType: string;
  item?: string;
  camp?: string;
  arrivalData: {
    distributionType: string;
    distParameters: {
      mean?: string;
      arrivalInterval?: string;
      initialArrival?: boolean;
    };
  };
  amountData: { distributionType: string; distParameters: { mean?: string } };
}

export interface Agency {
  name: string;
  fundingArray: AgencyFunding[];
}

export interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
  arrivalData: DistBlock;
  quantityData?: DistBlock; // for *_TO_SYSTEM
  migrationRatio: number;
}

export type InventoryPolicyType = "ORDER_UP_TO" | "TARGET_LEVEL";

export interface OrderUpToPolicy {
  policyType: "ORDER_UP_TO";
  inventoryControlPeriod: string;
  bufferRatios: { [campName: string]: { [itemName: string]: string } };
  centralBufferRatios: { [itemName: string]: string };
  periodicCounts: { [campName: string]: { [itemName: string]: string } };
  centralPeriodicCounts: { [itemName: string]: string };
}

export interface TargetLevelPolicy {
  policyType: "TARGET_LEVEL";
  inventoryControlPeriod: string;
  targetLevels: {
    [campName: string]: {
      [itemName: string]: string | {
        internal: string; // float between 0 and 1
        external: string; // float between 0 and 1
      };
    };
  };
  centralTargetLevels: { [itemName: string]: string };
  thresholdRatios: { [campName: string]: { [itemName: string]: string } };
  centralThresholdRatios: { [itemName: string]: string };
}

export type InventoryPolicy = OrderUpToPolicy | TargetLevelPolicy;

export interface InitialState {
  availableFunds: string;
  initialInventory: { [campName: string]: { [itemName: string]: string } };
  initialCentralWarehouseInventory: { [itemName: string]: string };
  earmarkedFunds: { [campName: string]: string };
  isItemAvailable: { [itemName: string]: boolean };
}

export interface DistParams {
  min?: string;
  mode?: string;
  max?: string;
  mean?: string;
  stdDev?: string;
  arrivalInterval?: string;
  initialArrival?: boolean;
}

export interface DistBlock {
  distributionType: string;
  distParameters: DistParams;
}

export interface SupplyDisruption {
  item: string;
  disruptionArrivalData: DistBlock;
  recoveryArrivalData: DistBlock;
}

export type { Item };
