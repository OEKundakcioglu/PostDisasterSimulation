"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { CollapsibleSection } from "@/components/CollapsibleSections/CollapsibleSections";
import SimulationConfigSection from "@/components/InputComponents/SimulationConfigSection";
import ItemsSection from "@/components/InputComponents/ItemsSection";
import CampsSection from "@/components/InputComponents/CampsSection";
import AgenciesSection from "@/components/InputComponents/AgenciesSection";
import MigrationsSection from "@/components/InputComponents/MigrationsSection";
import InventoryPoliciesSection from "@/components/InputComponents/InventoryPoliciesSection";
import InitialStateSection from "@/components/InputComponents/InitialStateSection";
import { useSimulationInputLogic } from "@/lib/simulationInput/useSimulationInputLogic";

const InputParameters = () => {
  // Use the custom hook that contains all the logic
  const {
    // State
    isLoading,
    error,
    successMessage,
    validationIssues,
    simulationConfig,
    items,
    camps,
    agencies,
    migrations,
    inventoryPolicy,
    initialState,
    // Setters
    setSimulationConfig,
    setItems,
    setCamps,
    setAgencies,
    setMigrations,
    setInventoryPolicy,
    setInitialState,
    // Actions
    handleSubmit,
  } = useSimulationInputLogic();

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
