import React, { useEffect } from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Typography,
  Grid,
  TextField,
  Button,
  MenuItem,
  Box,
  IconButton,
  Tooltip,
  Paper,
  Stack,
  Divider,
} from "@mui/material";
import { NestedCollapsibleSection } from "../CollapsibleSections/CollapsibleSections";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";

type DemandClass = "INTERNAL" | "EXTERNAL";

const formatLabel = (value: string): string => {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

interface DistParams {
  min?: string;
  mode?: string;
  max?: string;
  mean?: string;
  stdDev?: string;
  spread?: string;
  arrivalInterval?: string;
  initialArrival?: boolean;
}

interface DistBlock {
  distributionType: string;
  distParameters: DistParams;
}

interface CampDemand {
  item: string;
  demandClass: DemandClass;
  demandTimingType: string;
  demandQuantityType: string;
  arrivalData: DistBlock;
  leadTimeData: DistBlock;
}

interface Camp {
  name: string;
  demands: CampDemand[];
  initialInternalPopulation: string;
  initialExternalPopulation: string;
}

interface Item {
  name: string;
}

interface Migration {
  fromCamp: string;
  toCamp: string;
  migrationType: string;
}

interface Props {
  camps: Camp[];
  setCamps: React.Dispatch<React.SetStateAction<Camp[]>>;
  items: Item[];
  migrations: Migration[];
}

const explanations = {
  leadTime:
    "Lead time is the delay between when an order is placed and when it is received. It affects inventory planning and response time.",
  interArrivalData:
    "Interarrival data defines the timing between consecutive demand occurrences. Mean defines the demand frequency.",
};

const MINUTES_PER_DAY = 1440;

const calcExpectedPerDayFromMeanMinutes = (meanMinutesStr?: string) => {
  const meanMinutes = parseFloat(meanMinutesStr || "") || 0;
  if (meanMinutes <= 0) return 0;
  return MINUTES_PER_DAY / meanMinutes;
};

const clone = <T,>(x: T): T => structuredClone(x);

const defaultDemand = (
  itemName: string,
  demandClass: DemandClass
): CampDemand => {
  return {
    item: itemName,
    demandClass,
    demandTimingType: "RECURRING",
    demandQuantityType: "SINGLE",
    arrivalData: {
      distributionType: "EXPONENTIAL",
      distParameters: { mean: "60" }, // minutes
    },
    leadTimeData: {
      distributionType: "TRIANGULAR",
      distParameters: { min: "1", mode: "2", max: "4" },
    },
  };
};

const buildDemandGroups = (demands: CampDemand[]) => {
  const byItem = new Map<
    string,
    { key: string; item: string; internalIdx: number; externalIdx: number }
  >();

  const emptyGroups: {
    key: string;
    item: string;
    internalIdx: number;
    externalIdx: number;
  }[] = [];

  let emptyCounter = 0;

  for (let i = 0; i < demands.length; i++) {
    const d = demands[i];
    const item = d.item ?? "";

    if (item !== "") {
      const existing = byItem.get(item) ?? {
        key: `item:${item}`,
        item,
        internalIdx: -1,
        externalIdx: -1,
      };
      if (d.demandClass === "INTERNAL") existing.internalIdx = i;
      if (d.demandClass === "EXTERNAL") existing.externalIdx = i;
      byItem.set(item, existing);
      continue;
    }

    if (d.demandClass === "INTERNAL") {
      const key = `new:${emptyCounter++}`;
      emptyGroups.push({ key, item: "", internalIdx: i, externalIdx: -1 });
    } else {
      const last = emptyGroups[emptyGroups.length - 1];
      if (last && last.externalIdx === -1) last.externalIdx = i;
      else {
        const key = `new:${emptyCounter++}`;
        emptyGroups.push({ key, item: "", internalIdx: -1, externalIdx: i });
      }
    }
  }

  const groups = [...Array.from(byItem.values()), ...emptyGroups];
  groups.sort((a, b) => a.key.localeCompare(b.key));
  return groups;
};

const ensurePairForItem = (
  camps: Camp[],
  setCamps: React.Dispatch<React.SetStateAction<Camp[]>>,
  campIndex: number,
  itemName: string
) => {
  const camp = camps[campIndex];
  const hasInternal = camp.demands.some(
    (d) => d.item === itemName && d.demandClass === "INTERNAL"
  );
  const hasExternal = camp.demands.some(
    (d) => d.item === itemName && d.demandClass === "EXTERNAL"
  );

  if (hasInternal && hasExternal) return;

  setCamps((prev) => {
    const next = clone(prev);
    const ds = next[campIndex].demands;

    const existingInternal = ds.find(
      (d) => d.item === itemName && d.demandClass === "INTERNAL"
    );
    const existingExternal = ds.find(
      (d) => d.item === itemName && d.demandClass === "EXTERNAL"
    );
    const base = existingInternal ?? existingExternal;

    const makeFromBase = (demandClass: DemandClass) => {
      const b = base ? clone(base) : defaultDemand(itemName, demandClass);
      return {
        ...b,
        demandClass,
        // hard de-alias nested objects
        arrivalData: {
          ...b.arrivalData,
          distParameters: { ...b.arrivalData.distParameters },
        },
        leadTimeData: {
          ...b.leadTimeData,
          distParameters: { ...b.leadTimeData.distParameters },
        },
      } as CampDemand;
    };

    if (!existingInternal) ds.push(makeFromBase("INTERNAL"));
    if (!existingExternal) ds.push(makeFromBase("EXTERNAL"));

    return next;
  });
};

const ArrivalEditor: React.FC<{
  camps: Camp[];
  setCamps: React.Dispatch<React.SetStateAction<Camp[]>>;
  campIndex: number;
  demandIndex: number;
  hasMigrations: boolean;
}> = ({ camps, setCamps, campIndex, demandIndex, hasMigrations }) => {
  const demand = camps[campIndex].demands[demandIndex];
  const distParams = demand.arrivalData.distParameters;
  const distType = demand.arrivalData.distributionType;

  const handleParamChange = (paramKey: keyof DistParams, rawValue: string) => {
    setCamps((prev) => {
      const next = clone(prev);

      const targetDemand = next[campIndex].demands[demandIndex];

      // break shared refs (internal/external aliasing)
      targetDemand.arrivalData = {
        ...targetDemand.arrivalData,
        distParameters: { ...targetDemand.arrivalData.distParameters },
      };

      const targetParams = targetDemand.arrivalData.distParameters;
      const currentType = targetDemand.arrivalData.distributionType;

      const value = parseFloat(rawValue);
      const currentMean = parseFloat(targetParams.mean || "") || 0;

      if (paramKey === "mean") {
        targetParams.mean = rawValue;

        if (currentType === "UNIFORM" || currentType === "TRIANGULAR") {
          const currentSpread = parseFloat(targetParams.spread || "") || 0;
          if (currentSpread > value) targetParams.spread = rawValue;
        }
        if (currentType === "NORMAL") {
          const currentStd = parseFloat(targetParams.stdDev || "") || 0;
          if (currentStd > value) targetParams.stdDev = (value / 2).toString();
        }
      } else if (paramKey === "spread") {
        if (value <= currentMean) targetParams.spread = rawValue;
        else targetParams.spread = currentMean.toString();
      } else if (paramKey === "stdDev") {
        if (value < currentMean * 0.25) targetParams.stdDev = rawValue;
        else targetParams.stdDev = (currentMean * 0.25).toString();
      } else if (paramKey === "min") {
        targetParams.min = rawValue;
      } else if (paramKey === "mode") {
        targetParams.mode = rawValue;
      } else if (paramKey === "max") {
        targetParams.max = rawValue;
      } else if (paramKey === "arrivalInterval") {
        targetParams.arrivalInterval = rawValue;
      } else if (paramKey === "initialArrival") {
        // Handle boolean conversion for initialArrival
        targetParams.initialArrival = rawValue === "true";
      }

      const m = parseFloat(targetParams.mean || "") || 0;
      const s = parseFloat(targetParams.spread || "") || 0;

      if (currentType === "TRIANGULAR") {
        targetParams.min = (m - s).toString();
        targetParams.max = (m + s).toString();
        targetParams.mode = m.toString();
      } else if (currentType === "UNIFORM") {
        targetParams.min = (m - s).toString();
        targetParams.max = (m + s).toString();
      }

      return next;
    });
  };

  const handleTypeChange = (newType: string) => {
    setCamps((prev) => {
      const next = clone(prev);

      const targetDemand = next[campIndex].demands[demandIndex];

      // break shared refs (internal/external aliasing)
      targetDemand.arrivalData = {
        ...targetDemand.arrivalData,
        distParameters: { ...targetDemand.arrivalData.distParameters },
      };

      const targetData = targetDemand.arrivalData;
      const currentMean = targetData.distParameters.mean || "60";
      const meanVal = parseFloat(currentMean) || 60;

      targetData.distributionType = newType;

      targetData.distParameters = {
        mean: currentMean,
        ...(newType === "UNIFORM" && {
          spread: (meanVal / 2).toString(),
          min: (meanVal - meanVal / 2).toString(),
          max: (meanVal + meanVal / 2).toString(),
        }),
        ...(newType === "TRIANGULAR" && {
          spread: (meanVal / 2).toString(),
          min: (meanVal - meanVal / 2).toString(),
          max: (meanVal + meanVal / 2).toString(),
          mode: currentMean,
        }),
        ...(newType === "NORMAL" && { stdDev: (meanVal * 0.125).toString() }),
      };

      return next;
    });
  };

  const meanVal = parseFloat(distParams.mean || "") || 0;
  const spreadVal = parseFloat(distParams.spread || "") || 0;
  const minVal = (meanVal - spreadVal).toFixed(2);
  const maxVal = (meanVal + spreadVal).toFixed(2);

  return (
    <Grid container spacing={3} alignItems="flex-start">
      {hasMigrations && (
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              bgcolor: "rgba(33, 150, 243, 0.08)",
              borderLeft: 3,
              borderColor: "primary.main",
              borderRadius: 1,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <InfoIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.6 }}
              >
                <strong style={{ color: "#1976d2" }}>
                  Migration Detected:
                </strong>{" "}
                Distribution is automatically set to EXPONENTIAL for theoretical
                consistency. This cannot be changed while migrations exist.
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <TextField
          select
          fullWidth
          label="Interarrival Distribution"
          value={hasMigrations ? "EXPONENTIAL" : distType}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={hasMigrations}
          helperText={
            hasMigrations
              ? "Locked to EXPONENTIAL due to migrations"
              : undefined
          }
        >
          <MenuItem value="EXPONENTIAL">Exponential</MenuItem>
          <MenuItem value="NORMAL">Truncated Normal</MenuItem>
          <MenuItem value="TRIANGULAR">Symmetric Triangular</MenuItem>
          <MenuItem value="UNIFORM">Uniform</MenuItem>
          <MenuItem value="FIXED">Constant</MenuItem>
        </TextField>
      </Grid>

      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          type="number"
          label="Mean Interarrival Time"
          value={distParams.mean || ""}
          onChange={(e) => handleParamChange("mean", e.target.value)}
          InputProps={{ inputProps: { min: 0 } }}
          helperText="Average time between demand occurrences (minutes)"
        />
      </Grid>

      {(distType === "TRIANGULAR" || distType === "UNIFORM") && (
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="number"
            label="Spread (+/- Minutes)"
            value={distParams.spread || ""}
            onChange={(e) => handleParamChange("spread", e.target.value)}
            InputProps={{ inputProps: { min: 0, max: distParams.mean } }}
            helperText={
              distParams.mean
                ? `Range: ${minVal} to ${maxVal} minutes (minimum must be ≥ 0)`
                : "Spread cannot exceed the mean value"
            }
            error={
              (parseFloat(distParams.spread || "0") || 0) >
              (parseFloat(distParams.mean || "0") || 0)
            }
          />
        </Grid>
      )}

      {distType === "NORMAL" && (
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            type="number"
            label="Standard Deviation (Minutes)"
            value={distParams.stdDev || ""}
            onChange={(e) => handleParamChange("stdDev", e.target.value)}
            InputProps={{
              inputProps: {
                min: 0,
                max: 0.25 * (parseFloat(distParams.mean || "0") || 0),
              },
            }}
            helperText={`Standard deviation must be ≤ ${
              0.25 * (parseFloat(distParams.mean || "0") || 0)
            } minutes (25% of mean)`}
          />
        </Grid>
      )}
    </Grid>
  );
};

const InterArrivalSection: React.FC<{
  camps: Camp[];
  setCamps: React.Dispatch<React.SetStateAction<Camp[]>>;
  campIndex: number;
  itemName: string;
  hasMigrations: boolean;
}> = ({ camps, setCamps, campIndex, itemName, hasMigrations }) => {
  useEffect(() => {
    if (!itemName) return;
    ensurePairForItem(camps, setCamps, campIndex, itemName);
  }, [camps, setCamps, campIndex, itemName]);

  const camp = camps[campIndex];

  const internalIdx = camp.demands.findIndex(
    (d) => d.item === itemName && d.demandClass === "INTERNAL"
  );
  const externalIdx = camp.demands.findIndex(
    (d) => d.item === itemName && d.demandClass === "EXTERNAL"
  );

  if (!itemName || internalIdx < 0 || externalIdx < 0) return null;

  const internal = camp.demands[internalIdx];
  const external = camp.demands[externalIdx];

  const internalPerDay = calcExpectedPerDayFromMeanMinutes(
    internal.arrivalData.distParameters.mean
  );
  const externalPerDay = calcExpectedPerDayFromMeanMinutes(
    external.arrivalData.distParameters.mean
  );
  const totalPerDay = internalPerDay + externalPerDay;

  return (
    <Grid container spacing={3}>
      {/* --- LEFT COLUMN: EDITORS --- */}
      <Grid item xs={12} md={9}>
        <Stack spacing={3}>
          {/* Internal Section */}
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="h6" fontSize="1rem" fontWeight={700}>
                Internal Interarrival
              </Typography>
            </Box>

            <Box sx={{ p: 3 }}>
              <ArrivalEditor
                camps={camps}
                setCamps={setCamps}
                campIndex={campIndex}
                demandIndex={internalIdx}
                hasMigrations={hasMigrations}
              />
            </Box>
          </Paper>

          {/* External Section */}
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              borderRadius: 3,
              overflow: "hidden",
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2,
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="h6" fontSize="1rem" fontWeight={700}>
                External Interarrival
              </Typography>
            </Box>

            <Box sx={{ p: 3 }}>
              <ArrivalEditor
                camps={camps}
                setCamps={setCamps}
                campIndex={campIndex}
                demandIndex={externalIdx}
                hasMigrations={hasMigrations}
              />
            </Box>
          </Paper>
        </Stack>
      </Grid>

      {/* --- RIGHT COLUMN: STATS SUMMARY --- */}
      <Grid item xs={12} md={3}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            height: "100%",
            bgcolor: "primary.50",
            color: "primary.900",
            border: "1px solid",
            borderColor: "primary.100",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
                opacity: 0.7,
              }}
            >
              <InfoOutlinedIcon fontSize="small" />
              <Typography
                variant="subtitle2"
                fontWeight={700}
                textTransform="uppercase"
                letterSpacing={1}
              >
                Expected Demand
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{ color: "primary.main" }}
              >
                {totalPerDay > 0 ? totalPerDay.toFixed(2) : "0"}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ opacity: 0.8 }}
              >
                items / day
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2, borderColor: "primary.200" }} />

          {/* Visual Ratio Bar - Buraya Taşındı */}
          {totalPerDay > 0 && (
            <Box
              sx={{
                mb: 3,
                height: 6,
                width: "100%",
                bgcolor: "white",
                borderRadius: 4,
                overflow: "hidden",
                display: "flex",
              }}
            >
              <Box
                sx={{
                  width: `${(internalPerDay / totalPerDay) * 100}%`,
                  bgcolor: "primary.main",
                }}
              />
              <Box
                sx={{
                  width: `${(externalPerDay / totalPerDay) * 100}%`,
                  bgcolor: "secondary.main",
                }}
              />
            </Box>
          )}

          <Stack spacing={2}>
            {/* Internal Row */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {}
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                  }}
                />
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Internal
                </Typography>
              </Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {internalPerDay.toFixed(2)}
              </Typography>
            </Box>

            {/* External Row */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {}
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "secondary.main",
                  }}
                />
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  External
                </Typography>
              </Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {externalPerDay.toFixed(2)}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
};

