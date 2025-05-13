"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";

// Import collapsible components
import {
  CollapsibleSection,
  NestedCollapsibleSection,
} from "../../../components/CollapsibleSections/CollapsibleSections";

// Import subcomponents
import SimulationConfigSection from "../../../components/InputComponents/SimulationConfigSection";
import ItemsSection from "../../../components/InputComponents/ItemsSection";
import CampsSection from "../../../components/InputComponents/CampsSection";
import AgenciesSection from "../../../components/InputComponents/AgenciesSection";
import MigrationsSection from "../../../components/InputComponents/MigrationsSection";
import InventoryPoliciesSection from "../../../components/InputComponents/InventoryPoliciesSection";
import InitialStateSection from "../../../components/InputComponents/InitialStateSection";
import { Item } from "../../../types/Item";

// All interface definitions remain the same
interface SimulationConfig {
  [key: string]: string | boolean;
}

interface CampDemand {
  item: string;
  demandTimingType: string;
  demandQuantityType: string;
  arrivalData: {
    distributionType: string;
    distParameters: {
      mean?: string;
    };
  };
  internalRatio: string;
  externalRatio: string;
}

interface Camp {
  name: string;
  leadTimeData: {
    distributionType: string;
    distParameters: {
      min?: string;
      mode?: string;
      max?: string;
    };
  };
  demands: CampDemand[];
  campExternalDemandSatisfactionType: string;
  populationType: string;
  initialInternalPopulation: string;
  initialExternalPopulation: string;
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
  amountData: {
    distributionType: string;
    distParameters: {
      mean?: string;
    };
  };
}

interface Agency {
  name: string;
  fundingArray: AgencyFunding[];
}

interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
  arrivalData: {
    distributionType: string;
    distParameters: {
      mean?: string;
    };
  };
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

