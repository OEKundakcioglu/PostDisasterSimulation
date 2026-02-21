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
  Alert,
  AlertTitle,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";

// Population Group → Movement → migrationType mapping
const POPULATION_GROUP = [
  { value: "INTERNAL", label: "Camp Residents" },
  { value: "EXTERNAL", label: "Surrounding Area Population" },
] as const;

const MOVEMENT = [
  { value: "WITHIN_SYSTEM", label: "Between Camps" },
  { value: "TO_SYSTEM", label: "Entering system" },
  { value: "FROM_SYSTEM", label: "Leaving system" },
] as const;

function migrationTypeFromGroupAndMovement(group: string, movement: string): string {
  const g = group === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
  const m = movement === "TO_SYSTEM" ? "TO_SYSTEM" : movement === "FROM_SYSTEM" ? "FROM_SYSTEM" : "WITHIN_SYSTEM";
  return `${g}_${m}`;
}

function parseMigrationType(migrationType: string): { group: string; movement: string } {
  const internal = migrationType.includes("INTERNAL");
  const group = internal ? "INTERNAL" : "EXTERNAL";
  const movement = migrationType.includes("_TO_SYSTEM")
    ? "TO_SYSTEM"
    : migrationType.includes("_FROM_SYSTEM")
    ? "FROM_SYSTEM"
    : "WITHIN_SYSTEM";
  return { group, movement };
}

const formatLabel = (value: string): string =>
  value.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

/** Computes daily demand rate per item (items/day) for a camp's population group. */
function computeDailyDemandRateByItem(
  camp: CampWithDemands,
  demandClass: "INTERNAL" | "EXTERNAL"
): Record<string, number> {
  const out: Record<string, number> = {};
  if (!camp?.demands?.length) return out;
  const internalPop = Math.max(0, Number(camp.initialInternalPopulation) || 0);
  const externalPop = Math.max(0, Number(camp.initialExternalPopulation) || 0);
  for (const d of camp.demands) {
    if (d.demandClass !== demandClass || !d.arrivalData?.distParameters?.mean) continue;
    const meanMin = Number(d.arrivalData.distParameters.mean);
    if (meanMin <= 0) continue;
    const eventsPerDay = 1440 / meanMin;
    const expectedQty =
      d.demandQuantityType === "BATCH"
        ? demandClass === "INTERNAL"
          ? internalPop * (Number(d.internalRatio) || 0.01)
          : externalPop * (Number(d.externalRatio) || 0.01)
        : 1;
    const rate = eventsPerDay * expectedQty;
    out[d.item] = (out[d.item] ?? 0) + rate;
  }
  return out;
}

function formatItemRates(rates: Record<string, number>, ratio: number): string {
  const entries = Object.entries(rates)
    .map(([item, r]) => {
      const transfer = r * ratio;
      return transfer > 0 ? `${item}: ${transfer.toFixed(1)} items/day` : null;
    })
    .filter(Boolean) as string[];
  return entries.length > 0 ? ` (${entries.join(", ")})` : "";
}

/** Builds clear, numeric description: demand per day per item + arrival time. */
function buildMigrationDescription(
  m: Migration,
  camps: CampWithDemands[]
): { demandLine: string; arrivalLine: string } {
  const ratio = m.demandRatio ?? 0.05;
  const pct = Math.round(ratio * 100);
  const mean = m.arrivalData?.distParameters?.mean;
  const arrivalStr = mean ? `Expected arrival: ~${mean} days` : "Expected arrival: —";

  const internal = m.migrationType.includes("INTERNAL");
  const demandClass = internal ? "INTERNAL" : "EXTERNAL";
  const group = internal ? "Camp Residents" : "Surrounding Area Population";

  const getSourceRatesByItem = (campName: string): Record<string, number> => {
    const camp = camps.find((c) => c.name === campName);
    return camp ? computeDailyDemandRateByItem(camp, demandClass) : {};
  };

  if (m.migrationType.includes("_WITHIN_SYSTEM")) {
    const from = m.fromCamp || "—";
    const to = m.toCamp || "—";
    const sourceRates = getSourceRatesByItem(m.fromCamp || "");
    const itemStr = formatItemRates(sourceRates, ratio);
    return {
      demandLine: `${pct}% of ${from}'s ${group} demand${itemStr} transfers to ${to}.`,
      arrivalLine: arrivalStr,
    };
  }
  if (m.migrationType.includes("_TO_SYSTEM")) {
    const to = m.toCamp || "—";
    const baseRates = getSourceRatesByItem(m.toCamp || "");
    const itemStr = formatItemRates(baseRates, ratio);
    return {
      demandLine: `Incoming demand: adds ${pct}% of camp ${to}'s base ${group} demand${itemStr}.`,
      arrivalLine: arrivalStr,
    };
  }
  if (m.migrationType.includes("_FROM_SYSTEM")) {
    const from = m.fromCamp || "—";
    const sourceRates = getSourceRatesByItem(m.fromCamp || "");
    const itemStr = formatItemRates(sourceRates, ratio);
    return {
      demandLine: `${pct}% of ${from}'s ${group} demand${itemStr} leaves the system.`,
      arrivalLine: arrivalStr,
    };
  }
  return { demandLine: "", arrivalLine: "" };
}

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
  demandRatio: number;
}

