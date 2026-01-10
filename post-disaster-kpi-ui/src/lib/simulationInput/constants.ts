// Constants extracted from the original InputParameters component
import {
  SimulationConfig,
  Camp,
  Agency,
  Migration,
  InventoryPolicy,
  InitialState,
  SupplyDisruption,
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
  demands: [
    {
      item: "HygieneKit",
      demandClass: "INTERNAL",
      demandTimingType: "RECURRING",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: { mean: "60" },
      },
      leadTimeData: {
        distributionType: "TRIANGULAR",
        distParameters: { min: "1", mode: "2", max: "4" },
      },
    },
    {
      item: "HygieneKit",
      demandClass: "EXTERNAL",
      demandTimingType: "RECURRING",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: { mean: "60" },
      },
      leadTimeData: {
        distributionType: "TRIANGULAR",
        distParameters: { min: "1", mode: "2", max: "4" },
      },
    },
    {
      item: "Medicine",
      demandClass: "INTERNAL",
      demandTimingType: "RECURRING",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: { mean: "120" },
      },
      leadTimeData: {
        distributionType: "TRIANGULAR",
        distParameters: { min: "1", mode: "2", max: "4" },
      },
    },
    {
      item: "Medicine",
      demandClass: "EXTERNAL",
      demandTimingType: "RECURRING",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: { mean: "120" },
      },
      leadTimeData: {
        distributionType: "TRIANGULAR",
        distParameters: { min: "1", mode: "2", max: "4" },
      },
    },
  ],
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
          distributionType: "FIXED",
          distParameters: {
            mean: "0",
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

export const DEFAULT_SUPPLY_DISRUPTIONS: SupplyDisruption[] = [];

// Initialize Target Level Policy with proper default values for all camps and items
const initializeTargetLevelPolicy = (): InventoryPolicy => {
  const targetLevels: Record<
    string,
    Record<
      string,
      {
        S_targetRatio: string;
        S_targetLevel: string;
        rationingThreshold: string;
      }
    >
  > = {};
  const centralTargetLevels: Record<
    string,
    { S_targetRatio: string; S_targetLevel: string }
  > = {};
  const thresholdRatios: Record<string, Record<string, string>> = {};

  // Initialize for all default camps and items
  DEFAULT_CAMPS.forEach((camp) => {
    targetLevels[camp.name] = {};
    thresholdRatios[camp.name] = {};
    DEFAULT_ITEMS.forEach((item) => {
      targetLevels[camp.name][item.name] = {
        S_targetRatio: "1.5",
        S_targetLevel: "0",
        rationingThreshold: "0",
      };
      thresholdRatios[camp.name][item.name] = "0.2";
    });
  });

  DEFAULT_ITEMS.forEach((item) => {
    centralTargetLevels[item.name] = {
      S_targetRatio: "1.5",
      S_targetLevel: "0",
    };
  });

  return {
    policyType: "TARGET_LEVEL",
    inventoryControlPeriod: "5",
    targetLevels,
    centralTargetLevels,
    thresholdRatios,
  };
};

export const DEFAULT_INVENTORY_POLICY: InventoryPolicy =
  initializeTargetLevelPolicy();

export const DEFAULT_INITIAL_STATE: InitialState = {
  availableFunds: "0",
  initialInventory: {},
  initialCentralWarehouseInventory: {},
  earmarkedFunds: {},
  isItemAvailable: { HygieneKit: true, Medicine: true },
};
