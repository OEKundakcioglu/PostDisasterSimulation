import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  MenuItem,
  Divider,
} from "@mui/material";

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
    field: string,
    value: any,
    subField?: string,
    subSubField?: string
  ) => {
    const newCamps = [...camps];
    if (subField) {
      if (subSubField) {
        newCamps[index][field][subField][subSubField] = value;
      } else {
        newCamps[index][field][subField] = value;
      }
    } else {
      newCamps[index][field] = value;
    }
    setCamps(newCamps);
  };

  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ marginTop: 4 }}>
        Camps Configuration
      </Typography>
      {camps.map((camp, campIndex) => (
        <Paper
          key={`camp-${campIndex}`}
          sx={{ padding: 2, marginTop: 2, mt: 4 }}
        >
          <Typography variant="h6" sx={{ marginBottom: 4 }}>
            Camp {campIndex + 1}
          </Typography>
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

            {/* Lead Time Data */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Lead Time Data
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Lead Time Distribution Type"
                value={camp.leadTimeData.distributionType}
                onChange={(e) =>
                  handleCampChange(
                    campIndex,
                    "leadTimeData",
                    e.target.value,
                    "distributionType"
                  )
                }
              >
                <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
                <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
                <MenuItem value="FIXED">FIXED</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Min"
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
                label="Mode"
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
                label="Max"
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

            {/* Demands */}
            {camp.demands.map((demand, demandIndex) => (
              <Paper
                key={`demand-${demandIndex}`}
                sx={{ padding: 2, marginTop: 4 }}
              >
                <Typography variant="subtitle1" sx={{ marginBottom: 2 }}>
                  Demand {demandIndex + 1}
                </Typography>
                <Grid container spacing={2}>
                  {/* Item */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Item"
                      value={demand.item}
                      onChange={(e) => {
                        const newCamps = [...camps];
                        newCamps[campIndex].demands[demandIndex].item =
                          e.target.value;
                        setCamps(newCamps);
                      }}
                    >
                      {items.map((itm) => (
                        <MenuItem key={itm.name} value={itm.name}>
                          {itm.name}
                        </MenuItem>
                      ))}
                    </TextField>
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
                      <MenuItem value="SPORADIC">SPORADIC</MenuItem>
                      <MenuItem value="CONTINUOUS">CONTINUOUS</MenuItem>
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
                      <MenuItem value="MULTIPLE">MULTIPLE</MenuItem>
                    </TextField>
                  </Grid>

                  {/* Arrival Data */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Arrival Data
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      select
                      fullWidth
                      label="Arrival Distribution Type"
                      value={demand.arrivalData.distributionType}
                      onChange={(e) => {
                        const newCamps = [...camps];
                        newCamps[campIndex].demands[
                          demandIndex
                        ].arrivalData.distributionType = e.target.value;
                        setCamps(newCamps);
                      }}
                    >
                      <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                      <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Mean"
                      value={demand.arrivalData.distParameters.mean || ""}
                      onChange={(e) => {
                        const newCamps = [...camps];
                        newCamps[campIndex].demands[
                          demandIndex
                        ].arrivalData.distParameters.mean = e.target.value;
                        setCamps(newCamps);
                      }}
                    />
                  </Grid>

                  {/* Internal Ratio */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label="Internal Ratio"
                      value={demand.internalRatio}
                      onChange={(e) => {
                        const newCamps = [...camps];
                        newCamps[campIndex].demands[demandIndex].internalRatio =
                          e.target.value;
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
                        newCamps[campIndex].demands[demandIndex].externalRatio =
                          e.target.value;
                        setCamps(newCamps);
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}

            {/* Add Demand Button positioned below demands */}
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
                      distributionType: "EXPONENTIAL",
                      distParameters: { mean: "0.033" },
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
        </Paper>
      ))}

      {/* Add Camp Button positioned below camps */}
      <Button
        variant="contained"
        onClick={() =>
          setCamps([
            ...camps,
            {
              name: "",
              leadTimeData: {
                distributionType: "TRIANGULAR",
                distParameters: {},
              },
              demands: [],
              campExternalDemandSatisfactionType: "FULLY",
              populationType: "REGULAR",
              initialInternalPopulation: "0",
              initialExternalPopulation: "0",
            },
          ])
        }
        sx={{ marginTop: 4 }}
      >
        Add Camp
      </Button>
    </>
  );
};

export default CampsSection;
