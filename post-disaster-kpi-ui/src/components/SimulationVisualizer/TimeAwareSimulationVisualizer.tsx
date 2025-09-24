/* /components/SimulationVisualizer/TimeAwareSimulationVisualizer.tsx */
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Box, Paper, Typography, Grid, CircularProgress } from "@mui/material";
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
const DISPLAY_STEP = 10; // desired visual increment
const COST_COLOUR: Record<string, string> = {
  "Replenishment Cost": "#4CAF50",
  "Deprivation Cost": "#F44336",
  "Holding Cost": "#FF9800",
  "Referral Cost": "#2196F3",
};
/* order for 2 × 2 grid */
const PLOT_ORDER = [
  "Replenishment Cost",
  "Deprivation Cost",
  "Holding Cost",
  "Referral Cost",
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
}

interface TimeAwareSimulationVisualizerProps {
  logs?: TimeStepLog[];
}

/* =================================================================== */
const TimeAwareSimulationVisualizer: React.FC<
  TimeAwareSimulationVisualizerProps
> = ({ logs }) => {
  // remove internal websocket if logs prop provided
  const externalMode = !!logs;
  const [allLogs, setAllLogs] = useState<TimeStepLog[]>([]);
  const [ranking, setRanking] = useState<CostEntry[]>([]);
  const [ts, setTs] = useState<Record<string, Record<string, Point[]>>>({});
  const [day, setDay] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<number | null>(null);
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
    setDay(latestLog.time);
    setHorizon(latestLog.planningHorizon);

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
        type: "Replenishment Cost",
        cost,
      })),
      ...Object.entries(cumulativeData.deprivation).map(([camp, cost]) => ({
        camp,
        type: "Deprivation Cost",
        cost,
      })),
      ...Object.entries(cumulativeData.holding).map(([camp, cost]) => ({
        camp,
        type: "Holding Cost",
        cost,
      })),
      ...Object.entries(cumulativeData.referral).map(([camp, cost]) => ({
        camp,
        type: "Referral Cost",
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
            ([camp, cost]) => ({ camp, type: "Replenishment Cost", cost })
          ),
          ...Object.entries(log.cumulativeDeprivationCosts || {}).map(
            ([camp, cost]) => ({ camp, type: "Deprivation Cost", cost })
          ),
          ...Object.entries(log.cumulativeHoldingCosts || {}).map(
            ([camp, cost]) => ({ camp, type: "Holding Cost", cost })
          ),
          ...Object.entries(log.cumulativeReferralCosts || {}).map(
            ([camp, cost]) => ({ camp, type: "Referral Cost", cost })
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
          let previousValue = 0;

          sortedTimes.forEach((time) => {
            const cumulativeValue = timeData[time];
            const incrementalValue = cumulativeValue - previousValue;

            // Prevent negative incremental costs which can occur due to data inconsistencies
            // or expired items being removed from inventory without proper cost accounting
            const safeIncrementalValue = Math.max(0, incrementalValue);

            next[camp][type].push({ t: time, cost: safeIncrementalValue });
            previousValue = cumulativeValue;
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

  const handleSpeedChange = useCallback(
    (speed: number) => {
      setPlaybackSpeed(speed);
      if (isPlaying) {
        handlePause();
        setTimeout(() => handlePlay(), 100);
      }
    },
    [isPlaying, handlePause, handlePlay]
  );

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
    if (isPlaying && playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
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

  const headline = useMemo(() => {
    if (isRealTimeMode) {
      return day === null || horizon === null
        ? "Awaiting data …"
        : (() => {
            const d = Math.floor(day);
            const h = Math.floor(horizon);
            const snapped = h - d < DISPLAY_STEP ? h : d; // snap if within one step of horizon
            return `Day\u00A0${snapped}\u00A0of\u00A0${h}`;
          })();
    } else if (isRangeMode) {
      return horizon === null
        ? "Awaiting data …"
        : `Day\u00A0${Math.floor(startTime)}\u00A0to\u00A0${Math.floor(
            endTime
          )}\u00A0of\u00A0${Math.floor(horizon)}`;
    } else {
      const displayTime = currentTime;
      return displayTime === null || horizon === null
        ? "Awaiting data …"
        : (() => {
            const d = Math.floor(displayTime);
            const h = Math.floor(horizon);
            const snapped = h - d < DISPLAY_STEP ? h : d; // snap if within one step of horizon
            return `Day\u00A0${snapped}\u00A0of\u00A0${h}`;
          })();
    }
  }, [
    day,
    horizon,
    currentTime,
    startTime,
    endTime,
    isRealTimeMode,
    isRangeMode,
  ]);

  /* -------- render ------------------------------------------------ */
  return (
    <Box>
      {/* Time Slider Control */}
      <TimeSliderControl
        currentTime={currentTime}
        maxTime={maxTime}
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
      />

      {/* banner */}
      <Paper
        sx={{
          mb: 3,
          p: 2,
          color: "primary.contrastText",
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.primary.dark} 0%, ${t.palette.primary.main} 100%)`,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {headline}
        </Typography>
        {!isRealTimeMode && (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {isRangeMode
              ? `Viewing range: Day ${Math.floor(
                  startTime
                )} to Day ${Math.floor(endTime)}`
              : `Viewing snapshot up to Day ${Math.floor(currentTime)}`}
          </Typography>
        )}
      </Paper>

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
            <Paper sx={{ p: 2, height: "100%" }}>
              <RankBox>
                {ranking.map(({ camp, type, cost }, idx) => (
                  <RankItem key={`${camp}-${type}`} $colour={COST_COLOUR[type]}>
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
                        // Filter series based on mode
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
                                  {
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
                                  // Add indicators for time boundaries in snapshot mode
                                  ...(isRealTimeMode
                                    ? []
                                    : isRangeMode
                                    ? [
                                        // Start time line
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
                                        // End time line
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
                                        // Current time line for single point mode
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
                                    title: { text: "Day" },
                                    range: isRealTimeMode
                                      ? undefined
                                      : isRangeMode
                                      ? [
                                          Math.max(0, startTime - 5),
                                          endTime + 5,
                                        ]
                                      : [0, maxTime * 1.1],
                                  },
                                  yaxis: { title: { text: "Cost" } },
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
