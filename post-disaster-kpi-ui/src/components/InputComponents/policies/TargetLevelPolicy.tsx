import React from "react";
import { Grid, TextField, Typography, Box } from "@mui/material";
import { Item } from "../../../types/Item";
import { NestedCollapsibleSection } from "../../CollapsibleSections/CollapsibleSections";
import { TargetLevelPolicy as TargetLevelPolicyType } from "@/lib/simulationInput/types";

interface Camp {
  name: string;
}

interface Props {
  policy: TargetLevelPolicyType;
  setPolicy: (policy: TargetLevelPolicyType) => void;
  camps: Camp[];
  items: Item[];
}

const TargetLevelPolicy: React.FC<Props> = ({
  policy,
  setPolicy,
  camps,
  items,
}) => {
  const handleTargetLevelChange = (
    campName: string,
    itemName: string,
    value: string
  ) => {
    if (value === "" || /^-?\d*$/.test(value)) {
      setPolicy({
        ...policy,
        targetLevels: {
          ...policy.targetLevels,
          [campName]: {
            ...policy.targetLevels[campName],
            [itemName]: value,
          },
        },
      });
    }
  };

  const handleCentralTargetLevelChange = (itemName: string, value: string) => {
    if (value === "" || /^-?\d*$/.test(value)) {
      setPolicy({
        ...policy,
        centralTargetLevels: {
          ...policy.centralTargetLevels,
          [itemName]: value,
        },
      });
    }
  };

  const handleThresholdChange = (value: string) => {
    if (value === "" || /^0(\.\d*)?$|^1(\.0*)?$/.test(value)) {
      const numValue = parseFloat(value);
      if (value === "" || (numValue >= 0 && numValue <= 1)) {
        setPolicy({
          ...policy,
          threshold: value,
        });
      }
    }
  };

  const handleInventoryControlPeriodChange = (value: string) => {
    if (value === "" || /^\d*$/.test(value)) {
      setPolicy({
        ...policy,
        inventoryControlPeriod: value,
      });
    }
  };

  return (
    <>
      {/* Inventory Control Period Field */}
      <NestedCollapsibleSection
        title="Inventory Control Settings"
        level="secondary"
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Inventory Control Period (days)"
              type="number"
              inputProps={{ step: 1, min: 1 }}
              value={policy.inventoryControlPeriod || ""}
              onChange={(e) =>
                handleInventoryControlPeriodChange(e.target.value)
              }
              helperText="How often (in days) to review and reorder inventory"
            />
          </Grid>
        </Grid>
      </NestedCollapsibleSection>

      {/* Threshold Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Reorder Threshold
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Orders are placed when inventory falls below this fraction of the
          target level (0-1)
        </Typography>
        <TextField
          label="Threshold"
          type="number"
          inputProps={{ step: 0.01, min: 0, max: 1 }}
          value={policy.threshold || ""}
          onChange={(e) => handleThresholdChange(e.target.value)}
          sx={{ width: "200px" }}
          helperText="Value between 0 and 1"
        />
      </Box>

      {/* Target Levels Section */}
      <NestedCollapsibleSection title="Camp Target Levels" level="secondary">
        {camps.map((camp) => (
          <NestedCollapsibleSection
            key={`target-${camp.name}`}
            title={`${camp.name} Target Levels`}
            level="tertiary"
          >
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={`${camp.name}-${item.name}-target`}
                >
                  <TextField
                    fullWidth
                    label={`${item.name} Target Level`}
                    type="number"
                    inputProps={{ step: 1, min: 0 }}
                    value={policy.targetLevels[camp.name]?.[item.name] || ""}
                    onChange={(e) =>
                      handleTargetLevelChange(
                        camp.name,
                        item.name,
                        e.target.value
                      )
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </NestedCollapsibleSection>
        ))}
      </NestedCollapsibleSection>

      {/* Central Target Levels Section */}
      <NestedCollapsibleSection title="Central Target Levels" level="secondary">
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={`central-target-${item.name}`}
            >
              <TextField
                fullWidth
                label={`${item.name} Central Target Level`}
                type="number"
                inputProps={{ step: 1, min: 0 }}
                value={policy.centralTargetLevels[item.name] || ""}
                onChange={(e) =>
                  handleCentralTargetLevelChange(item.name, e.target.value)
                }
              />
            </Grid>
          ))}
        </Grid>
      </NestedCollapsibleSection>
    </>
  );
};

export default TargetLevelPolicy;
