import React from "react";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
    Typography,
    Grid,
    TextField,
    Button,
    MenuItem,
    Box,
    IconButton,
    FormControlLabel,
    Checkbox, Tooltip, Paper, Divider, Chip
} from "@mui/material";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import { Stack } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';

// Helper function to convert uppercase macros to readable format
const formatLabel = (value: string): string => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface CampDemand {
  item: string;
  demandTimingType: string;
  demandQuantityType: string;
  arrivalData: {
    distributionType: string;
    distParameters: {
      min?: string;
      mode?: string;
      max?: string;
      mean?: string;
      stdDev?: string;
      arrivalInterval?: string;
      initialArrival?: boolean;
    };
  };
  quantityData: {
    distributionType: string;
    distParameters: {
        min?: string;
        mode?: string;
        max?: string;
        mean?: string;
        stdDev?: string;
        arrivalInterval?: string;
        initialArrival?: boolean;
    };
  };
  leadTimeData: {
    distributionType: string;
    distParameters: {
      min?: string;
      mode?: string;
      max?: string;
      mean?: string;
      stdDev?: string;
      arrivalInterval?: string;
      initialArrival?: boolean;
    };
  };
  internalRatio: string;
  externalRatio: string;
}

interface Camp {
  name: string;
  demands: CampDemand[];
  initialInternalPopulation: string;
  initialExternalPopulation: string;
}

interface Item {
  name: string;
}

interface Props {
  camps: Camp[];
  setCamps: React.Dispatch<React.SetStateAction<Camp[]>>;
  items: Item[];
}

const explanations = {
    leadTime:
        "Lead time is the delay between when an order is placed and when it is received. It affects inventory planning and response time.",
    demandRatio:
        "Demand ratios specify the proportion of demand coming from internal vs external populations. Adjusting these affects resource allocation.",
    interArrivalData:
        "Inter-arrival data defines the timing between consecutive demand occurrences. Mean defines the demand per day per person, " +
        "and initial arrival indicates if there is an immediate demand at the start of the simulation.",
    quantityData:
        "Quantity data defines how much individuals demand at each occurrence, rather than assuming one demand per occurrence. " +
        "Mean defines the average quantity demanded per occurrence, while standard deviation captures variability in that quantity.",
};

