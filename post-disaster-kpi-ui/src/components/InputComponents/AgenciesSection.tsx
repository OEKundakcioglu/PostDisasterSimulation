import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  MenuItem,
  Divider,
  Checkbox,
  FormControlLabel,
} from "@mui/material";

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

interface Props {
  agencies: Agency[];
  setAgencies: React.Dispatch<React.SetStateAction<Agency[]>>;
}

const AgenciesSection: React.FC<Props> = ({ agencies, setAgencies }) => {
  const handleAgencyChange = (
    index: number,
    field: string,
    value: any,
    subField?: string,
    subSubField?: string
  ) => {
    const newAgencies = [...agencies];
    if (subField) {
      if (subSubField) {
        newAgencies[index][field][subField][subSubField] = value;
      } else {
        newAgencies[index][field][subField] = value;
      }
    } else {
      newAgencies[index][field] = value;
    }
    setAgencies(newAgencies);
  };

  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ marginTop: 4 }}>
        Agencies Configuration
      </Typography>
      {agencies.map((agency, agencyIndex) => (
        <Paper key={`agency-${agencyIndex}`} sx={{ padding: 2, marginTop: 4 }}>
          <Typography variant="h6" sx={{ marginBottom: 2 }}>
            Agency {agencyIndex + 1}
          </Typography>
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

            {/* Add Funding Button */}
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={() => {
                  const newAgencies = [...agencies];
                  newAgencies[agencyIndex].fundingArray.push({
                    fundingType: "MONETARY_REGULAR",
                    arrivalData: {
                      distributionType: "BERNOULLI",
                      distParameters: { mean: "1.0", arrivalInterval: "1090" },
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

            {agency.fundingArray.map((funding, fundingIndex) => (
              <Paper
                key={`funding-${fundingIndex}`}
                sx={{ padding: 2, marginTop: 4 }}
              >
                <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
                  Funding {fundingIndex + 1}
                </Typography>

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
                      <MenuItem value="IN_KIND">IN_KIND</MenuItem>
                    </TextField>
                  </Grid>

                  {/* Arrival Data */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Arrival Data
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Arrival Distribution Type"
                      value={funding.arrivalData.distributionType}
                      onChange={(e) => {
                        const newAgencies = [...agencies];
                        newAgencies[agencyIndex].fundingArray[
                          fundingIndex
                        ].arrivalData.distributionType = e.target.value;
                        setAgencies(newAgencies);
                      }}
                    >
                      <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
                      <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Mean"
                      value={funding.arrivalData.distParameters.mean || ""}
                      onChange={(e) => {
                        const newAgencies = [...agencies];
                        newAgencies[agencyIndex].fundingArray[
                          fundingIndex
                        ].arrivalData.distParameters.mean = e.target.value;
                        setAgencies(newAgencies);
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Arrival Interval"
                      value={
                        funding.arrivalData.distParameters.arrivalInterval || ""
                      }
                      onChange={(e) => {
                        const newAgencies = [...agencies];
                        newAgencies[agencyIndex].fundingArray[
                          fundingIndex
                        ].arrivalData.distParameters.arrivalInterval =
                          e.target.value;
                        setAgencies(newAgencies);
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={
                            funding.arrivalData.distParameters.initialArrival ||
                            false
                          }
                          onChange={(e) => {
                            const newAgencies = [...agencies];
                            newAgencies[agencyIndex].fundingArray[
                              fundingIndex
                            ].arrivalData.distParameters.initialArrival =
                              e.target.checked;
                            setAgencies(newAgencies);
                          }}
                        />
                      }
                      label="Initial Arrival"
                    />
                  </Grid>

                  {/* Amount Data */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>
                      Amount Data
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Amount Distribution Type"
                      value={funding.amountData.distributionType}
                      onChange={(e) => {
                        const newAgencies = [...agencies];
                        newAgencies[agencyIndex].fundingArray[
                          fundingIndex
                        ].amountData.distributionType = e.target.value;
                        setAgencies(newAgencies);
                      }}
                    >
                      <MenuItem value="EQUAL_SHARE">EQUAL_SHARE</MenuItem>
                      <MenuItem value="FIXED">FIXED</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Mean"
                      value={funding.amountData.distParameters.mean || ""}
                      onChange={(e) => {
                        const newAgencies = [...agencies];
                        newAgencies[agencyIndex].fundingArray[
                          fundingIndex
                        ].amountData.distParameters.mean = e.target.value;
                        setAgencies(newAgencies);
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Grid>
        </Paper>
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
