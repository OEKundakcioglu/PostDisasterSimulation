/* /components/SimulationVisualizer/SimulationVisualizer.tsx */
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  alpha,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import dynamic from "next/dynamic";
import { debounce } from "lodash";

/* -------- Plotly (client‑only) ------------------------------------- */
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  ),
});

/* -------- colours & order ----------------------------------------- */
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
interface IncomingPacket {
  time?: number;
  planningHorizon?: number;
  cumulativeHoldingCosts?: Record<string, number>;
  cumulativeReferralCosts?: Record<string, number>;
  cumulativeDeprivationCosts?: Record<string, number>;
  cumulativeReplenishmentCosts?: Record<string, number>;
}
interface Point {
  t: number;
  cost: number;
}
interface CostEntry {
  camp: string;
  type: string;
  cost: number;
}

/* =================================================================== */
const SimulationVisualizer: React.FC = () => {
  const wsRef = useRef<WebSocket | null>(null);

  const [ready, setReady] = useState(false);
  const [day, setDay] = useState<number | null>(null);
  const [horizon, setHorizon] = useState<number | null>(null);

  const [ranking, setRanking] = useState<CostEntry[]>([]);
  const [ts, setTs] = useState<Record<string, Record<string, Point[]>>>({}); // camp → type → series

  /* -------- websocket --------------------------------------------- */
  useEffect(() => {
    const connect = () => {
      wsRef.current = new WebSocket("ws://localhost:8083/ws");
      wsRef.current.onopen = () => setReady(true);
      wsRef.current.onmessage = (evt) => {
        try {
          const pkt: IncomingPacket = JSON.parse(evt.data);
          onPacket(pkt);
        } catch (e) {
          console.warn("WS parse error", e);
        }
      };
      wsRef.current.onclose = () => {
        setReady(false);
        setTimeout(connect, 3000);
      };
    };
    connect();
    return () => wsRef.current?.close(1000, "unmount");
  }, []);

  /* -------- packet handler (debounced) ---------------------------- */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onPacket = useCallback(
    debounce((pkt: IncomingPacket) => {
      if (pkt.time !== undefined) setDay(pkt.time);
      if (pkt.planningHorizon !== undefined) setHorizon(pkt.planningHorizon);

      const make = (obj: Record<string, number> | undefined, label: string) =>
        obj
          ? Object.entries(obj).map<CostEntry>(([camp, cost]) => ({
              camp,
              type: label,
              cost,
            }))
          : [];

      const entries: CostEntry[] = [
        ...make(pkt.cumulativeReplenishmentCosts, "Replenishment Cost"),
        ...make(pkt.cumulativeDeprivationCosts, "Deprivation Cost"),
        ...make(pkt.cumulativeHoldingCosts, "Holding Cost"),
        ...make(pkt.cumulativeReferralCosts, "Referral Cost"),
      ];

      // ranking
      setRanking(
        entries.sort((a, b) => b.cost - a.cost || a.camp.localeCompare(b.camp))
      );

      // timeseries
      if (pkt.time !== undefined) {
        setTs((prev) => {
          const next = { ...prev };
          entries.forEach(({ camp, type, cost }) => {
            if (!next[camp]) next[camp] = {};
            if (!next[camp][type]) next[camp][type] = [];
            next[camp][type].push({ t: pkt.time!, cost });
            if (next[camp][type].length > 100) next[camp][type].shift();
          });
          return next;
        });
      }
    }, 250),
    []
  );

  /* -------- derived ---------------------------------------------- */
  const topCamps = useMemo(
    () => Array.from(new Set(ranking.map((e) => e.camp))).slice(0, 4),
    [ranking]
  );

  const headline =
    day === null || horizon === null
      ? "Awaiting data …"
      : `Day ${Math.floor(day)} of ${Math.floor(horizon)}`;

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
                                layout={{
                                  height: 220,
                                  margin: { t: 25, l: 50, r: 10, b: 40 },
                                  title: {
                                    text: type,
                                    font: {
                                      size: 14,
                                      color: COST_COLOUR[type],
                                    },
                                  },
                                  xaxis: { title: "Day" },
                                  yaxis: { title: "Cost" },
                                  paper_bgcolor: "white",
                                  plot_bgcolor: "white",
                                  showlegend: false,
                                }}
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