const CampsSection: React.FC<Props> = ({ camps, setCamps, items }) => {
  const handleCampChange = (
    index: number,
    field: keyof Camp,
    value: string | boolean
  ) => {
    const newCamps = [...camps];

    // Add validation for numeric fields
    if (
      field === "initialInternalPopulation" ||
      field === "initialExternalPopulation"
    ) {
      if (typeof value === "string" && (value === "" || /^\d*$/.test(value))) {
        newCamps[index][field] = value;
      } else {
        return; // Skip update if invalid
      }
    } else {
      // Default handling for top-level simple fields
      if (field === "name") newCamps[index].name = value as string;
    }

    setCamps(newCamps);
  };

  // New helper function to create a default demand for an item
  const createDefaultDemandForItem = (itemName: string): CampDemand => {
    return {
      item: itemName,
      demandTimingType: "RECURRING",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: {
          mean: "0.033",
        },
      },
        quantityData: {
            distributionType: "EXPONENTIAL",
            distParameters: {
                mean: "0.033",
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
      internalRatio: "0.2",
      externalRatio: "0.02",
    };
  };

  // Update the Add Camp button click handler
  const handleAddCamp = () => {
    // Create default demands for all items
    const defaultDemands = items
      .filter((item) => item.name) // Only include items with names
      .map((item) => createDefaultDemandForItem(item.name));

    setCamps([
      ...camps,
      {
        name: "",
        demands: defaultDemands, // Populate with demands for all existing items
        initialInternalPopulation: "0",
        initialExternalPopulation: "0",
      },
    ]);
  };

  return (
    <>
      {camps.map((camp, campIndex) => (
        <NestedCollapsibleSection
          key={`camp-${campIndex}`}
          title={
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                Camp {campIndex + 1}
                {camp.name ? `: ${camp.name}` : ""}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent collapsing when clicking delete
                  if (
                    window.confirm(
                      `Are you sure you want to delete this camp${
                        camp.name ? ` (${camp.name})` : ""
                      }?`
                    )
                  ) {
                    const newCamps = [...camps];
                    newCamps.splice(campIndex, 1);
                    setCamps(newCamps);
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
            {/* Basic Camp Information - Now Collapsible */}
            <Grid item xs={12}>
              <NestedCollapsibleSection
                title="Basic Camp Information"
                level="tertiary"
              >
                <Grid container spacing={2}>
                  {/* Name */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Name"
                      value={camp.name}
                      onChange={(e) =>
                        handleCampChange(campIndex, "name", e.target.value)
                      }
                    />
                  </Grid>

                  {/* Initial Population */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Initial Internal Population"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={camp.initialInternalPopulation}
                      onChange={(e) =>
                        handleCampChange(
                          campIndex,
                          "initialInternalPopulation",
                          e.target.value
                        )
                      }
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Initial External Population"
                      type="number"
                      inputProps={{ min: 0, step: 1 }}
                      value={camp.initialExternalPopulation}
                      onChange={(e) =>
                        handleCampChange(
                          campIndex,
                          "initialExternalPopulation",
                          e.target.value
                        )
                      }
                    />
                  </Grid>
                </Grid>
              </NestedCollapsibleSection>
            </Grid>

            {/* Demands */}
            {camp.demands.map((demand, demandIndex) => (
              <Grid item xs={12} key={`demand-${demandIndex}`}>
                <NestedCollapsibleSection
                  title={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      <Typography sx={{ flexGrow: 1 }}>
                        Demand {demandIndex + 1}
                        {demand.item ? `: ${demand.item}` : ""}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Are you sure you want to delete this demand?"
                            )
                          ) {
                            const newCamps = [...camps];
                            newCamps[campIndex].demands.splice(demandIndex, 1);
                            setCamps(newCamps);
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                  level="tertiary"
                >
                  <Grid container spacing={2}>
                    {/* Section 1: Basic Properties */}
                    <Grid item xs={12}>
                      <NestedCollapsibleSection
                        title="Basic Properties"
                        level="tertiary"
                      >
                        <Grid container spacing={2}>
                          {/* Item */}
                          <Grid item xs={12} sm={6} md={4}>
                            {demand.item ? (
                              <TextField
                                fullWidth
                                label="Item"
                                value={demand.item}
                                InputProps={{
                                  readOnly: true,
                                  style: { backgroundColor: "#f5f5f5" },
                                }}
                                helperText="Item selection cannot be changed"
                              />
                            ) : (
                              <TextField
                                select
                                fullWidth
                                label="Item"
                                value={demand.item || ""}
                                onChange={(e) => {
                                  const newCamps = [...camps];
                                  newCamps[campIndex].demands[
                                    demandIndex
                                  ].item = e.target.value;
                                  setCamps(newCamps);
                                }}
                              >
                                {items.length === 0 ? (
                                  <MenuItem disabled>
                                    No items available. Please add items first.
                                  </MenuItem>
                                ) : (
                                  items
                                    .filter((itm) => itm.name)
                                    .sort((a, b) =>
                                      a.name.localeCompare(b.name)
                                    )
                                    .map((itm) => (
                                      <MenuItem
                                        key={`item-${
                                          itm.name
                                        }-${Math.random()}`}
                                        value={itm.name}
                                      >
                                        {itm.name}
                                      </MenuItem>
                                    ))
                                )}
                              </TextField>
                            )}
                          </Grid>

                          {/* Demand Timing Type */}
                          <Grid item xs={12} sm={6} md={4}>
                            <TextField
                              select
                              fullWidth
                              label="Demand Timing Type"
                              value={demand.demandTimingType}
                              onChange={(e) => {
                                const newCamps = [...camps];
                                newCamps[campIndex].demands[
                                  demandIndex
                                ].demandTimingType = e.target.value;
                                setCamps(newCamps);
                              }}
                            >
                              <MenuItem value="ONETIME">
                                {formatLabel("ONETIME")}
                              </MenuItem>
                              <MenuItem value="RECURRING">
                                {formatLabel("RECURRING")}
                              </MenuItem>
                            </TextField>
                          </Grid>

                          {/* Demand Quantity Type */}
                          <Grid item xs={12} sm={6} md={4}>
                            <TextField
                              select
                              fullWidth
                              label="Demand Quantity Type"
                              value={demand.demandQuantityType}
                              onChange={(e) => {
                                const newCamps = [...camps];
                                newCamps[campIndex].demands[
                                  demandIndex
                                ].demandQuantityType = e.target.value;
                                setCamps(newCamps);
                              }}
                            >
                              <MenuItem value="SINGLE">
                                {formatLabel("SINGLE")}
                              </MenuItem>
                              <MenuItem value="BATCH">
                                {formatLabel("BATCH")}
                              </MenuItem>
                            </TextField>
                          </Grid>
                        </Grid>
                      </NestedCollapsibleSection>
                    </Grid>

                      {/* Section 2: Lead Time Data */}
                      <Grid item xs={12}>
                          <NestedCollapsibleSection
                              title={
                                  <Box sx={{ display: "flex", alignItems: "center" }}>
                                      Lead Time Data (Depot to Camp)
                                      <Tooltip
                                          title={explanations.leadTime}
                                          arrow
                                          placement="top"
                                      >
                                          <IconButton size="small" sx={{ ml: 1 }}>
                                              <InfoIcon fontSize="small" />
                                          </IconButton>
                                      </Tooltip>
                                  </Box>
                              }
                              level="tertiary"
                          >
                              <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6} md={4}>
                                      <TextField
                                          select
                                          fullWidth
                                          label="Lead Time Distribution Type"
                                          value={demand.leadTimeData.distributionType}
                                          onChange={(e) => {
                                              const newCamps = [...camps];
                                              const newType = e.target.value;
                                              newCamps[campIndex].demands[
                                                  demandIndex
                                                  ].leadTimeData.distributionType = newType;

                                              // Reset parameters based on the new distribution type
                                              switch (newType) {
                                                  case "TRIANGULAR":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters = {
                                                          min: "1",
                                                          mode: "2",
                                                          max: "4",
                                                      };
                                                      break;
                                                  case "EXPONENTIAL":
                                                  case "FIXED":
                                                  case "EQUAL_SHARE":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters = {
                                                          mean: "2",
                                                      };
                                                      break;
                                                  case "NORMAL":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters = {
                                                          mean: "2",
                                                          stdDev: "0.5",
                                                      };
                                                      break;
                                                  case "UNIFORM":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters = {
                                                          min: "1",
                                                          max: "5",
                                                      };
                                                      break;
                                              }

                                              setCamps(newCamps);
                                          }}
                                      >
                                          <MenuItem value="EXPONENTIAL">
                                              {formatLabel("EXPONENTIAL")}
                                          </MenuItem>
                                          <MenuItem value="NORMAL">
                                              {formatLabel("NORMAL")}
                                          </MenuItem>
                                          <MenuItem value="UNIFORM">
                                              {formatLabel("UNIFORM")}
                                          </MenuItem>
                                          <MenuItem value="TRIANGULAR">
                                              {formatLabel("TRIANGULAR")}
                                          </MenuItem>
                                          <MenuItem value="FIXED">
                                              {formatLabel("FIXED")}
                                          </MenuItem>
                                      </TextField>
                                  </Grid>

                                  {/* Render different parameter fields based on distribution type */}
                                  {demand.leadTimeData.distributionType ===
                                  "EXPONENTIAL" ||
                                  demand.leadTimeData.distributionType === "FIXED" ||
                                  demand.leadTimeData.distributionType ===
                                  "EQUAL_SHARE" ? (
                                      <Grid item xs={12} sm={6} md={4}>
                                          <TextField
                                              fullWidth
                                              label="Mean (days)"
                                              value={
                                                  demand.leadTimeData.distParameters.mean || ""
                                              }
                                              onChange={(e) => {
                                                  const newCamps = [...camps];
                                                  newCamps[campIndex].demands[
                                                      demandIndex
                                                      ].leadTimeData.distParameters.mean =
                                                      e.target.value;
                                                  setCamps(newCamps);
                                              }}
                                          />
                                      </Grid>
                                  ) : demand.leadTimeData.distributionType ===
                                  "NORMAL" ? (
                                      <>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Mean (days)"
                                                  value={
                                                      demand.leadTimeData.distParameters.mean || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters.mean =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Standard Deviation (days)"
                                                  value={
                                                      demand.leadTimeData.distParameters.stdDev ||
                                                      ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters.stdDev =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                      </>
                                  ) : demand.leadTimeData.distributionType ===
                                  "TRIANGULAR" ? (
                                      <>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Minimum (days)"
                                                  value={
                                                      demand.leadTimeData.distParameters.min || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters.min =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Mode (days)"
                                                  value={
                                                      demand.leadTimeData.distParameters.mode || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters.mode =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Maximum (days)"
                                                  value={
                                                      demand.leadTimeData.distParameters.max || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters.max =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                      </>
                                  ) : demand.leadTimeData.distributionType ===
                                  "UNIFORM" ? (
                                      <>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Minimum (days)"
                                                  value={
                                                      demand.leadTimeData.distParameters.min || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters.min =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Maximum (days)"
                                                  value={
                                                      demand.leadTimeData.distParameters.max || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].leadTimeData.distParameters.max =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                      </>
                                  ) : null}
                              </Grid>
                          </NestedCollapsibleSection>
                      </Grid>

                      {/* Section 3: Demand Ratios */}
                      <Grid item xs={12}>
                          <NestedCollapsibleSection
                              title="Demand Ratios"
                              level="tertiary"
                          >
                              <Grid container spacing={2}>
                                  {/* Internal Ratio */}
                                  <Grid item xs={12} sm={6} md={4}>
                                      <TextField
                                          fullWidth
                                          label="Internal Ratio"
                                          value={demand.internalRatio}
                                          onChange={(e) => {
                                              const newCamps = [...camps];
                                              newCamps[campIndex].demands[
                                                  demandIndex
                                                  ].internalRatio = e.target.value;
                                              setCamps(newCamps);
                                          }}
                                      />
                                  </Grid>

                                  {/* External Ratio */}
                                  <Grid item xs={12} sm={6} md={4}>
                                      <TextField
                                          fullWidth
                                          label="External Ratio"
                                          value={demand.externalRatio}
                                          onChange={(e) => {
                                              const newCamps = [...camps];
                                              newCamps[campIndex].demands[
                                                  demandIndex
                                                  ].externalRatio = e.target.value;
                                              setCamps(newCamps);
                                          }}
                                      />
                                  </Grid>
                              </Grid>
                          </NestedCollapsibleSection>
                      </Grid>
                      {/* Section 4: Arrival Data*/}
                      <Grid item xs={12}>
                          <NestedCollapsibleSection title="Inter Arrival Data" level="tertiary">
                              <InterArrivalSection
                                  camps={camps}
                                  setCamps={setCamps}
                                  campIndex={campIndex}
                                  demandIndex={demandIndex}
                                  demand={demand}
                              />
                          </NestedCollapsibleSection>
                      </Grid>

                      {/* Section 5: Quantity Data */}
                      {demand.demandQuantityType === "BATCH" && (
                      <Grid item xs={12}>
                          <NestedCollapsibleSection
                              title="Quantity Data"
                              level="tertiary"
                          >
                              <Grid container spacing={2}>
                                  <Grid item xs={12} sm={6} md={4}>
                                      <TextField
                                          select
                                          fullWidth
                                          label="Quantity Distribution Type"
                                          value={demand.quantityData.distributionType}
                                          onChange={(e) => {
                                              const newCamps = [...camps];
                                              const newType = e.target.value;
                                              newCamps[campIndex].demands[
                                                  demandIndex
                                                  ].quantityData.distributionType = newType;

                                              // Reset parameters based on the new distribution type
                                              switch (newType) {
                                                  case "TRIANGULAR":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters = {
                                                          min: "1",
                                                          mode: "2",
                                                          max: "4",
                                                      };
                                                      break;
                                                  case "EXPONENTIAL":
                                                  case "FIXED":
                                                  case "EQUAL_SHARE":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters = {
                                                          mean: "0.033",
                                                      };
                                                      break;
                                                  case "BERNOULLI":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters = {
                                                          mean: "0.5",
                                                          arrivalInterval: "10",
                                                          initialArrival: true,
                                                      };
                                                      break;
                                                  case "NORMAL":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters = {
                                                          mean: "10",
                                                          stdDev: "2",
                                                      };
                                                      break;
                                                  case "UNIFORM":
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters = {
                                                          min: "1",
                                                          max: "5",
                                                      };
                                                      break;
                                              }

                                              setCamps(newCamps);
                                          }}
                                      >
                                          <MenuItem value="EXPONENTIAL">
                                              {formatLabel("EXPONENTIAL")}
                                          </MenuItem>
                                          <MenuItem value="NORMAL">
                                              {formatLabel("NORMAL")}
                                          </MenuItem>
                                          <MenuItem value="UNIFORM">
                                              {formatLabel("UNIFORM")}
                                          </MenuItem>
                                          <MenuItem value="TRIANGULAR">
                                              {formatLabel("TRIANGULAR")}
                                          </MenuItem>
                                          <MenuItem value="FIXED">
                                              {formatLabel("CONSTANT")}
                                          </MenuItem>
                                      </TextField>
                                  </Grid>

                                  {/* Render different parameter fields based on distribution type */}
                                  {demand.quantityData.distributionType ===
                                  "EXPONENTIAL" ||
                                  demand.quantityData.distributionType === "FIXED" ||
                                  demand.quantityData.distributionType ===
                                  "EQUAL_SHARE" ? (
                                      <Grid item xs={12} sm={6} md={4}>
                                          <TextField
                                              fullWidth
                                              label="Mean (amount)"
                                              value={
                                                  demand.quantityData.distParameters.mean || ""
                                              }
                                              onChange={(e) => {
                                                  const newCamps = [...camps];
                                                  newCamps[campIndex].demands[
                                                      demandIndex
                                                      ].quantityData.distParameters.mean =
                                                      e.target.value;
                                                  setCamps(newCamps);
                                              }}
                                          />
                                      </Grid>
                                  ) : demand.quantityData.distributionType ===
                                  "NORMAL" ? (
                                      <>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Mean (days)"
                                                  value={
                                                      demand.quantityData.distParameters.mean || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.mean =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Standard Deviation (days)"
                                                  value={
                                                      demand.quantityData.distParameters.stdDev ||
                                                      ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.stdDev =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                      </>
                                  ) : demand.quantityData.distributionType ===
                                  "TRIANGULAR" ? (
                                      <>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Minimum (days)"
                                                  value={
                                                      demand.quantityData.distParameters.min || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.min =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Mode (days)"
                                                  value={
                                                      demand.quantityData.distParameters.mode || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.mode =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Maximum (days)"
                                                  value={
                                                      demand.quantityData.distParameters.max || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.max =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                      </>
                                  ) : demand.quantityData.distributionType ===
                                  "UNIFORM" ? (
                                      <>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Minimum (days)"
                                                  value={
                                                      demand.quantityData.distParameters.min || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.min =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Maximum (days)"
                                                  value={
                                                      demand.quantityData.distParameters.max || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.max =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                      </>
                                  ) : demand.quantityData.distributionType ===
                                  "BERNOULLI" ? (
                                      <>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Mean Probability"
                                                  value={
                                                      demand.quantityData.distParameters.mean || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.mean =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <TextField
                                                  fullWidth
                                                  label="Arrival Interval (days)"
                                                  value={
                                                      demand.quantityData.distParameters
                                                          .arrivalInterval || ""
                                                  }
                                                  onChange={(e) => {
                                                      const newCamps = [...camps];
                                                      newCamps[campIndex].demands[
                                                          demandIndex
                                                          ].quantityData.distParameters.arrivalInterval =
                                                          e.target.value;
                                                      setCamps(newCamps);
                                                  }}
                                              />
                                          </Grid>
                                          <Grid item xs={12} sm={6} md={4}>
                                              <FormControlLabel
                                                  control={
                                                      <Checkbox
                                                          checked={
                                                              !!demand.quantityData.distParameters
                                                                  .initialArrival
                                                          }
                                                          onChange={(e) => {
                                                              const newCamps = [...camps];
                                                              newCamps[campIndex].demands[
                                                                  demandIndex
                                                                  ].quantityData.distParameters.initialArrival =
                                                                  e.target.checked;
                                                              setCamps(newCamps);
                                                          }}
                                                      />
                                                  }
                                                  label="Initial Arrival"
                                              />
                                          </Grid>
                                      </>
                                  ) : null}
                              </Grid>
                          </NestedCollapsibleSection>
                      </Grid> )}
                  </Grid>
                </NestedCollapsibleSection>
              </Grid>

            ))}

            {/* Add Demand Button */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={() => {
                  const newCamps = [...camps];
                  newCamps[campIndex].demands.push({
                    item: "",
                    demandTimingType: "RECURRING",
                    demandQuantityType: "SINGLE",
                    arrivalData: {
                      distributionType: "BERNOULLI",
                      distParameters: {
                        mean: "0.5",
                        arrivalInterval: "10",
                        initialArrival: true,
                      },
                    },
                  quantityData: {
                      distributionType: "BERNOULLI",
                      distParameters: {
                          mean: "0.5",
                          arrivalInterval: "10",
                          initialArrival: true,
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
                    internalRatio: "0.2",
                    externalRatio: "0.02",
                  });
                  setCamps(newCamps);
                }}
                sx={{ marginTop: 2 }}
              >
                Add Demand
              </Button>
            </Grid>
          </Grid>
        </NestedCollapsibleSection>
      ))}

      {/* Add Camp Button positioned below camps */}
      <Button variant="contained" onClick={handleAddCamp} sx={{ marginTop: 4 }}>
        Add Camp
      </Button>
    </>
  );
};


const calculateExpectedDemand = (meanValue, externalFactor = 1) => {
    const mean = parseFloat(meanValue) || 0;
    if (mean <= 0) return '---';
    const demandPerPerson = 1 / mean;
    return (demandPerPerson * externalFactor).toFixed(2);
};

const InterArrivalSection = ({ camps, setCamps, campIndex, demandIndex, demand }) => {
    const externalMultiplier =  camps[campIndex].initialInternalPopulation * demand.internalRatio +
        camps[campIndex].initialExternalPopulation * demand.externalRatio;
    const distParams = demand.arrivalData.distParameters;
    const distType = demand.arrivalData.distributionType;

    // --- SAFE UPDATE HANDLER ---
    const handleParamChange = (paramKey, rawValue) => {
        const newCamps = [...camps];
        const targetParams = newCamps[campIndex].demands[demandIndex].arrivalData.distParameters;

        const value = parseFloat(rawValue);
        const currentMean = parseFloat(targetParams.mean) || 0;

        if (paramKey === 'mean') {
            targetParams.mean = rawValue;

            if (distType === 'UNIFORM' || distType === 'TRIANGULAR') {
                const currentSpread = parseFloat(targetParams.spread) || 0;
                if (currentSpread > value) {
                    targetParams.spread = rawValue;
                }
            }
            if (distType === 'NORMAL') {
                const currentStd = parseFloat(targetParams.stdDev) || 0;
                if (currentStd > value) {
                    targetParams.stdDev = (value / 2).toString();
                }
            }
        }

        // 2. SPREAD
        else if (paramKey === 'spread') { // Uniform/Triangular için
            if (value <= currentMean) {
                targetParams.spread = rawValue;
            } else {
                targetParams.spread = currentMean.toString();
            }
        }

        // 3. STD DEV
        else if (paramKey === 'stdDev') {
            if (value < currentMean * 0.25) {
                targetParams.stdDev = rawValue;
            } else {
                targetParams.stdDev = (currentMean * 0.25).toString(); // Max'a set et
            }
        }

        else {
            targetParams[paramKey] = rawValue;
        }
        const m = parseFloat(targetParams.mean) || 0;
        const s = parseFloat(targetParams.spread) || 0;

        if (distType === 'TRIANGULAR') {
            targetParams.min = (m - s).toString();
            targetParams.max = (m + s).toString();
            targetParams.mode = m.toString();
        }
        else if (distType === 'UNIFORM') {
            targetParams.min = (m - s).toString();
            targetParams.max = (m + s).toString();
        }

        setCamps(newCamps);
    };

    const handleTypeChange = (newType) => {
        const newCamps = [...camps];
        const targetData = newCamps[campIndex].demands[demandIndex].arrivalData;
        const currentMean = targetData.distParameters.mean || "1";
        const meanVal = parseFloat(currentMean);

        targetData.distributionType = newType;

        targetData.distParameters = {
            mean: currentMean,
            ...((newType === 'UNIFORM') && {
                spread: (meanVal / 2).toString(),
                min: (meanVal - (meanVal / 2)).toString(),
                max: (meanVal + (meanVal / 2)).toString()
            }),
            ...((newType === 'TRIANGULAR') && {
                spread: (meanVal / 2).toString(),
                min: (meanVal - (meanVal / 2)).toString(),
                max: (meanVal + (meanVal / 2)).toString(),
                mode: currentMean // Triangular için gerekli
            }),
            ...(newType === 'NORMAL' && { stdDev: (meanVal * 0.125).toString() }),
        };

        setCamps(newCamps);
    };

    const expectedDemand = calculateExpectedDemand(distParams.mean, externalMultiplier);

    // Helper values for display
    const meanVal = parseFloat(distParams.mean) || 0;
    const spreadVal = parseFloat(distParams.spread) || 0;
    const minVal = (meanVal - spreadVal).toFixed(2);
    const maxVal = (meanVal + spreadVal).toFixed(2);

    return (
        <Grid container spacing={3} alignItems="center">
            {/* 1. Choose */}
            <Grid item xs={12} md={4}>
                <TextField
                    select
                    fullWidth
                    label="Inter Arrival Distribution"
                    value={distType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                >
                    <MenuItem value="EXPONENTIAL">Exponential</MenuItem>
                    <MenuItem value="NORMAL">Truncated Normal</MenuItem>
                    <MenuItem value="TRIANGULAR">Symmetric Triangular</MenuItem>
                    <MenuItem value="UNIFORM">Uniform</MenuItem>
                    <MenuItem value="FIXED">Constant</MenuItem>
                </TextField>
            </Grid>

            {/* 2. Params */}
            <Grid item xs={12} md={4}>
                <Grid container spacing={2}>

                    {/* MEAN */}
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Mean Inter-Arrival (Days)"
                            value={distParams.mean || ''}
                            onChange={(e) => handleParamChange('mean', e.target.value)}
                            InputProps={{ inputProps: { min: 0 } }}
                        />
                    </Grid>

                    {/* SPREAD INPUT */}
                    {(distType === 'TRIANGULAR' || distType === 'UNIFORM') && (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Spread (+/- Days)"
                                value={distParams.spread || ''}
                                onChange={(e) => handleParamChange('spread', e.target.value)}
                                InputProps={{ inputProps: { min: 0, max: distParams.mean } }}
                                helperText={
                                    distParams.mean
                                        ? `Min: ${minVal} (≥0) | Max: ${maxVal}`
                                        : "Cannot exceed Mean value"
                                }
                                error={parseFloat(distParams.spread) > parseFloat(distParams.mean)}
                            />
                        </Grid>
                    )}

                    {/* STD DEV INPUT (Normal) */}
                    {distType === 'NORMAL' && (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Standard Deviation"
                                value={distParams.stdDev || ''}
                                onChange={(e) => handleParamChange('stdDev', e.target.value)}
                                InputProps={{ inputProps: { min: 0, max: 0.25 * distParams.mean } }}
                                helperText={`Standard deviation <=  ${0.25 * distParams.mean}`}
                            />
                        </Grid>
                    )}
                </Grid>
            </Grid>

            {/* 3. Result card */}
            <Grid item xs={12} sm={6} md={3}>
                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                    }}
                >
                    {/* HEADER */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="caption" fontWeight={600} color="text.secondary">
                            Expected Demand
                        </Typography>
                    </Box>

                    {/* MAIN VALUE CENTERED */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '1.3rem' }}>
                            {expectedDemand}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            persons/day
                        </Typography>
                    </Box>

                    {/* INTERNAL / EXTERNAL */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Internal
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                                {(
                                    camps[campIndex].initialInternalPopulation *
                                    demand.internalRatio /
                                    demand.arrivalData.distParameters.mean
                                ).toFixed(1)}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                External
                            </Typography>
                            <Typography variant="caption" fontWeight={600}>
                                {(
                                    camps[campIndex].initialExternalPopulation *
                                    demand.externalRatio /
                                    demand.arrivalData.distParameters.mean
                                ).toFixed(1)}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Grid>

        </Grid>
    );
};
export default CampsSection;
