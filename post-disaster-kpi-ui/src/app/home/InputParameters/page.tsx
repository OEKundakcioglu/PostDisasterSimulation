"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { CollapsibleSection } from "@/components/CollapsibleSections/CollapsibleSections";
import SimulationConfigSection from "@/components/InputComponents/SimulationConfigSection";
import ItemsSection from "@/components/InputComponents/ItemsSection";
import CampsSection from "@/components/InputComponents/CampsSection";
import AgenciesSection from "@/components/InputComponents/AgenciesSection";
import MigrationsSection from "@/components/InputComponents/MigrationsSection";
import InventoryPoliciesSection from "@/components/InputComponents/InventoryPoliciesSection";
import InitialStateSection from "@/components/InputComponents/InitialStateSection";
import { Item } from "@/types/Item";

// --------------------------------------------------
// Types (could be moved to /types if reused elsewhere)
// --------------------------------------------------
interface SimulationConfig {
  [key: string]: string | boolean;
}
interface CampDemand {
  item: string;
  demandTimingType: string;
  demandQuantityType: string;
  arrivalData: { distributionType: string; distParameters: { mean?: string } };
  internalRatio: string;
  externalRatio: string;
}
interface Camp {
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
interface AgencyFunding {
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
interface Agency {
  name: string;
  fundingArray: AgencyFunding[];
}
interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
  arrivalData: DistBlock;
  quantityData?: DistBlock; // for *_TO_SYSTEM
  migrationRatio: string; // keep required for compatibility; may be '' when unused
}
interface InventoryPolicy {
  bufferRatios: { [campName: string]: { [itemName: string]: string } };
  centralBufferRatios: { [itemName: string]: string };
  periodicCounts: { [campName: string]: { [itemName: string]: string } };
  centralPeriodicCounts: { [itemName: string]: string };
}
interface InitialState {
  availableFunds: string;
  initialInventory: { [campName: string]: { [itemName: string]: string } };
  initialCentralWarehouseInventory: { [itemName: string]: string };
  earmarkedFunds: { [campName: string]: string };
  initialEarmarkedInKind: {
    [campName: string]: { [itemName: string]: string };
  };
  isItemAvailable: { [itemName: string]: boolean };
}
interface DistParams {
  min?: string;
  mode?: string;
  max?: string;
  mean?: string;
  stdDev?: string;
  arrivalInterval?: string;
  initialArrival?: boolean;
}
interface DistBlock {
  distributionType: string;
  distParameters: DistParams;
}

// --------------------------------------------------
// Constants
// --------------------------------------------------
const LS_KEYS = {
  simulationInput: "simulationInputData",
  currentSimulation: "currentSimulationData",
  preserveFlag: "preserveLastConfig",
} as const;

const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
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

const DEFAULT_ITEMS: Item[] = [
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

const DEFAULT_CAMPS: Camp[] = ["Hatay-1", "Hatay-2"].map((name) => ({
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

const DEFAULT_AGENCIES: Agency[] = [
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

const DEFAULT_MIGRATIONS: Migration[] = [
  {
    fromCamp: "Hatay-1",
    toCamp: "Hatay-2",
    migrationType: "INTERNAL_WITHIN_SYSTEM",
    arrivalData: {
      distributionType: "FIXED",
      distParameters: { mean: "120000" },
    },
    migrationRatio: "0.05",
  },
];

const DEFAULT_INVENTORY_POLICY: InventoryPolicy = {
  bufferRatios: {},
  centralBufferRatios: {},
  periodicCounts: {},
  centralPeriodicCounts: {},
};
const DEFAULT_INITIAL_STATE: InitialState = {
  availableFunds: "0",
  initialInventory: {},
  initialCentralWarehouseInventory: {},
  earmarkedFunds: {},
  initialEarmarkedInKind: {},
  isItemAvailable: { HygieneKit: true, Medicine: true },
};

// --------------------------------------------------
// Utility helpers
// --------------------------------------------------
const deepClone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

const ensureNumericValues = <T,>(data: T): T => {
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

const loadSavedConfig = (): Partial<{
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

// --------------------------------------------------
// Component
// --------------------------------------------------
const InputParameters = () => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>(
    DEFAULT_SIMULATION_CONFIG
  );
  const [items, setItems] = useState<Item[]>(DEFAULT_ITEMS);
  const [camps, setCamps] = useState<Camp[]>(DEFAULT_CAMPS);
  const [agencies, setAgencies] = useState<Agency[]>(DEFAULT_AGENCIES);
  const [migrations, setMigrations] = useState<Migration[]>(DEFAULT_MIGRATIONS);
  const [inventoryPolicy, setInventoryPolicy] = useState<InventoryPolicy>(
    DEFAULT_INVENTORY_POLICY
  );
  const [initialState, setInitialState] = useState<InitialState>(
    DEFAULT_INITIAL_STATE
  );

  const prevItemsRef = useRef<Item[]>([]);
  const availabilityRef = useRef(initialState.isItemAvailable);
  const prevCampsRef = useRef<Camp[]>([]); // for detecting renames vs deletions
  const campRenameDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // --------------------------------------------------
  // Effect: Sync camp demands + item availability with items
  // --------------------------------------------------
  useEffect(() => {
    availabilityRef.current = initialState.isItemAvailable;
  }, [initialState.isItemAvailable]);

  useEffect(() => {
    const prevItems = prevItemsRef.current;
    const prevNames = new Set(prevItems.map((i: Item) => i.name));
    const currentNames = new Set(
      items.map((i: Item) => i.name).filter(Boolean)
    );
    const newItems = items.filter(
      (it: Item) => it.name && !prevNames.has(it.name)
    );
    const removed = Array.from(prevNames).filter(
      (name) => name && !currentNames.has(name)
    );
    if (newItems.length || removed.length) {
      setCamps((oldCamps: Camp[]) =>
        oldCamps.map((camp: Camp) => {
          const existingItemNames = new Set(
            camp.demands.map((d: CampDemand) => d.item)
          );
          let demands = camp.demands;
          if (newItems.length) {
            const additions: CampDemand[] = newItems
              .filter((ni: Item) => ni.name && !existingItemNames.has(ni.name))
              .map((ni: Item) => ({
                item: ni.name!,
                demandTimingType: "SPORADIC",
                demandQuantityType: "SINGLE",
                arrivalData: {
                  distributionType: "EXPONENTIAL",
                  distParameters: { mean: "0.033" },
                },
                internalRatio: "0.2",
                externalRatio: "0.02",
              }));
            if (additions.length) demands = [...demands, ...additions];
          }
          if (removed.length)
            demands = demands.filter(
              (d: CampDemand) => !d.item || currentNames.has(d.item)
            );
          return demands === camp.demands ? camp : { ...camp, demands };
        })
      );
    }
    const nextAvailability: Record<string, boolean> = {};
    items.forEach((it: Item) => {
      if (it.name)
        nextAvailability[it.name] = availabilityRef.current[it.name] ?? true;
    });
    const currentAvail = availabilityRef.current;
    let changed =
      Object.keys(nextAvailability).length !== Object.keys(currentAvail).length;
    if (!changed) {
      for (const k of Object.keys(nextAvailability)) {
        if (currentAvail[k] !== nextAvailability[k]) {
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      setInitialState((prev: InitialState) => ({
        ...prev,
        isItemAvailable: nextAvailability,
      }));
    }
    prevItemsRef.current = deepClone(items);
  }, [items]); // items only; internal comparison prevents loops

  // --------------------------------------------------
  // Effect: Load / restore configuration once on mount
  // (merges the previous two similar effects)
  // --------------------------------------------------
  useEffect(() => {
    const shouldPreserve =
      localStorage.getItem(LS_KEYS.preserveFlag) === "true";
    const saved = loadSavedConfig();
    if (saved) {
      if (saved.simulationConfig) setSimulationConfig(saved.simulationConfig);
      if (saved.items) setItems(saved.items);
      if (saved.camps) setCamps(saved.camps);
      if (saved.agencies) setAgencies(saved.agencies);
      if (saved.migrations) setMigrations(saved.migrations);
      if (saved.inventoryPolicy) setInventoryPolicy(saved.inventoryPolicy);
      if (saved.initialState) setInitialState(saved.initialState);
      setSuccessMessage(
        shouldPreserve
          ? "Previous configuration restored successfully!"
          : "Previous configuration loaded successfully!"
      );
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    if (shouldPreserve) localStorage.removeItem(LS_KEYS.preserveFlag);
  }, []);

  // --------------------------------------------------
  // Migration camp reference maintenance (non-destructive)
  // If a camp is removed, we DO NOT delete the migration; we blank the now-invalid side
  // depending on migration type requirements so the user can fix it manually.
  // Type rules:
  //  - *_WITHIN_SYSTEM requires both fromCamp & toCamp
  //  - *_TO_SYSTEM requires only toCamp
  //  - *_FROM_SYSTEM requires only fromCamp
  useEffect(() => {
    // Build rename map: detect single (or multiple) renames where counts unchanged and names mostly same.
    const prev = prevCampsRef.current;
    const prevNames = new Set(prev.map((c) => c.name).filter(Boolean));
    const currentNames = new Set(camps.map((c) => c.name).filter(Boolean));
    const removed = Array.from(prevNames).filter((n) => !currentNames.has(n));
    const added = Array.from(currentNames).filter((n) => !prevNames.has(n));
    // Normalize helper (trim + case-insensitive) so minor edits don't look like deletions
    const normalize = (s: string) => s.trim().toLowerCase();
    // If we see exactly one removed and zero added, we may be mid-rename (user editing the text field)
    if (removed.length === 1 && added.length === 0) {
      // Delay processing to allow the new name to appear
      if (campRenameDebounceRef.current)
        clearTimeout(campRenameDebounceRef.current);
      campRenameDebounceRef.current = setTimeout(() => {
        // Re-run logic after debounce by updating ref and triggering effect manually via a dummy state toggle pattern if needed
        prevCampsRef.current = prev; // keep previous snapshot so next effect run still sees rename pair
        setCamps((c) => [...c]); // force re-render/effect
      }, 600);
      return; // Skip immediate blanking
    }
    const renameMap: Record<string, string> = {};
    // Heuristic: if same counts and removed/added sizes match (often 1), map pairwise by index
    if (
      prev.length === camps.length &&
      removed.length === added.length &&
      removed.length > 0 &&
      removed.length <= 3
    ) {
      for (let i = 0; i < removed.length; i++) {
        // If normalized strings match (e.g., trimming or case change) treat as rename
        if (normalize(removed[i]) === normalize(added[i])) continue; // no actual rename change needed
        renameMap[removed[i]] = added[i];
      }
    } else if (removed.length === 1 && added.length === 1) {
      if (normalize(removed[0]) !== normalize(added[0])) {
        renameMap[removed[0]] = added[0];
      }
    }
    // If camp count did not decrease and we didn't detect a rename, skip blanking entirely to avoid false positives
    if (
      camps.length >= prev.length &&
      Object.keys(renameMap).length === 0 &&
      removed.length === 0
    ) {
      prevCampsRef.current = camps; // still advance snapshot
      return;
    }
    const campNames = new Set(camps.map((c: Camp) => c.name).filter(Boolean));
    setMigrations((prevMigs: Migration[]) => {
      let blanked = false;
      let renamed = false;
      const next = prevMigs.map((m: Migration) => {
        let fromCamp = m.fromCamp;
        let toCamp = m.toCamp;
        const type = m.migrationType || "";
        const within = type.includes("_WITHIN_SYSTEM");
        const toSystem = type.includes("_TO_SYSTEM");
        const fromSystem = type.includes("_FROM_SYSTEM");
        // Attempt rename substitution first
        if (fromCamp && renameMap[fromCamp]) {
          fromCamp = renameMap[fromCamp];
          renamed = true;
        }
        if (toCamp && renameMap[toCamp]) {
          toCamp = renameMap[toCamp];
          renamed = true;
        }
        // Only blank if truly removed (not renamed) and not an empty editing placeholder
        const shouldBlank = (name: string | undefined) =>
          !!name && !campNames.has(name) && !renameMap[name];
        if (within) {
          if (shouldBlank(fromCamp)) {
            fromCamp = "";
            blanked = true;
          }
          if (shouldBlank(toCamp)) {
            toCamp = "";
            blanked = true;
          }
        } else if (toSystem) {
          if (shouldBlank(toCamp)) {
            toCamp = "";
            blanked = true;
          }
        } else if (fromSystem) {
          if (shouldBlank(fromCamp)) {
            fromCamp = "";
            blanked = true;
          }
        }
        if (fromCamp === m.fromCamp && toCamp === m.toCamp) return m;
        return { ...m, fromCamp, toCamp };
      });
      if (blanked) {
        setValidationIssues((iss) => [
          ...iss,
          "Cleared invalid camp references in migrations after camp removal",
        ]);
      } else if (renamed) {
        setValidationIssues((iss) => [
          ...iss,
          "Updated migration camp references after camp rename",
        ]);
      }
      return next;
    });
    prevCampsRef.current = camps;
  }, [camps]);

  // --------------------------------------------------
  // Validate inputs
  // --------------------------------------------------
  const validateDistribution = (
    block: DistBlock | undefined,
    ctx: string,
    required: string[] = []
  ): string[] => {
    const errs: string[] = [];
    if (!block) {
      errs.push(`${ctx}: distribution missing`);
      return errs;
    }
    const dt = block.distributionType;
    if (!dt) errs.push(`${ctx}: distributionType missing`);
    const p = block.distParameters || {};
    const needMean = [
      "EXPONENTIAL",
      "FIXED",
      "EQUAL_SHARE",
      "NORMAL",
      "BERNOULLI",
    ].includes(dt);
    if (needMean && (p.mean === undefined || p.mean === ""))
      errs.push(`${ctx}: mean missing`);
    // Parameter presence per type
    switch (dt) {
      case "TRIANGULAR": {
        const triKeys: (keyof DistParams)[] = ["min", "mode", "max"];
        triKeys.forEach((k) => {
          const val = p[k];
          if (val === undefined || val === "")
            errs.push(`${ctx}: ${k} missing`);
        });
        const { min, mode, max } = p;
        if (min !== undefined && mode !== undefined && max !== undefined) {
          const nMin = Number(min),
            nMode = Number(mode),
            nMax = Number(max);
          if ([nMin, nMode, nMax].some((v) => isNaN(v)))
            errs.push(`${ctx}: triangular params must be numeric`);
          else if (!(nMin <= nMode && nMode <= nMax))
            errs.push(`${ctx}: require min <= mode <= max`);
        }
        break;
      }
      case "UNIFORM": {
        const uniKeys: (keyof DistParams)[] = ["min", "max"];
        uniKeys.forEach((k) => {
          const val = p[k];
          if (val === undefined || val === "")
            errs.push(`${ctx}: ${k} missing`);
        });
        const { min, max } = p;
        if (min !== undefined && max !== undefined) {
          const nMin = Number(min),
            nMax = Number(max);
          if (isNaN(nMin) || isNaN(nMax))
            errs.push(`${ctx}: uniform params must be numeric`);
          else if (nMin > nMax) errs.push(`${ctx}: min must be <= max`);
        }
        break;
      }
      case "NORMAL":
        if (p.stdDev === undefined || p.stdDev === "")
          errs.push(`${ctx}: stdDev missing`);
        if (
          p.stdDev !== undefined &&
          (isNaN(Number(p.stdDev)) || Number(p.stdDev) <= 0)
        )
          errs.push(`${ctx}: stdDev must be > 0`);
        break;
      case "BERNOULLI":
        if (p.mean !== undefined) {
          const mean = Number(p.mean);
          if (isNaN(mean) || mean < 0 || mean > 1)
            errs.push(`${ctx}: mean must be 0-1`);
        }
        if (
          p.arrivalInterval !== undefined &&
          (isNaN(Number(p.arrivalInterval)) || Number(p.arrivalInterval) <= 0)
        )
          errs.push(`${ctx}: arrivalInterval must be > 0`);
        break;
      case "EXPONENTIAL":
      case "FIXED":
      case "EQUAL_SHARE":
        if (
          p.mean !== undefined &&
          (isNaN(Number(p.mean)) || Number(p.mean) < 0)
        )
          errs.push(`${ctx}: mean must be >= 0`);
        break;
    }
    // Generic required keys
    required.forEach((rk) => {
      const key = rk as keyof DistParams;
      if (p[key] === undefined || p[key] === "")
        errs.push(`${ctx}: ${rk} missing`);
    });
    return errs;
  };

  const normalizeInventoryPolicy = useCallback(() => {
    setInventoryPolicy((prev: InventoryPolicy) => {
      const next = deepClone(prev);
      camps.forEach((camp: Camp) => {
        next.bufferRatios[camp.name] = next.bufferRatios[camp.name] || {};
        next.periodicCounts[camp.name] = next.periodicCounts[camp.name] || {};
        items.forEach((it: Item) => {
          if (next.bufferRatios[camp.name][it.name] === undefined)
            next.bufferRatios[camp.name][it.name] = "0";
          if (next.periodicCounts[camp.name][it.name] === undefined)
            next.periodicCounts[camp.name][it.name] = "0";
        });
      });
      items.forEach((it: Item) => {
        if (next.centralBufferRatios[it.name] === undefined)
          next.centralBufferRatios[it.name] = "0";
        if (next.centralPeriodicCounts[it.name] === undefined)
          next.centralPeriodicCounts[it.name] = "0";
      });
      return next;
    });
  }, [camps, items]);

  // --------------------------------------------------
  // Initial State normalization (auto-complete & prune)
  // --------------------------------------------------
  const computeNormalizedInitialState = useCallback(
    (prev: InitialState): InitialState => {
      const campNames = new Set(camps.map((c: Camp) => c.name).filter(Boolean));
      const itemNames = new Set(items.map((i: Item) => i.name).filter(Boolean));
      const next: InitialState = deepClone(prev);

      // initialInventory: add missing camps/items, remove stale
      const newInitialInventory: Record<string, Record<string, string>> = {};
      campNames.forEach((campName) => {
        const existing = next.initialInventory[campName] || {};
        const newItems: Record<string, string> = {};
        itemNames.forEach((itemName) => {
          newItems[itemName] = existing[itemName] ?? "0";
        });
        newInitialInventory[campName] = newItems;
      });
      next.initialInventory = newInitialInventory;

      // initialCentralWarehouseInventory
      const newCentral: Record<string, string> = {};
      itemNames.forEach((itemName) => {
        newCentral[itemName] =
          next.initialCentralWarehouseInventory[itemName] ?? "0";
      });
      next.initialCentralWarehouseInventory = newCentral;

      // earmarkedFunds
      const newEarmarkedFunds: Record<string, string> = {};
      campNames.forEach((campName) => {
        newEarmarkedFunds[campName] = next.earmarkedFunds[campName] ?? "0";
      });
      next.earmarkedFunds = newEarmarkedFunds;

      // initialEarmarkedInKind
      const newInKind: Record<string, Record<string, string>> = {};
      campNames.forEach((campName) => {
        const existing = next.initialEarmarkedInKind[campName] || {};
        const newItems: Record<string, string> = {};
        itemNames.forEach((itemName) => {
          newItems[itemName] = existing[itemName] ?? "0";
        });
        newInKind[campName] = newItems;
      });
      next.initialEarmarkedInKind = newInKind;

      // isItemAvailable
      const newAvailability: Record<string, boolean> = {};
      itemNames.forEach((itemName) => {
        newAvailability[itemName] = next.isItemAvailable[itemName] ?? true; // default available
      });
      next.isItemAvailable = newAvailability;

      return next;
    },
    [camps, items]
  );

  const normalizeInitialState = useCallback(() => {
    setInitialState((prev: InitialState) =>
      computeNormalizedInitialState(prev)
    );
  }, [computeNormalizedInitialState]);

  // --------------------------------------------------
  // Inventory Policy normalization (auto-complete & prune)
  // Ensures every camp/item pair exists in bufferRatios & periodicCounts and
  // every item exists in centralBufferRatios & centralPeriodicCounts. Removes
  // stale entries for deleted camps/items.
  // --------------------------------------------------

  // Auto normalize when camps/items change
  useEffect(() => {
    normalizeInitialState();
    normalizeInventoryPolicy();
  }, [normalizeInitialState, normalizeInventoryPolicy]);

  // --------------------------------------------------
  // Validate inputs
  // --------------------------------------------------
  const validateInputs = useCallback(
    (stateOverride?: InitialState): string[] => {
      const issues: string[] = [];
      const currentInitialState = stateOverride || initialState;

      // Uniqueness checks
      const unique = (arr: string[], label: string) => {
        const seen = new Set<string>();
        arr.forEach((v: string) => {
          if (!v) return;
          if (seen.has(v)) issues.push(`${label} '${v}' duplicated`);
          else seen.add(v);
        });
      };
      unique(
        items.map((i: Item) => i.name),
        "Item"
      );
      unique(
        camps.map((c: Camp) => c.name),
        "Camp"
      );
      unique(
        agencies.map((a: Agency) => a.name),
        "Agency"
      );

      // Items
      items.forEach((it: Item, i: number) => {
        if (!it.name) issues.push(`Item ${i + 1} missing name`);
        const numericKeys: string[] = [
          "price",
          "orderingCost",
          "holdingCost",
          "deprivationRate",
          "deprivationCoefficient",
          "referralCost",
        ];
        numericKeys.forEach((k: string) => {
          const v = (it as unknown as Record<string, unknown>)[k];
          if (v === undefined || v === null || v === "")
            issues.push(`Item ${it.name || i + 1}: ${k} missing`);
          else if (isNaN(Number(v)))
            issues.push(`Item ${it.name}: ${k} not numeric`);
          else if (Number(v) < 0) issues.push(`Item ${it.name}: ${k} negative`);
        });
        // lead time distribution required
        issues.push(
          ...validateDistribution(
            it.leadTimeData as unknown as DistBlock,
            `Item ${it.name} leadTimeData`
          )
        );
        if (it.isPerishable) {
          const dur = (it as unknown as Record<string, unknown>)[
            "durationData"
          ] as DistBlock | undefined;
          if (!dur)
            issues.push(`Item ${it.name} perishable but durationData missing`);
          else
            issues.push(
              ...validateDistribution(dur, `Item ${it.name} durationData`)
            );
        }
      });

      // Camps & Demands
      camps.forEach((c: Camp, i: number) => {
        if (!c.name) issues.push(`Camp ${i + 1} is missing a name`);
        if (
          c.initialInternalPopulation === undefined ||
          c.initialInternalPopulation === "" ||
          isNaN(Number(c.initialInternalPopulation)) ||
          Number(c.initialInternalPopulation) < 0
        )
          issues.push(`Camp ${c.name || i + 1}: internal population invalid`);
        if (
          c.initialExternalPopulation === undefined ||
          c.initialExternalPopulation === "" ||
          isNaN(Number(c.initialExternalPopulation)) ||
          Number(c.initialExternalPopulation) < 0
        )
          issues.push(`Camp ${c.name || i + 1}: external population invalid`);
        // camp lead time
        issues.push(
          ...validateDistribution(
            c.leadTimeData as unknown as DistBlock,
            `Camp ${c.name} leadTimeData`
          )
        );
        c.demands.forEach((d: CampDemand, di: number) => {
          if (!d.item)
            issues.push(`Camp ${c.name}: demand ${di + 1} missing item`);
          issues.push(
            ...validateDistribution(
              d.arrivalData as unknown as DistBlock,
              `Camp ${c.name} / ${d.item || "demand"} arrivalData`
            )
          );
          // quantityData optional – if present validate
          // ratios
          [d.internalRatio, d.externalRatio].forEach(
            (r: string, ri: number) => {
              const label = ri === 0 ? "internal" : "external";
              if (r === undefined || r === null || r === "")
                issues.push(
                  `Camp ${c.name} / ${d.item}: ${label} ratio missing`
                );
              else if (isNaN(Number(r)) || Number(r) < 0 || Number(r) > 1)
                issues.push(
                  `Camp ${c.name} / ${d.item}: ${label} ratio must be 0-1`
                );
            }
          );
        });
      });

      // Migrations
      migrations.forEach((m: Migration, i: number) => {
        const type = m.migrationType || "";
        const ctx = `Migration ${i + 1}`;
        if (!type) issues.push(`${ctx} missing type`);
        const toSystem = type.includes("_TO_SYSTEM");
        const fromSystem = type.includes("_FROM_SYSTEM");
        const within = type.includes("_WITHIN_SYSTEM");
        if (within) {
          if (!m.fromCamp) issues.push(`${ctx} missing fromCamp`);
          if (!m.toCamp) issues.push(`${ctx} missing toCamp`);
          if (m.fromCamp && m.toCamp && m.fromCamp === m.toCamp)
            issues.push(`${ctx} has identical from/to camp`);
        } else if (toSystem) {
          if (!m.toCamp)
            issues.push(`${ctx} missing toCamp (required for *_TO_SYSTEM)`);
        } else if (fromSystem) {
          if (!m.fromCamp)
            issues.push(`${ctx} missing fromCamp (required for *_FROM_SYSTEM)`);
        }
        issues.push(
          ...validateDistribution(
            m.arrivalData as unknown as DistBlock,
            `${ctx} arrivalData`
          )
        );
        if (toSystem) {
          issues.push(
            ...validateDistribution(
              m.quantityData as DistBlock | undefined,
              `${ctx} quantityData`
            )
          );
        } else {
          if (m.migrationRatio === undefined || m.migrationRatio === "")
            issues.push(`${ctx} missing migrationRatio`);
          else if (
            isNaN(Number(m.migrationRatio)) ||
            Number(m.migrationRatio) < 0 ||
            Number(m.migrationRatio) > 1
          )
            issues.push(`${ctx} migrationRatio must be 0-1`);
        }
      });

      // Agencies / Funding
      agencies.forEach((a: Agency, ai: number) => {
        if (!a.name) issues.push(`Agency ${ai + 1} missing name`);
        (a.fundingArray || []).forEach((f: AgencyFunding, fi: number) => {
          const fctx = `Agency ${a.name || ai + 1} funding ${fi + 1}`;
          if (!f.fundingType) issues.push(`${fctx} missing type`);
          issues.push(
            ...validateDistribution(
              f.arrivalData as unknown as DistBlock,
              `${fctx} arrivalData`
            )
          );
          issues.push(
            ...validateDistribution(
              f.amountData as unknown as DistBlock,
              `${fctx} amountData`
            )
          );
          if (f.fundingType?.includes("EARMARKED")) {
            if (!f.camp && !f.item)
              issues.push(`${fctx} earmarked requires camp or item`);
          }
        });
      });

      // Inventory Policy completeness (after normalization we only warn if missing before normalization)
      camps.forEach((c: Camp) =>
        items.forEach((it: Item) => {
          const br = inventoryPolicy.bufferRatios?.[c.name]?.[it.name];
          const pc = inventoryPolicy.periodicCounts?.[c.name]?.[it.name];
          if (br === undefined)
            issues.push(
              `Inventory policy bufferRatio missing for ${c.name}/${it.name}`
            );
          else if (isNaN(Number(br)) || Number(br) < 0)
            issues.push(
              `Inventory policy bufferRatio invalid for ${c.name}/${it.name}`
            );
          if (pc === undefined)
            issues.push(
              `Inventory policy periodicCount missing for ${c.name}/${it.name}`
            );
          else if (!/^\d+$/.test(String(pc)) || Number(pc) < 0)
            issues.push(
              `Inventory policy periodicCount invalid for ${c.name}/${it.name}`
            );
        })
      );
      items.forEach((it: Item) => {
        const cbr = inventoryPolicy.centralBufferRatios?.[it.name];
        const cpc = inventoryPolicy.centralPeriodicCounts?.[it.name];
        if (cbr === undefined)
          issues.push(`Central bufferRatio missing for ${it.name}`);
        else if (isNaN(Number(cbr)) || Number(cbr) < 0)
          issues.push(`Central bufferRatio invalid for ${it.name}`);
        if (cpc === undefined)
          issues.push(`Central periodicCount missing for ${it.name}`);
        else if (!/^\d+$/.test(String(cpc)) || Number(cpc) < 0)
          issues.push(`Central periodicCount invalid for ${it.name}`);
      });

      // Initial State
      if (
        currentInitialState.availableFunds === undefined ||
        currentInitialState.availableFunds === "" ||
        isNaN(Number(currentInitialState.availableFunds)) ||
        Number(currentInitialState.availableFunds) < 0
      )
        issues.push("Initial availableFunds invalid");
      // Ensure all items have availability flags
      items.forEach((it: Item) => {
        if (currentInitialState.isItemAvailable[it.name] === undefined)
          issues.push(`Initial availability missing for item ${it.name}`);
      });

      // Simulation config
      if (
        !simulationConfig.planningHorizon ||
        isNaN(Number(simulationConfig.planningHorizon)) ||
        Number(simulationConfig.planningHorizon) <= 0
      )
        issues.push("Planning horizon invalid");
      if (
        !simulationConfig.inventoryControlPeriod ||
        isNaN(Number(simulationConfig.inventoryControlPeriod)) ||
        Number(simulationConfig.inventoryControlPeriod) <= 0
      )
        issues.push("Inventory control period invalid");

      return issues;
    },
    [
      items,
      camps,
      agencies,
      migrations,
      inventoryPolicy,
      initialState,
      simulationConfig,
    ]
  );

  // --------------------------------------------------
  // Submit handler
  // --------------------------------------------------
  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      normalizeInventoryPolicy();
      // Compute & apply normalized initial state before validation
      const normalizedState = computeNormalizedInitialState(initialState);
      setInitialState(normalizedState); // update react state for UI consistency
      const issues = validateInputs(normalizedState);
      setValidationIssues(issues);
      if (issues.length) {
        setError(
          `Cannot start simulation. Please fix: \n- ${issues.join("\n- ")}`
        );
        return;
      }
      const dataToSend = deepClone({
        simulationConfig,
        items,
        camps,
        agencies,
        migrations,
        inventoryPolicy,
        initialState: normalizedState,
      });
      dataToSend.agencies?.forEach((agency: Agency) =>
        agency.fundingArray?.forEach((f: AgencyFunding) => {
          if (f.item === "") f.item = undefined;
          if (f.camp === "") f.camp = undefined;
        })
      );
      localStorage.setItem(LS_KEYS.simulationInput, JSON.stringify(dataToSend));
      localStorage.setItem(
        LS_KEYS.currentSimulation,
        JSON.stringify(dataToSend)
      );
      const processedData = ensureNumericValues(dataToSend);
      const createResp = await fetch("/api/simulations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });
      const createJson = await createResp.json();
      if (!createResp.ok) {
        setError(createJson.error || "Failed to create simulation session");
        return;
      }
      const sessionId = createJson.id;
      const startResp = await fetch(
        `/api/simulations/start?id=${encodeURIComponent(sessionId)}`,
        { method: "POST" }
      );
      const startJson = await startResp.json();
      if (!startResp.ok) {
        setError(startJson.error || "Failed to start simulation");
        return;
      }
      localStorage.setItem("activeSimulationSessionId", sessionId);
      setSuccessMessage("Simulation started successfully! Redirecting ...");
      router.push(
        `/home/RealTimeVisualization?sessionId=${encodeURIComponent(sessionId)}`
      );
    } catch (e) {
      console.error("Failed to run simulation:", e);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
    validateInputs,
    normalizeInventoryPolicy,
    computeNormalizedInitialState,
    simulationConfig,
    items,
    camps,
    agencies,
    migrations,
    inventoryPolicy,
    initialState,
    router,
  ]);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#000000" }}>
        Simulation Input Parameters
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}
      {validationIssues.length > 0 && !isLoading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>Validation Issues:</strong>
          <ul style={{ margin: "8px 0 0 16px" }}>
            {validationIssues.slice(0, 8).map((v: string, i: number) => (
              <li key={i}>{v}</li>
            ))}
            {validationIssues.length > 8 && (
              <li>...and {validationIssues.length - 8} more</li>
            )}
          </ul>
        </Alert>
      )}

      <Paper sx={{ padding: 4 }}>
        <CollapsibleSection title="Items">
          <ItemsSection items={items} setItems={setItems} />
        </CollapsibleSection>
        <CollapsibleSection title="Camps">
          <CampsSection camps={camps} setCamps={setCamps} items={items} />
        </CollapsibleSection>
        <CollapsibleSection title="Agencies">
          <AgenciesSection
            agencies={agencies}
            setAgencies={setAgencies}
            items={items}
            camps={camps}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Migrations">
          <MigrationsSection
            migrations={migrations}
            setMigrations={setMigrations}
            camps={camps}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Inventory Policies">
          <InventoryPoliciesSection
            inventoryPolicy={inventoryPolicy}
            setInventoryPolicy={setInventoryPolicy}
            camps={camps}
            items={items}
            campBuffer={String(simulationConfig.campBuffer)}
            centralBuffer={String(simulationConfig.centralBuffer)}
            inventoryControlPeriod={String(
              simulationConfig.inventoryControlPeriod
            )}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Initial State">
          <InitialStateSection
            initialState={initialState}
            setInitialState={setInitialState}
            camps={camps}
            items={items}
          />
        </CollapsibleSection>
        <CollapsibleSection title="Simulation Configuration">
          <SimulationConfigSection
            simulationConfig={simulationConfig}
            setSimulationConfig={setSimulationConfig}
          />
        </CollapsibleSection>

        <Box sx={{ mt: 4, display: "flex", alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isLoading}
            sx={{ mr: 2 }}
          >
            {isLoading ? "Running Simulation..." : "Run Simulation"}
          </Button>
          {isLoading && <CircularProgress size={24} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default InputParameters;