interface CampWithDemands {
  name: string;
  demands?: Array<{
    item: string;
    demandClass: string;
    demandQuantityType?: string;
    arrivalData?: { distParameters?: { mean?: string } };
    internalRatio?: string | number;
    externalRatio?: string | number;
  }>;
  initialInternalPopulation?: string;
  initialExternalPopulation?: string;
}

interface Props {
  migrations: Migration[];
  setMigrations: React.Dispatch<React.SetStateAction<Migration[]>>;
  camps: CampWithDemands[];
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

    // Validate demandRatio
    if (field === "demandRatio") {
      if (
        typeof value === "string" &&
        (value === "" || /^0*\.?\d*$/.test(value))
      ) {
        if (value === "" || parseFloat(value) <= 1) {
          newMigrations[index].demandRatio =
            value === "" ? 0 : parseFloat(value);
        }
        setMigrations(newMigrations);
        return;
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
      if (field === "arrivalData") {
        const block = newMigrations[index].arrivalData;
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
        case "demandRatio":
          if (typeof value === "string") {
            newMigrations[index].demandRatio =
              value === "" ? 0 : parseFloat(value);
          }
          break;
        case "arrivalData":
          if (typeof value === "object" && value)
            newMigrations[index].arrivalData = value as DataBlock;
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
    dataType: "arrivalData",
    newDistType: string
  ) => {
    const newMigrations = [...migrations];
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
          return { mean: "30" };
        case "NORMAL":
          return { mean: "30", stdDev: "5" };
        case "UNIFORM":
          return { min: "1", max: "10" };
        default:
          return {};
      }
    };

    newMigrations[migrationIndex].arrivalData.distParameters = updateParams();
    setMigrations(newMigrations);
  };

