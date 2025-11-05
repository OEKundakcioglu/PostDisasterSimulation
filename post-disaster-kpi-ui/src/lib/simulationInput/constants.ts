// Constants extracted from the original InputParameters component
import {
  SimulationConfig,
  Camp,
  Agency,
  Migration,
  InventoryPolicy,
  InitialState,
} from "./types";
import { Item } from "@/types/Item";

export const LS_KEYS = {
  simulationInput: "simulationInputData",
  currentSimulation: "currentSimulationData",
  preserveFlag: "preserveLastConfig",
} as const;

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  seedDemandTime: "0",
  seedDemandQuantity: "0",
  seedItemDuration: "0",
  seedSupplyDisruptionTime: "0",
  seedSupplyDisruptionDuration: "0",
  seedMigrationTime: "0",
  seedMigrationQuantity: "0",
  seedFundingTime: "0",
  seedFundingAmount: "0",
  seedReplenishmentTime: "0",
  seedTransferTime: "0",
  seedTransshipmentTime: "0",
  planningHorizon: "1080",
  reportEvents: false,
  reportKPIs: true,
  fileName: "C-0.10",
  campBuffer: "0.0",
  centralBuffer: "0.0",
};

export const DEFAULT_ITEMS: Item[] = [
  {
    name: "HygieneKit",
    isPerishable: false,
    price: "5",
    orderingCost: "1200",
    holdingCost: "1",
    deprivationRate: "0.12",
    deprivationCoefficient: "1",
    referralCost: "2",
    leadTimeData: {
      distributionType: "TRIANGULAR",
      distParameters: { min: "1", mode: "2", max: "4" },
    },
  },
  {
    name: "Medicine",
    isPerishable: true,
    price: "12",
    orderingCost: "2400",
    holdingCost: "1",
    deprivationRate: "0.245",
    deprivationCoefficient: "1",
    referralCost: "4",
    durationData: {
      distributionType: "UNIFORM",
      distParameters: { min: "30", max: "60" },
    },
    leadTimeData: {
      distributionType: "TRIANGULAR",
      distParameters: { min: "1", mode: "2", max: "4" },
    },
  },
];

export const DEFAULT_CAMPS: Camp[] = ["Hatay-1", "Hatay-2"].map((name) => ({
  name,
  leadTimeData: {
    distributionType: "TRIANGULAR",
    distParameters: { min: "1", mode: "2", max: "4" },
  },
  demands: [
    {
      item: "HygieneKit",
      demandTimingType: "SPORADIC",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: { mean: "0.033" },
      },
      internalRatio: "0.5",
      externalRatio: "0.05",
    },
    {
      item: "Medicine",
      demandTimingType: "SPORADIC",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: { mean: "0.0167" },
      },
      internalRatio: "0.2",
      externalRatio: "0.02",
    },
  ],
  campExternalDemandSatisfactionType: "FULLY",
  populationType: "REGULAR",
  initialInternalPopulation: "2142",
  initialExternalPopulation: "144105",
}));

export const DEFAULT_AGENCIES: Agency[] = [
  {
    name: "Government",
    fundingArray: [
      {
        fundingType: "MONETARY_REGULAR",
        arrivalData: {
          distributionType: "BERNOULLI",
          distParameters: {
            mean: "1.0",
            arrivalInterval: "1090",
            initialArrival: true,
          },
        },
        amountData: {
          distributionType: "EQUAL_SHARE",
          distParameters: { mean: "14900000" },
        },
      },
    ],
  },
];

export const DEFAULT_MIGRATIONS: Migration[] = [
  {
    fromCamp: "Hatay-1",
    toCamp: "Hatay-2",
    migrationType: "INTERNAL_WITHIN_SYSTEM",
    arrivalData: {
      distributionType: "FIXED",
      distParameters: { mean: "120000" },
    },
    migrationRatio: 0.05,
  },
];

export const DEFAULT_INVENTORY_POLICY: InventoryPolicy = {
  policyType: "ORDER_UP_TO",
  inventoryControlPeriod: "5",
  bufferRatios: {},
  centralBufferRatios: {},
  periodicCounts: {},
  centralPeriodicCounts: {},
};

export const DEFAULT_INITIAL_STATE: InitialState = {
  availableFunds: "0",
  initialInventory: {},
  initialCentralWarehouseInventory: {},
  earmarkedFunds: {},
  initialEarmarkedInKind: {},
  isItemAvailable: { HygieneKit: true, Medicine: true },
};
