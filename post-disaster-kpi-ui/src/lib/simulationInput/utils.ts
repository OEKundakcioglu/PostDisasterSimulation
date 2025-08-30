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
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
