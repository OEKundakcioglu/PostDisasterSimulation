import React from "react";
import {
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Box,
  IconButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";

interface SimulationConfig {
  [key: string]: string | boolean;
}

interface Props {
  simulationConfig: SimulationConfig;
  setSimulationConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
}

const SimulationConfigSection: React.FC<Props> = ({
  simulationConfig,
  setSimulationConfig,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    // For number inputs, only update if it's a valid number or empty string
    if (type === "number") {
      // Different validation for different types of numeric fields
      if (name === "campBuffer" || name === "centralBuffer") {
        // For buffer ratios, allow decimals (0-1 range typically)
        if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
          setSimulationConfig((prev) => ({
            ...prev,
            [name]: value,
          }));
        }
      } else if (
        name === "inventoryControlPeriod" ||
        name === "planningHorizon"
      ) {
        // For periods, only allow positive integers
        if (value === "" || /^\d*$/.test(value)) {
          setSimulationConfig((prev) => ({
            ...prev,
            [name]: value,
          }));
        }
      } else {
        // For other numeric inputs
        if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
          setSimulationConfig((prev) => ({
            ...prev,
            [name]: value,
          }));
        }
      }
    } else if (type === "checkbox") {
      setSimulationConfig((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setSimulationConfig((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle direct keyboard input for numeric fields
  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, decimal point, navigation
    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        ".",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
      ].indexOf(e.key) !== -1 ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      ((e.ctrlKey || e.metaKey) &&
        ["a", "c", "v", "x"].indexOf(e.key.toLowerCase()) !== -1)
    ) {
      // Allow normal operation
      return;
    }

    // Ensure that it is a number and stop the keypress if not
    if ((e.shiftKey || e.key < "0" || e.key > "9") && e.key !== ".") {
      e.preventDefault();
    }
  };

  // Group configuration items by type or purpose if needed
  const groupedConfig: { [category: string]: string[] } = {
    "Inventory Settings": [],
    "Time Parameters": [],
    "Seed Parameters": [],
    "Advanced Options": [],
  };

  // Sort configuration keys into categories based on name patterns
  Object.keys(simulationConfig).forEach((key) => {
    // Skip reportKPIs, reportEvents, fileName as they'll be passed to YAML but hidden from UI
    if (key === "reportKPIs" || key === "reportEvents" || key === "fileName") {
      return;
    }

    // Skip inventoryControlType as we'll always use PERIODIC
    if (key === "inventoryControlType") {
      return;
    }

    // Special case for inventory control period - move to inventory settings
    if (
      key === "inventoryControlPeriod" ||
      key === "campBuffer" ||
      key === "centralBuffer"
    ) {
      groupedConfig["Inventory Settings"].push(key);
    }
    // Group all seed parameters together
    else if (key.toLowerCase().includes("seed")) {
      groupedConfig["Seed Parameters"].push(key);
    } else if (key === "planningHorizon") {
      groupedConfig["Time Parameters"].push(key);
    } else if (
      key.toLowerCase().includes("time") ||
      key.toLowerCase().includes("period") ||
      key.toLowerCase().includes("duration")
    ) {
      groupedConfig["Time Parameters"].push(key);
    } else if (
      key.toLowerCase().includes("enable") ||
      key.toLowerCase().includes("use") ||
      typeof simulationConfig[key] === "boolean"
    ) {
      groupedConfig["Advanced Options"].push(key);
    } else {
      groupedConfig["Inventory Settings"].push(key);
    }
  });

  const seedExplanation =
    "Seed numbers control the randomization in the simulation. Using the same seed values will " +
    "reproduce identical random sequences, allowing for consistent results across multiple simulation runs. " +
    "Different seeds will generate different random patterns for events like demand timing, quantities, and funding arrivals.";

  // Custom labels for specific fields
  const getCustomLabel = (key: string) => {
    switch (key) {
      case "inventoryControlPeriod":
        return "Inventory Control Period (days)";
      case "planningHorizon":
        return "Planning Horizon (days)";
      default:
        return String(key);
    }
  };

  // Determine if a field should be numeric input
  const isNumericField = (key: string): boolean => {
    // Fields that should be numbers
    return (
      key.toLowerCase().includes("seed") ||
      key === "inventoryControlPeriod" ||
      key === "planningHorizon" ||
      key === "campBuffer" ||
      key === "centralBuffer" ||
      key.toLowerCase().includes("time") ||
      key.toLowerCase().includes("period") ||
      key.toLowerCase().includes("duration") ||
      key.toLowerCase().includes("ratio") ||
      key.toLowerCase().includes("quantity") ||
      key.toLowerCase().includes("amount") ||
      key.toLowerCase().includes("rate") ||
      key.toLowerCase().includes("coefficient")
    );
  };

  return (
    <>
      {Object.entries(groupedConfig).map(([category, keys]) =>
        keys.length > 0 ? (
          <NestedCollapsibleSection
            key={category}
            title={
              category === "Seed Parameters" ? (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {category}
                  <Tooltip title={seedExplanation} arrow placement="top">
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                category
              )
            }
            level="secondary"
          >
            <Grid container spacing={2}>
              {keys.map((key) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  {typeof simulationConfig[key] === "boolean" ? (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={simulationConfig[key] as boolean}
                          onChange={handleChange}
                          name={String(key)}
                        />
                      }
                      label={key}
                    />
                  ) : (
                    <TextField
                      fullWidth
                      name={String(key)}
                      label={getCustomLabel(key)}
                      type={isNumericField(key) ? "number" : "text"}
                      inputProps={{
                        min: 0, // Assuming all numeric values should be positive
                        step:
                          key === "campBuffer" || key === "centralBuffer"
                            ? "0.01"
                            : "1", // Use decimal steps for ratios
                        inputMode: isNumericField(key) ? "numeric" : "text",
                        pattern: isNumericField(key)
                          ? "[0-9]*(.[0-9]+)?"
                          : undefined,
                      }}
                      value={simulationConfig[key] as string}
                      onChange={handleChange}
                      onKeyDown={
                        isNumericField(key) ? handleNumericKeyDown : undefined
                      }
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </NestedCollapsibleSection>
        ) : null
      )}
    </>
  );
};

export default SimulationConfigSection;