const InputParameters = () => {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [simulationConfig, setSimulationConfig] = useState<SimulationConfig>({
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
  });

  // Add this helper function to safely handle type conversions
  const ensureNumericValues = (data: any) => {
    if (!data) return data;

    // Make a deep copy to avoid modifying the original
    const result = JSON.parse(JSON.stringify(data));

    // Helper to recursively process objects
    const processObject = (obj: any) => {
      if (!obj || typeof obj !== "object") return;

      Object.keys(obj).forEach((key) => {
        const value = obj[key];

        // Handle arrays
        if (Array.isArray(value)) {
          value.forEach((item) => processObject(item));
          return;
        }

        // Process nested objects
        if (typeof value === "object" && value !== null) {
          processObject(value); // Recursively process nested objects
          return;
        }

        // Convert string numbers to actual numbers
        if (typeof value === "string" && /^-?\d*\.?\d*$/.test(value)) {
          const numValue = value.includes(".")
            ? parseFloat(value)
            : parseInt(value, 10);

          if (!isNaN(numValue)) {
            obj[key] = numValue;
          }
        }
      });
    };

    processObject(result);
    return result;
  };

  const [items, setItems] = useState<Item[]>([
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
        distParameters: {
          min: "1",
          mode: "2",
          max: "4",
        },
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
        distParameters: {
          min: "30",
          max: "60",
        },
      },
      leadTimeData: {
        distributionType: "TRIANGULAR",
        distParameters: {
          min: "1",
          mode: "2",
          max: "4",
        },
      },
    },
  ]);

  const [camps, setCamps] = useState<Camp[]>([
    {
      name: "Hatay-1",
      leadTimeData: {
        distributionType: "TRIANGULAR",
        distParameters: {
          min: "1",
          mode: "2",
          max: "4",
        },
      },
      demands: [
        {
          item: "HygieneKit",
          demandTimingType: "SPORADIC",
          demandQuantityType: "SINGLE",
          arrivalData: {
            distributionType: "EXPONENTIAL",
            distParameters: {
              mean: "0.033",
            },
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
            distParameters: {
              mean: "0.0167",
            },
          },
          internalRatio: "0.2",
          externalRatio: "0.02",
        },
      ],
      campExternalDemandSatisfactionType: "FULLY",
      populationType: "REGULAR",
      initialInternalPopulation: "2142",
      initialExternalPopulation: "144105",
    },
    {
      name: "Hatay-2",
      leadTimeData: {
        distributionType: "TRIANGULAR",
        distParameters: {
          min: "1",
          mode: "2",
          max: "4",
        },
      },
      demands: [
        {
          item: "HygieneKit",
          demandTimingType: "SPORADIC",
          demandQuantityType: "SINGLE",
          arrivalData: {
            distributionType: "EXPONENTIAL",
            distParameters: {
              mean: "0.033",
            },
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
            distParameters: {
              mean: "0.0167",
            },
          },
          internalRatio: "0.2",
          externalRatio: "0.02",
        },
      ],
      campExternalDemandSatisfactionType: "FULLY",
      populationType: "REGULAR",
      initialInternalPopulation: "2142",
      initialExternalPopulation: "144105",
    },
  ]);

  const [agencies, setAgencies] = useState<Agency[]>([
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
            distParameters: {
              mean: "14900000",
            },
          },
        },
      ],
    },
  ]);

  const [migrations, setMigrations] = useState<Migration[]>([
    {
      fromCamp: "Hatay-1",
      toCamp: "Hatay-2",
      migrationType: "INTERNAL_WITHIN_SYSTEM",
      arrivalData: {
        distributionType: "FIXED",
        distParameters: {
          mean: "120000",
        },
      },
      migrationRatio: "0.05",
    },
  ]);

  const [inventoryPolicy, setInventoryPolicy] = useState<InventoryPolicy>({
    bufferRatios: {},
    centralBufferRatios: {},
    periodicCounts: {},
    centralPeriodicCounts: {},
  });

  const [initialState, setInitialState] = useState<InitialState>({
    availableFunds: "0",
    initialInventory: {},
    initialCentralWarehouseInventory: {},
    earmarkedFunds: {},
    initialEarmarkedInKind: {},
    isItemAvailable: {
      HygieneKit: true,
      Medicine: true,
    },
  });

  // Create ref at component level
  const prevItemsRef = React.useRef<Item[]>([]);

  // Replace the existing useEffect that handles items changes with this one
  useEffect(() => {
    // Find newly added items by comparing current items with previous items
    const newItems = items.filter(
      (item) =>
        item.name &&
        !prevItemsRef.current.some((prevItem) => prevItem.name === item.name)
    );

    if (newItems.length > 0) {
      // For each new item, add it as a demand to all camps but only if they don't already have it
      const updatedCamps = camps.map((camp) => {
        // Create a copy of the camp
        const updatedCamp = { ...camp };
        const campItemNames = new Set(
          updatedCamp.demands.map((demand) => demand.item)
        );

        // For each new item, create a new demand ONLY if it doesn't exist already
        newItems.forEach((newItem) => {
          if (newItem.name && !campItemNames.has(newItem.name)) {
            // Only add if item has a name AND camp doesn't already have this item
            updatedCamp.demands.push({
              item: newItem.name,
              demandTimingType: "SPORADIC",
              demandQuantityType: "SINGLE",
              arrivalData: {
                distributionType: "EXPONENTIAL",
                distParameters: { mean: "0.033" },
              },
              internalRatio: "0.2",
              externalRatio: "0.02",
            });
          }
        });

        return updatedCamp;
      });

      // Update camps without triggering the effect again
      setCamps(updatedCamps);
    }

    // Clean up deleted items from camps - only if items were actually deleted
    const itemNames = new Set(items.map((item) => item.name).filter(Boolean));
    const itemsDeleted = prevItemsRef.current.some(
      (prevItem) => prevItem.name && !itemNames.has(prevItem.name)
    );

    if (itemsDeleted) {
      const updatedCamps = camps.map((camp) => {
        const updatedDemands = camp.demands.filter((demand) => {
          return !demand.item || itemNames.has(demand.item);
        });

        return {
          ...camp,
          demands: updatedDemands,
        };
      });

      setCamps(updatedCamps);
    }

    // Update initialState's isItemAvailable mapping
    const newIsItemAvailable: { [itemName: string]: boolean } = {};
    items.forEach((item) => {
      if (item.name) {
        newIsItemAvailable[item.name] =
          initialState.isItemAvailable[item.name] !== undefined
            ? initialState.isItemAvailable[item.name]
            : true;
      }
    });

    setInitialState((prev) => ({
      ...prev,
      isItemAvailable: newIsItemAvailable,
    }));

    // Update our ref for the next run
    prevItemsRef.current = JSON.parse(JSON.stringify(items));
  }, [items]); // Remove camps from dependency array to prevent infinite loops

  // Add this effect to load saved configuration
  useEffect(() => {
    try {
      // Check if we have saved configuration data
      const savedInputData = localStorage.getItem("simulationInputData");
      if (savedInputData) {
        const parsedData = JSON.parse(savedInputData);

        // Restore all configuration from saved data
        if (parsedData.simulationConfig)
          setSimulationConfig(parsedData.simulationConfig);
        if (parsedData.items) setItems(parsedData.items);
        if (parsedData.camps) setCamps(parsedData.camps);
        if (parsedData.agencies) setAgencies(parsedData.agencies);
        if (parsedData.migrations) setMigrations(parsedData.migrations);
        if (parsedData.inventoryPolicy)
          setInventoryPolicy(parsedData.inventoryPolicy);
        if (parsedData.initialState) setInitialState(parsedData.initialState);

        // Show success message
        setSuccessMessage("Previous configuration loaded successfully!");
        // Clear message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error("Error loading saved configuration:", error);
    }
  }, []);

  // In InputParameters/page.tsx in the existing useEffect
  useEffect(() => {
    try {
      // Check if we were redirected from the visualization page
      const preserveLastConfig = localStorage.getItem("preserveLastConfig");

      if (preserveLastConfig === "true") {
        // Clear the flag
        localStorage.removeItem("preserveLastConfig");

        // Get saved input data
        const savedInputData = localStorage.getItem("simulationInputData");
        if (savedInputData) {
          try {
            const parsedData = JSON.parse(savedInputData);

            // Restore all configuration from saved data
            if (parsedData.simulationConfig)
              setSimulationConfig(parsedData.simulationConfig);
            if (parsedData.items) setItems(parsedData.items);
            if (parsedData.camps) setCamps(parsedData.camps);
            if (parsedData.agencies) setAgencies(parsedData.agencies);
            if (parsedData.migrations) setMigrations(parsedData.migrations);
            if (parsedData.inventoryPolicy)
              setInventoryPolicy(parsedData.inventoryPolicy);
            if (parsedData.initialState)
              setInitialState(parsedData.initialState);

            setSuccessMessage("Previous configuration restored successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
          } catch (parseError) {
            console.error("Error parsing saved configuration:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Error loading saved configuration:", error);
    }
  }, []);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Create a deep copy of the data to modify
      const dataToSend = JSON.parse(
        JSON.stringify({
          simulationConfig,
          items,
          camps,
          agencies,
          migrations,
          inventoryPolicy,
          initialState,
        })
      );

      // Normalize agency funding data to ensure property names match backend expectations
      if (dataToSend.agencies) {
        dataToSend.agencies.forEach((agency: any) => {
          if (agency.fundingArray) {
            agency.fundingArray.forEach((funding: any) => {
              // Ensure empty strings are null to avoid backend issues
              if (funding.item === "") funding.item = null;
              if (funding.camp === "") funding.camp = null;
            });
          }
        });
      }

      // Save raw data to localStorage for later use
      localStorage.setItem("simulationInputData", JSON.stringify(dataToSend));
      localStorage.setItem("currentSimulationData", JSON.stringify(dataToSend));

      // Process data for API submission to ensure correct types
      const processedData = ensureNumericValues(dataToSend);

      const response = await fetch("/api/runSimulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processedData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          "Simulation started successfully! Redirecting to visualization page..."
        );

        setTimeout(() => {
          router.push("/home/RealTimeVisualization");
        }, 1500);
      } else {
        setError(
          data.error || "An error occurred while running the simulation."
        );
      }
    } catch (err) {
      console.error("Failed to run simulation:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#000000" }}>
        Simulation Input Parameters
      </Typography>

      {/* Error and Success Messages */}
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
        {/* Sections reordered as requested */}
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

        {/* Submit Button with Loading State */}
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
