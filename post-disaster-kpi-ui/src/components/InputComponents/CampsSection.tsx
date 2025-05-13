import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Box,
  IconButton,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";
import DeleteIcon from "@mui/icons-material/Delete";
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
      mean?: string;
      stdDev?: string;
      arrivalInterval?: string;
      initialArrival?: boolean;
    };
  };
  demands: CampDemand[];
  campExternalDemandSatisfactionType: string;
  populationType: string;
  initialInternalPopulation: string;
  initialExternalPopulation: string;
  externalDemandSatisfactionThreshold?: string;
}

interface Item {
  name: string;
}

interface Props {
  camps: Camp[];
  setCamps: React.Dispatch<React.SetStateAction<Camp[]>>;
  items: Item[];
}

const CampsSection: React.FC<Props> = ({ camps, setCamps, items }) => {
  const handleCampChange = (
    index: number,
    field: keyof Camp,
    value: any,
    subField?: keyof Camp["leadTimeData"] | keyof CampDemand,
    subSubField?: keyof Camp["leadTimeData"]["distParameters"]
  ) => {
    const newCamps = [...camps];

    // Add validation for numeric fields
    if (
      field === "initialInternalPopulation" ||
      field === "initialExternalPopulation"
    ) {
      // Only allow non-negative integers for population
      if (typeof value === "string" && (value === "" || /^\d*$/.test(value))) {
        newCamps[index][field] = value;
      } else {
        return; // Skip update if invalid
      }
    } else if (subField && subSubField) {
      // Handle nested subField and subSubField
      (newCamps[index][field] as any)[subField][subSubField] = value;
    } else if (subField) {
      // Handle nested subField
      (newCamps[index][field] as any)[subField] = value;
    } else {
      // Default handling
      newCamps[index][field] = value;
    }

    setCamps(newCamps);
  };

  // New helper function to create a default demand for an item
  const createDefaultDemandForItem = (itemName: string): CampDemand => {
    return {
      item: itemName,
      demandTimingType: "SPORADIC",
      demandQuantityType: "SINGLE",
      arrivalData: {
        distributionType: "EXPONENTIAL",
        distParameters: {
          mean: "0.033",
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
        leadTimeData: {
          distributionType: "TRIANGULAR",
          distParameters: {
            min: "1",
            mode: "2",
            max: "4",
          },
        },
        demands: defaultDemands, // Populate with demands for all existing items
        campExternalDemandSatisfactionType: "FULLY",
        externalDemandSatisfactionThreshold: "0.5",
        populationType: "REGULAR",
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

                  {/* External Demand Satisfaction Type */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="External Demand Satisfaction Type"
                      value={camp.campExternalDemandSatisfactionType}
                      onChange={(e) =>
                        handleCampChange(
                          campIndex,
                          "campExternalDemandSatisfactionType",
                          e.target.value
                        )
                      }
                    >
                      <MenuItem value="FULLY">FULLY</MenuItem>
                      <MenuItem value="THRESHOLD">THRESHOLD</MenuItem>
                      <MenuItem value="NONE">NONE</MenuItem>
                    </TextField>
                  </Grid>

                  {camp.campExternalDemandSatisfactionType === "THRESHOLD" && (
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        fullWidth
                        label="External Demand Satisfaction Threshold"
                        type="number"
                        inputProps={{ min: 0, max: 1, step: 0.01 }}
                        value={
                          camp.externalDemandSatisfactionThreshold || "0.5"
                        }
                        onChange={(e) =>
                          handleCampChange(
                            campIndex,
                            "externalDemandSatisfactionThreshold",
                            e.target.value
                          )
                        }
                      />
                    </Grid>
                  )}

                  {/* Population Type */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Population Type"
                      value={camp.populationType}
                      onChange={(e) =>
                        handleCampChange(
                          campIndex,
                          "populationType",
                          e.target.value
                        )
                      }
                    >
                      <MenuItem value="REGULAR">REGULAR</MenuItem>
                      <MenuItem value="PRIORITIZED">PRIORITIZED</MenuItem>
                      <MenuItem value="DISADVANTAGEOUS">
                        DISADVANTAGEOUS
                      </MenuItem>
                    </TextField>
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

            {/* Lead Time Data - Collapsible */}
            <Grid item xs={12}>
              <NestedCollapsibleSection title="Lead Time Data" level="tertiary">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Lead Time Distribution Type"
                      value={camp.leadTimeData.distributionType}
                      onChange={(e) => {
                        const newCamps = [...camps];
                        const newType = e.target.value;
                        newCamps[campIndex].leadTimeData.distributionType =
                          newType;

                        // Reset parameters based on the new distribution type
                        switch (newType) {
                          case "TRIANGULAR":
                            newCamps[campIndex].leadTimeData.distParameters = {
                              min: "1",
                              mode: "2",
                              max: "4",
                            };
                            break;
                          case "EXPONENTIAL":
                          case "FIXED":
                          case "EQUAL_SHARE":
                            newCamps[campIndex].leadTimeData.distParameters = {
                              mean: "2",
                            };
                            break;
                          case "BERNOULLI":
                            newCamps[campIndex].leadTimeData.distParameters = {
                              mean: "0.5",
                              arrivalInterval: "10",
                              initialArrival: true,
                            };
                            break;
                          case "NORMAL":
                            newCamps[campIndex].leadTimeData.distParameters = {
                              mean: "10",
                              stdDev: "2",
                            };
                            break;
                          case "UNIFORM":
                            newCamps[campIndex].leadTimeData.distParameters = {
                              min: "1",
                              max: "5",
                            };
                            break;
                        }
                        setCamps(newCamps);
                      }}
                    >
                      <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
                      <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                      <MenuItem value="NORMAL">NORMAL</MenuItem>
                      <MenuItem value="UNIFORM">UNIFORM</MenuItem>
                      <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
                      <MenuItem value="FIXED">FIXED</MenuItem>
                      <MenuItem value="EQUAL_SHARE">EQUAL SHARE</MenuItem>
                    </TextField>
                  </Grid>

                  {/* Render different parameter fields based on distribution type */}
                  {camp.leadTimeData.distributionType === "EXPONENTIAL" ||
                  camp.leadTimeData.distributionType === "FIXED" ||
                  camp.leadTimeData.distributionType === "EQUAL_SHARE" ? (
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        fullWidth
                        label="Mean (days)"
                        value={camp.leadTimeData.distParameters.mean || ""}
                        onChange={(e) =>
                          handleCampChange(
                            campIndex,
                            "leadTimeData",
                            e.target.value,
                            "distParameters",
                            "mean"
                          )
                        }
                      />
                    </Grid>
                  ) : camp.leadTimeData.distributionType === "NORMAL" ? (
                    <>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Mean (days)"
                          value={camp.leadTimeData.distParameters.mean || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "mean"
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Standard Deviation (days)"
                          value={camp.leadTimeData.distParameters.stdDev || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "stdDev"
                            )
                          }
                        />
                      </Grid>
                    </>
                  ) : camp.leadTimeData.distributionType === "TRIANGULAR" ? (
                    <>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Minimum (days)"
                          value={camp.leadTimeData.distParameters.min || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "min"
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Mode (days)"
                          value={camp.leadTimeData.distParameters.mode || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "mode"
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Maximum (days)"
                          value={camp.leadTimeData.distParameters.max || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "max"
                            )
                          }
                        />
                      </Grid>
                    </>
                  ) : camp.leadTimeData.distributionType === "UNIFORM" ? (
                    <>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Minimum (days)"
                          value={camp.leadTimeData.distParameters.min || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "min"
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Maximum (days)"
                          value={camp.leadTimeData.distParameters.max || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "max"
                            )
                          }
                        />
                      </Grid>
                    </>
                  ) : camp.leadTimeData.distributionType === "BERNOULLI" ? (
                    <>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Mean Probability"
                          value={camp.leadTimeData.distParameters.mean || ""}
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "mean"
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          fullWidth
                          label="Arrival Interval (days)"
                          value={
                            camp.leadTimeData.distParameters.arrivalInterval ||
                            ""
                          }
                          onChange={(e) =>
                            handleCampChange(
                              campIndex,
                              "leadTimeData",
                              e.target.value,
                              "distParameters",
                              "arrivalInterval"
                            )
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6} md={4}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={
                                !!camp.leadTimeData.distParameters
                                  .initialArrival
                              }
                              onChange={(e) =>
                                handleCampChange(
                                  campIndex,
                                  "leadTimeData",
                                  e.target.checked,
                                  "distParameters",
                                  "initialArrival"
                                )
                              }
                            />
                          }
                          label="Initial Arrival"
                        />
                      </Grid>
                    </>
                  ) : null}
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
                              <MenuItem value="ONETIME">ONETIME</MenuItem>
                              <MenuItem value="SPORADIC">SPORADIC</MenuItem>
                              <MenuItem value="PERIODIC">PERIODIC</MenuItem>
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
                              <MenuItem value="SINGLE">SINGLE</MenuItem>
                              <MenuItem value="BATCH">BATCH</MenuItem>
                            </TextField>
                          </Grid>
                        </Grid>
                      </NestedCollapsibleSection>
                    </Grid>

                    {/* Section 2: Arrival Data */}
                    <Grid item xs={12}>
                      <NestedCollapsibleSection
                        title="Arrival Data"
                        level="tertiary"
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={4}>
                            <TextField
                              select
                              fullWidth
                              label="Arrival Distribution Type"
                              value={demand.arrivalData.distributionType}
                              onChange={(e) => {
                                const newCamps = [...camps];
                                const newType = e.target.value;
                                newCamps[campIndex].demands[
                                  demandIndex
                                ].arrivalData.distributionType = newType;

                                // Reset parameters based on the new distribution type
                                switch (newType) {
                                  case "TRIANGULAR":
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters = {
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
                                    ].arrivalData.distParameters = {
                                      mean: "0.033",
                                    };
                                    break;
                                  case "BERNOULLI":
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters = {
                                      mean: "0.5",
                                      arrivalInterval: "10",
                                      initialArrival: true,
                                    };
                                    break;
                                  case "NORMAL":
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters = {
                                      mean: "10",
                                      stdDev: "2",
                                    };
                                    break;
                                  case "UNIFORM":
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters = {
                                      min: "1",
                                      max: "5",
                                    };
                                    break;
                                }

                                setCamps(newCamps);
                              }}
                            >
                              <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
                              <MenuItem value="EXPONENTIAL">
                                EXPONENTIAL
                              </MenuItem>
                              <MenuItem value="NORMAL">NORMAL</MenuItem>
                              <MenuItem value="UNIFORM">UNIFORM</MenuItem>
                              <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
                              <MenuItem value="FIXED">FIXED</MenuItem>
                              <MenuItem value="EQUAL_SHARE">
                                EQUAL SHARE
                              </MenuItem>
                            </TextField>
                          </Grid>

                          {/* Render different parameter fields based on distribution type */}
                          {demand.arrivalData.distributionType ===
                            "EXPONENTIAL" ||
                          demand.arrivalData.distributionType === "FIXED" ||
                          demand.arrivalData.distributionType ===
                            "EQUAL_SHARE" ? (
                            <Grid item xs={12} sm={6} md={4}>
                              <TextField
                                fullWidth
                                label="Mean (days)"
                                value={
                                  demand.arrivalData.distParameters.mean || ""
                                }
                                onChange={(e) => {
                                  const newCamps = [...camps];
                                  newCamps[campIndex].demands[
                                    demandIndex
                                  ].arrivalData.distParameters.mean =
                                    e.target.value;
                                  setCamps(newCamps);
                                }}
                              />
                            </Grid>
                          ) : demand.arrivalData.distributionType ===
                            "NORMAL" ? (
                            <>
                              <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                  fullWidth
                                  label="Mean (days)"
                                  value={
                                    demand.arrivalData.distParameters.mean || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.mean =
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
                                    demand.arrivalData.distParameters.stdDev ||
                                    ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.stdDev =
                                      e.target.value;
                                    setCamps(newCamps);
                                  }}
                                />
                              </Grid>
                            </>
                          ) : demand.arrivalData.distributionType ===
                            "TRIANGULAR" ? (
                            <>
                              <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                  fullWidth
                                  label="Minimum (days)"
                                  value={
                                    demand.arrivalData.distParameters.min || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.min =
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
                                    demand.arrivalData.distParameters.mode || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.mode =
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
                                    demand.arrivalData.distParameters.max || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.max =
                                      e.target.value;
                                    setCamps(newCamps);
                                  }}
                                />
                              </Grid>
                            </>
                          ) : demand.arrivalData.distributionType ===
                            "UNIFORM" ? (
                            <>
                              <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                  fullWidth
                                  label="Minimum (days)"
                                  value={
                                    demand.arrivalData.distParameters.min || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.min =
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
                                    demand.arrivalData.distParameters.max || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.max =
                                      e.target.value;
                                    setCamps(newCamps);
                                  }}
                                />
                              </Grid>
                            </>
                          ) : demand.arrivalData.distributionType ===
                            "BERNOULLI" ? (
                            <>
                              <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                  fullWidth
                                  label="Mean Probability"
                                  value={
                                    demand.arrivalData.distParameters.mean || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.mean =
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
                                    demand.arrivalData.distParameters
                                      .arrivalInterval || ""
                                  }
                                  onChange={(e) => {
                                    const newCamps = [...camps];
                                    newCamps[campIndex].demands[
                                      demandIndex
                                    ].arrivalData.distParameters.arrivalInterval =
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
                                        !!demand.arrivalData.distParameters
                                          .initialArrival
                                      }
                                      onChange={(e) => {
                                        const newCamps = [...camps];
                                        newCamps[campIndex].demands[
                                          demandIndex
                                        ].arrivalData.distParameters.initialArrival =
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
                    demandTimingType: "SPORADIC",
                    demandQuantityType: "SINGLE",
                    arrivalData: {
                      distributionType: "BERNOULLI",
                      distParameters: {
                        mean: "0.5",
                        arrivalInterval: "10",
                        initialArrival: true,
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

export default CampsSection;
