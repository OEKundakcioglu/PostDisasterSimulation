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
  internalRatio: string;
  externalRatio: string;
}

export interface Camp {
  name: string;
  leadTimeData: {
    distributionType: string;
    distParameters: { min?: string; mode?: string; max?: string };
  };
  demands: CampDemand[];
  campExternalDemandSatisfactionType: string;
  populationType: string;
  initialInternalPopulation: string;
  initialExternalPopulation: string;
  externalDemandSatisfactionThreshold?: string;
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

export interface InventoryPolicy {
  bufferRatios: { [campName: string]: { [itemName: string]: string } };
  centralBufferRatios: { [itemName: string]: string };
  periodicCounts: { [campName: string]: { [itemName: string]: string } };
  centralPeriodicCounts: { [itemName: string]: string };
}

export interface InitialState {
  availableFunds: string;
  initialInventory: { [campName: string]: { [itemName: string]: string } };
  initialCentralWarehouseInventory: { [itemName: string]: string };
  earmarkedFunds: { [campName: string]: string };
  initialEarmarkedInKind: {
    [campName: string]: { [itemName: string]: string };
  };
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

export type { Item };
