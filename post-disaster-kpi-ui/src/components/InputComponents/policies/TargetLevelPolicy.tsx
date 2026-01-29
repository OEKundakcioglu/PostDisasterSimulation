import React, { useMemo, useEffect } from "react";
import {
  Grid,
  TextField,
  Typography,
  Paper,
  Slider,
  Box,
  Divider,
  Stack,
  Chip,
  InputAdornment,
  Alert,
} from "@mui/material";
import {
  Inventory2,
  Functions,
  Timeline,
  LocalShipping,
  ReportProblem,
} from "@mui/icons-material";
import InfoIcon from "@mui/icons-material/Info";
import { Tooltip, IconButton } from "@mui/material";
import { Item } from "../../../types/Item";
import { NestedCollapsibleSection } from "../../CollapsibleSections/CollapsibleSections";
import {
  TargetLevelPolicy as TargetLevelPolicyType,
  Camp,
  DistBlock,
} from "@/lib/simulationInput/types";

interface Props {
  policy: TargetLevelPolicyType;
  setPolicy: (policy: TargetLevelPolicyType) => void;
  camps: Camp[];
  items: Item[];
}

const MINUTES_PER_DAY = 1440;

// --- HELPERS ---

const calcExpectedPerDayFromMeanMinutes = (meanMinutesStr?: string) => {
  const meanMinutes = parseFloat(meanMinutesStr || "") || 0;
  if (meanMinutes <= 0) return 0;
  return MINUTES_PER_DAY / meanMinutes;
};

const calcMeanLeadTimeDays = (dist: DistBlock): number => {
  if (!dist) return 0;
  const { distributionType, distParameters } = dist;
  const { mean, min, mode, max } = distParameters;

  if (distributionType === "TRIANGULAR") {
    const val =
      (parseFloat(min || "0") +
        parseFloat(mode || "0") +
        parseFloat(max || "0")) /
      3;
    return isNaN(val) ? 0 : val;
  }
  const val = parseFloat(mean || "0");
  return isNaN(val) ? 0 : val;
};

const getCalculationParams = (camp: Camp, item: Item) => {
  const internalDemand = camp.demands.find(
    (d) => d.item === item.name && d.demandClass === "INTERNAL"
  );
  const externalDemand = camp.demands.find(
    (d) => d.item === item.name && d.demandClass === "EXTERNAL"
  );

  const rateInt = internalDemand
    ? calcExpectedPerDayFromMeanMinutes(
        internalDemand.arrivalData.distParameters.mean
      )
    : 0;
  const rateExt = externalDemand
    ? calcExpectedPerDayFromMeanMinutes(
        externalDemand.arrivalData.distParameters.mean
      )
    : 0;
  const totalDailyRate = rateInt + rateExt;

  const leadTimeInt = internalDemand
    ? calcMeanLeadTimeDays(internalDemand.leadTimeData)
    : 0;
  const leadTimeExt = externalDemand
    ? calcMeanLeadTimeDays(externalDemand.leadTimeData)
    : 0;

  let finalLeadTime = 0;
  if (totalDailyRate > 0) {
    finalLeadTime =
      (rateInt * leadTimeInt + rateExt * leadTimeExt) / totalDailyRate;
  } else {
    if (internalDemand && externalDemand)
      finalLeadTime = (leadTimeInt + leadTimeExt) / 2;
    else if (internalDemand) finalLeadTime = leadTimeInt;
    else if (externalDemand) finalLeadTime = leadTimeExt;
  }

  return {
    totalDailyRate,
    finalLeadTime,
    rateInt,
    rateExt,
    internalDemand,
    externalDemand,
  };
};

const getCentralCalculationParams = (camps: Camp[], item: Item) => {
  let aggTotalDaily = 0;
  let totalInt = 0;
  let totalExt = 0;

  camps.forEach((c) => {
    const { totalDailyRate, rateInt, rateExt } = getCalculationParams(c, item);
    aggTotalDaily += totalDailyRate;
    totalInt += rateInt;
    totalExt += rateExt;
  });

  return { aggTotalDaily, totalInt, totalExt };
};

// --- UI COMPONENTS ---

