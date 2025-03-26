"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { styled } from "@mui/material/styles";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress, // Added missing import
} from "@mui/material";
import dynamic from "next/dynamic";

import { debounce } from "lodash";
const Plot = dynamic(
  () =>
    import("react-plotly.js").catch((err) => {
      console.error("Failed to load Plotly:", err);
      const ErrorComponent = () => <div>Failed to load chart component</div>;
      ErrorComponent.displayName = "PlotErrorFallback";
      return ErrorComponent;
    }),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

const COST_TYPE_COLORS: Record<string, string> = {
  "Holding Cost": "#FF9800",
  "Referral Cost": "#2196F3",
  "Deprivation Cost": "#F44336",
  "Replenishment Cost": "#4CAF50",
};

const CostList = styled("div")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  position: "relative",
}));

interface CostItemProps {
  costType: string;
  index: number;
  isMoving: boolean;
}

const CostItem = styled("div", {
  shouldForwardProp: (prop) =>
    prop !== "costType" && prop !== "index" && prop !== "isMoving",
})<CostItemProps>(({ theme, costType, index, isMoving }) => ({
  display: "flex",
  alignItems: "center",
  padding: "8px 12px",
  margin: "1px 0",
  background: "white",
  borderRadius: "6px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
  position: "absolute",
  width: "calc(100% - 24px)",
  left: 0,
  transition: "transform 0.6s cubic-bezier(0.33, 1, 0.68, 1)",
  borderLeft: `2px solid ${COST_TYPE_COLORS[costType] || "#ddd"}`,
  transform: `translateY(${index * 40}px)`,
  "&:hover": {
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  },
  ...(isMoving && {
    zIndex: 2,
    background: `linear-gradient(to right, ${
      COST_TYPE_COLORS[costType] ? `${COST_TYPE_COLORS[costType]}08` : "#e6ffe6"
    }, white)`,
  }),
}));

const CampName = styled(Typography)(({ theme }) => ({
  fontWeight: 500,
  fontSize: "11.5px",
  flex: 1,
  color: theme.palette.primary.dark,
}));

interface CostTypeProps {
  costtype: string;
}

const CostType = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "costtype",
})<CostTypeProps>(({ theme, costtype }) => ({
  color: COST_TYPE_COLORS[costtype] || theme.palette.text.primary,
  marginRight: "12px",
  fontSize: "11px",
  fontWeight: 500,
  opacity: 0.85,
}));

const CostValue = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: "11.5px",
  color: theme.palette.primary.dark,
  minWidth: "100px",
  textAlign: "right",
}));

const SimulationProgress = styled(Paper)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
  padding: "12px",
  borderRadius: "8px",
  color: "white",
  textAlign: "center",
  marginBottom: "20px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
}));

const ProgressText = styled(Typography)(({ theme }) => ({
  fontSize: "1.1em",
  fontWeight: 500,
  letterSpacing: "0.5px",
}));

const LoadingOverlay = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "20px",
  background: "rgba(255, 255, 255, 0.8)",
  borderRadius: "8px",
  margin: "10px 0",
}));

