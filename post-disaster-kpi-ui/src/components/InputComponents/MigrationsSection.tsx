import React from "react";
import {
  Typography,
  Grid,
  TextField,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";

interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
  arrivalData: {
    distributionType: string;
    distParameters: {
      mean?: string;
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
    subField?: keyof Migration["arrivalData"],
    subSubField?: keyof Migration["arrivalData"]["distParameters"]
  ) => {
    const newMigrations = [...migrations];

    if (subField && subSubField) {
      // Handle nested fields within "arrivalData"
      if (field === "arrivalData" && newMigrations[index][field]) {
        (newMigrations[index][field][subField] as any)[subSubField] = value;
      }
    } else if (subField) {
      // Handle direct subField within "arrivalData"
      if (field === "arrivalData" && newMigrations[index][field]) {
        (newMigrations[index][field] as any)[subField] = value;
      }
    } else {
      // Handle direct field assignment by checking type compatibility
      if (
        typeof newMigrations[index][field] === typeof value ||
        field === "migrationType" ||
        field === "fromCamp" ||
        field === "toCamp" ||
        field === "migrationRatio"
      ) {
        newMigrations[index][field] = value;
      } else if (field === "arrivalData" && typeof value === "object") {
        newMigrations[index][field] = value as Migration["arrivalData"];
      }
    }

    setMigrations(newMigrations);
  };

  return (
    <>
      <Typography variant="h5" gutterBottom sx={{ marginTop: 4 }}>
        Migrations Configuration
      </Typography>
      {migrations.map((migration, migrationIndex) => (
        <Paper
          key={`migration-${migrationIndex}`}
          sx={{ padding: 2, marginTop: 4 }}
        >
          <Typography variant="h6" sx={{ marginBottom: 2 }}>
            Migration {migrationIndex + 1}
          </Typography>
          <Grid container spacing={2}>
            {/* From Camp */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel shrink>From Camp</InputLabel>
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
                    <MenuItem key={camp.name} value={camp.name}>
                      {camp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* To Camp */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel shrink>To Camp</InputLabel>
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
                    <MenuItem key={camp.name} value={camp.name}>
                      {camp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Migration Type */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel shrink>Migration Type</InputLabel>
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
                  <MenuItem value="EXTERNAL_TO_SYSTEM">
                    EXTERNAL_TO_SYSTEM
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Arrival Data Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ marginTop: 2 }}>
                Arrival Data
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth variant="outlined">
                <InputLabel shrink>Arrival Distribution Type</InputLabel>
                <Select
                  label="Arrival Distribution Type"
                  value={migration.arrivalData.distributionType}
                  onChange={(e) =>
                    handleMigrationChange(
                      migrationIndex,
                      "arrivalData",
                      e.target.value,
                      "distributionType"
                    )
                  }
                >
                  <MenuItem value="FIXED">FIXED</MenuItem>
                  <MenuItem value="EXPONENTIAL">EXPONENTIAL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Mean"
                value={migration.arrivalData.distParameters.mean || ""}
                onChange={(e) =>
                  handleMigrationChange(
                    migrationIndex,
                    "arrivalData",
                    e.target.value,
                    "distParameters",
                    "mean"
                  )
                }
              />
            </Grid>

            {/* Migration Ratio */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Migration Ratio"
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
        </Paper>
      ))}

      {/* Add Migration Button positioned below the migrations list */}
      <Button
        variant="contained"
        onClick={() =>
          setMigrations([
            ...migrations,
            {
              fromCamp: "",
              toCamp: "",
              migrationType: "INTERNAL_WITHIN_SYSTEM",
              arrivalData: {
                distributionType: "FIXED",
                distParameters: { mean: "120000" },
              },
              migrationRatio: "0.05",
            },
          ])
        }
        sx={{ marginTop: 4 }}
      >
        Add Migration
      </Button>
    </>
  );
};

export default MigrationsSection;