const MetricCard = ({
  label,
  value,
  unit,
  highlight = false,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: 2,
      bgcolor: highlight ? "#e3f2fd" : "background.default",
      border: "1px solid",
      borderColor: highlight ? "primary.main" : "divider",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ fontWeight: 600, textTransform: "uppercase", fontSize: "0.65rem" }}
    >
      {label}
    </Typography>
    <Typography
      variant="h6"
      sx={{
        fontWeight: "bold",
        color: highlight ? "primary.main" : "text.primary",
        lineHeight: 1.2,
        my: 0.5,
      }}
    >
      {value}{" "}
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: "normal" }}
      >
        {unit}
      </Typography>
    </Typography>
  </Box>
);

const TargetLevelPolicy: React.FC<Props> = ({
  policy,
  setPolicy,
  camps,
  items,
}) => {
  const reviewPeriod = parseFloat(policy.inventoryControlPeriod || "1");

  // --- MEMOIZED HELPERS ---
  const calculations = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCalculationParams>>();
    camps.forEach((camp) => {
      items.forEach((item) => {
        map.set(`${camp.name}-${item.name}`, getCalculationParams(camp, item));
      });
    });
    return map;
  }, [camps, items]);

  const getCachedParams = (campName: string, itemName: string) => {
    return calculations.get(`${campName}-${itemName}`)!;
  };

  // --- AUTO-SYNC EFFECT: Ensures state matches calculations ---
  useEffect(() => {
    let hasChanges = false;
    const nextPolicy = { ...policy };

    // 1. CAMP TARGET LEVELS SYNC
    const nextTargetLevels = { ...(nextPolicy.targetLevels || {}) };
    let campDataChanged = false;

    camps.forEach((camp) => {
      const campName = camp.name;
      const currentCampLevels = nextTargetLevels[campName] || {};
      let campChanged = false;
      const newCampLevels = { ...currentCampLevels };

      items.forEach((item) => {
        const itemName = item.name;
        // Retrieve the calculated values used by the UI
        const params = calculations.get(`${campName}-${itemName}`);
        if (!params) return;

        const { totalDailyRate, finalLeadTime } = params;
        const baseExposure = reviewPeriod + finalLeadTime;

        const itemPolicy = newCampLevels[itemName] || {};

        // Determine Ratio: Use stored ratio or default to 1.5 (UI defaults)
        const sRatioStr = itemPolicy.S_targetRatio;
        const sRatio = sRatioStr ? parseFloat(sRatioStr) : 1.5;

        // Calculate the correct S based on current parameters (UI value)
        const calculatedS = Math.ceil(totalDailyRate * baseExposure * sRatio);

        // Check what is currently stored
        const storedSStr = itemPolicy.S_targetLevel;
        const storedS = storedSStr ? parseInt(storedSStr, 10) : undefined;

        // If mismatch or missing, update state to pass validation
        if (storedS !== calculatedS) {
          // Recalculate threshold to maintain consistency
          const tRatioStored = policy.thresholdRatios?.[campName]?.[itemName];
          const tRatio = tRatioStored ? parseFloat(tRatioStored) : 0.2;
          const newThreshold = Math.ceil(calculatedS * tRatio);

          newCampLevels[itemName] = {
            ...itemPolicy,
            S_targetLevel: calculatedS.toString(),
            S_targetRatio: sRatio.toString(),
            rationingThreshold: newThreshold.toString(),
          };
          campChanged = true;
          campDataChanged = true;
          hasChanges = true;
        }
      });

      if (campChanged) {
        nextTargetLevels[campName] = newCampLevels;
      }
    });

    if (campDataChanged) {
      nextPolicy.targetLevels = nextTargetLevels;
    }

    // 2. CENTRAL TARGET LEVELS SYNC
    const nextCentralLevels = { ...(nextPolicy.centralTargetLevels || {}) };
    let centralDataChanged = false;

    items.forEach((item) => {
      const itemName = item.name;
      const { aggTotalDaily } = getCentralCalculationParams(camps, item);
      const supplierLeadTime = (item as any).supplierLeadTime || 2.0;

      const centralItemPolicy = nextCentralLevels[itemName] || {};
      const c_S_ratioStr = centralItemPolicy.S_targetRatio;
      const c_S_ratio = c_S_ratioStr ? parseFloat(c_S_ratioStr) : 1.5;

      const centralTargetS = Math.ceil(
        aggTotalDaily * (reviewPeriod + supplierLeadTime) * c_S_ratio
      );

      const storedCentralSStr = centralItemPolicy.S_targetLevel;
      const storedCentralS = storedCentralSStr
        ? parseInt(storedCentralSStr, 10)
        : undefined;

      if (storedCentralS !== centralTargetS) {
        nextCentralLevels[itemName] = {
          ...centralItemPolicy,
          S_targetRatio: c_S_ratio.toString(),
          S_targetLevel: centralTargetS.toString(),
        };
        centralDataChanged = true;
        hasChanges = true;
      }
    });

    if (centralDataChanged) {
      nextPolicy.centralTargetLevels = nextCentralLevels;
    }

    if (hasChanges) {
      setPolicy(nextPolicy);
    }
  }, [camps, items, reviewPeriod, calculations, policy, setPolicy]);

  // --- CRITICAL FIX: ROBUST STATE UPDATER ---
  // Bu fonksiyon slider hareket ettiğinde objenin var olup olmadığına bakmaksızın
  // o yolu (path) oluşturur. Bu sayede "undefined" hatası almazsın ve slider takılmaz.
  const updateCampPolicyState = (
    campName: string,
    itemName: string,
    updates: Record<string, string>
  ) => {
    const nextPolicy = { ...policy };

    // 1. targetLevels yoksa oluştur
    if (!nextPolicy.targetLevels) {
      nextPolicy.targetLevels = {};
    } else {
      nextPolicy.targetLevels = { ...nextPolicy.targetLevels };
    }

    // 2. Kamp objesi yoksa oluştur
    if (!nextPolicy.targetLevels[campName]) {
      nextPolicy.targetLevels[campName] = {};
    } else {
      nextPolicy.targetLevels[campName] = {
        ...nextPolicy.targetLevels[campName],
      };
    }

    // 3. Item objesi yoksa oluştur
    const currentItemData = nextPolicy.targetLevels[campName][itemName] || {};

    // 4. Güncellemeyi uygula
    nextPolicy.targetLevels[campName][itemName] = {
      ...currentItemData,
      ...updates,
    };

    setPolicy(nextPolicy);
  };

  const updateCampThresholdState = (
    campName: string,
    itemName: string,
    ratioVal: string,
    intVal: string
  ) => {
    const nextPolicy = { ...policy };

    // --- Threshold Ratios Update ---
    if (!nextPolicy.thresholdRatios) nextPolicy.thresholdRatios = {};
    else nextPolicy.thresholdRatios = { ...nextPolicy.thresholdRatios };

    if (!nextPolicy.thresholdRatios[campName])
      nextPolicy.thresholdRatios[campName] = {};
    else
      nextPolicy.thresholdRatios[campName] = {
        ...nextPolicy.thresholdRatios[campName],
      };

    nextPolicy.thresholdRatios[campName][itemName] = ratioVal;

    // --- Target Levels Update (Backend Compatibility) ---
    // Backend threshold değerini targetLevels içinde beklediği için burayı da güncelliyoruz.
    if (!nextPolicy.targetLevels) nextPolicy.targetLevels = {};
    else nextPolicy.targetLevels = { ...nextPolicy.targetLevels };

    if (!nextPolicy.targetLevels[campName])
      nextPolicy.targetLevels[campName] = {};
    else
      nextPolicy.targetLevels[campName] = {
        ...nextPolicy.targetLevels[campName],
      };

    const currentItem = nextPolicy.targetLevels[campName][itemName] || {};
    nextPolicy.targetLevels[campName][itemName] = {
      ...currentItem,
      rationingThreshold: intVal,
    };

    setPolicy(nextPolicy);
  };

  // --- HANDLERS ---

  const handleSRatioChange = (
    camp: Camp,
    item: Item,
    newValue: number | number[]
  ) => {
    const ratio = Array.isArray(newValue) ? newValue[0] : newValue;

    // Calculate new S Level based on ratio
    const { totalDailyRate, finalLeadTime } = getCachedParams(
      camp.name,
      item.name
    );
    const baseExposure = reviewPeriod + finalLeadTime;
    const calculatedS = Math.ceil(totalDailyRate * baseExposure * ratio);

    // Get current threshold ratio to recalculate the threshold quantity
    const currentThreshRatioVal =
      policy.thresholdRatios?.[camp.name]?.[item.name];
    const currentThreshRatio = currentThreshRatioVal
      ? parseFloat(currentThreshRatioVal)
      : 0.2;
    const newThreshold = Math.ceil(calculatedS * currentThreshRatio);

    // Create a SINGLE updated policy object to avoid race conditions
    const nextPolicy = { ...policy };

    // --- 1. Update Target Levels (S_targetRatio & S_targetLevel) ---
    if (!nextPolicy.targetLevels) nextPolicy.targetLevels = {};
    else nextPolicy.targetLevels = { ...nextPolicy.targetLevels };

    if (!nextPolicy.targetLevels[camp.name])
      nextPolicy.targetLevels[camp.name] = {};
    else
      nextPolicy.targetLevels[camp.name] = {
        ...nextPolicy.targetLevels[camp.name],
      };

    const currentItemData = nextPolicy.targetLevels[camp.name][item.name] || {};
    nextPolicy.targetLevels[camp.name][item.name] = {
      ...currentItemData,
      S_targetRatio: ratio.toString(),
      S_targetLevel: calculatedS.toString(),
      // Also update backend compatible rationingThreshold here
      rationingThreshold: newThreshold.toString(),
    };

    // --- 2. Update Threshold Ratios ---
    if (!nextPolicy.thresholdRatios) nextPolicy.thresholdRatios = {};
    else nextPolicy.thresholdRatios = { ...nextPolicy.thresholdRatios };

    if (!nextPolicy.thresholdRatios[camp.name])
      nextPolicy.thresholdRatios[camp.name] = {};
    else
      nextPolicy.thresholdRatios[camp.name] = {
        ...nextPolicy.thresholdRatios[camp.name],
      };

    nextPolicy.thresholdRatios[camp.name][item.name] =
      currentThreshRatio.toString();

    // Perform a single atomic state update
    setPolicy(nextPolicy);
  };

  const handleThresholdChange = (
    camp: Camp,
    item: Item,
    newValue: number | number[]
  ) => {
    const ratio = Array.isArray(newValue) ? newValue[0] : newValue;

    // Mevcut S değerini state'den al
    const sTargetLevelStr =
      policy.targetLevels?.[camp.name]?.[item.name]?.S_targetLevel;
    const sTargetLevel = sTargetLevelStr ? parseInt(sTargetLevelStr) : 0;

    const newThreshold = Math.ceil(sTargetLevel * ratio);

    updateCampThresholdState(
      camp.name,
      item.name,
      ratio.toString(),
      newThreshold.toString()
    );
  };

  const handleGlobalRChange = (val: string) => {
    if (val === "" || /^\d*$/.test(val))
      setPolicy({ ...policy, inventoryControlPeriod: val });
  };

  // --- CENTRAL HANDLERS ---
  // Central için de aynı robust mantığı uyguluyoruz
  const updateCentralState = (
    itemName: string,
    updates: Record<string, string>
  ) => {
    const nextPolicy = { ...policy };
    if (!nextPolicy.centralTargetLevels) nextPolicy.centralTargetLevels = {};
    else nextPolicy.centralTargetLevels = { ...nextPolicy.centralTargetLevels };

    const current = nextPolicy.centralTargetLevels[itemName] || {};
    nextPolicy.centralTargetLevels[itemName] = { ...current, ...updates };

    setPolicy(nextPolicy);
  };

  const handleCentralSRatioChange = (item: Item, val: number | number[]) => {
    const ratio = Array.isArray(val) ? val[0] : val;
    const { aggTotalDaily } = getCentralCalculationParams(camps, item);
    const supplierLeadTime = (item as any).supplierLeadTime || 2.0;
    const calculatedS = Math.ceil(
      aggTotalDaily * (reviewPeriod + supplierLeadTime) * ratio
    );

    updateCentralState(item.name, {
      S_targetRatio: ratio.toString(),
      S_targetLevel: calculatedS.toString(),
    });
  };

  return (
    <Stack spacing={3}>
      {/* 1. GLOBAL HEADER */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: "#fafafa" }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                p: 1,
                borderRadius: 1,
              }}
            >
              <Inventory2 />
            </Box>
          </Grid>
          <Grid item xs>
            <Typography variant="subtitle1" fontWeight="bold">
              Inventory Control & Rationing
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Define target level policies and critical rationing thresholds for inventory management.
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Review Period (R)"
              size="small"
              type="number"
              fullWidth
              value={policy.inventoryControlPeriod || ""}
              onChange={(e) => handleGlobalRChange(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">days</InputAdornment>
                ),
              }}
              helperText="Time interval between inventory reviews"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 2. CAMP OPERATIONS - key includes demand/lead time so updates in Camps section flow here */}
      <NestedCollapsibleSection title="Camp Operations" level="secondary">
        {camps.map((camp) => {
          const campDataKey = camp.demands
            ?.map(
              (d) =>
                `${d.arrivalData?.distParameters?.mean ?? ""}-${d.leadTimeData?.distParameters?.mean ?? ""}-${d.leadTimeData?.distParameters?.min ?? ""}-${d.leadTimeData?.distParameters?.max ?? ""}`
            )
            .join("|");
          return (
          <NestedCollapsibleSection
            key={`${camp.name}-${campDataKey}`}
            title={camp.name}
            level="tertiary"
          >
            {items.map((item) => {
              // CALCULATIONS - derived from current camps (interarrival means & lead time from Camps section)
              const params = getCachedParams(camp.name, item.name);
              const {
                totalDailyRate,
                finalLeadTime,
                rateInt,
                rateExt,
                internalDemand,
                externalDemand,
              } = params;

              // SAFE READ: State okurken de fallback kullanıyoruz ki UI patlamasın
              const campPolicy =
                policy.targetLevels?.[camp.name]?.[item.name] || {};

              // Slider value okuma
              let S_ratio = 1.0;
              if (campPolicy.S_targetRatio) {
                S_ratio = parseFloat(campPolicy.S_targetRatio);
              }

              // Threshold ratio okuma
              let thresh_ratio = 0.2;
              const tVal = policy.thresholdRatios?.[camp.name]?.[item.name];
              if (tVal) {
                thresh_ratio = parseFloat(tVal);
              }

              const baseExposure = reviewPeriod + finalLeadTime;
              const calculatedS = Math.ceil(
                totalDailyRate * baseExposure * S_ratio
              );
              const calculatedThreshold = Math.ceil(calculatedS * thresh_ratio);

              if (!internalDemand && !externalDemand) {
                return (
                  <Paper
                    key={item.name}
                    sx={{
                      p: 2,
                      mb: 2,
                      bgcolor: "#f5f5f5",
                      borderLeft: "4px solid #bdbdbd",
                    }}
                  >
                    <Typography variant="subtitle2" color="text.secondary">
                      {item.name}
                    </Typography>
                    <Typography variant="caption">
                      No demand configuration found.
                    </Typography>
                  </Paper>
                );
              }

              return (
                <Paper
                  key={item.name}
                  elevation={2}
                  sx={{
                    mb: 3,
                    border: "1px solid #e0e0e0",
                    overflow: "hidden",
                  }}
                >
                  {/* Item Header */}
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "#f8f9fa",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <Grid
                      container
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Grid item>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {item.name}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Chip
                          icon={<Functions sx={{ fontSize: 16 }} />}
                          label={`Total Expected Daily Demand: ${totalDailyRate.toFixed(
                            2
                          )}`}
                          color="primary"
                          variant="filled"
                          sx={{ fontWeight: "bold" }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Grid container>
                    {/* LEFT: ANALYTICS */}
                    <Grid
                      item
                      xs={12}
                      md={5}
                      sx={{ p: 3, borderRight: { md: "1px solid #eee" } }}
                    >
                      <Stack spacing={3}>
                        <Box>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            mb={1}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                bgcolor: "primary.main",
                              }}
                            />
                            <Typography variant="overline" fontWeight="bold">
                              Internal Demand Stream
                            </Typography>
                            {!internalDemand && (
                              <Chip label="None" size="small" />
                            )}
                          </Stack>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <MetricCard
                                label="Interarrival Mean"
                                value={
                                  internalDemand?.arrivalData.distParameters
                                    .mean || "-"
                                }
                                unit="min"
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <MetricCard
                                label="Expected Daily Demand"
                                value={rateInt.toFixed(2)}
                                unit="units"
                                highlight={!!internalDemand}
                              />
                            </Grid>
                          </Grid>
                        </Box>

                        <Divider />

                        <Box>
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            mb={1}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                bgcolor: "secondary.main",
                              }}
                            />
                            <Typography variant="overline" fontWeight="bold">
                              External Demand Stream
                            </Typography>
                            {!externalDemand && (
                              <Chip label="None" size="small" />
                            )}
                          </Stack>
                          <Grid container spacing={2}>
                            <Grid item xs={6}>
                              <MetricCard
                                label="Interarrival Mean"
                                value={
                                  externalDemand?.arrivalData.distParameters
                                    .mean || "-"
                                }
                                unit="min"
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <MetricCard
                                label="Expected Daily Demand"
                                value={rateExt.toFixed(2)}
                                unit="units"
                                highlight={!!externalDemand}
                              />
                            </Grid>
                          </Grid>
                        </Box>

                        <Box
                          sx={{
                            bgcolor: "#fff3e0",
                            p: 1.5,
                            borderRadius: 2,
                            border: "1px solid #ffe0b2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color="text.secondary"
                          >
                            Expected Lead Time (L)
                          </Typography>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            color="warning.dark"
                          >
                            {finalLeadTime.toFixed(2)}{" "}
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                            >
                              days
                            </Typography>
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    {/* RIGHT: CONTROL PANEL */}
                    <Grid item xs={12} md={7} sx={{ p: 3, bgcolor: "#fff" }}>
                      {/* SECTION 1: Target Level Policy */}
                      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                        <Typography
                          variant="overline"
                          color="primary"
                          fontWeight="bold"
                        >
                          Target Level Policy
                        </Typography>
                        <Tooltip
                          title="Target Level Policy maintains inventory at a target level (S). When inventory is reviewed, orders are placed to bring stock up to the target level S. Formula: S = Expected Daily Demand × (Review Period + Lead Time) × Multiplier"
                          arrow
                          placement="top"
                        >
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Grid
                        container
                        spacing={3}
                        alignItems="center"
                        sx={{ mb: 2 }}
                      >
                        <Grid item xs={12}>
                          <Typography variant="caption" fontWeight="bold">
                            Target Level (S) Multiplier
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Multiplier applied to expected demand during review period and lead time to determine target level (S)
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                          >
                            <Slider
                              value={S_ratio}
                              min={0}
                              max={3}
                              step={0.01}
                              valueLabelDisplay="auto"
                              marks={[{ value: 1, label: "1.0" }]}
                              onChange={(_, v) =>
                                handleSRatioChange(camp, item, v)
                              }
                              sx={{ flexGrow: 1 }}
                            />
                            <Box
                              sx={{
                                minWidth: 50,
                                textAlign: "right",
                                fontWeight: "bold",
                                color: "primary.main",
                                border: "1px solid",
                                borderColor: "primary.main",
                                borderRadius: 1,
                                px: 1,
                              }}
                            >
                              {S_ratio.toFixed(2)}x
                            </Box>
                          </Stack>
                        </Grid>
                      </Grid>

                      {/* Formula Visualization (s, S) */}
                      <Box
                        sx={{
                          p: 1.5,
                          bgcolor: "#f0f4f8",
                          borderRadius: 2,
                          mb: 3,
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Target (S) = Daily Demand Rate × (R+L) × Multiplier
                            </Typography>
                            <Typography
                              variant="h6"
                              color="primary.dark"
                              fontWeight="bold"
                            >
                              {calculatedS} Units
                            </Typography>
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                          >
                            = {totalDailyRate.toFixed(2)} × (
                            {reviewPeriod.toFixed(2)} +{" "}
                            {finalLeadTime.toFixed(2)}) × {S_ratio.toFixed(2)}
                          </Typography>
                        </Stack>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* SECTION 2: Rationing Threshold */}
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: "error.main",
                            mr: 1,
                          }}
                        />
                        <Typography
                          variant="overline"
                          color="error"
                          fontWeight="bold"
                        >
                          Rationing Threshold
                        </Typography>
                        <Tooltip
                          title="When inventory falls below this threshold (calculated as: Threshold = S × Percentage), rationing policies are activated to manage limited supply. This ensures fair distribution when stock is low."
                          arrow
                          placement="top"
                        >
                          <IconButton size="small" sx={{ ml: 1 }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} sm={8}>
                          <Typography
                            variant="caption"
                            fontWeight="bold"
                            color="text.secondary"
                          >
                            Rationing percentage of target
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                          >
                            <Slider
                              value={thresh_ratio}
                              min={0}
                              max={1}
                              step={0.01}
                              valueLabelDisplay="auto"
                              color="error"
                              marks={[{ value: 0.2, label: "20%" }]}
                              onChange={(_, v) =>
                                handleThresholdChange(camp, item, v)
                              }
                              sx={{ flexGrow: 1 }}
                            />
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color="error.main"
                            >
                              {(thresh_ratio * 100).toFixed(0)}%
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Box
                            sx={{
                              textAlign: "right",
                              borderLeft: "2px solid #ef5350",
                              pl: 2,
                            }}
                          >
                            <Typography
                              variant="caption"
                              display="block"
                              color="text.secondary"
                            >
                              Rationing threshold level
                            </Typography>
                            <Typography
                              variant="h5"
                              color="error.dark"
                              fontWeight="bold"
                            >
                              {calculatedThreshold}
                            </Typography>
                            <Typography variant="caption" color="error.main">
                              Units
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              );
            })}
          </NestedCollapsibleSection>
          );
        })}
      </NestedCollapsibleSection>

      {/* 3. CENTRAL WAREHOUSE */}
      <NestedCollapsibleSection
        title="Central Warehouse Operations"
        level="secondary"
      >
        <Alert severity="info" sx={{ mb: 2 }}>
          Central targets are calculated based on the aggregated demand of all
          camps.
        </Alert>
        <Grid container spacing={2}>
          {items.map((item) => {
            const { aggTotalDaily, totalInt, totalExt } =
              getCentralCalculationParams(camps, item);

            const supplierLeadTime = (item as any).supplierLeadTime || 2.0;

            const centralPolicy = policy.centralTargetLevels?.[item.name] || {};

            let c_S_ratio = 1.0;
            if (centralPolicy.S_targetRatio) {
              c_S_ratio = parseFloat(centralPolicy.S_targetRatio);
            }

            const centralTargetS = Math.ceil(
              aggTotalDaily * (reviewPeriod + supplierLeadTime) * c_S_ratio
            );

            return (
              <Grid item xs={12} key={item.name}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {item.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Internal: {totalInt.toFixed(2)} | External: {totalExt.toFixed(2)}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color="primary"
                    >
                      Total: {aggTotalDaily.toFixed(2)} items / day
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Slider
                        size="small"
                        value={c_S_ratio}
                        min={0}
                        max={3}
                        step={0.01}
                        marks={[{ value: 1, label: "1.0" }]}
                        onChange={(_, v) => handleCentralSRatioChange(item, v)}
                        sx={{ flexGrow: 1 }}
                      />
                      <Typography variant="caption" fontWeight="bold">
                        {c_S_ratio.toFixed(2)}x
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      display="block"
                      textAlign="center"
                    >
                      Target Level (S) Multiplier
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" textAlign="center" sx={{ mt: 0.5 }}>
                      Multiplier for aggregated demand across all camps
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      textAlign: "right",
                      minWidth: 120,
                      borderLeft: "1px solid #eee",
                      pl: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      Target (S)
                    </Typography>
                    <Typography
                      variant="h5"
                      color="primary.dark"
                      fontWeight="bold"
                    >
                      {centralTargetS}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </NestedCollapsibleSection>
    </Stack>
  );
};

export default TargetLevelPolicy;
