import {
  SimulationConfig,
  InventoryPolicy,
  InitialState,
  Agency,
  AgencyFunding,
  Camp,
  CampDemand,
  Migration,
} from "./types";
import { Item } from "@/types/Item";

export const LS_KEYS = {
  simulationInput: "simulationInputConfig",
  currentSimulation: "currentSimulation",
  preserveFlag: "preserveInputConfig",
};

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
  inventoryControlType: "PERIODIC",
  inventoryControlPeriod: "5",
  planningHorizon: "1080",
  reportEvents: false,
  reportKPIs: true,
  fileName: "C-0.10",
  campBuffer: "0.0",
  centralBuffer: "0.0",
};

export const DEFAULT_ITEMS: Item[] = [];
export const DEFAULT_CAMPS: Camp[] = [];
export const DEFAULT_AGENCIES: Agency[] = [];
export const DEFAULT_MIGRATIONS: Migration[] = [];
export const DEFAULT_INVENTORY_POLICY: InventoryPolicy = {
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
  isItemAvailable: {},
};
