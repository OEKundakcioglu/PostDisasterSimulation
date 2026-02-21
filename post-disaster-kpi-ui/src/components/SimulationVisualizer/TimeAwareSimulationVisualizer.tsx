/* /components/SimulationVisualizer/TimeAwareSimulationVisualizer.tsx */
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Stack,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import dynamic from "next/dynamic";
import type { Layout } from "plotly.js";
import TimeSliderControl from "./TimeSliderControl";

/* -------- Plotly (client‑only with retry) ------------------------- */
const Plot = dynamic(
  async () => {
    try {
      const mod = await import("react-plotly.js");
      return mod;
    } catch (e) {
      console.error("Initial Plotly chunk load failed, retrying once", e);
      // small delay then retry (helps during dev HMR race)
      await new Promise((res) => setTimeout(res, 300));
      const mod = await import("react-plotly.js");
      return mod;
    }
  },
  {
    ssr: false,
    loading: () => (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    ),
  }
);

/* -------- colours & order ----------------------------------------- */
const COST_COLOUR: Record<string, string> = {
  Replenishment: "#4CAF50",
  Deprivation: "#F44336",
  Holding: "#FF9800",
  Referral: "#2196F3",
};
/* order for 2 × 2 grid */
const PLOT_ORDER = [
  "Replenishment",
  "Deprivation",
  "Holding",
  "Referral",
] as const;

/* -------- sidebar styles ------------------------------------------ */
const RankBox = styled(Box)({
  maxHeight: "calc(100vh - 160px)", // fill column, then scroll
  overflowY: "auto",
  pr: 1,
});

const RankItem = styled("div")<{
  $colour: string;
}>(({ $colour }) => ({
  display: "grid",
  gridTemplateColumns: "23px minmax(70px,1fr) 80px 80px",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  marginBottom: 2,
  background: "white",
  borderLeft: `4px solid ${$colour}`,
  borderRadius: 4,
  fontSize: 12.5,
  fontWeight: 500,
  "& .camp": {
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2, // wrap to max‑two lines then ellipsis
    WebkitBoxOrient: "vertical",
  },
}));

/* -------- types ---------------------------------------------------- */
interface Point {
  t: number;
  cost: number;
}
interface CostEntry {
  camp: string;
  type: string;
  cost: number;
}
interface TimeStepLog {
  time: number;
  planningHorizon: number;
  cumulativeHoldingCosts: Record<string, number>;
  cumulativeReferralCosts: Record<string, number>;
  cumulativeDeprivationCosts: Record<string, number>;
  cumulativeReplenishmentCosts: Record<string, number>;
  demandRatePerHour?: Record<string, Record<string, number>>;
  demandRatePerHourInternal?: Record<string, Record<string, number>>;
  demandRatePerHourExternal?: Record<string, Record<string, number>>;
}

interface TimeAwareSimulationVisualizerProps {
  logs?: TimeStepLog[];
  onDownloadEnv?: () => void;
  onStopAndRestart?: () => void;
}

/* =================================================================== */
const TimeAwareSimulationVisualizer: React.FC<
  TimeAwareSimulationVisualizerProps