const PlotFallback: React.FC<{ title: string; data: any[] }> = ({
  title,
  data,
}) => {
  return (
    <Paper
      sx={{
        p: 2,
        height: "250px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Typography variant="h6" color={COST_TYPE_COLORS[title] || "primary"}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {data.length > 0
          ? `Latest value: ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(data[data.length - 1].cost)}`
          : "No data available"}
      </Typography>
    </Paper>
  );
};

interface SimulationVisualizerProps {
  onConnectionChange?: (connected: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
}

interface CostItem {
  camp: string;
  costType: string;
  cost: number;
}

interface PlotDataPoint {
  time: number;
  costs: {
    [camp: string]: {
      [costType: string]: number;
    };
  };
}

const SimulationVisualizer: React.FC<SimulationVisualizerProps> = ({
  onConnectionChange,
  onLoadingChange,
}) => {
  const scrollPositionRef = useRef({ x: 0, y: 0 });
  const saveScrollPosition = () => {
    scrollPositionRef.current = {
      x: window.scrollX,
      y: window.scrollY,
    };
  };
  const restoreScrollPosition = () => {
    window.scrollTo(scrollPositionRef.current.x, scrollPositionRef.current.y);
  };
  const [costs, setCosts] = useState<CostItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCosts = localStorage.getItem("costs");
        return savedCosts ? JSON.parse(savedCosts) : [];
      } catch (e) {
        console.error("Error reading costs from localStorage:", e);
        return [];
      }
    }
    return [];
  });

  const [prevRanks, setPrevRanks] = useState<Record<string, number>>({});

  const [timeSeriesData, setTimeSeriesData] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem("timeSeriesData");
        return savedData ? JSON.parse(savedData) : [];
      } catch (e) {
        console.error("Error reading timeSeriesData from localStorage:", e);
        return [];
      }
    }
    return [];
  });

  const [funding, setFunding] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedFunding = localStorage.getItem("funding");
        return savedFunding ? parseFloat(savedFunding) : 0;
      } catch (e) {
        console.error("Error reading funding from localStorage:", e);
        return 0;
      }
    }
    return 0;
  });

  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [plotRevision, setPlotRevision] = useState(0);
  const [plotData, setPlotData] = useState<PlotDataPoint[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("costs", JSON.stringify(costs));
        localStorage.setItem("timeSeriesData", JSON.stringify(timeSeriesData));
        localStorage.setItem("funding", funding.toString());
      } catch (e) {
        console.error("Error saving data to localStorage:", e);
      }
    }
  }, [costs, timeSeriesData, funding]);

  useEffect(() => {
    if (onConnectionChange) {
      onConnectionChange(connected);
    }
  }, [connected, onConnectionChange]);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading);
    }
  }, [isLoading, onLoadingChange]);

  const processWebSocketData = useCallback(
    debounce((data: any) => {
      console.log("Processing WebSocket data:", data);

      saveScrollPosition();

      if (!data || Object.keys(data).length === 0) {
        console.warn("Received empty data packet");
        return;
      }

      try {
        if (data.time !== undefined) {
          setCurrentDay(Math.floor(data.time));
        }
        if (data.planningHorizon !== undefined) {
          setTotalDays(Math.floor(data.planningHorizon));
        }

        const oldRanks: Record<string, number> = {};
        costs.forEach((item, index) => {
          oldRanks[`${item.camp}-${item.costType}`] = index;
        });
        setPrevRanks(oldRanks);

        const newCosts: CostItem[] = [];
        const costTypes = {
          cumulativeHoldingCosts: "Holding Cost",
          cumulativeReferralCosts: "Referral Cost",
          cumulativeDeprivationCosts: "Deprivation Cost",
          cumulativeReplenishmentCosts: "Replenishment Cost",
        };

        Object.entries(costTypes).forEach(([dataKey, costType]) => {
          Object.entries(data[dataKey] || {}).forEach(([camp, cost]) => {
            newCosts.push({
              camp,
              costType,
              cost: cost as number,
            });
          });
        });

        newCosts.sort((a, b) => b.cost - a.cost);
        setCosts(newCosts);

        if (data.fundingReceived !== undefined) {
          setFunding((prev) => prev + data.fundingReceived);
        }

        if (data.time !== undefined) {
          setPlotData((prevData) => {
            const newDataPoint: PlotDataPoint = {
              time: data.time,
              costs: {},
            };

            Object.entries(costTypes).forEach(([dataKey, costType]) => {
              Object.entries(data[dataKey] || {}).forEach(([camp, cost]) => {
                if (!newDataPoint.costs[camp]) {
                  newDataPoint.costs[camp] = {};
                }
                newDataPoint.costs[camp][costType] = cost as number;
              });
            });

            // Keep only last 100 points per camp/cost type
            const updatedData = [...prevData, newDataPoint];
            if (updatedData.length > 100) {
              return updatedData.slice(-100);
            }
            return updatedData;
          });

          setPlotRevision((prev) => prev + 1);
        }
        setTimeout(restoreScrollPosition, 0);
      } catch (e) {
        console.error("Error processing data:", e);
      }
    }, 500),
    [costs]
  );

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RECONNECT_DELAY = 3000;

    const connectWebSocket = () => {
      if (typeof window !== "undefined") {
        try {
          if (ws) {
            ws.close();
          }

          console.log("Attempting to connect to WebSocket...");
          ws = new WebSocket("ws://localhost:8083/ws");

          ws.onopen = () => {
            console.log("Connected to Spring Boot WebSocket");
            setConnected(true);
            setIsLoading(false);
            reconnectAttempts = 0;
          };

          ws.onclose = (event) => {
            console.log(
              `WebSocket closed: ${event.code} - ${
                event.reason || "No reason provided"
              }`
            );
            setConnected(false);

            if (
              event.code !== 1000 &&
              reconnectAttempts < MAX_RECONNECT_ATTEMPTS
            ) {
              reconnectAttempts++;
              console.log(
                `Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`
              );
              reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
            } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              console.log("Max reconnection attempts reached");
            }
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log("Received WebSocket data:", data);
              setIsLoading(false);
              processWebSocketData(data);
            } catch (e) {
              console.error("Error processing WebSocket message:", e);
            }
          };

          ws.onerror = (error) => {
            console.error("WebSocket error:", error);
          };
        } catch (error) {
          console.error("Failed to connect to WebSocket:", error);

          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(
              `Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`
            );
            reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
          }
        }
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close(1000, "Component unmounted");
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [processWebSocketData]);

  const formatCost = (cost: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cost);
  };

  const renderRankings = () => {
    if (isLoading && costs.length === 0) {
      return (
        <LoadingOverlay>
          <CircularProgress size={40} sx={{ marginRight: 2 }} />
          <Typography>Loading data...</Typography>
        </LoadingOverlay>
      );
    }

    const sortedCosts = [...costs].sort((a, b) => b.cost - a.cost);
    const totalHeight = sortedCosts.length * 40;

    return (
      <CostList sx={{ height: `${totalHeight}px` }}>
        {sortedCosts.map((item, index) => {
          const key = `${item.camp}-${item.costType}`;
          const prevRank = prevRanks[key];
          const isMoving = prevRank !== undefined && prevRank !== index;

          return (
            <CostItem
              key={key}
              costType={item.costType}
              index={index}
              isMoving={isMoving}
            >
              <CampName>{item.camp}</CampName>
              <CostType costtype={item.costType}>{item.costType}</CostType>
              <CostValue>{formatCost(item.cost)}</CostValue>
            </CostItem>
          );
        })}
      </CostList>
    );
  };

  const renderPlots = () => {
    if (!connected) {
      return (
        <LoadingOverlay>
          <CircularProgress size={40} sx={{ marginRight: 2 }} />
          <Typography></Typography>
        </LoadingOverlay>
      );
    }

    if (plotData.length === 0) {
      return (
        <LoadingOverlay>
          <CircularProgress size={40} sx={{ marginRight: 2 }} />
          <Typography>
            Connected to server. Waiting for simulation data...
          </Typography>
        </LoadingOverlay>
      );
    }
    if (plotData.length === 0) {
      return (
        <LoadingOverlay>
          <CircularProgress size={40} sx={{ marginRight: 2 }} />
          <Typography>Waiting for time series data...</Typography>
        </LoadingOverlay>
      );
    }

    const camps = Array.from(new Set(costs.map((item) => item.camp)));
    const costTypes = [
      "Holding Cost",
      "Referral Cost",
      "Deprivation Cost",
      "Replenishment Cost",
    ];

    const allCosts = plotData.flatMap((data) =>
      Object.values(data.costs).flatMap((campCosts) =>
        Object.values(campCosts).filter(
          (cost) => typeof cost === "number" && cost > 0
        )
      )
    );

    const globalMax = Math.max(1, ...allCosts);
    const ymax = globalMax * 1.1;

    const timeMin = Math.min(...plotData.map((d) => d.time));
    const timeMax = Math.max(...plotData.map((d) => d.time));

    return (
      <Box>
        {camps.map((camp) => (
          <Paper
            key={camp}
            sx={{
              margin: "0 0 20px 0",
              padding: "15px",
              borderRadius: "10px",
            }}
          >
            <Box sx={{ marginBottom: "20px", textAlign: "center" }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "#333", marginBottom: "20px" }}
              >
                {camp}
              </Typography>
            </Box>

            <Grid container spacing={2}>
              {costTypes.map((costType) => {
                const plotPoints = plotData
                  .filter(
                    (d) =>
                      d.costs[camp] &&
                      typeof d.costs[camp][costType] === "number"
                  )
                  .map((d) => ({
                    time: d.time,
                    cost: d.costs[camp][costType],
                  }))
                  .sort((a, b) => a.time - b.time);

                return (
                  <Grid
                    item
                    xs={12}
                    md={6}
                    key={`${camp}-${costType}-${plotRevision}`}
                  >
                    {typeof window !== "undefined" && Plot ? (
                      <Plot
                        data={[
                          {
                            x: plotPoints.map((d) => d.time),
                            y: plotPoints.map((d) => d.cost),
                            type: "scatter",
                            mode: "lines",
                            line: {
                              color: COST_TYPE_COLORS[costType],
                              width: 2,
                              shape: "linear",
                            },
                            name: costType,
                          },
                        ]}
                        layout={{
                          title: {
                            text: costType,
                            font: {
                              size: 14,
                              color: COST_TYPE_COLORS[costType],
                            },
                          },
                          xaxis: {
                            title: "Time",
                            showgrid: true,
                            gridcolor: "#f0f0f0",
                            tickformat: ".0f",
                            range: [timeMin, timeMax + 5],
                          },
                          yaxis: {
                            title: "Cost",
                            showgrid: true,
                            gridcolor: "#f0f0f0",
                            range: [0, ymax],
                            tickformat: ".2s",
                          },
                          paper_bgcolor: "white",
                          plot_bgcolor: "white",
                          height: 250,
                          margin: { t: 30, l: 60, r: 30, b: 40 },
                          showlegend: false,
                          hovermode: "closest",
                          uirevision: "static",
                        }}
                        config={{
                          responsive: true,
                          displayModeBar: false,
                          staticPlot: false,
                        }}
                        useResizeHandler={true}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <PlotFallback title={costType} data={plotPoints} />
                    )}
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <SimulationProgress>
        <ProgressText>
          Simulation Day: {Math.floor(currentDay)} / {Math.floor(totalDays)}
        </ProgressText>
      </SimulationProgress>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4} lg={3}>
          <Paper sx={{ padding: 2, borderRadius: "10px" }}>
            <Typography variant="h6" sx={{ marginBottom: 2 }}>
              Cost Rankings
            </Typography>
            {renderRankings()}
          </Paper>
        </Grid>

        <Grid item xs={12} md={8} lg={9}>
          <Paper sx={{ padding: 2, borderRadius: "10px" }}>
            <Typography variant="h6" sx={{ marginBottom: 2 }}>
              Cost Visualization
            </Typography>
            {renderPlots()}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SimulationVisualizer;
