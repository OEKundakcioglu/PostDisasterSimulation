// Utility functions extracted from the original InputParameters component
import { LS_KEYS } from "./constants";
import {
  SimulationConfig,
  InventoryPolicy,
  InitialState,
  Agency,
  Camp,
  Migration,
} from "./types";
import { Item } from "@/types/Item";

export const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const ensureNumericValues = <T>(data: T): T => {
  if (data === null || data === undefined) return data;
  const coerce = (val: unknown): unknown => {
    if (
      typeof val === "string" &&
      /^-?\d*\.?\d*$/.test(val) &&
      val.trim() !== ""
    ) {
      const num = val.includes(".") ? parseFloat(val) : parseInt(val, 10);
      return isNaN(num) ? val : num;
    }
    if (Array.isArray(val)) return val.map(coerce);
    if (val && typeof val === "object") {
      const entries = Object.entries(val as Record<string, unknown>).map(
        ([k, v]) => [k, coerce(v)] as const
      );
      return Object.fromEntries(entries);
    }
    return val;
  };
  return coerce(data) as T;
};

const DEFAULT_LEAD_TIME_DATA = {
  distributionType: "TRIANGULAR",
  distParameters: { min: "1", mode: "2", max: "4" },
};

const DEFAULT_ARRIVAL_DATA = {
  distributionType: "EXPONENTIAL",
  distParameters: { mean: "0.033" },
};

interface LegacyItem extends Omit<Partial<Item>, "leadTimeData"> {
  leadTimeData?: unknown;
}

interface LegacyDemand {
  arrivalData?: unknown;
  leadTimeData?: unknown;
  [key: string]: unknown;
}

interface LegacyCamp extends Omit<Partial<Camp>, "demands"> {
  demands?: LegacyDemand[];
}

interface LegacyConfig {
  simulationConfig?: SimulationConfig;
  items?: LegacyItem[];
  camps?: LegacyCamp[];
  agencies?: Agency[];
  migrations?: Migration[];
  inventoryPolicy?: InventoryPolicy;
  initialState?: InitialState;
}

const sanitizeConfig = (config: unknown): Partial<LegacyConfig> => {
  if (!config || typeof config !== "object") return {};

  const typedConfig = config as LegacyConfig;

  if (Array.isArray(typedConfig.items)) {
    typedConfig.items = typedConfig.items.map((item) => ({
      ...item,
      leadTimeData: item.leadTimeData || deepClone(DEFAULT_LEAD_TIME_DATA),
    }));
  }

  if (Array.isArray(typedConfig.camps)) {
    typedConfig.camps = typedConfig.camps.map((camp) => ({
      ...camp,
      demands: Array.isArray(camp.demands)
        ? camp.demands.map((demand) => ({
            ...demand,
            arrivalData: demand.arrivalData || deepClone(DEFAULT_ARRIVAL_DATA),
            leadTimeData:
              demand.leadTimeData || deepClone(DEFAULT_LEAD_TIME_DATA),
          }))
        : [],
    }));
  }

  return typedConfig;
};

export const loadSavedConfig = (): Partial<{
  simulationConfig: SimulationConfig;
  items: Item[];
  camps: Camp[];
  agencies: Agency[];
  migrations: Migration[];
  inventoryPolicy: InventoryPolicy;
  initialState: InitialState;
}> | null => {
  try {
    const raw = localStorage.getItem(LS_KEYS.simulationInput);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // We know sanitizeConfig returns a structure compatible with the return type
    // providing we trust the LegacyConfig shape overlaps sufficiently.
    return sanitizeConfig(parsed) as any;
  } catch {
    return null;
  }
};
