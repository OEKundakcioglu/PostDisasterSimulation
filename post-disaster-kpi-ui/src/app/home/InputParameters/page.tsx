"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";

// Import subcomponents
import SimulationConfigSection from "../../../components/InputComponents/SimulationConfigSection";
import ItemsSection from "../../../components/InputComponents/ItemsSection";
import CampsSection from "../../../components/InputComponents/CampsSection";
import AgenciesSection from "../../../components/InputComponents/AgenciesSection";
import MigrationsSection from "../../../components/InputComponents/MigrationsSection";
import InventoryPoliciesSection from "../../../components/InputComponents/InventoryPoliciesSection";
import InitialStateSection from "../../../components/InputComponents/InitialStateSection";
import { Item } from "../../../types/Item";

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
    seedDemandTime: "10",
    seedDemandQuantity: "15",
    seedItemDuration: "14",
    seedSupplyDisruptionTime: "11",
    seedSupplyDisruptionDuration: "18",
    seedMigrationTime: "13",
    seedMigrationQuantity: "17",
    seedFundingTime: "13",
    seedFundingAmount: "16",
    seedReplenishmentTime: "14",
    seedTransferTime: "15",
    seedTransshipmentTime: "16",
    inventoryControlType: "PERIODIC",
    inventoryControlPeriod: "5",
    planningHorizon: "1080",
    reportEvents: false,
    reportKPIs: true,
    fileName: "C-0.10",
    campBuffer: "0.0",
    centralBuffer: "0.0",
  });

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

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const dataToSend = {
        simulationConfig,
        items,
        camps,
        agencies,
        migrations,
        inventoryPolicy,
        initialState,
      };

      const response = await fetch("/api/runSimulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
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
        {/* Simulation Configuration Section */}
        <SimulationConfigSection
          simulationConfig={simulationConfig}
          setSimulationConfig={setSimulationConfig}
        />

        {/* Items Section */}
        <ItemsSection items={items} setItems={setItems} />

        {/* Camps Section */}
        <CampsSection camps={camps} setCamps={setCamps} items={items} />

        {/* Agencies Section */}
        <AgenciesSection agencies={agencies} setAgencies={setAgencies} />

        {/* Migrations Section */}
        <MigrationsSection
          migrations={migrations}
          setMigrations={setMigrations}
          camps={camps}
        />

        {/* Inventory Policies Section */}
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

        {/* Initial State Section */}
        <InitialStateSection
          initialState={initialState}
          setInitialState={setInitialState}
          camps={camps}
          items={items}
        />

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
