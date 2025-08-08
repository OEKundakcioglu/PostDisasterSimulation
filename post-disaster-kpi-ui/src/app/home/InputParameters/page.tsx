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
  arrivalData: { distributionType: string; distParameters: { mean?: string } };
  migrationRatio: string;
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

  // --------------------------------------------------
  // Effect: Sync camp demands + item availability with items
  // --------------------------------------------------
  useEffect(() => {
    availabilityRef.current = initialState.isItemAvailable;
  }, [initialState.isItemAvailable]);

  useEffect(() => {
    const prevItems = prevItemsRef.current;
    const prevNames = new Set(prevItems.map((i) => i.name));
    const currentNames = new Set(items.map((i) => i.name).filter(Boolean));
    const newItems = items.filter((it) => it.name && !prevNames.has(it.name));
    const removed = Array.from(prevNames).filter(
      (name) => name && !currentNames.has(name)
    );
    if (newItems.length || removed.length) {
      setCamps((oldCamps) =>
        oldCamps.map((camp) => {
          const existingItemNames = new Set(camp.demands.map((d) => d.item));
          let demands = camp.demands;
          if (newItems.length) {
            const additions: CampDemand[] = newItems
              .filter((ni) => ni.name && !existingItemNames.has(ni.name))
              .map((ni) => ({
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
              (d) => !d.item || currentNames.has(d.item)
            );
          return demands === camp.demands ? camp : { ...camp, demands };
        })
      );
    }
    const nextAvailability: Record<string, boolean> = {};
    items.forEach((it) => {
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
      setInitialState((prev) => ({
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
  // Submit handler
  // --------------------------------------------------
  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      const dataToSend = deepClone({
        simulationConfig,
        items,
        camps,
        agencies,
        migrations,
        inventoryPolicy,
        initialState,
      });
      dataToSend.agencies?.forEach((agency) =>
        agency.fundingArray?.forEach((f) => {
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
      const response = await fetch("/api/runSimulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          "Simulation started successfully! Redirecting to visualization page..."
        );
        console.log("pushing now to /home/RealTimeVisualization");
        router.push("/home/RealTimeVisualization");
      } else {
        setError(
          data.error || "An error occurred while running the simulation."
        );
      }
    } catch (e) {
      console.error("Failed to run simulation:", e);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [
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