  const renderDistParams = (
    migrationIndex: number,
    dataType: "arrivalData",
    migration: Migration
  ) => {
    const data = migration.arrivalData;
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
              type="number"
              label={`Mean ${dataType === "arrivalData" ? "(days)" : ""}`}
              value={params.mean || ""}
              onChange={(e) => {
                handleMigrationChange(
                  migrationIndex,
                  "arrivalData",
                  e.target.value,
                  "distParameters",
                  "mean"
                );
              }}
              helperText="Average time until migration occurs (days)"
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
                    "arrivalData",
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
                type="number"
                label="Standard Deviation (days)"
                value={params.stdDev || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    "arrivalData",
                    e.target.value,
                    "distParameters",
                    "stdDev"
                  );
                }}
                helperText="Variability in migration timing (days)"
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
                type="number"
                label="Minimum (days)"
                value={params.min || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    "arrivalData",
                    e.target.value,
                    "distParameters",
                    "min"
                  );
                }}
                helperText="Earliest possible migration time (days)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Mode (days)"
                value={params.mode || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    "arrivalData",
                    e.target.value,
                    "distParameters",
                    "mode"
                  );
                }}
                helperText="Most likely migration time (days)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Maximum (days)"
                value={params.max || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    "arrivalData",
                    e.target.value,
                    "distParameters",
                    "max"
                  );
                }}
                helperText="Latest possible migration time (days)"
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
                label="Minimum (days)"
                value={params.min || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    "arrivalData",
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
                label="Maximum (days)"
                value={params.max || ""}
                onChange={(e) => {
                  handleMigrationChange(
                    migrationIndex,
                    "arrivalData",
                    e.target.value,
                    "distParameters",
                    "max"
                  );
                }}
              />
            </Grid>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Warning about distribution override when migrations exist */}
      {migrations.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Distribution Override Notice</AlertTitle>
          When migrations are present in the simulation, all demand
          distributions are automatically converted to{" "}
          <strong>Exponential distributions</strong> to maintain theoretical
          consistency. The expected values (means) of your configured
          distributions will be preserved during this conversion.
        </Alert>
      )}

      {migrations.map((migration, migrationIndex) => (
        <NestedCollapsibleSection
          key={`migration-${migrationIndex}`}
          title={
            <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
              <Typography sx={{ flexGrow: 1 }}>
                Migration {migrationIndex + 1}
                {(() => {
                  const { group, movement } = parseMigrationType(migration.migrationType || "INTERNAL_WITHIN_SYSTEM");
                  const groupLabel = POPULATION_GROUP.find((o) => o.value === group)?.label?.split(" (")[0] ?? group;
                  const moveLabel = MOVEMENT.find((o) => o.value === movement)?.label ?? movement;
                  const arrow =
                    movement === "WITHIN_SYSTEM" && migration.fromCamp && migration.toCamp
                      ? `: ${migration.fromCamp} → ${migration.toCamp}`
                      : movement === "TO_SYSTEM" && migration.toCamp
                      ? `: → ${migration.toCamp}`
                      : movement === "FROM_SYSTEM" && migration.fromCamp
                      ? `: ${migration.fromCamp} →`
                      : "";
                  return ` — ${groupLabel} · ${moveLabel}${arrow}`;
                })()}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      "Are you sure you want to delete this migration configuration?"
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
            {/* Population Group → Movement (replaces enum-based Migration Type) */}
            {(() => {
              const { group, movement } = parseMigrationType(migration.migrationType || "INTERNAL_WITHIN_SYSTEM");
              return (
                <>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Population Group</InputLabel>
                      <Select
                        label="Population Group"
                        value={group}
                        onChange={(e) => {
                          const newGroup = e.target.value as string;
                          handleMigrationChange(
                            migrationIndex,
                            "migrationType",
                            migrationTypeFromGroupAndMovement(newGroup, movement)
                          );
                        }}
                      >
                        {POPULATION_GROUP.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Movement</InputLabel>
                      <Select
                        label="Movement"
                        value={movement}
                        onChange={(e) => {
                          const newMovement = e.target.value as string;
                          handleMigrationChange(
                            migrationIndex,
                            "migrationType",
                            migrationTypeFromGroupAndMovement(group, newMovement)
                          );
                        }}
                      >
                        {MOVEMENT.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              );
            })()}

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

            {/* Arrival Data Section */}
            <Grid item xs={12}>
              <NestedCollapsibleSection title="Migration Timing" level="tertiary">
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
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Dynamic parameter fields based on distribution type */}
                  {renderDistParams(migrationIndex, "arrivalData", migration)}
                </Grid>
              </NestedCollapsibleSection>
            </Grid>

            {/* Demand Ratio: fraction of demand rate that migrates */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Demand ratio"
                type="number"
                inputProps={{ min: 0, max: 1, step: 0.01 }}
                value={migration.demandRatio ?? 0.05}
                onChange={(e) =>
                  handleMigrationChange(
                    migrationIndex,
                    "demandRatio",
                    e.target.value
                  )
                }
                helperText="Fraction (0–1) of demand rate that transfers. E.g. 0.05 = 5% of demand rate."
              />
            </Grid>

            {/* Description at bottom: demand per day transfer + arrival time */}
            <Grid item xs={12}>
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: "#f0f4f8",
                  borderRadius: 2,
                }}
              >
                {(() => {
                  const { demandLine, arrivalLine } = buildMigrationDescription(migration, camps);
                  if (!demandLine) return null;
                  return (
                    <>
                      <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        {demandLine}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {arrivalLine}
                      </Typography>
                    </>
                  );
                })()}
              </Box>
            </Grid>
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
            demandRatio: 0.05,
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
