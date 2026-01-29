import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Box,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";

// Helper function to convert uppercase macros to readable format
const formatLabel = (value: string): string => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Update the interfaces to have proper type separation
interface CommonDistParameters {
  min?: string;
  mode?: string;
  max?: string;
  mean?: string;
  stdDev?: string;
}

interface ArrivalDistParameters extends CommonDistParameters {
  arrivalInterval?: string;
  initialArrival?: boolean;
}

interface AgencyFunding {
  fundingType: string;
  item?: string; // For in-kind donations
  camp?: string; // Changed from earmarkedFor to camp
  arrivalData: {
    distributionType: string;
    distParameters: ArrivalDistParameters;
  };
  amountData: {
    distributionType: string;
    distParameters: CommonDistParameters;
  };
}

interface Agency {
  name: string;
  fundingArray: AgencyFunding[];
}

interface Props {
  agencies: Agency[];
  setAgencies: React.Dispatch<React.SetStateAction<Agency[]>>;
  items?: { name: string }[]; // Make items optional to prevent errors
  camps: { name: string }[]; // Add camps prop for earmarked funding
}

const AgenciesSection: React.FC<Props> = ({
  agencies,
  setAgencies,
  items = [],
  camps = [], // Default to empty array
}) => {
  // Default items to empty array if not provided

  const handleAgencyChange = (
    index: number,
    field: keyof Agency,
    value: string | boolean | AgencyFunding[] | AgencyFunding,
    subField?: keyof AgencyFunding,
    subSubField?: keyof AgencyFunding["arrivalData"]["distParameters"] &
      keyof AgencyFunding["amountData"]["distParameters"]
  ) => {
    const newAgencies = [...agencies];

    if (field === "fundingArray") {
      const arr = newAgencies[index].fundingArray;
      if (typeof subField === "string") {
        // Update a property on a specific funding entry
        const targetIndex = 0; // by design this handler is used with a known fundingIndex in calls
        const entry = arr[targetIndex];
        if (!entry) return;
        if (subField === "arrivalData" || subField === "amountData") {
          if (subSubField) {
            // distParameters nested key update
            const data = entry[subField];
            const params = { ...data.distParameters };
            (params as Record<string, string | boolean>)[
              subSubField as string
            ] = value as string | boolean;
            data.distParameters = params as typeof data.distParameters;
          } else if (typeof value === "string") {
            // update distributionType
            entry[subField].distributionType = value as string;
          }
        } else if (subField in entry) {
          // top-level funding field like fundingType, item, camp
          (entry as unknown as Record<string, string | boolean>)[
            subField as string
          ] = value as string | boolean;
        }
      } else if (Array.isArray(value)) {
        newAgencies[index].fundingArray = value as AgencyFunding[];
      }
    } else {
      // direct agency field update
      if (field === "name") newAgencies[index].name = value as string;
    }

    setAgencies(newAgencies);
  };

  // Function to update funding distribution parameters based on type
  const updateFundingDistParameters = (
    agencyIndex: number,
    fundingIndex: number,
    dataType: "arrivalData" | "amountData",
    newDistType: string
  ) => {
    const newAgencies = [...agencies];

    if (dataType === "arrivalData") {
      // Handle arrival data parameters
      switch (newDistType) {
        case "TRIANGULAR":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            min: "1",
            mode: "2",
            max: "4",
          } as ArrivalDistParameters;
          break;
        case "EXPONENTIAL":
        case "FIXED":
        case "EQUAL_SHARE":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            mean: "0.033",
          } as ArrivalDistParameters;
          break;
        case "NORMAL":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            mean: "10",
            stdDev: "2",
          } as ArrivalDistParameters;
          break;
        case "UNIFORM":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            min: "1",
            max: "5",
          } as ArrivalDistParameters;
          break;
        default:
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {} as ArrivalDistParameters;
      }
    } else {
      // Handle amount data parameters
      switch (newDistType) {
        case "TRIANGULAR":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            min: "100",
            mode: "200",
            max: "400",
          } as CommonDistParameters;
          break;
        case "EXPONENTIAL":
        case "FIXED":
        case "EQUAL_SHARE":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            mean: "200",
          } as CommonDistParameters;
          break;
        case "NORMAL":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            mean: "200",
            stdDev: "50",
          } as CommonDistParameters;
          break;
        case "UNIFORM":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            min: "100",
            max: "400",
          } as CommonDistParameters;
          break;
        default:
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {} as CommonDistParameters;
      }
    }

    setAgencies(newAgencies);
  };

  // Helper to render the appropriate fields for a distribution type
  const renderDistParams = (
    agencyIndex: number,
    fundingIndex: number,
    dataType: "arrivalData" | "amountData",
    funding: AgencyFunding
  ) => {
    const data = funding[dataType];
    const distType = data.distributionType;
    const params = data.distParameters;

    switch (distType) {
      case "EXPONENTIAL":
      case "FIXED":
      case "EQUAL_SHARE":
        return (
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Mean"
              value={params.mean || ""}
              onChange={(e) => {
                const newAgencies = [...agencies];
                newAgencies[agencyIndex].fundingArray[fundingIndex][
                  dataType
                ].distParameters.mean = e.target.value;
                setAgencies(newAgencies);
              }}
            />
          </Grid>
        );

      case "NORMAL":
        return (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Mean"
                type="number"
                value={params.mean || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.mean = e.target.value;
                  setAgencies(newAgencies);
                }}
                helperText={dataType === "arrivalData" ? "Mean arrival time (days)" : "Mean amount value"}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Standard Deviation"
                type="number"
                value={params.stdDev || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.stdDev = e.target.value;
                  setAgencies(newAgencies);
                }}
                helperText={dataType === "arrivalData" ? "Standard deviation of arrival time (days)" : "Standard deviation of amount"}
              />
            </Grid>
          </>
        );

      case "TRIANGULAR":
        return (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Minimum"
                type="number"
                value={params.min || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.min = e.target.value;
                  setAgencies(newAgencies);
                }}
                helperText={dataType === "arrivalData" ? "Minimum arrival time (days)" : "Minimum amount value"}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Mode"
                type="number"
                value={params.mode || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.mode = e.target.value;
                  setAgencies(newAgencies);
                }}
                helperText={dataType === "arrivalData" ? "Most likely arrival time (days)" : "Most likely amount value"}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Maximum"
                type="number"
                value={params.max || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.max = e.target.value;
                  setAgencies(newAgencies);
                }}
                helperText={dataType === "arrivalData" ? "Maximum arrival time (days)" : "Maximum amount value"}
              />
            </Grid>
          </>
        );

      case "UNIFORM":
        return (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Minimum"
                value={params.min || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.min = e.target.value;
                  setAgencies(newAgencies);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Maximum"
                value={params.max || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.max = e.target.value;
                  setAgencies(newAgencies);
                }}
              />
            </Grid>
          </>
        );

      default:
        return null;
    }
  };

  // Render empty placeholder when no items are available
  const renderItemOptions = () => {
    if (!items || items.length === 0) {
      return <MenuItem disabled>No items available. Please add items in the Items section first.</MenuItem>;
    }
    return items.map((item) => (
      <MenuItem key={`item-${item.name}`} value={item.name}>
        {item.name}
      </MenuItem>
    ));
  };

  // Render empty placeholder when no camps are available
  const renderCampOptions = () => {
    if (!camps || camps.length === 0) {
      return <MenuItem disabled>No camps available. Please add camps in the Camps section first.</MenuItem>;
    }
    return camps.map((camp) => (
      <MenuItem key={`camp-${camp.name}`} value={camp.name}>
        {camp.name}
      </MenuItem>
    ));
  };

  return (
    <>
      {agencies.map((agency, agencyIndex) => (
        <NestedCollapsibleSection
          key={`agency-${agencyIndex}`}
          title={
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                Agency {agencyIndex + 1}
                {agency.name ? `: ${agency.name}` : ""}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      `Are you sure you want to delete this agency${
                        agency.name ? ` "${agency.name}"` : ""
                      }?\n\nWARNING: This will remove all funding configurations associated with this agency.`
                    )
                  ) {
                    const newAgencies = [...agencies];
                    newAgencies.splice(agencyIndex, 1);
                    setAgencies(newAgencies);
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
            {/* Agency Name */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Agency Name"
                value={agency.name}
                onChange={(e) =>
                  handleAgencyChange(agencyIndex, "name", e.target.value)
                }
                placeholder="Enter agency name"
                helperText="Name of the funding agency or organization"
              />
            </Grid>

            {/* Render all funding items */}
            {agency.fundingArray.map((funding, fundingIndex) => (
              <Grid item xs={12} key={`funding-${fundingIndex}`}>
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
                        Funding {fundingIndex + 1}:{" "}
                        {formatLabel(funding.fundingType)}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Are you sure you want to delete this funding configuration?"
                            )
                          ) {
                            const newAgencies = [...agencies];
                            newAgencies[agencyIndex].fundingArray.splice(
                              fundingIndex,
                              1
                            );
                            setAgencies(newAgencies);
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
                    {/* Funding Type */}
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        select
                        fullWidth
                        label="Funding Type"
                        value={funding.fundingType}
                        onChange={(e) => {
                          const newAgencies = [...agencies];
                          newAgencies[agencyIndex].fundingArray[
                            fundingIndex
                          ].fundingType = e.target.value;
                          setAgencies(newAgencies);
                        }}
                      >
                        <MenuItem value="MONETARY_REGULAR">
                          {formatLabel("MONETARY_REGULAR")}
                        </MenuItem>
                        <MenuItem value="MONETARY_EARMARKED">
                          {formatLabel("MONETARY_EARMARKED")}
                        </MenuItem>
                        <MenuItem value="INKIND_REGULAR">
                          {formatLabel("INKIND_REGULAR")}
                        </MenuItem>
                        <MenuItem value="INKIND_EARMARKED">
                          {formatLabel("INKIND_EARMARKED")}
                        </MenuItem>
                      </TextField>
                    </Grid>

                    {(funding.fundingType === "INKIND_REGULAR" ||
                      funding.fundingType === "INKIND_EARMARKED") && (
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          select
                          fullWidth
                          label="Item"
                          value={funding.item || ""}
                          onChange={(e) => {
                            const newAgencies = [...agencies];
                            newAgencies[agencyIndex].fundingArray[
                              fundingIndex
                            ].item = e.target.value;
                            setAgencies(newAgencies);
                          }}
                          helperText="Select the item for in-kind funding"
                        >
                          {renderItemOptions()}
                        </TextField>
                      </Grid>
                    )}

                    {(funding.fundingType === "MONETARY_EARMARKED" ||
                      funding.fundingType === "INKIND_EARMARKED") && (
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          select
                          fullWidth
                          label="Earmarked For Camp"
                          value={funding.camp || ""}
                          onChange={(e) => {
                            const newAgencies = [...agencies];
                            newAgencies[agencyIndex].fundingArray[
                              fundingIndex
                            ].camp = e.target.value;
                            setAgencies(newAgencies);
                          }}
                          helperText="Select the camp this funding is specifically allocated to"
                        >
                          {renderCampOptions()}
                        </TextField>
                      </Grid>
                    )}

                    {/* Arrival Data - Collapsible */}
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
                              value={funding.arrivalData.distributionType}
                              onChange={(e) => {
                                const newAgencies = [...agencies];
                                const newDistType = e.target.value;
                                newAgencies[agencyIndex].fundingArray[
                                  fundingIndex
                                ].arrivalData.distributionType = newDistType;

                                // Update parameters based on the new type
                                updateFundingDistParameters(
                                  agencyIndex,
                                  fundingIndex,
                                  "arrivalData",
                                  newDistType
                                );
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
                              <MenuItem value="EQUAL_SHARE">
                                {formatLabel("EQUAL_SHARE")}
                              </MenuItem>
                            </TextField>
                          </Grid>

                          {/* Dynamic parameter fields based on distribution type */}
                          {renderDistParams(
                            agencyIndex,
                            fundingIndex,
                            "arrivalData",
                            funding
                          )}
                        </Grid>
                      </NestedCollapsibleSection>
                    </Grid>

                    {/* Amount Data - Collapsible */}
                    <Grid item xs={12}>
                      <NestedCollapsibleSection
                        title="Amount Data"
                        level="tertiary"
                      >
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6} md={4}>
                            <TextField
                              select
                              fullWidth
                              label="Amount Distribution Type"
                              value={funding.amountData.distributionType}
                              onChange={(e) => {
                                const newAgencies = [...agencies];
                                const newDistType = e.target.value;
                                newAgencies[agencyIndex].fundingArray[
                                  fundingIndex
                                ].amountData.distributionType = newDistType;

                                // Update parameters based on the new type
                                updateFundingDistParameters(
                                  agencyIndex,
                                  fundingIndex,
                                  "amountData",
                                  newDistType
                                );
                              }}
                            >
                              <MenuItem value="EQUAL_SHARE">
                                {formatLabel("EQUAL_SHARE")}
                              </MenuItem>
                              <MenuItem value="FIXED">
                                {formatLabel("FIXED")}
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
                              <MenuItem value="EXPONENTIAL">
                                {formatLabel("EXPONENTIAL")}
                              </MenuItem>
                            </TextField>
                          </Grid>

                          {/* Dynamic parameter fields based on distribution type */}
                          {renderDistParams(
                            agencyIndex,
                            fundingIndex,
                            "amountData",
                            funding
                          )}
                        </Grid>
                      </NestedCollapsibleSection>
                    </Grid>
                  </Grid>
                </NestedCollapsibleSection>
              </Grid>
            ))}

            {/* Add Funding Button - MOVED TO THE BOTTOM */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={() => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray.push({
                    fundingType: "MONETARY_REGULAR",
                    item: "", // Initialize empty for in-kind
                    camp: "", // Initialize empty for earmarked
                    arrivalData: {
                      distributionType: "FIXED",
                      distParameters: {
                        mean: "0",
                      },
                    },
                    amountData: {
                      distributionType: "EQUAL_SHARE",
                      distParameters: { mean: "14900000" },
                    },
                  });
                  setAgencies(newAgencies);
                }}
                sx={{ marginTop: 2 }}
              >
                Add Funding
              </Button>
            </Grid>
          </Grid>
        </NestedCollapsibleSection>
      ))}

      {/* Add Agency Button positioned below agencies */}
      <Button
        variant="contained"
        onClick={() =>
          setAgencies([
            ...agencies,
            {
              name: "",
              fundingArray: [],
            },
          ])
        }
        sx={{ marginTop: 4 }}
      >
        Add Agency
      </Button>
    </>
  );
};

export default AgenciesSection;
