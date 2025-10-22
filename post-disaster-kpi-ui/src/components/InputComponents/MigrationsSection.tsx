import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  IconButton,
  Box,
  FormControl,
  InputLabel,
  Select,
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

// Updated interface to match Java backend implementation
interface DistParams {
  min?: string;
  mode?: string;
  max?: string;
  mean?: string;
  stdDev?: string;
}
interface DataBlock {
  distributionType: string;
  distParameters: DistParams;
}
interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
  arrivalData: DataBlock;
  // quantityData is only needed for *_TO_SYSTEM migration types
  quantityData?: DataBlock;
  migrationRatio: number;
}

interface Camp {
  name: string;
}

interface Props {
  migrations: Migration[];
  setMigrations: React.Dispatch<React.SetStateAction<Migration[]>>;
  camps: Camp[];
}

const MigrationsSection: React.FC<Props> = ({
  migrations,
  setMigrations,
  camps,
}) => {
  const handleMigrationChange = (
    index: number,
    field: keyof Migration,
    value: string | DataBlock,
    subField?: "distributionType" | "distParameters",
    subSubField?: keyof DistParams
  ) => {
    const newMigrations = [...migrations];

    // Validate migrationRatio
    if (field === "migrationRatio") {
      // Only allow values between 0-1 and in decimal format
      if (
        typeof value === "string" &&
        (value === "" || /^0*\.?\d*$/.test(value))
      ) {
        if (value === "" || parseFloat(value) <= 1) {
          newMigrations[index].migrationRatio =
            value === "" ? 0 : parseFloat(value);
        }
        setMigrations(newMigrations);
        return;
      }
    }

    // Handle migration type change - add or remove quantityData as needed
    if (field === "migrationType") {
      const newType = String(value);

      // If changing to a type that needs quantityData
      if (
        newType.includes("_TO_SYSTEM") &&
        !newMigrations[index].quantityData
      ) {
        newMigrations[index].quantityData = {
          distributionType: "FIXED",
          distParameters: { mean: "500" },
        };
      }
      // If changing to a type that doesn't need quantityData
      else if (
        !newType.includes("_TO_SYSTEM") &&
        newMigrations[index].quantityData
      ) {
        delete newMigrations[index].quantityData;
      }
    }

    if (subField && subSubField) {
      // Handle nested fields within data structures
      if (field === "arrivalData" || field === "quantityData") {
        const block = newMigrations[index][field] as DataBlock | undefined;
        if (block && subField === "distParameters") {
          block.distParameters = {
            ...block.distParameters,
            [subSubField]: String(value),
          };
        }
      }
    } else if (subField) {
      // Handle direct subField
      if (field === "arrivalData" || field === "quantityData") {
        const block = newMigrations[index][field] as DataBlock | undefined;
        if (block) {
          if (subField === "distributionType" && typeof value === "string") {
            block.distributionType = value;
          } else if (
            subField === "distParameters" &&
            typeof value === "object" &&
            value
          ) {
            block.distParameters = value as DistParams;
          }
        } else if (
          field === "quantityData" &&
          typeof value === "object" &&
          value
        ) {
          // initialize quantityData if absent
          newMigrations[index].quantityData = value as DataBlock;
        }
      }
    } else {
      // Handle direct field assignment
      switch (field) {
        case "fromCamp":
          if (typeof value === "string") {
            // Validate that the camp exists
            const campExists = camps.some((camp) => camp.name === value);
            if (campExists || value === "") {
              newMigrations[index].fromCamp = value;
            } else {
              console.warn(
                `Warning: Camp '${value}' does not exist in the system`
              );
              // Don't update if camp doesn't exist
              return;
            }
          }
          break;
        case "toCamp":
          if (typeof value === "string") {
            // Validate that the camp exists
            const campExists = camps.some((camp) => camp.name === value);
            if (campExists || value === "") {
              newMigrations[index].toCamp = value;
            } else {
              console.warn(
                `Warning: Camp '${value}' does not exist in the system`
              );
              // Don't update if camp doesn't exist
              return;
            }
          }
          break;
        case "migrationType":
          if (typeof value === "string")
            newMigrations[index].migrationType = value;
          break;
        case "migrationRatio":
          if (typeof value === "string") {
            newMigrations[index].migrationRatio =
              value === "" ? 0 : parseFloat(value);
          }
          break;
        case "arrivalData":
          if (typeof value === "object" && value)
            newMigrations[index].arrivalData = value as DataBlock;
          break;
        case "quantityData":
          if (typeof value === "object" && value)
            newMigrations[index].quantityData = value as DataBlock;
          break;
        default:
          break;
      }
    }

    setMigrations(newMigrations);
  };

  // Function to update distribution parameters based on type
  const updateDistParameters = (
    migrationIndex: number,
    dataType: "arrivalData" | "quantityData",
    newDistType: string
  ) => {
    const newMigrations = [...migrations];

    // Initialize quantityData if it doesn't exist and is needed
    if (
      dataType === "quantityData" &&
      !newMigrations[migrationIndex].quantityData &&
      newMigrations[migrationIndex].migrationType.includes("_TO_SYSTEM")
    ) {
      newMigrations[migrationIndex].quantityData = {
        distributionType: newDistType,
        distParameters: {},
      };
    }

    // Use a type guard approach to fix the TypeScript error
    const updateParams = (): DistParams => {
      switch (newDistType) {
        case "TRIANGULAR":
          return {
            min: "1",
            mode: "2",
            max: "4",
          };
        case "EXPONENTIAL":
        case "FIXED":
        case "EQUAL_SHARE":
          return {
            mean: dataType === "arrivalData" ? "30" : "500",
          };
        case "BERNOULLI":
          return {
            mean: "0.5",
          };
        case "NORMAL":
          return {
            mean: dataType === "arrivalData" ? "30" : "500",
            stdDev: dataType === "arrivalData" ? "5" : "100",
          };
        case "UNIFORM":
          return {
            min: "1",
            max: dataType === "arrivalData" ? "10" : "1000",
          };
        default:
          return {};
      }
    };

    // Set the parameters safely using type checking
    if (dataType === "arrivalData") {
      newMigrations[migrationIndex].arrivalData.distParameters = updateParams();
    } else if (
      dataType === "quantityData" &&
      newMigrations[migrationIndex].quantityData
    ) {
      // Only access quantityData if it exists
      newMigrations[migrationIndex].quantityData!.distParameters =
        updateParams();
    }

    setMigrations(newMigrations);
  };

  // Helper to render the appropriate fields for a distribution type
  const renderDistParams = (
    migrationIndex: number,
    dataType: "arrivalData" | "quantityData",
    migration: Migration
  ) => {
    const data =
      dataType === "arrivalData"
        ? migration.arrivalData
        : migration.quantityData;
    if (!data) return null;

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
              label={`Mean ${dataType === "arrivalData" ? "(days)" : ""}`}
              value={params.mean || ""}
              onChange={(e) => {
                handleMigrationChange(
                  migrationIndex,
                  dataType,
                  e.target.value,
                  "distParameters",
                  "mean"
                );
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
                label={`Mean ${dataType === "arrivalData" ? "(days)" : ""}`}
                value={params.mean || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    dataType,
                    e.target.value,
                    "distParameters",
                    "mean"
                  );
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={`Standard Deviation ${
                  dataType === "arrivalData" ? "(days)" : ""
                }`}
                value={params.stdDev || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    dataType,
                    e.target.value,
                    "distParameters",
                    "stdDev"
                  );
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
                label={`Minimum ${dataType === "arrivalData" ? "(days)" : ""}`}
                value={params.min || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    dataType,
                    e.target.value,
                    "distParameters",
                    "min"
                  );
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={`Mode ${dataType === "arrivalData" ? "(days)" : ""}`}
                value={params.mode || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    dataType,
                    e.target.value,
                    "distParameters",
                    "mode"
                  );
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={`Maximum ${dataType === "arrivalData" ? "(days)" : ""}`}
                value={params.max || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    dataType,
                    e.target.value,
                    "distParameters",
                    "max"
                  );
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
                label={`Minimum ${dataType === "arrivalData" ? "(days)" : ""}`}
                value={params.min || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    dataType,
                    e.target.value,
                    "distParameters",
                    "min"
                  );
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label={`Maximum ${dataType === "arrivalData" ? "(days)" : ""}`}
                value={params.max || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    dataType,
                    e.target.value,
                    "distParameters",
                    "max"
                  );
                }}
              />
            </Grid>
          </>
        );

      case "BERNOULLI":
        return (
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Mean (probability)"
              value={params.mean || ""}
              onChange={(e) => {
                handleMigrationChange(
                  migrationIndex,
                  dataType,
                  e.target.value,
                  "distParameters",
                  "mean"
                );
              }}
            />
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {migrations.map((migration, migrationIndex) => (
        <NestedCollapsibleSection
          key={`migration-${migrationIndex}`}
          title={
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                Migration {migrationIndex + 1}
                {(() => {
                  const t = migration.migrationType || "";
                  if (t.includes("_WITHIN_SYSTEM")) {
                    return migration.fromCamp && migration.toCamp
                      ? `: ${migration.fromCamp} → ${migration.toCamp}`
                      : "";
                  }
                  if (t.includes("_TO_SYSTEM")) {
                    return migration.toCamp ? `: → ${migration.toCamp}` : "";
                  }
                  if (t.includes("_FROM_SYSTEM")) {
                    return migration.fromCamp
                      ? `: ${migration.fromCamp} →`
                      : "";
                  }
                  return "";
                })()}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      "Are you sure you want to delete this migration?"
                    )
                  ) {
                    const newMigrations = [...migrations];
                    newMigrations.splice(migrationIndex, 1);
                    setMigrations(newMigrations);
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
            {/* Migration Type - Show this first to determine which fields to show */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Migration Type</InputLabel>
                <Select
                  label="Migration Type"
                  value={migration.migrationType}
                  onChange={(e) =>
                    handleMigrationChange(
                      migrationIndex,
                      "migrationType",
                      e.target.value
                    )
                  }
                >
                  <MenuItem value="INTERNAL_WITHIN_SYSTEM">
                    {formatLabel("INTERNAL_WITHIN_SYSTEM")}
                  </MenuItem>
                  <MenuItem value="INTERNAL_TO_SYSTEM">
                    {formatLabel("INTERNAL_TO_SYSTEM")}
                  </MenuItem>
                  <MenuItem value="INTERNAL_FROM_SYSTEM">
                    {formatLabel("INTERNAL_FROM_SYSTEM")}
                  </MenuItem>
                  <MenuItem value="EXTERNAL_WITHIN_SYSTEM">
                    {formatLabel("EXTERNAL_WITHIN_SYSTEM")}
                  </MenuItem>
                  <MenuItem value="EXTERNAL_TO_SYSTEM">
                    {formatLabel("EXTERNAL_TO_SYSTEM")}
                  </MenuItem>
                  <MenuItem value="EXTERNAL_FROM_SYSTEM">
                    {formatLabel("EXTERNAL_FROM_SYSTEM")}
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* From Camp - Only show for types that require a source camp */}
            {!migration.migrationType.includes("_TO_SYSTEM") && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>From Camp</InputLabel>
                  <Select
                    label="From Camp"
                    value={migration.fromCamp}
                    onChange={(e) =>
                      handleMigrationChange(
                        migrationIndex,
                        "fromCamp",
                        e.target.value
                      )
                    }
                  >
                    {camps.map((camp) => (
                      <MenuItem key={`from-${camp.name}`} value={camp.name}>
                        {camp.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* To Camp - Only show for types that require a destination camp */}
            {!migration.migrationType.includes("_FROM_SYSTEM") && (
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>To Camp</InputLabel>
                  <Select
                    label="To Camp"
                    value={migration.toCamp}
                    onChange={(e) =>
                      handleMigrationChange(
                        migrationIndex,
                        "toCamp",
                        e.target.value
                      )
                    }
                  >
                    {camps.map((camp) => (
                      <MenuItem key={`to-${camp.name}`} value={camp.name}>
                        {camp.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Add helper text explaining the migration type */}
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {migration.migrationType === "INTERNAL_WITHIN_SYSTEM" &&
                  "Migration of internal population between two camps within the system."}
                {migration.migrationType === "INTERNAL_TO_SYSTEM" &&
                  "Migration of internal population from outside into the system."}
                {migration.migrationType === "INTERNAL_FROM_SYSTEM" &&
                  "Migration of internal population from inside the system to outside."}
                {migration.migrationType === "EXTERNAL_WITHIN_SYSTEM" &&
                  "Migration of external population between two camps within the system."}
                {migration.migrationType === "EXTERNAL_TO_SYSTEM" &&
                  "Migration of external population from outside into the system."}
                {migration.migrationType === "EXTERNAL_FROM_SYSTEM" &&
                  "Migration of external population from inside the system to outside."}
              </Typography>
            </Grid>

            {/* Arrival Data Section */}
            <Grid item xs={12}>
              <NestedCollapsibleSection title="Arrival Data" level="tertiary">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Arrival Distribution Type</InputLabel>
                      <Select
                        label="Arrival Distribution Type"
                        value={migration.arrivalData.distributionType}
                        onChange={(e) => {
                          const newDistType = e.target.value;
                          handleMigrationChange(
                            migrationIndex,
                            "arrivalData",
                            newDistType,
                            "distributionType"
                          );
                          updateDistParameters(
                            migrationIndex,
                            "arrivalData",
                            newDistType
                          );
                        }}
                      >
                        <MenuItem value="FIXED">
                          {formatLabel("FIXED")}
                        </MenuItem>
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
                        <MenuItem value="BERNOULLI">
                          {formatLabel("BERNOULLI")}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Dynamic parameter fields based on distribution type */}
                  {renderDistParams(migrationIndex, "arrivalData", migration)}
                </Grid>
              </NestedCollapsibleSection>
            </Grid>

            {/* Quantity Data Section - Only show for *_TO_SYSTEM migration types */}
            {migration.migrationType.includes("_TO_SYSTEM") && (
              <Grid item xs={12}>
                <NestedCollapsibleSection
                  title="Quantity Data"
                  level="tertiary"
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <FormControl fullWidth variant="outlined">
                        <InputLabel>Quantity Distribution Type</InputLabel>
                        <Select
                          label="Quantity Distribution Type"
                          value={
                            migration.quantityData?.distributionType || "FIXED"
                          }
                          onChange={(e) => {
                            const newDistType = e.target.value;
                            if (!migration.quantityData) {
                              handleMigrationChange(
                                migrationIndex,
                                "quantityData",
                                {
                                  distributionType: newDistType,
                                  distParameters: { mean: "500" },
                                }
                              );
                            } else {
                              handleMigrationChange(
                                migrationIndex,
                                "quantityData",
                                newDistType,
                                "distributionType"
                              );
                            }
                            updateDistParameters(
                              migrationIndex,
                              "quantityData",
                              newDistType
                            );
                          }}
                        >
                          <MenuItem value="FIXED">
                            {formatLabel("FIXED")}
                          </MenuItem>
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
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Dynamic parameter fields based on distribution type */}
                    {migration.quantityData &&
                      renderDistParams(
                        migrationIndex,
                        "quantityData",
                        migration
                      )}
                  </Grid>
                </NestedCollapsibleSection>
              </Grid>
            )}

            {/* Migration Ratio (hidden for *_TO_SYSTEM types which use quantityData instead) */}
            {!migration.migrationType.includes("_TO_SYSTEM") && (
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Migration Ratio"
                  type="number"
                  inputProps={{ min: 0, max: 1, step: 0.01 }}
                  value={migration.migrationRatio || 0.05}
                  onChange={(e) =>
                    handleMigrationChange(
                      migrationIndex,
                      "migrationRatio",
                      e.target.value
                    )
                  }
                />
              </Grid>
            )}
          </Grid>
        </NestedCollapsibleSection>
      ))}

      {/* Add Migration Button */}
      <Button
        variant="contained"
        onClick={() => {
          const newMigration: Migration = {
            fromCamp: "",
            toCamp: "",
            migrationType: "INTERNAL_WITHIN_SYSTEM",
            arrivalData: {
              distributionType: "FIXED",
              distParameters: { mean: "30" },
            },
            // No quantityData by default since INTERNAL_WITHIN_SYSTEM doesn't use it
            migrationRatio: 0.05,
          };

          // Set default camps based on type
          if (camps.length > 0) {
            if (newMigration.migrationType.includes("WITHIN_SYSTEM")) {
              newMigration.fromCamp = camps[0].name;
              newMigration.toCamp =
                camps.length > 1 ? camps[1].name : camps[0].name;
            } else if (newMigration.migrationType.includes("_TO_SYSTEM")) {
              newMigration.toCamp = camps[0].name;
            } else if (newMigration.migrationType.includes("_FROM_SYSTEM")) {
              newMigration.fromCamp = camps[0].name;
            }
          }

          setMigrations([...migrations, newMigration]);
        }}
        sx={{ marginTop: 4 }}
      >
        Add Migration
      </Button>
    </>
  );
};

export default MigrationsSection;