> = ({ logs, onDownloadEnv, onStopAndRestart }) => {
  // remove internal websocket if logs prop provided
  const externalMode = !!logs;
  const [allLogs, setAllLogs] = useState<TimeStepLog[]>([]);
  const [ranking, setRanking] = useState<CostEntry[]>([]);
  const [ts, setTs] = useState<Record<string, Record<string, Point[]>>>({});
  const ready = true;
  const lastIngestedRef = useRef(0); // track how many logs already processed

  // Time slider state
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [isRealTimeMode, setIsRealTimeMode] = useState<boolean>(true);
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get available time points from logs
  const availableTimes = useMemo(() => {
    return allLogs.map((log) => log.time).sort((a, b) => a - b);
  }, [allLogs]);

  const maxTime = useMemo(() => {
    return availableTimes.length > 0 ? Math.max(...availableTimes) : 0;
  }, [availableTimes]);

  const planningHorizon = useMemo(() => {
    if (!allLogs.length) return 0;
    const firstWithHorizon = allLogs.find(
      (l) =>
        typeof l.planningHorizon === "number" &&
        !Number.isNaN(l.planningHorizon)
    );
    return firstWithHorizon?.planningHorizon || 0;
  }, [allLogs]);

  const maxDisplayTime = useMemo(() => {
    return planningHorizon > 0 ? Math.max(planningHorizon, maxTime) : maxTime;
  }, [planningHorizon, maxTime]);

  // Update start and end time when max time changes
  useEffect(() => {
    if (maxTime > 0) {
      setEndTime(maxTime);
    }
  }, [maxTime]);

  // Filter logs based on current time or time range (for snapshot mode)
  const filteredLogs = useMemo(() => {
    if (isRealTimeMode) {
      return allLogs;
    }

    if (isRangeMode) {
      // Range mode: filter between start and end time
      return allLogs.filter(
        (log) => log.time >= startTime && log.time <= endTime
      );
    } else {
      // Single point mode: filter up to current time
      return allLogs.filter((log) => log.time <= currentTime);
    }
  }, [allLogs, currentTime, startTime, endTime, isRealTimeMode, isRangeMode]);

  const ingest = useCallback((batch: TimeStepLog[]) => {
    if (!batch || !batch.length) return;

    // Store all logs for time navigation
    setAllLogs((prev) => {
      const combined = [...prev, ...batch];
      // Remove duplicates based on time and sort
      const unique = combined.reduce((acc, current) => {
        const existing = acc.find((log) => log.time === current.time);
        if (!existing) {
          acc.push(current);
        } else {
          // Update with latest data for same time
          Object.assign(existing, current);
        }
        return acc;
      }, [] as TimeStepLog[]);
      return unique.sort((a, b) => a.time - b.time);
    });
  }, []);

  // Process filtered logs for display
  useEffect(() => {
    if (!filteredLogs.length) return;

    const latestLog = filteredLogs[filteredLogs.length - 1];

    // Update current time in real-time mode
    if (isRealTimeMode) {
      setCurrentTime(latestLog.time);
    }

    // Calculate cumulative data up to current time
    const cumulativeData: Record<string, Record<string, number>> = {
      replenishment: {},
      deprivation: {},
      holding: {},
      referral: {},
    };

    // Aggregate data from all logs up to current time
    filteredLogs.forEach((log) => {
      Object.entries(log.cumulativeReplenishmentCosts || {}).forEach(
        ([camp, cost]) => {
          cumulativeData.replenishment[camp] = Math.max(
            cumulativeData.replenishment[camp] || 0,
            cost
          );
        }
      );
      Object.entries(log.cumulativeDeprivationCosts || {}).forEach(
        ([camp, cost]) => {
          cumulativeData.deprivation[camp] = Math.max(
            cumulativeData.deprivation[camp] || 0,
            cost
          );
        }
      );
      Object.entries(log.cumulativeHoldingCosts || {}).forEach(
        ([camp, cost]) => {
          cumulativeData.holding[camp] = Math.max(
            cumulativeData.holding[camp] || 0,
            cost
          );
        }
      );
      Object.entries(log.cumulativeReferralCosts || {}).forEach(
        ([camp, cost]) => {
          cumulativeData.referral[camp] = Math.max(
            cumulativeData.referral[camp] || 0,
            cost
          );
        }
      );
    });

    const entries: CostEntry[] = [
      ...Object.entries(cumulativeData.replenishment).map(([camp, cost]) => ({
        camp,
        type: "Replenishment",
        cost,
      })),
      ...Object.entries(cumulativeData.deprivation).map(([camp, cost]) => ({
        camp,
        type: "Deprivation",
        cost,
      })),
      ...Object.entries(cumulativeData.holding).map(([camp, cost]) => ({
        camp,
        type: "Holding",
        cost,
      })),
      ...Object.entries(cumulativeData.referral).map(([camp, cost]) => ({
        camp,
        type: "Referral",
        cost,
      })),
    ];

    setRanking(
      entries.length
        ? entries.sort(
            (a, b) => b.cost - a.cost || a.camp.localeCompare(b.camp)
          )
        : []
    );

    // Build time series data for charts
    setTs(() => {
      const next: Record<string, Record<string, Point[]>> = {};
      const cumulativeData: Record<
        string,
        Record<string, Record<number, number>>
      > = {};

      // First pass: collect all cumulative data points
      filteredLogs.forEach((log) => {
        const logEntries = [
          ...Object.entries(log.cumulativeReplenishmentCosts || {}).map(
            ([camp, cost]) => ({ camp, type: "Replenishment", cost })
          ),
          ...Object.entries(log.cumulativeDeprivationCosts || {}).map(
            ([camp, cost]) => ({ camp, type: "Deprivation", cost })
          ),
          ...Object.entries(log.cumulativeHoldingCosts || {}).map(
            ([camp, cost]) => ({ camp, type: "Holding", cost })
          ),
          ...Object.entries(log.cumulativeReferralCosts || {}).map(
            ([camp, cost]) => ({ camp, type: "Referral", cost })
          ),
        ];

        logEntries.forEach(({ camp, type, cost }) => {
          if (!cumulativeData[camp]) cumulativeData[camp] = {};
          if (!cumulativeData[camp][type]) cumulativeData[camp][type] = {};
          cumulativeData[camp][type][log.time] = cost;
        });
      });

      // Second pass: convert to real-time incremental values for charts
      Object.entries(cumulativeData).forEach(([camp, campData]) => {
        Object.entries(campData).forEach(([type, timeData]) => {
          if (!next[camp]) next[camp] = {};
          if (!next[camp][type]) next[camp][type] = [];

          const sortedTimes = Object.keys(timeData)
            .map(Number)
            .sort((a, b) => a - b);

          sortedTimes.forEach((time) => {
            const cumulativeValue = timeData[time];
            next[camp][type].push({ t: time, cost: cumulativeValue });
          });
        });
      });

      return next;
    });
  }, [filteredLogs, isRealTimeMode]);

  useEffect(() => {
    if (externalMode && logs) {
      const start = lastIngestedRef.current;
      if (logs.length > start) {
        ingest(logs.slice(start));
        lastIngestedRef.current = logs.length;
      }
    }
  }, [logs, externalMode, ingest]);

  // Playback controls
  const handlePlay = useCallback(() => {
    if (currentTime >= maxTime) return;
    setIsPlaying(true);

    playbackIntervalRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const nextTime = prev + 1;
        if (nextTime >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return nextTime;
      });
    }, 1000 / playbackSpeed);
  }, [currentTime, maxTime, playbackSpeed]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentTime((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentTime((prev) => Math.min(maxTime, prev + 1));
  }, [maxTime]);

  const handleReset = useCallback(() => {
    setCurrentTime(0);
    handlePause();
  }, [handlePause]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  // Cleanup playback on unmount
  useEffect(() => {
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, []);

  // Update playback speed
  useEffect(() => {
    if (isPlaying) {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const nextTime = prev + 1;
          if (nextTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return nextTime;
        });
      }, 1000 / playbackSpeed);
    }
  }, [playbackSpeed, isPlaying, maxTime]);

  const topCamps = useMemo(
    () => Array.from(new Set(ranking.map((e) => e.camp))).slice(0, 4),
    [ranking]
  );

  /* -------- render ------------------------------------------------ */
  return (
    <Box>
      {/* Time Slider Control */}
      <TimeSliderControl
        currentTime={currentTime}
        maxTime={maxTime}
        displayMaxTime={maxDisplayTime}
        onTimeChange={setCurrentTime}
        startTime={startTime}
        endTime={endTime}
        onStartTimeChange={setStartTime}
        onEndTimeChange={setEndTime}
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onReset={handleReset}
        playbackSpeed={playbackSpeed}
        onSpeedChange={handleSpeedChange}
        isRealTimeMode={isRealTimeMode}
        onRealTimeModeChange={setIsRealTimeMode}
        isRangeMode={isRangeMode}
        onRangeModeChange={setIsRangeMode}
        availableTimes={availableTimes}
        onDownloadEnv={onDownloadEnv}
        onStopAndRestart={onStopAndRestart}
      />

      {!ready && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Connecting …</Typography>
        </Box>
      )}

      {ready && (
        <Grid container spacing={3}>
          {/* -------- sidebar ------------------------------------- */}
          <Grid item xs={12} md={4} lg={3}>
            <Stack spacing={2}>
              {/* Cost Rankings */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Cost Rankings
                </Typography>
                <RankBox sx={{ maxHeight: "250px" }}>
                  {ranking.map(({ camp, type, cost }, idx) => (
                    <RankItem
                      key={`${camp}-${type}`}
                      $colour={COST_COLOUR[type]}
                    >
                      <span>{idx + 1}.</span>
                      <span className="camp" title={camp}>
                        {camp}
                      </span>
                      <span
                        style={{
                          color: COST_COLOUR[type],
                          fontWeight: 600,
                        }}
                      >
                        {type}
                      </span>
                      <span style={{ textAlign: "right" }}>
                        {cost.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </RankItem>
                  ))}
                </RankBox>
              </Paper>

              {/* Demand rate (hourly) per camp–item — internal vs external; values can change over time. */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                  Demand rate (hourly) by camp & item
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  Internal vs external units/hour at current time. These values can change over time (e.g. with migration).
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 1, px: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: "#FF9800", borderRadius: "2px" }} />
                    <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>Internal</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: "#2196F3", borderRadius: "2px" }} />
                    <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>External</Typography>
                  </Box>
                </Box>
                {(() => {
                  const latestLog = filteredLogs[filteredLogs.length - 1];
                  const demandRates: { camp: string; item: string; internal: number; external: number; total: number }[] = [];
                  const src = latestLog?.demandRatePerHourInternal && latestLog?.demandRatePerHourExternal
                    ? { internal: latestLog.demandRatePerHourInternal, external: latestLog.demandRatePerHourExternal }
                    : latestLog?.demandRatePerHour
                      ? null
                      : null;
                  if (src) {
                    const camps = new Set<string>([
                      ...Object.keys(src.internal),
                      ...Object.keys(src.external),
                    ]);
                    camps.forEach((camp) => {
                      const itemsInternal = src.internal[camp] || {};
                      const itemsExternal = src.external[camp] || {};
                      const itemNames = new Set<string>([
                        ...Object.keys(itemsInternal),
                        ...Object.keys(itemsExternal),
                      ]);
                      itemNames.forEach((item) => {
                        const internal = typeof itemsInternal[item] === "number" ? itemsInternal[item] : 0;
                        const external = typeof itemsExternal[item] === "number" ? itemsExternal[item] : 0;
                        demandRates.push({ camp, item, internal, external, total: internal + external });
                      });
                    });
                  } else if (latestLog?.demandRatePerHour) {
                    Object.entries(latestLog.demandRatePerHour).forEach(([camp, items]) => {
                      if (items && typeof items === "object")
                        Object.entries(items).forEach(([item, rate]) => {
                          demandRates.push({
                            camp,
                            item,
                            internal: 0,
                            external: typeof rate === "number" ? rate : 0,
                            total: typeof rate === "number" ? rate : 0,
                          });
                        });
                    });
                  }
                  demandRates.sort((a, b) => b.total - a.total);
                  const topRates = demandRates.slice(0, 15);
                  const labels = topRates.map((r) => `${r.camp} — ${r.item}`);
                  const internalRates = topRates.map((r) => r.internal);
                  const externalRates = topRates.map((r) => r.external);

                  if (labels.length === 0) {
                    return (
                      <Box sx={{ py: 4, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                          Awaiting demand rate data…
                        </Typography>
                      </Box>
                    );
                  }

                  return (
                    <Box>
                      <Plot
                        data={[
                          {
                            y: labels,
                            x: internalRates,
                            type: "bar",
                            orientation: "h",
                            name: "Internal",
                            marker: { color: "#FF9800" },
                            text: internalRates.map((v) => (v > 0 ? v.toFixed(2) : "")),
                            textposition: "auto",
                            textfont: { color: "white", size: 11 },
                            insidetextanchor: "middle",
                            hovertemplate: "%{y}<br>Internal: %{x:,.2f} units/h<extra></extra>",
                          },
                          {
                            y: labels,
                            x: externalRates,
                            type: "bar",
                            orientation: "h",
                            name: "External",
                            marker: { color: "#2196F3" },
                            text: externalRates.map((v) => (v > 0 ? v.toFixed(2) : "")),
                            textposition: "auto",
                            textfont: { color: "white", size: 11 },
                            insidetextanchor: "middle",
                            hovertemplate: "%{y}<br>External: %{x:,.2f} units/h<extra></extra>",
                          },
                        ]}
                        layout={{
                          height: Math.max(300, labels.length * 32),
                          margin: { t: 10, l: 140, r: 20, b: 50 },
                          barmode: "stack",
                          xaxis: {
                            title: { text: "Demand (units/hour)" },
                            gridcolor: "#f0f0f0",
                          },
                          yaxis: { automargin: true },
                          paper_bgcolor: "white",
                          plot_bgcolor: "white",
                          showlegend: false,
                        }}
                        config={{ responsive: true, displayModeBar: false }}
                        useResizeHandler
                        style={{ width: "100%" }}
                      />
                      {demandRates.length > 15 && (
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", pt: 1, display: "block" }}>
                          +{demandRates.length - 15} more camp–item pairs
                        </Typography>
                      )}
                    </Box>
                  );
                })()}
              </Paper>
            </Stack>
          </Grid>

          {/* -------- plots --------------------------------------- */}
          <Grid item xs={12} md={8} lg={9}>
            <Paper sx={{ p: 2 }}>
              {topCamps.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    Waiting for simulation …
                  </Typography>
                </Box>
              ) : (
                topCamps.map((camp) => (
                  <Box key={camp} sx={{ mb: 4 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {camp}
                    </Typography>

                    <Grid container spacing={2}>
                      {PLOT_ORDER.map((type) => {
                        const series = ts[camp]?.[type] || [];
                        const displaySeries = isRealTimeMode
                          ? series
                          : isRangeMode
                          ? series.filter(
                              (p) => p.t >= startTime && p.t <= endTime
                            )
                          : series.filter((p) => p.t <= currentTime);

                        return (
                          <Grid item xs={12} md={6} key={type}>
                            {displaySeries.length === 0 ? (
                              <Box
                                sx={{
                                  height: 200,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px dashed #ddd",
                                  borderRadius: 1,
                                }}
                              >
                                <Typography color="text.secondary">
                                  No {type} data yet
                                </Typography>
                              </Box>
                            ) : (
                              <Plot
                                data={[
                                  type === "Replenishment"
                                    ? {
                                        x: displaySeries.map((p) => p.t),
                                        y: displaySeries.map((p) => p.cost),
                                        type: "bar",
                                        marker: {
                                          color: COST_COLOUR[type],
                                        },
                                        name: type,
                                      }
                                    : {
                                        x: displaySeries.map((p) => p.t),
                                        y: displaySeries.map((p) => p.cost),
                                        type: "scatter",
                                        mode: "lines",
                                        line: {
                                          width: 2,
                                          color: COST_COLOUR[type],
                                        },
                                        name: type,
                                      },
                                  ...(isRealTimeMode
                                    ? []
                                    : isRangeMode
                                    ? [
                                        {
                                          x: [startTime, startTime],
                                          y: [
                                            0,
                                            Math.max(
                                              ...displaySeries.map(
                                                (p) => p.cost
                                              ),
                                              1
                                            ) * 1.1,
                                          ],
                                          type: "scatter" as const,
                                          mode: "lines" as const,
                                          line: {
                                            width: 2,
                                            color: "rgba(0, 255, 0, 0.5)",
                                            dash: "dash" as const,
                                          },
                                          name: "Start Time",
                                          showlegend: false,
                                        },
                                        {
                                          x: [endTime, endTime],
                                          y: [
                                            0,
                                            Math.max(
                                              ...displaySeries.map(
                                                (p) => p.cost
                                              ),
                                              1
                                            ) * 1.1,
                                          ],
                                          type: "scatter" as const,
                                          mode: "lines" as const,
                                          line: {
                                            width: 2,
                                            color: "rgba(255, 0, 0, 0.5)",
                                            dash: "dash" as const,
                                          },
                                          name: "End Time",
                                          showlegend: false,
                                        },
                                      ]
                                    : [
                                        {
                                          x: [currentTime, currentTime],
                                          y: [
                                            0,
                                            Math.max(
                                              ...displaySeries.map(
                                                (p) => p.cost
                                              ),
                                              1
                                            ) * 1.1,
                                          ],
                                          type: "scatter" as const,
                                          mode: "lines" as const,
                                          line: {
                                            width: 2,
                                            color: "rgba(255, 0, 0, 0.5)",
                                            dash: "dash" as const,
                                          },
                                          name: "Current Time",
                                          showlegend: false,
                                        },
                                      ]),
                                ]}
                                layout={((): Partial<Layout> => ({
                                  height: 220,
                                  margin: { t: 25, l: 50, r: 10, b: 40 },
                                  title: {
                                    text: type,
                                    font: {
                                      size: 14,
                                      color: COST_COLOUR[type],
                                    },
                                  },
                                  xaxis: {
                                    range: isRealTimeMode
                                      ? undefined
                                      : isRangeMode
                                      ? [
                                          Math.max(0, startTime - 5),
                                          endTime + 5,
                                        ]
                                      : [0, maxTime * 1.1],
                                  },
                                  yaxis: {},
                                  paper_bgcolor: "white",
                                  plot_bgcolor: "white",
                                  showlegend: false,
                                }))()}
                                config={{
                                  responsive: true,
                                  displayModeBar: false,
                                }}
                                useResizeHandler
                                style={{ width: "100%" }}
                              />
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TimeAwareSimulationVisualizer;
