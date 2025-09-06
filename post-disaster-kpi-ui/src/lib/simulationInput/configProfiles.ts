// Configuration profile management utilities
import { Item } from "@/types/Item";
import {
  SimulationConfig,
  Camp,
  Agency,
  Migration,
  InventoryPolicy,
  InitialState,
} from "./types";

export interface ConfigProfile {
  name: string;
  description?: string;
  createdAt: string;
  simulationConfig: SimulationConfig;
  items: Item[];
  camps: Camp[];
  agencies: Agency[];
  migrations: Migration[];
  inventoryPolicy: InventoryPolicy;
  initialState: InitialState;
}

const PROFILES_KEY = "simulationConfigProfiles";

export const saveConfigProfile = (
  name: string,
  config: Omit<ConfigProfile, "name" | "createdAt">,
  description?: string
): void => {
  try {
    const profiles = getConfigProfiles();
    const newProfile: ConfigProfile = {
      name,
      description,
      createdAt: new Date().toISOString(),
      ...config,
    };
    
    // Replace if exists, otherwise add
    const existingIndex = profiles.findIndex(p => p.name === name);
    if (existingIndex >= 0) {
      profiles[existingIndex] = newProfile;
    } else {
      profiles.push(newProfile);
    }
    
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error("Failed to save config profile:", error);
  }
};

export const getConfigProfiles = (): ConfigProfile[] => {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load config profiles:", error);
    return [];
  }
};

export const loadConfigProfile = (name: string): ConfigProfile | null => {
  const profiles = getConfigProfiles();
  return profiles.find(p => p.name === name) || null;
};

export const deleteConfigProfile = (name: string): void => {
  try {
    const profiles = getConfigProfiles().filter(p => p.name !== name);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error("Failed to delete config profile:", error);
  }
};

export const exportConfigProfile = (profile: ConfigProfile): void => {
  const blob = new Blob([JSON.stringify(profile, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${profile.name}-config.json`;
  a.click();
  URL.revokeObjectURL(url);
};