const CampsSection: React.FC<Props> = ({
  camps,
  setCamps,
  items,
  migrations,
}) => {
  const hasMigrations = migrations.length > 0;
  const handleCampChange = (
    index: number,
    field: keyof Camp,
    value: string | boolean
  ) => {
    const newCamps = [...camps];

    if (
      field === "initialInternalPopulation" ||
      field === "initialExternalPopulation"
    ) {
      if (typeof value === "string" && (value === "" || /^\d*$/.test(value))) {
        newCamps[index][field] = value;
      } else {
        return;
      }
    } else {
      if (field === "name") newCamps[index].name = value as string;
    }

    setCamps(newCamps);
  };

  const handleAddCamp = () => {
    setCamps([
      ...camps,
      {
        name: "",
        demands: [],
        initialInternalPopulation: "0",
        initialExternalPopulation: "0",
      },
    ]);
  };

  return (
    <>
      {camps.map((camp, campIndex) => {
        const groups = buildDemandGroups(camp.demands);

        return (
          <NestedCollapsibleSection
            key={`camp-${campIndex}`}
            title={
              <Box
                sx={{ display: "flex", alignItems: "center", width: "100%" }}
              >
                <Typography sx={{ flexGrow: 1 }}>
                  Camp {campIndex + 1}
                  {camp.name ? `: ${camp.name}` : ""}
                </Typography>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                  if (
                    window.confirm(
                      `Are you sure you want to delete this camp${
                        camp.name ? ` "${camp.name}"` : ""
                      }?\n\nWARNING: This will also remove all demands, inventory, and other configurations associated with this camp.`
                    )
                  ) {
                      const newCamps = [...camps];
                      newCamps.splice(campIndex, 1);
                      setCamps(newCamps);
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
              <Grid item xs={12}>
                <NestedCollapsibleSection
                  title="Basic Camp Information"
                  level="tertiary"
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        fullWidth
                        label="Camp Name"
                        value={camp.name}
                        onChange={(e) =>
                          handleCampChange(campIndex, "name", e.target.value)
                        }
                        placeholder="Enter camp name"
                        helperText="A unique identifier for this camp"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        fullWidth
                        label="Initial Internal Population"
                        type="number"
                        inputProps={{ min: 0, step: 1 }}
                        value={camp.initialInternalPopulation}
                        onChange={(e) =>
                          handleCampChange(
                            campIndex,
                            "initialInternalPopulation",
                            e.target.value
                          )
                        }
                        helperText="Number of internal population members at day 0"
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={4}>
                      <TextField
                        fullWidth
                        label="Initial External Population"
                        type="number"
                        inputProps={{ min: 0, step: 1 }}
                        value={camp.initialExternalPopulation}
                        onChange={(e) =>
                          handleCampChange(
                            campIndex,
                            "initialExternalPopulation",
                            e.target.value
                          )
                        }
                        helperText="Number of external population members at day 0"
                      />
                    </Grid>
                  </Grid>
                </NestedCollapsibleSection>
              </Grid>

              {groups.map((g) => {
                const internalIdx = g.internalIdx;
                const externalIdx = g.externalIdx;

                const internalDemand =
                  internalIdx >= 0 ? camp.demands[internalIdx] : undefined;
                const externalDemand =
                  externalIdx >= 0 ? camp.demands[externalIdx] : undefined;

                const master = internalDemand ?? externalDemand;
                if (!master) return null;

                const itemName = master.item;

                return (
                  <Grid item xs={12} key={`demand-group-${g.key}`}>
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
                            Demand{itemName ? `: ${itemName}` : ""}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  "Are you sure you want to delete this demand?\n\nThis will remove both internal and external demand configurations for this item."
                                )
                              ) {
                                const newCamps = [...camps];
                                const newDemands = [
                                  ...newCamps[campIndex].demands,
                                ];

                                const removeIdxs = [internalIdx, externalIdx]
                                  .filter((x) => x >= 0)
                                  .sort((a, b) => b - a);

                                for (const idx of removeIdxs)
                                  newDemands.splice(idx, 1);

                                newCamps[campIndex].demands = newDemands;
                                setCamps(newCamps);
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
                        <Grid item xs={12}>
                          <NestedCollapsibleSection
                            title="Basic Properties"
                            level="tertiary"
                          >
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={4}>
                                {itemName ? (
                                  <TextField
                                    fullWidth
                                    label="Item"
                                    value={itemName}
                                    InputProps={{
                                      readOnly: true,
                                      style: { backgroundColor: "#f5f5f5" },
                                    }}
                                    helperText="Item selection is locked once demand is configured"
                                  />
                                ) : (
                                  <TextField
                                    select
                                    fullWidth
                                    label="Item"
                                    value={itemName || ""}
                                    onChange={(e) => {
                                      const newItem = e.target.value;
                                      const newCamps = [...camps];
                                      const ds = [
                                        ...newCamps[campIndex].demands,
                                      ];

                                      if (internalIdx >= 0)
                                        ds[internalIdx] = {
                                          ...ds[internalIdx],
                                          item: newItem,
                                        };
                                      if (externalIdx >= 0)
                                        ds[externalIdx] = {
                                          ...ds[externalIdx],
                                          item: newItem,
                                        };

                                      newCamps[campIndex].demands = ds;
                                      setCamps(newCamps);

                                      // if (newItem) ensurePairForItem(newCamps, setCamps, campIndex, newItem);
                                    }}
                                  >
                                    {items.length === 0 ? (
                                      <MenuItem disabled>
                                        No items available. Please add items in the Items section first.
                                      </MenuItem>
                                    ) : (
                                      items
                                        .filter((itm) => itm.name)
                                        .sort((a, b) =>
                                          a.name.localeCompare(b.name)
                                        )
                                        .map((itm) => (
                                          <MenuItem
                                            key={`item-${itm.name}`}
                                            value={itm.name}
                                          >
                                            {itm.name}
                                          </MenuItem>
                                        ))
                                    )}
                                  </TextField>
                                )}
                              </Grid>

                              {/* Demand Timing Type is SHARED (single input) */}
                              <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                  select
                                  fullWidth
                                  label="Demand Timing Type"
                                  value={master.demandTimingType}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newCamps = [...camps];
                                    const ds = [...newCamps[campIndex].demands];

                                    if (internalIdx >= 0)
                                      ds[internalIdx] = {
                                        ...ds[internalIdx],
                                        demandTimingType: val,
                                      };
                                    if (externalIdx >= 0)
                                      ds[externalIdx] = {
                                        ...ds[externalIdx],
                                        demandTimingType: val,
                                      };

                                    newCamps[campIndex].demands = ds;
                                    setCamps(newCamps);
                                  }}
                                >
                                  <MenuItem value="ONETIME">
                                    {formatLabel("ONETIME")}
                                  </MenuItem>
                                  <MenuItem value="RECURRING">
                                    {formatLabel("RECURRING")}
                                  </MenuItem>
                                </TextField>
                              </Grid>
                            </Grid>
                          </NestedCollapsibleSection>
                        </Grid>

                        <Grid item xs={12}>
                          <NestedCollapsibleSection
                            title={
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                Interarrival Data
                                <Tooltip
                                  title={explanations.interArrivalData}
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
                            <InterArrivalSection
                              camps={camps}
                              setCamps={setCamps}
                              campIndex={campIndex}
                              itemName={itemName}
                              hasMigrations={hasMigrations}
                            />
                          </NestedCollapsibleSection>
                        </Grid>

                        <Grid item xs={12}>
                          <NestedCollapsibleSection
                            title={
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                Lead Time Data (Depot to Camp)
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
                            {/* Lead time */}
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6} md={4}>
                                <TextField
                                  select
                                  fullWidth
                                  label="Lead Time Distribution Type"
                                  value={master.leadTimeData.distributionType}
                                  onChange={(
                                    e: React.ChangeEvent<HTMLInputElement>
                                  ) => {
                                    const newType = e.target.value;
                                    const resetParams = (() => {
                                      switch (newType) {
                                        case "TRIANGULAR":
                                          return {
                                            min: "1",
                                            mode: "2",
                                            max: "4",
                                          };
                                        case "EXPONENTIAL":
                                        case "FIXED":
                                        case "EQUAL_SHARE":
                                          return { mean: "2" };
                                        case "NORMAL":
                                          return { mean: "2", stdDev: "0.5" };
                                        case "UNIFORM":
                                          return { min: "1", max: "5" };
                                        default:
                                          return { mean: "2" };
                                      }
                                    })();

                                    const newCamps = [...camps];
                                    const ds = [...newCamps[campIndex].demands];

                                    const patch = (idx: number) => {
                                      ds[idx] = {
                                        ...ds[idx],
                                        leadTimeData: {
                                          distributionType: newType,
                                          distParameters: resetParams,
                                        },
                                      };
                                    };

                                    if (internalIdx >= 0) patch(internalIdx);
                                    if (externalIdx >= 0) patch(externalIdx);

                                    newCamps[campIndex].demands = ds;
                                    setCamps(newCamps);
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
                                </TextField>
                              </Grid>

                              {(master.leadTimeData.distributionType ===
                                "EXPONENTIAL" ||
                                master.leadTimeData.distributionType ===
                                  "FIXED" ||
                                master.leadTimeData.distributionType ===
                                  "EQUAL_SHARE") && (
                                <Grid item xs={12} sm={6} md={4}>
                                  <TextField
                                    fullWidth
                                    label="Mean (days)"
                                    value={
                                      master.leadTimeData.distParameters.mean ||
                                      ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const newCamps = [...camps];
                                      const ds = [
                                        ...newCamps[campIndex].demands,
                                      ];

                                      const patch = (idx: number) => {
                                        ds[idx] = {
                                          ...ds[idx],
                                          leadTimeData: {
                                            ...ds[idx].leadTimeData,
                                            distParameters: {
                                              ...ds[idx].leadTimeData
                                                .distParameters,
                                              mean: val,
                                            },
                                          },
                                        };
                                      };

                                      if (internalIdx >= 0) patch(internalIdx);
                                      if (externalIdx >= 0) patch(externalIdx);

                                      newCamps[campIndex].demands = ds;
                                      setCamps(newCamps);
                                    }}
                                  />
                                </Grid>
                              )}

                              {master.leadTimeData.distributionType ===
                                "NORMAL" && (
                                <>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Mean (days)"
                                      value={
                                        master.leadTimeData.distParameters
                                          .mean || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newCamps = [...camps];
                                        const ds = [
                                          ...newCamps[campIndex].demands,
                                        ];

                                        const patch = (idx: number) => {
                                          ds[idx] = {
                                            ...ds[idx],
                                            leadTimeData: {
                                              ...ds[idx].leadTimeData,
                                              distParameters: {
                                                ...ds[idx].leadTimeData
                                                  .distParameters,
                                                mean: val,
                                              },
                                            },
                                          };
                                        };

                                        if (internalIdx >= 0)
                                          patch(internalIdx);
                                        if (externalIdx >= 0)
                                          patch(externalIdx);

                                        newCamps[campIndex].demands = ds;
                                        setCamps(newCamps);
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Standard Deviation (days)"
                                      value={
                                        master.leadTimeData.distParameters
                                          .stdDev || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newCamps = [...camps];
                                        const ds = [
                                          ...newCamps[campIndex].demands,
                                        ];

                                        const patch = (idx: number) => {
                                          ds[idx] = {
                                            ...ds[idx],
                                            leadTimeData: {
                                              ...ds[idx].leadTimeData,
                                              distParameters: {
                                                ...ds[idx].leadTimeData
                                                  .distParameters,
                                                stdDev: val,
                                              },
                                            },
                                          };
                                        };

                                        if (internalIdx >= 0)
                                          patch(internalIdx);
                                        if (externalIdx >= 0)
                                          patch(externalIdx);

                                        newCamps[campIndex].demands = ds;
                                        setCamps(newCamps);
                                      }}
                                    />
                                  </Grid>
                                </>
                              )}

                              {master.leadTimeData.distributionType ===
                                "TRIANGULAR" && (
                                <>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Minimum (days)"
                                      value={
                                        master.leadTimeData.distParameters
                                          .min || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newCamps = [...camps];
                                        const ds = [
                                          ...newCamps[campIndex].demands,
                                        ];

                                        const patch = (idx: number) => {
                                          ds[idx] = {
                                            ...ds[idx],
                                            leadTimeData: {
                                              ...ds[idx].leadTimeData,
                                              distParameters: {
                                                ...ds[idx].leadTimeData
                                                  .distParameters,
                                                min: val,
                                              },
                                            },
                                          };
                                        };

                                        if (internalIdx >= 0)
                                          patch(internalIdx);
                                        if (externalIdx >= 0)
                                          patch(externalIdx);

                                        newCamps[campIndex].demands = ds;
                                        setCamps(newCamps);
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Mode (days)"
                                      value={
                                        master.leadTimeData.distParameters
                                          .mode || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newCamps = [...camps];
                                        const ds = [
                                          ...newCamps[campIndex].demands,
                                        ];

                                        const patch = (idx: number) => {
                                          ds[idx] = {
                                            ...ds[idx],
                                            leadTimeData: {
                                              ...ds[idx].leadTimeData,
                                              distParameters: {
                                                ...ds[idx].leadTimeData
                                                  .distParameters,
                                                mode: val,
                                              },
                                            },
                                          };
                                        };

                                        if (internalIdx >= 0)
                                          patch(internalIdx);
                                        if (externalIdx >= 0)
                                          patch(externalIdx);

                                        newCamps[campIndex].demands = ds;
                                        setCamps(newCamps);
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Maximum (days)"
                                      value={
                                        master.leadTimeData.distParameters
                                          .max || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newCamps = [...camps];
                                        const ds = [
                                          ...newCamps[campIndex].demands,
                                        ];

                                        const patch = (idx: number) => {
                                          ds[idx] = {
                                            ...ds[idx],
                                            leadTimeData: {
                                              ...ds[idx].leadTimeData,
                                              distParameters: {
                                                ...ds[idx].leadTimeData
                                                  .distParameters,
                                                max: val,
                                              },
                                            },
                                          };
                                        };

                                        if (internalIdx >= 0)
                                          patch(internalIdx);
                                        if (externalIdx >= 0)
                                          patch(externalIdx);

                                        newCamps[campIndex].demands = ds;
                                        setCamps(newCamps);
                                      }}
                                    />
                                  </Grid>
                                </>
                              )}

                              {master.leadTimeData.distributionType ===
                                "UNIFORM" && (
                                <>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Minimum (days)"
                                      value={
                                        master.leadTimeData.distParameters
                                          .min || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newCamps = [...camps];
                                        const ds = [
                                          ...newCamps[campIndex].demands,
                                        ];

                                        const patch = (idx: number) => {
                                          ds[idx] = {
                                            ...ds[idx],
                                            leadTimeData: {
                                              ...ds[idx].leadTimeData,
                                              distParameters: {
                                                ...ds[idx].leadTimeData
                                                  .distParameters,
                                                min: val,
                                              },
                                            },
                                          };
                                        };

                                        if (internalIdx >= 0)
                                          patch(internalIdx);
                                        if (externalIdx >= 0)
                                          patch(externalIdx);

                                        newCamps[campIndex].demands = ds;
                                        setCamps(newCamps);
                                      }}
                                    />
                                  </Grid>
                                  <Grid item xs={12} sm={6} md={4}>
                                    <TextField
                                      fullWidth
                                      label="Maximum (days)"
                                      value={
                                        master.leadTimeData.distParameters
                                          .max || ""
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const newCamps = [...camps];
                                        const ds = [
                                          ...newCamps[campIndex].demands,
                                        ];

                                        const patch = (idx: number) => {
                                          ds[idx] = {
                                            ...ds[idx],
                                            leadTimeData: {
                                              ...ds[idx].leadTimeData,
                                              distParameters: {
                                                ...ds[idx].leadTimeData
                                                  .distParameters,
                                                max: val,
                                              },
                                            },
                                          };
                                        };

                                        if (internalIdx >= 0)
                                          patch(internalIdx);
                                        if (externalIdx >= 0)
                                          patch(externalIdx);

                                        newCamps[campIndex].demands = ds;
                                        setCamps(newCamps);
                                      }}
                                    />
                                  </Grid>
                                </>
                              )}
                            </Grid>

                            {/* Expected Demand during Lead Time Display */}
                            <Grid item xs={12}>
                              <Paper
                                elevation={0}
                                sx={{
                                  p: 2,
                                  mt: 2,
                                  bgcolor: "#e3f2fd",
                                  borderLeft: "4px solid",
                                  borderColor: "primary.main",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  color="text.primary"
                                  fontWeight="bold"
                                  display="block"
                                  mb={1.5}
                                >
                                  Expected Demand during Lead Time
                                </Typography>
                                {(() => {
                                  const leadTimeMean = (() => {
                                    const lt = master.leadTimeData;
                                    if (!lt) return 0;
                                    switch (lt.distributionType) {
                                      case "TRIANGULAR":
                                        return (
                                          (parseFloat(
                                            lt.distParameters.min || "0"
                                          ) +
                                            parseFloat(
                                              lt.distParameters.mode || "0"
                                            ) +
                                            parseFloat(
                                              lt.distParameters.max || "0"
                                            )) /
                                          3
                                        );
                                      case "UNIFORM":
                                        return (
                                          (parseFloat(
                                            lt.distParameters.min || "0"
                                          ) +
                                            parseFloat(
                                              lt.distParameters.max || "0"
                                            )) /
                                          2
                                        );
                                      default:
                                        return parseFloat(
                                          lt.distParameters.mean || "0"
                                        );
                                    }
                                  })();

                                  const internalDemand = camp.demands.find(
                                    (d) =>
                                      d.item === itemName &&
                                      d.demandClass === "INTERNAL"
                                  );
                                  const externalDemand = camp.demands.find(
                                    (d) =>
                                      d.item === itemName &&
                                      d.demandClass === "EXTERNAL"
                                  );

                                  const internalRate = internalDemand
                                    ? calcExpectedPerDayFromMeanMinutes(
                                        internalDemand.arrivalData
                                          .distParameters.mean
                                      )
                                    : 0;
                                  const externalRate = externalDemand
                                    ? calcExpectedPerDayFromMeanMinutes(
                                        externalDemand.arrivalData
                                          .distParameters.mean
                                      )
                                    : 0;
                                  const totalDailyDemand =
                                    internalRate + externalRate;

                                  const expectedDemand =
                                    leadTimeMean * totalDailyDemand;

                                  return (
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {leadTimeMean.toFixed(2)} days ×{" "}
                                        {totalDailyDemand.toFixed(2)} items/day
                                      </Typography>
                                      <Typography
                                        variant="h6"
                                        color="primary.main"
                                        fontWeight="bold"
                                      >
                                        = {expectedDemand.toFixed(2)} items
                                      </Typography>
                                    </Box>
                                  );
                                })()}
                              </Paper>
                            </Grid>
                          </NestedCollapsibleSection>
                        </Grid>
                      </Grid>
                    </NestedCollapsibleSection>
                  </Grid>
                );
              })}

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={() => {
                    const newCamps = [...camps];
                    const ds = [...newCamps[campIndex].demands];

                    // IMPORTANT: make separate objects (no shared refs)
                    const makeBase = (): Omit<CampDemand, "demandClass"> => ({
                      item: "",
                      demandTimingType: "RECURRING",
                      demandQuantityType: "SINGLE",
                      arrivalData: {
                        distributionType: "EXPONENTIAL",
                        distParameters: { mean: "60" }, // minutes
                      },
                      leadTimeData: {
                        distributionType: "TRIANGULAR",
                        distParameters: { min: "1", mode: "2", max: "4" },
                      },
                    });

                    ds.push({ ...makeBase(), demandClass: "INTERNAL" });
                    ds.push({ ...makeBase(), demandClass: "EXTERNAL" });

                    newCamps[campIndex].demands = ds;
                    setCamps(newCamps);
                  }}
                  sx={{ marginTop: 2 }}
                >
                  Add Demand
                </Button>
              </Grid>
            </Grid>
          </NestedCollapsibleSection>
        );
      })}

      <Button variant="contained" onClick={handleAddCamp} sx={{ marginTop: 4 }}>
        Add Camp
      </Button>
    </>
  );
};

export default CampsSection;
