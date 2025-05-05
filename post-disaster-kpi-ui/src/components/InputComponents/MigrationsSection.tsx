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

// Updated interface to match Java backend implementation
interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
  arrivalData: {
    distributionType: string;
    distParameters: {
      min?: string;
      mode?: string;
      max?: string;
      mean?: string;
      stdDev?: string;
    };
  };
  // quantityData is only needed for *_TO_SYSTEM migration types
  quantityData?: {
    distributionType: string;
    distParameters: {
      min?: string;
      mode?: string;
      max?: string;
      mean?: string;
      stdDev?: string;
    };
  };
  migrationRatio: string;
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
    value: any,
    subField?: string,
    subSubField?: string
  ) => {
    const newMigrations = [...migrations];

    // Handle migration type change - add or remove quantityData as needed
    if (field === "migrationType") {
      const newType = value as string;

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
      if (
        newMigrations[index][field] &&
        typeof newMigrations[index][field] === "object"
      ) {
        (newMigrations[index][field] as any)[subField][subSubField] = value;
      }
    } else if (subField) {
      // Handle direct subField
      if (
        newMigrations[index][field] &&
        typeof newMigrations[index][field] === "object"
      ) {
        (newMigrations[index][field] as any)[subField] = value;
      }
    } else {
      // Handle direct field assignment
      newMigrations[index][field] = value;
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
    const updateParams = () => {
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
      newMigrations[migrationIndex].quantityData.distParameters =
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

      // Other cases (TRIANGULAR, UNIFORM, BERNOULLI) remain the same
      // ...existing code...

      default:
        return null;
    }
  };

  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ marginTop: 4 }}>
        Migrations Configuration
      </Typography>

      {migrations.map((migration, migrationIndex) => (
        <NestedCollapsibleSection
          key={`migration-${migrationIndex}`}
          title={
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                Migration {migrationIndex + 1}
                {migration.fromCamp && migration.toCamp
                  ? `: ${migration.fromCamp} → ${migration.toCamp}`
                  : ""}
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
                    INTERNAL_WITHIN_SYSTEM
                  </MenuItem>
                  <MenuItem value="INTERNAL_TO_SYSTEM">
                    INTERNAL_TO_SYSTEM
                  </MenuItem>
                  <MenuItem value="INTERNAL_FROM_SYSTEM">
                    INTERNAL_FROM_SYSTEM
                  </MenuItem>
                  <MenuItem value="EXTERNAL_WITHIN_SYSTEM">
                    EXTERNAL_WITHIN_SYSTEM
                  </MenuItem>
                  <MenuItem value="EXTERNAL_TO_SYSTEM">
                    EXTERNAL_TO_SYSTEM
                  </MenuItem>
                  <MenuItem value="EXTERNAL_FROM_SYSTEM">
                    EXTERNAL_FROM_SYSTEM
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
                        <MenuItem value="FIXED">FIXED</MenuItem>
                        <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                        <MenuItem value="NORMAL">NORMAL</MenuItem>
                        <MenuItem value="UNIFORM">UNIFORM</MenuItem>
                        <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
                        <MenuItem value="BERNOULLI">BERNOULLI</MenuItem>
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
                          <MenuItem value="FIXED">FIXED</MenuItem>
                          <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                          <MenuItem value="NORMAL">NORMAL</MenuItem>
                          <MenuItem value="UNIFORM">UNIFORM</MenuItem>
                          <MenuItem value="TRIANGULAR">TRIANGULAR</MenuItem>
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

            {/* Migration Ratio */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Migration Ratio"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.01 }}
                value={migration.migrationRatio || "0.05"}
                onChange={(e) =>
                  handleMigrationChange(
                    migrationIndex,
                    "migrationRatio",
                    e.target.value
                  )
                }
              />
            </Grid>
          </Grid>
        </NestedCollapsibleSection>
      ))}

      {/* Add Migration Button */}
      <Button
        variant="contained"
        onClick={() => {
          const newMigration = {
            fromCamp: "",
            toCamp: "",
            migrationType: "INTERNAL_WITHIN_SYSTEM",
            arrivalData: {
              distributionType: "FIXED",
              distParameters: { mean: "30" },
            },
            // No quantityData by default since INTERNAL_WITHIN_SYSTEM doesn't use it
            migrationRatio: "0.05",
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
