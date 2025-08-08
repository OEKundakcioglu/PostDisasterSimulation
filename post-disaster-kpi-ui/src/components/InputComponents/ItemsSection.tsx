import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  Tooltip,
  Box,
  IconButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";
import { Item, DistParameters } from "../../types/Item";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRef } from "react";

interface Props {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
}

const ItemsSection: React.FC<Props> = ({ items, setItems }) => {
  // Explanations for different concepts
  const explanations = {
    leadTime:
      "Lead time is the delay between when an order is placed and when it is received. It affects inventory planning and response time.",
    perishable:
      "Perishable items have a limited shelf life. When enabled, you must specify the duration distribution.",
    deprivation:
      "Deprivation parameters measure the negative impact when demand isn't satisfied. Higher rates mean more severe consequences for shortages.",
    distributions:
      "Distribution types determine how random values are generated. Each has specific parameters that control the range and likelihood of values.",
  };

  // Type guards for distribution parameters
  const isTriangular = (
    params: DistParameters
  ): params is { min: string; mode: string; max: string } => {
    return "mode" in params && "min" in params && "max" in params;
  };

  const isBernoulli = (
    params: DistParameters
  ): params is {
    mean: string;
    arrivalInterval: string;
    initialArrival: boolean;
  } => {
    return (
      "mean" in params &&
      "arrivalInterval" in params &&
      "initialArrival" in params
    );
  };

  const isUniform = (
    params: DistParameters
  ): params is { min: string; max: string } => {
    return "min" in params && "max" in params && !("mode" in params);
  };

  const isMeanOnly = (params: DistParameters): params is { mean: string } => {
    return "mean" in params && !("arrivalInterval" in params);
  };

  const isNormal = (
    params: DistParameters
  ): params is { mean: string; stdDev: string } => {
    return "mean" in params && "stdDev" in params;
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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

  // Determine if a field should only accept numeric input
  const isNumericField = (
    field: keyof Item,
    subField?: string,
    subSubField?: string
  ): boolean => {
    // Fields that should be numbers
    const numericFields: (keyof Item)[] = [
      "price",
      "orderingCost",
      "holdingCost",
      "deprivationRate",
      "deprivationCoefficient",
      "referralCost",
    ];

    if (subSubField) {
      // All distribution parameters are numeric except initialArrival which is boolean
      return subSubField !== "initialArrival";
    }

    return numericFields.includes(field);
  };

  // Enhance handleItemChange to ensure consistent numeric validation
  const handleItemChange = (
    index: number,
    field: keyof Item,
    value: any,
    subField?:
      | keyof Item["leadTimeData"]
      | keyof NonNullable<Item["durationData"]>,
    subSubField?: string
  ) => {
    const newItems = [...items];

    // Validate numeric input for number fields
    if (
      typeof value === "string" &&
      isNumericField(field, subField as string, subSubField) &&
      value !== ""
    ) {
      // For decimals (price, rates, etc.)
      if (
        field === "price" ||
        field === "orderingCost" ||
        field === "holdingCost" ||
        field === "deprivationRate" ||
        field === "deprivationCoefficient" ||
        field === "referralCost" ||
        (subSubField &&
          (subSubField === "mean" ||
            subSubField === "min" ||
            subSubField === "max" ||
            subSubField === "mode" ||
            subSubField === "stdDev"))
      ) {
        if (!/^-?\d*\.?\d*$/.test(value)) {
          return; // Invalid decimal format
        }
      }
      // For integers
      else if (!/^-?\d*$/.test(value)) {
        return; // Invalid integer format
      }
    }

    if (subField && subSubField) {
      // Handle nested subField and subSubField
      if (
        (field === "leadTimeData" || field === "durationData") &&
        newItems[index][field]
      ) {
        const mainField = newItems[index][field];

        if (subField === "distParameters") {
          // Create a new distParameters object based on distribution type
          const params = { ...mainField.distParameters };

          if (field === "leadTimeData") {
            switch (mainField.distributionType) {
              case "TRIANGULAR":
                if (isTriangular(params)) {
                  if (
                    subSubField === "min" ||
                    subSubField === "mode" ||
                    subSubField === "max"
                  ) {
                    params[subSubField] = value;
                  }
                }
                break;
              case "EXPONENTIAL":
              case "FIXED":
                if (isMeanOnly(params) && subSubField === "mean") {
                  params.mean = value;
                }
                break;
              case "BERNOULLI":
                if (isBernoulli(params)) {
                  if (
                    subSubField === "mean" ||
                    subSubField === "arrivalInterval"
                  ) {
                    params[subSubField] = value;
                  } else if (subSubField === "initialArrival") {
                    params.initialArrival = value;
                  }
                }
                break;
            }
          } else if (
            field === "durationData" &&
            mainField.distributionType === "UNIFORM"
          ) {
            if (isUniform(params)) {
              if (subSubField === "min" || subSubField === "max") {
                params[subSubField] = value;
              }
            }
          }

          // Update with the new distParameters
          mainField.distParameters = params;
        }
      }
    } else if (subField) {
      // Handle nested subField
      if (
        (field === "leadTimeData" || field === "durationData") &&
        newItems[index][field]
      ) {
        const mainField = newItems[index][field];

        if (subField === "distributionType") {
          // Update distribution type and reset parameters based on the new type
          mainField.distributionType = value as any;

          if (field === "leadTimeData") {
            switch (value) {
              case "TRIANGULAR":
                mainField.distParameters = { min: "1", mode: "2", max: "4" };
                break;
              case "EXPONENTIAL":
              case "FIXED":
              case "EQUAL_SHARE":
                mainField.distParameters = { mean: "2" };
                break;
              case "BERNOULLI":
                mainField.distParameters = {
                  mean: "0.5",
                  arrivalInterval: "10",
                  initialArrival: true,
                };
                break;
              case "NORMAL":
                mainField.distParameters = { mean: "10", stdDev: "2" };
                break;
              case "UNIFORM":
                mainField.distParameters = { min: "1", max: "5" };
                break;
            }
          } else if (field === "durationData") {
            switch (value) {
              case "UNIFORM":
                mainField.distParameters = { min: "30", max: "60" };
                break;
              case "NORMAL":
                mainField.distParameters = { mean: "45", stdDev: "5" };
                break;
            }
          }
        }
      }
    } else {
      // Directly assign to `field` if types are compatible
      if (
        value !== undefined &&
        (typeof newItems[index][field] === typeof value ||
          newItems[index][field] === undefined)
      ) {
        (newItems[index][field] as typeof value) = value;
      }

      if (field === "isPerishable") {
        // Set `durationData` for perishable items
        if (value === true && !newItems[index].durationData) {
          newItems[index].durationData = {
            distributionType: "UNIFORM",
            distParameters: { min: "30", max: "60" },
          };
        } else if (!value) {
          delete newItems[index].durationData;
        }
      }
    }

    setItems(newItems);
  };

  // Custom label with units
  const getCustomLabel = (
    field: string,
    subField?: string,
    subSubField?: string
  ): string => {
    if (subSubField) {
      switch (subSubField) {
        case "min":
          return "Minimum (days)";
        case "max":
          return "Maximum (days)";
        case "mode":
          return "Mode (days)";
        case "mean":
          return "Mean (days)";
        case "stdDev":
          return "Standard Deviation (days)";
        case "arrivalInterval":
          return "Arrival Interval (days)";
        default:
          return subSubField;
      }
    }

    switch (field) {
      case "price":
        return "Price";
      case "orderingCost":
        return "Ordering Cost";
      case "holdingCost":
        return "Holding Cost (per unit per day)";
      case "deprivationRate":
        return "Deprivation Rate";
      case "deprivationCoefficient":
        return "Deprivation Coefficient";
      case "referralCost":
        return "Referral Cost";
      default:
        return field;
    }
  };

  // Function to render distribution parameters based on the distribution type
  const renderDistributionParameters = (
    item: Item,
    index: number,
    field: "leadTimeData" | "durationData"
  ) => {
    const distributionData = item[field];
    if (!distributionData) return null;

    const { distributionType, distParameters } = distributionData;

    switch (distributionType) {
      case "TRIANGULAR":
        if (isTriangular(distParameters)) {
          return (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(field, "distParameters", "min")}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 1,
                    inputMode: "numeric",
                  }}
                  value={distParameters.min}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "min"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(field, "distParameters", "mode")}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 1,
                    inputMode: "numeric",
                  }}
                  value={distParameters.mode}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "mode"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(field, "distParameters", "max")}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 1,
                    inputMode: "numeric",
                  }}
                  value={distParameters.max}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "max"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
            </>
          );
        }
        return null;

      case "EXPONENTIAL":
      case "FIXED":
        if (isMeanOnly(distParameters)) {
          return (
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={getCustomLabel(field, "distParameters", "mean")}
                type="number"
                inputProps={{
                  min: 0,
                  step: field === "leadTimeData" ? 1 : 0.01,
                  inputMode: "numeric",
                }}
                value={distParameters.mean}
                onChange={(e) =>
                  handleItemChange(
                    index,
                    field,
                    e.target.value,
                    "distParameters",
                    "mean"
                  )
                }
                onKeyDown={handleNumericKeyDown}
              />
            </Grid>
          );
        }
        return null;

      case "BERNOULLI":
        if (isBernoulli(distParameters)) {
          return (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Mean Probability"
                  type="number"
                  inputProps={{
                    min: 0,
                    max: 1,
                    step: 0.01,
                    inputMode: "numeric",
                  }}
                  value={distParameters.mean}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "mean"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(
                    field,
                    "distParameters",
                    "arrivalInterval"
                  )}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 1,
                    inputMode: "numeric",
                  }}
                  value={distParameters.arrivalInterval}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "arrivalInterval"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={distParameters.initialArrival}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          field,
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
          );
        }
        return null;

      case "UNIFORM":
        if (isUniform(distParameters)) {
          return (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(field, "distParameters", "min")}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 1,
                    inputMode: "numeric",
                  }}
                  value={distParameters.min}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "min"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(field, "distParameters", "max")}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 1,
                    inputMode: "numeric",
                  }}
                  value={distParameters.max}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "max"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
            </>
          );
        }
        return null;
      case "NORMAL":
        if (isNormal(distParameters)) {
          return (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(field, "distParameters", "mean")}
                  type="number"
                  inputProps={{
                    min: 0,
                    step: 0.01,
                    inputMode: "numeric",
                  }}
                  value={distParameters.mean}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "mean"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label={getCustomLabel(field, "distParameters", "stdDev")}
                  type="number"
                  inputProps={{
                    min: 0.01,
                    step: 0.01,
                    inputMode: "numeric",
                  }}
                  value={distParameters.stdDev}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      field,
                      e.target.value,
                      "distParameters",
                      "stdDev"
                    )
                  }
                  onKeyDown={handleNumericKeyDown}
                />
              </Grid>
            </>
          );
        }
        return null;
      case "EQUAL_SHARE":
        if (isMeanOnly(distParameters)) {
          return (
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={getCustomLabel(field, "distParameters", "mean")}
                type="number"
                inputProps={{
                  min: 0,
                  step: 0.01,
                  inputMode: "numeric",
                }}
                value={distParameters.mean}
                onChange={(e) =>
                  handleItemChange(
                    index,
                    field,
                    e.target.value,
                    "distParameters",
                    "mean"
                  )
                }
                onKeyDown={handleNumericKeyDown}
              />
            </Grid>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <>
      {items.map((item, index) => (
        <NestedCollapsibleSection
          key={`item-${index}`}
          title={
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                Item {index + 1}
                {item.name ? `: ${item.name}` : ""}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent collapsing when clicking delete
                  // Confirm before deleting
                  if (
                    window.confirm(
                      `Are you sure you want to delete this item${
                        item.name ? ` (${item.name})` : ""
                      }?${
                        item.name
                          ? "\n\nWARNING: This will also remove any demands using this item."
                          : ""
                      }`
                    )
                  ) {
                    const newItems = [...items];
                    newItems.splice(index, 1);
                    setItems(newItems);
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
            {/* Basic Item Properties */}
            <Grid item xs={12}>
              <NestedCollapsibleSection
                title="Basic Properties"
                level="tertiary"
              >
                <Grid container spacing={2}>
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
                  <Grid item xs={12} sm={6} md={4}>
                    <Box
                      sx={{
                        border: "1px solid #e0e0e0",
                        borderRadius: 1,
                        p: 1.5,
                      }}
                    >
                      <Typography variant="subtitle2" gutterBottom>
                        Item Expiration
                        <Tooltip
                          title="Items with an expiration date will become unusable after a certain period of time."
                          arrow
                          placement="top"
                        >
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Typography>

                      <Box
                        sx={{ display: "flex", flexDirection: "column", mt: 1 }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={item.isPerishable}
                              onChange={(e) =>
                                handleItemChange(index, "isPerishable", true)
                              }
                            />
                          }
                          label="Has Expiration Date"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={!item.isPerishable}
                              onChange={(e) =>
                                handleItemChange(index, "isPerishable", false)
                              }
                            />
                          }
                          label="No Expiration Date"
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label={getCustomLabel("price")}
                      type="number"
                      inputProps={{
                        min: 0,
                        step: 0.01,
                        inputMode: "numeric",
                      }}
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, "price", e.target.value)
                      }
                      onKeyDown={handleNumericKeyDown}
                    />
                  </Grid>
                </Grid>
              </NestedCollapsibleSection>
            </Grid>

            {/* Cost Parameters */}
            <Grid item xs={12}>
              <NestedCollapsibleSection
                title="Cost Parameters"
                level="tertiary"
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label={getCustomLabel("orderingCost")}
                      type="number"
                      inputProps={{
                        min: 0,
                        step: 0.01,
                        inputMode: "numeric",
                      }}
                      value={item.orderingCost}
                      onChange={(e) =>
                        handleItemChange(index, "orderingCost", e.target.value)
                      }
                      onKeyDown={handleNumericKeyDown}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label={getCustomLabel("holdingCost")}
                      type="number"
                      inputProps={{
                        min: 0,
                        step: 0.01,
                        inputMode: "numeric",
                      }}
                      value={item.holdingCost}
                      onChange={(e) =>
                        handleItemChange(index, "holdingCost", e.target.value)
                      }
                      onKeyDown={handleNumericKeyDown}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      label={getCustomLabel("referralCost")}
                      type="number"
                      inputProps={{
                        min: 0,
                        step: 0.01,
                        inputMode: "numeric",
                      }}
                      value={item.referralCost}
                      onChange={(e) =>
                        handleItemChange(index, "referralCost", e.target.value)
                      }
                      onKeyDown={handleNumericKeyDown}
                    />
                  </Grid>
                </Grid>
              </NestedCollapsibleSection>
            </Grid>

            {/* Deprivation Parameters */}
            <Grid item xs={12}>
              <NestedCollapsibleSection
                title={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Deprivation Parameters
                    <Tooltip
                      title={explanations.deprivation}
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
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={getCustomLabel("deprivationRate")}
                      type="number"
                      inputProps={{
                        min: 0,
                        max: 1,
                        step: 0.01,
                        inputMode: "numeric",
                      }}
                      value={item.deprivationRate}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "deprivationRate",
                          e.target.value
                        )
                      }
                      onKeyDown={handleNumericKeyDown}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label={getCustomLabel("deprivationCoefficient")}
                      type="number"
                      inputProps={{
                        min: 0,
                        step: 0.01,
                        inputMode: "numeric",
                      }}
                      value={item.deprivationCoefficient}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "deprivationCoefficient",
                          e.target.value
                        )
                      }
                      onKeyDown={handleNumericKeyDown}
                    />
                  </Grid>
                </Grid>
              </NestedCollapsibleSection>
            </Grid>

            {/* Lead Time Data */}
            <Grid item xs={12}>
              <NestedCollapsibleSection
                title={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    Lead Time Data
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
                      <MenuItem value="NORMAL">NORMAL</MenuItem>
                      <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                      <MenuItem value="UNIFORM">UNIFORM</MenuItem>
                      <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
                      <MenuItem value="FIXED">FIXED</MenuItem>
                      <MenuItem value="EQUAL_SHARE">EQUAL SHARE</MenuItem>
                    </TextField>
                  </Grid>

                  {/* Distribution Parameters */}
                  {renderDistributionParameters(item, index, "leadTimeData")}
                </Grid>
              </NestedCollapsibleSection>
            </Grid>

            {/* Duration Data - Only visible if item is perishable */}
            {item.isPerishable && (
              <Grid item xs={12}>
                <NestedCollapsibleSection
                  title="Duration Data (days)"
                  level="tertiary"
                >
                  <Grid container spacing={2}>
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
                        <MenuItem value="NORMAL">NORMAL</MenuItem>
                      </TextField>
                    </Grid>

                    {/* Distribution Parameters */}
                    {item.durationData &&
                      renderDistributionParameters(item, index, "durationData")}
                  </Grid>
                </NestedCollapsibleSection>
              </Grid>
            )}
          </Grid>
        </NestedCollapsibleSection>
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
                distParameters: { min: "1", mode: "2", max: "4" },
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
