/* /components/SimulationVisualizer/SimulationVisualizer.tsx */
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
/* order for 2 × 2 grid */
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

interface SimulationVisualizerProps {
  logs?: TimeStepLog[];
}

/* =================================================================== */
const SimulationVisualizer: React.FC<SimulationVisualizerProps> = ({
  logs,
}) => {
  // remove internal websocket if logs prop provided
  const externalMode = !!logs;
  const [ranking, setRanking] = useState<CostEntry[]>([]);
  const [ts, setTs] = useState<Record<string, Record<string, Point[]>>>({});
  const [day, setDay] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<number | null>(null);
  const ready = true;
  const lastIngestedRef = useRef(0); // track how many logs already processed

  const ingest = useCallback((batch: TimeStepLog[]) => {
    if (!batch || !batch.length) return;
    batch.forEach((pkt) => {
      setDay(pkt.time);
      setHorizon(pkt.planningHorizon);
      const entries: CostEntry[] = [
        ...Object.entries(pkt.cumulativeReplenishmentCosts || {}).map(
          ([camp, cost]) => ({ camp, type: "Replenishment Cost", cost })
        ),
        ...Object.entries(pkt.cumulativeDeprivationCosts || {}).map(
          ([camp, cost]) => ({ camp, type: "Deprivation Cost", cost })
        ),
        ...Object.entries(pkt.cumulativeHoldingCosts || {}).map(
          ([camp, cost]) => ({ camp, type: "Holding Cost", cost })
        ),
        ...Object.entries(pkt.cumulativeReferralCosts || {}).map(
          ([camp, cost]) => ({ camp, type: "Referral Cost", cost })
        ),
      ];
      setRanking((r) =>
        entries.length
          ? entries.sort(
              (a, b) => b.cost - a.cost || a.camp.localeCompare(b.camp)
            )
          : r
      );
      setTs((prev) => {
        const next = { ...prev };
        entries.forEach(({ camp, type, cost }) => {
          if (!next[camp]) next[camp] = {};
          if (!next[camp][type]) next[camp][type] = [];
          const series = next[camp][type];
          const t = pkt.time;
          const last = series[series.length - 1];
          if (!last || t > last.t) {
            // fill visual gaps with synthetic points every DISPLAY_STEP
            if (last && t - last.t > DISPLAY_STEP) {
              const gap = t - last.t;
              const steps = Math.floor(gap / DISPLAY_STEP) - 0; // number of full steps before final t
              for (let s = 1; s < steps; s++) {
                const interT = last.t + s * DISPLAY_STEP;
                if (interT >= t) break;
                // linear interpolation (costs are cumulative so linear approx is OK visually)
                const interCost =
                  last.cost +
                  ((cost - last.cost) * (interT - last.t)) / (t - last.t);
                series.push({ t: interT, cost: interCost });
              }
            }
            series.push({ t, cost });
          } else if (t === last.t) {
            series[series.length - 1] = { t, cost };
          } else {
            // out-of-order: insert sorted (no interpolation)
            let i = series.length - 1;
            while (i >= 0 && series[i].t > t) i--;
            if (i >= 0 && series[i].t === t) series[i].cost = cost;
            else series.splice(i + 1, 0, { t, cost });
          }
          if (series.length > 500) series.splice(0, series.length - 500);
        });
        return next;
      });
    });
  }, []);

  useEffect(() => {
    if (externalMode && logs) {
      const start = lastIngestedRef.current;
      if (logs.length > start) {
        ingest(logs.slice(start));
        lastIngestedRef.current = logs.length;
      }
    }
  }, [logs, externalMode, ingest]);

  const topCamps = useMemo(
    () => Array.from(new Set(ranking.map((e) => e.camp))).slice(0, 4),
    [ranking]
  );

  const headline =
    day === null || horizon === null
      ? "Awaiting data …"
      : (() => {
          const d = Math.floor(day);
          const h = Math.floor(horizon);
          const snapped = h - d < DISPLAY_STEP ? h : d; // snap if within one step of horizon
          return `Day\u00A0${snapped}\u00A0of\u00A0${h}`;
        })();

  /* -------- render ------------------------------------------------ */
  return (
    <Box>
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
      </Paper>

      {!ready && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Connecting …</Typography>
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
                    Waiting for simulation …
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
                        return (
                          <Grid item xs={12} md={6} key={type}>
                            {series.length === 0 ? (
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
                                    x: series.map((p) => p.t),
                                    y: series.map((p) => p.cost),
                                    type: "scatter",
                                    mode: "lines",
                                    line: {
                                      width: 2,
                                      color: COST_COLOUR[type],
                                    },
                                    name: type,
                                  },
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
                                  xaxis: { title: { text: "Day" } },
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

export default SimulationVisualizer;
