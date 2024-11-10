import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Divider,
} from "@mui/material";

interface Item {
  name: string;
  isPerishable: boolean;
  price: string;
  orderingCost: string;
  holdingCost: string;
  deprivationRate: string;
  deprivationCoefficient: string;
  referralCost: string;
  leadTimeData: {
    distributionType: string;
    distParameters: {
      min?: string;
      mode?: string;
      max?: string;
      mean?: string;
    };
  };
  durationData?: {
    distributionType: string;
    distParameters: {
      min: string;
      max: string;
    };
  };
}

interface Props {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

const ItemsSection: React.FC<Props> = ({ items, setItems }) => {
  const handleItemChange = (
    index: number,
    field: string,
    value: any,
    subField?: string,
    subSubField?: string
  ) => {
    const newItems = [...items];

    if (subField) {
      if (field === "durationData" && !newItems[index].isPerishable) {
        return;
      }
      if (!newItems[index][field]) {
        newItems[index][field] = {};
      }

      if (!newItems[index][field][subField]) {
        newItems[index][field][subField] = {};
      }

      if (subSubField) {
        newItems[index][field][subField][subSubField] = value;
      } else {
        newItems[index][field][subField] = {
          ...newItems[index][field][subField],
          ...value,
        };
      }
    } else {
      newItems[index][field] = value;

      if (field === "isPerishable") {
        if (value === true) {
          if (!newItems[index].durationData) {
            newItems[index].durationData = {
              distributionType: "UNIFORM",
              distParameters: { min: "30", max: "60" },
            };
          }
        } else {
          delete newItems[index].durationData;
        }
      }
    }

    setItems(newItems);
  };

  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ marginTop: 4 }}>
        Items Configuration
      </Typography>

      {items.map((item, index) => (
        <Paper key={`item-${index}`} sx={{ padding: 2, marginTop: 4 }}>
          <Typography variant="h6" sx={{ marginBottom: 2 }}>
            Item {index + 1}
          </Typography>
          <Grid container spacing={2}>
            {/* Name */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Name"
                value={item.name}
                onChange={(e) =>
                  handleItemChange(index, "name", e.target.value)
                }
              />
            </Grid>
            {/* Is Perishable */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={item.isPerishable}
                    onChange={(e) =>
                      handleItemChange(index, "isPerishable", e.target.checked)
                    }
                  />
                }
                label="Is Perishable"
              />
            </Grid>
            {/* Price */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Price"
                value={item.price}
                onChange={(e) =>
                  handleItemChange(index, "price", e.target.value)
                }
              />
            </Grid>
            {/* Ordering Cost */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Ordering Cost"
                value={item.orderingCost}
                onChange={(e) =>
                  handleItemChange(index, "orderingCost", e.target.value)
                }
              />
            </Grid>
            {/* Holding Cost */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Holding Cost"
                value={item.holdingCost}
                onChange={(e) =>
                  handleItemChange(index, "holdingCost", e.target.value)
                }
              />
            </Grid>
            {/* Deprivation Rate */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Deprivation Rate"
                value={item.deprivationRate}
                onChange={(e) =>
                  handleItemChange(index, "deprivationRate", e.target.value)
                }
              />
            </Grid>
            {/* Deprivation Coefficient */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Deprivation Coefficient"
                value={item.deprivationCoefficient}
                onChange={(e) =>
                  handleItemChange(
                    index,
                    "deprivationCoefficient",
                    e.target.value
                  )
                }
              />
            </Grid>
            {/* Referral Cost */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Referral Cost"
                value={item.referralCost}
                onChange={(e) =>
                  handleItemChange(index, "referralCost", e.target.value)
                }
              />
            </Grid>

            {/* Lead Time Data Section */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                Lead Time Data
              </Typography>
            </Grid>

            {/* Lead Time Distribution Type */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Distribution Type"
                value={item.leadTimeData.distributionType}
                onChange={(e) =>
                  handleItemChange(
                    index,
                    "leadTimeData",
                    e.target.value,
                    "distributionType"
                  )
                }
                variant="outlined"
              >
                <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
                <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
                <MenuItem value="FIXED">FIXED</MenuItem>
              </TextField>
            </Grid>

            {/* Dist Parameters Section for TRIANGULAR distribution */}
            {item.leadTimeData.distributionType === "TRIANGULAR" && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Distribution Parameters
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Min"
                    value={item.leadTimeData.distParameters.min || "0"}
                    onChange={(e) =>
                      handleItemChange(
                        index,
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
                    value={item.leadTimeData.distParameters.mode || "0"}
                    onChange={(e) =>
                      handleItemChange(
                        index,
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
                    value={item.leadTimeData.distParameters.max || "0"}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "leadTimeData",
                        e.target.value,
                        "distParameters",
                        "max"
                      )
                    }
                  />
                </Grid>
              </>
            )}

            {/* Duration Data Section (for Perishable Items) */}
            {item.isPerishable && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" gutterBottom>
                    Duration Data
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    select
                    fullWidth
                    label="Duration Distribution Type"
                    value={item.durationData?.distributionType || "UNIFORM"}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "durationData",
                        e.target.value,
                        "distributionType"
                      )
                    }
                    variant="outlined"
                  >
                    <MenuItem value="UNIFORM">UNIFORM</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    label="Min"
                    value={item.durationData?.distParameters.min || "30"}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "durationData",
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
                    label="Max"
                    value={item.durationData?.distParameters.max || "60"}
                    onChange={(e) =>
                      handleItemChange(
                        index,
                        "durationData",
                        e.target.value,
                        "distParameters",
                        "max"
                      )
                    }
                  />
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      ))}

      {/* Add Item button positioned below items list */}
      <Button
        variant="contained"
        onClick={() =>
          setItems([
            ...items,
            {
              name: "",
              isPerishable: false,
              price: "",
              orderingCost: "",
              holdingCost: "",
              deprivationRate: "",
              deprivationCoefficient: "",
              referralCost: "",
              leadTimeData: {
                distributionType: "TRIANGULAR",
                distParameters: { min: "0", mode: "0", max: "0" },
              },
            },
          ])
        }
        sx={{ marginTop: 4 }}
      >
        Add Item
      </Button>
    </>
  );
};

export default ItemsSection;
