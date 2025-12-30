import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Box,
  IconButton,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";
import DeleteIcon from "@mui/icons-material/Delete";

// Helper function to convert uppercase macros to readable format
const formatLabel = (value: string): string => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface DistBlock {
  distributionType: string;
  distParameters: {
    min?: string;
    mode?: string;
    max?: string;
    mean?: string;
    stdDev?: string;
  };
}

interface SupplyDisruption {
  item: string;
  disruptionArrivalData: DistBlock;
  recoveryArrivalData: DistBlock;
}

interface Item {
  name: string;
}

interface Props {
  supplyDisruptions: SupplyDisruption[];
  setSupplyDisruptions: React.Dispatch<React.SetStateAction<SupplyDisruption[]>>;
  items: Item[];
}

const SupplyDisruptionsSection: React.FC<Props> = ({
  supplyDisruptions,
  setSupplyDisruptions,
  items,
}) => {
  const handleDisruptionChange = (
    index: number,
    field: keyof SupplyDisruption,
    value: string,
    dataType?: "disruptionArrivalData" | "recoveryArrivalData",
    subField?: "distributionType",
    paramField?: keyof DistBlock["distParameters"]
  ) => {
    const newDisruptions = [...supplyDisruptions];

    if (dataType && subField === "distributionType") {
      // Changing distribution type
      newDisruptions[index][dataType].distributionType = value;
      // Reset parameters based on new distribution type
      newDisruptions[index][dataType].distParameters = getDefaultDistParameters(value);
    } else if (dataType && paramField) {
      // Changing distribution parameter
      if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
        newDisruptions[index][dataType].distParameters = {
          ...newDisruptions[index][dataType].distParameters,
          [paramField]: value,
        };
      } else {
        return; // Skip invalid input
      }
    } else if (field === "item") {
      newDisruptions[index].item = value;
    }

    setSupplyDisruptions(newDisruptions);
  };

  const getDefaultDistParameters = (
    distributionType: string
  ): DistBlock["distParameters"] => {
    switch (distributionType) {
      case "TRIANGULAR":
        return { min: "1", mode: "2", max: "4" };
      case "EXPONENTIAL":
        return { mean: "30" };
      case "UNIFORM":
        return { min: "1", max: "4" };
      case "NORMAL":
        return { mean: "30", stdDev: "5" };
      case "FIXED":
        return { mean: "30" };
      default:
        return { mean: "30" };
    }
  };

  const handleAddDisruption = () => {
    setSupplyDisruptions([
      ...supplyDisruptions,
      {
        item: items.length > 0 ? items[0].name : "",
        disruptionArrivalData: {
          distributionType: "EXPONENTIAL",
          distParameters: { mean: "180" },
        },
        recoveryArrivalData: {
          distributionType: "EXPONENTIAL",
          distParameters: { mean: "30" },
        },
      },
    ]);
  };

  const handleDeleteDisruption = (index: number) => {
    const newDisruptions = [...supplyDisruptions];
    newDisruptions.splice(index, 1);
    setSupplyDisruptions(newDisruptions);
  };

  const renderDistributionParameters = (
    disruption: SupplyDisruption,
    index: number,
    dataType: "disruptionArrivalData" | "recoveryArrivalData"
  ) => {
    const data = disruption[dataType];
    const distType = data.distributionType;
    const params = data.distParameters;

    switch (distType) {
      case "TRIANGULAR":
        return (
          <>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Min"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={params.min || ""}
                onChange={(e) =>
                  handleDisruptionChange(
                    index,
                    "item",
                    e.target.value,
                    dataType,
                    undefined,
                    "min"
                  )
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Mode"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={params.mode || ""}
                onChange={(e) =>
                  handleDisruptionChange(
                    index,
                    "item",
                    e.target.value,
                    dataType,
                    undefined,
                    "mode"
                  )
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={params.max || ""}
                onChange={(e) =>
                  handleDisruptionChange(
                    index,
                    "item",
                    e.target.value,
                    dataType,
                    undefined,
                    "max"
                  )
                }
              />
            </Grid>
          </>
        );

      case "EXPONENTIAL":
      case "FIXED":
        return (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Mean (days)"
              type="number"
              inputProps={{ min: 0, step: 1 }}
              value={params.mean || ""}
              onChange={(e) =>
                handleDisruptionChange(
                  index,
                  "item",
                  e.target.value,
                  dataType,
                  undefined,
                  "mean"
                )
              }
            />
          </Grid>
        );

      case "UNIFORM":
        return (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Min"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={params.min || ""}
                onChange={(e) =>
                  handleDisruptionChange(
                    index,
                    "item",
                    e.target.value,
                    dataType,
                    undefined,
                    "min"
                  )
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Max"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={params.max || ""}
                onChange={(e) =>
                  handleDisruptionChange(
                    index,
                    "item",
                    e.target.value,
                    dataType,
                    undefined,
                    "max"
                  )
                }
              />
            </Grid>
          </>
        );

      case "NORMAL":
        return (
          <>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mean"
                type="number"
                inputProps={{ step: 0.01 }}
                value={params.mean || ""}
                onChange={(e) =>
                  handleDisruptionChange(
                    index,
                    "item",
                    e.target.value,
                    dataType,
                    undefined,
                    "mean"
                  )
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Standard Deviation"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                value={params.stdDev || ""}
                onChange={(e) =>
                  handleDisruptionChange(
                    index,
                    "item",
                    e.target.value,
                    dataType,
                    undefined,
                    "stdDev"
                  )
                }
              />
            </Grid>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {supplyDisruptions.map((disruption, disruptionIndex) => (
        <NestedCollapsibleSection
          key={`disruption-${disruptionIndex}`}
          title={
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                Supply Disruption {disruptionIndex + 1}
                {disruption.item ? `: ${disruption.item}` : ""}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      `Are you sure you want to delete this supply disruption?`
                    )
                  ) {
                    handleDeleteDisruption(disruptionIndex);
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          }
          level="secondary"
        >
          <Grid container spacing={2}>
            {/* Item Selection */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Item</InputLabel>
                <Select
                  label="Item"
                  value={disruption.item}
                  onChange={(e) =>
                    handleDisruptionChange(disruptionIndex, "item", e.target.value)
                  }
                >
                  {items.map((item) => (
                    <MenuItem key={item.name} value={item.name}>
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Disruption Arrival Data */}
          <NestedCollapsibleSection
            title="Disruption Timing"
            level="tertiary"
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Distribution Type</InputLabel>
                  <Select
                    label="Distribution Type"
                    value={disruption.disruptionArrivalData.distributionType}
                    onChange={(e) =>
                      handleDisruptionChange(
                        disruptionIndex,
                        "item",
                        e.target.value,
                        "disruptionArrivalData",
                        "distributionType"
                      )
                    }
                  >
                    <MenuItem value="TRIANGULAR">
                      {formatLabel("TRIANGULAR")}
                    </MenuItem>
                    <MenuItem value="EXPONENTIAL">
                      {formatLabel("EXPONENTIAL")}
                    </MenuItem>
                    <MenuItem value="UNIFORM">{formatLabel("UNIFORM")}</MenuItem>
                    <MenuItem value="NORMAL">{formatLabel("NORMAL")}</MenuItem>
                    <MenuItem value="FIXED">{formatLabel("FIXED")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {renderDistributionParameters(
                disruption,
                disruptionIndex,
                "disruptionArrivalData"
              )}
            </Grid>
          </NestedCollapsibleSection>

          {/* Recovery Arrival Data */}
          <NestedCollapsibleSection
            title="Recovery Duration"
            level="tertiary"
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Distribution Type</InputLabel>
                  <Select
                    label="Distribution Type"
                    value={disruption.recoveryArrivalData.distributionType}
                    onChange={(e) =>
                      handleDisruptionChange(
                        disruptionIndex,
                        "item",
                        e.target.value,
                        "recoveryArrivalData",
                        "distributionType"
                      )
                    }
                  >
                    <MenuItem value="TRIANGULAR">
                      {formatLabel("TRIANGULAR")}
                    </MenuItem>
                    <MenuItem value="EXPONENTIAL">
                      {formatLabel("EXPONENTIAL")}
                    </MenuItem>
                    <MenuItem value="UNIFORM">{formatLabel("UNIFORM")}</MenuItem>
                    <MenuItem value="NORMAL">{formatLabel("NORMAL")}</MenuItem>
                    <MenuItem value="FIXED">{formatLabel("FIXED")}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {renderDistributionParameters(
                disruption,
                disruptionIndex,
                "recoveryArrivalData"
              )}
            </Grid>
          </NestedCollapsibleSection>
        </NestedCollapsibleSection>
      ))}

      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleAddDisruption}
          disabled={items.length === 0}
        >
          Add Supply Disruption
        </Button>
      </Box>
    </>
  );
};

export default SupplyDisruptionsSection;


