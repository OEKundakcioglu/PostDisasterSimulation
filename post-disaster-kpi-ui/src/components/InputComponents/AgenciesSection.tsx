import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Box,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";

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
  earmarkedFor?: string; // For earmarked funding
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
}

const AgenciesSection: React.FC<Props> = ({
  agencies,
  setAgencies,
  items = [],
}) => {
  // Default items to empty array if not provided

  const handleAgencyChange = (
    index: number,
    field: keyof Agency,
    value: any,
    subField?: keyof AgencyFunding,
    subSubField?: string
  ) => {
    const newAgencies = [...agencies];
    if (
      field === "fundingArray" &&
      typeof subField === "string" &&
      subSubField
    ) {
      (newAgencies[index].fundingArray as any)[subField][subSubField] = value;
    } else if (field === "fundingArray" && typeof subField === "string") {
      (newAgencies[index].fundingArray as any)[subField] = value;
    } else {
      (newAgencies[index] as any)[field] = value;
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
          };
          break;
        case "EXPONENTIAL":
        case "FIXED":
        case "EQUAL_SHARE":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            mean: "0.033",
          };
          break;
        case "BERNOULLI":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            mean: "0.5",
            arrivalInterval: "10",
            initialArrival: true,
          };
          break;
        case "NORMAL":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            mean: "10",
            stdDev: "2",
          };
          break;
        case "UNIFORM":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].arrivalData.distParameters = {
            min: "1",
            max: "5",
          };
          break;
      }
    } else {
      // Handle amount data parameters (which doesn't use arrivalInterval or initialArrival)
      switch (newDistType) {
        case "TRIANGULAR":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            min: "10000000",
            mode: "14900000",
            max: "20000000",
          };
          break;
        case "EXPONENTIAL":
        case "FIXED":
        case "EQUAL_SHARE":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            mean: "14900000",
          };
          break;
        case "BERNOULLI":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            mean: "0.5",
          };
          break;
        case "NORMAL":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            mean: "14900000",
            stdDev: "1000000",
          };
          break;
        case "UNIFORM":
          newAgencies[agencyIndex].fundingArray[
            fundingIndex
          ].amountData.distParameters = {
            min: "10000000",
            max: "20000000",
          };
          break;
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
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Standard Deviation"
                value={params.stdDev || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.stdDev = e.target.value;
                  setAgencies(newAgencies);
                }}
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
                label="Mode"
                value={params.mode || ""}
                onChange={(e) => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray[fundingIndex][
                    dataType
                  ].distParameters.mode = e.target.value;
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

      case "BERNOULLI":
        return (
          <>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Mean Probability"
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

            {dataType === "arrivalData" && (
              <>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Arrival Interval (days)" // Updated label to specify unit
                    value={
                      dataType === "arrivalData" &&
                      funding.arrivalData.distParameters.arrivalInterval
                        ? funding.arrivalData.distParameters.arrivalInterval
                        : ""
                    }
                    onChange={(e) => {
                      const newAgencies = [...agencies];
                      if (dataType === "arrivalData") {
                        newAgencies[agencyIndex].fundingArray[
                          fundingIndex
                        ].arrivalData.distParameters.arrivalInterval =
                          e.target.value;
                        setAgencies(newAgencies);
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={
                          dataType === "arrivalData" &&
                          funding.arrivalData.distParameters.initialArrival
                            ? !!funding.arrivalData.distParameters
                                .initialArrival
                            : false
                        }
                        onChange={(e) => {
                          const newAgencies = [...agencies];
                          if (dataType === "arrivalData") {
                            newAgencies[agencyIndex].fundingArray[
                              fundingIndex
                            ].arrivalData.distParameters.initialArrival =
                              e.target.checked;
                            setAgencies(newAgencies);
                          }
                        }}
                      />
                    }
                    label="Initial Arrival"
                  />
                </Grid>
              </>
            )}
          </>
        );

      default:
        return null;
    }
  };

  // Render empty placeholder when no items are available
  const renderItemOptions = () => {
    if (!items || items.length === 0) {
      return <MenuItem disabled>No items available</MenuItem>;
    }
    return items.map((item) => (
      <MenuItem key={`item-${item.name}`} value={item.name}>
        {item.name}
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
                        agency.name ? ` (${agency.name})` : ""
                      }?`
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
                        Funding {fundingIndex + 1}: {funding.fundingType}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Are you sure you want to delete this funding?"
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
                          MONETARY_REGULAR
                        </MenuItem>
                        <MenuItem value="MONETARY_EARMARKED">
                          MONETARY_EARMARKED
                        </MenuItem>
                        <MenuItem value="INKIND_REGULAR">
                          INKIND_REGULAR
                        </MenuItem>
                        <MenuItem value="INKIND_EARMARKED">
                          INKIND_EARMARKED
                        </MenuItem>
                      </TextField>
                    </Grid>

                    {(funding.fundingType === "INKIND_REGULAR" ||
                      funding.fundingType === "INKIND_EARMARKED") && (
                      <Grid item xs={12} sm={6} md={4}>
                        <TextField
                          select
                          fullWidth
                          label="Select Item"
                          value={funding.item || ""}
                          onChange={(e) => {
                            const newAgencies = [...agencies];
                            newAgencies[agencyIndex].fundingArray[
                              fundingIndex
                            ].item = e.target.value;
                            setAgencies(newAgencies);
                          }}
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
                          label="Earmarked For"
                          value={funding.earmarkedFor || ""}
                          onChange={(e) => {
                            const newAgencies = [...agencies];
                            newAgencies[agencyIndex].fundingArray[
                              fundingIndex
                            ].earmarkedFor = e.target.value;
                            setAgencies(newAgencies);
                          }}
                        >
                          {renderItemOptions()}
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
                                EQUAL SHARE
                              </MenuItem>
                              <MenuItem value="FIXED">FIXED</MenuItem>
                              <MenuItem value="NORMAL">NORMAL</MenuItem>
                              <MenuItem value="UNIFORM">UNIFORM</MenuItem>
                              <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
                              <MenuItem value="EXPONENTIAL">
                                EXPONENTIAL
                              </MenuItem>
                              <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
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
                    earmarkedFor: "", // Initialize empty for earmarked
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
