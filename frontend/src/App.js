import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import Plot from "react-plotly.js";
import YamlUpload from "./components/YamlUpload";

const Container = styled.div`
  max-width: 1800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: white;
  margin: 0;
  font-size: 2.5em;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
`;

const CostList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
`;

const COST_TYPE_COLORS = {
  "Holding Cost": "#FF9800",
  "Referral Cost": "#2196F3",
  "Deprivation Cost": "#F44336",
  "Replenishment Cost": "#4CAF50",
};

const CostItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 1px 0;
  background: white;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  position: absolute;
  width: calc(100% - 24px);
  left: 0;
  transition: transform 0.6s cubic-bezier(0.33, 1, 0.68, 1);
  border-left: 2px solid
    ${(props) => COST_TYPE_COLORS[props.costType] || "#ddd"};
  transform: translateY(${(props) => props.index * 40}px);

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &.moving {
    z-index: 2;
    background: linear-gradient(
      to right,
      ${(props) =>
        props.costType ? `${COST_TYPE_COLORS[props.costType]}08` : "#e6ffe6"},
      white
    );
  }
`;

const CampName = styled.span`
  font-weight: 500;
  font-size: 11.5px;
  flex: 1;
  color: #1a237e;
`;

const CostType = styled.span`
  color: ${(props) => COST_TYPE_COLORS[props.costType]};
  margin-right: 12px;
  font-size: 11px;
  font-weight: 500;
  opacity: 0.85;
`;

const CostValue = styled.span`
  font-weight: 600;
  font-size: 11.5px;
  color: #1a237e;
  min-width: 100px;
  text-align: right;
`;

const PlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  margin: 10px 0;
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1a237e;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

const CAMP_COLORS = {
  "Camp A": "#1f77b4", // blue
  "Camp B": "#ff7f0e", // orange
  "Camp C": "#2ca02c", // green
  "Camp D": "#d62728", // red
  "Camp E": "#9467bd", // purple
  "Camp F": "#8c564b", // brown
  "Camp G": "#e377c2", // pink
  "Camp H": "#7f7f7f", // gray
  "Camp I": "#bcbd22", // olive
  "Camp J": "#17becf", // cyan
};

const CampSection = styled.div`
  margin: 0 0 20px 0;
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const CampHeader = styled.div`
  margin-bottom: 20px;
  text-align: center;
`;

const CampTitle = styled.div`
  font-size: 1.5em;
  font-weight: bold;
  color: #333;
  margin-bottom: 20px;
`;

const CostPlotsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
`;

const SimulationProgress = styled.div`
  background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
  padding: 12px;
  border-radius: 8px;
  color: white;
  text-align: center;
  margin: -10px 0 20px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const ProgressText = styled.div`
  font-size: 1.1em;
  font-weight: 500;
  letter-spacing: 0.5px;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
  margin-top: 20px;
`;

const RankingsSection = styled.div`
  background: white;
  padding: 16px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: fit-content;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
`;

const PlotsSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
  max-height: calc(100vh - 200px);
`;

const calculateGlobalRanges = (timeSeriesData, costTypes) => {
  const ranges = {};

  // Initialize ranges for each cost type
  costTypes.forEach((costType) => {
    ranges[costType] = {
      min: Infinity,
      max: -Infinity,
    };
  });

  if (timeSeriesData.length > 0) {
    timeSeriesData.forEach((data) => {
      Object.entries(data.costs).forEach(([camp, costs]) => {
        costTypes.forEach((costType) => {
          const cost = costs[costType] || 0;
          if (cost > 0) {
            // Only consider positive values
            ranges[costType].min = Math.min(ranges[costType].min, cost);
            ranges[costType].max = Math.max(ranges[costType].max, cost);
          }
        });
      });
    });
  }

  // Set default values if no valid data found
  costTypes.forEach((costType) => {
    if (ranges[costType].min === Infinity) {
      ranges[costType].min = 0;
    }
    if (ranges[costType].max === -Infinity) {
      ranges[costType].max = 1;
    }
  });

  return ranges;
};

function App() {
  const [costs, setCosts] = useState(() => {
    const savedCosts = localStorage.getItem("costs");
    return savedCosts ? JSON.parse(savedCosts) : [];
  });
  const [prevRanks, setPrevRanks] = useState({});
  const [timeSeriesData, setTimeSeriesData] = useState(() => {
    const savedData = localStorage.getItem("timeSeriesData");
    return savedData ? JSON.parse(savedData) : [];
  });
  const [funding, setFunding] = useState(() => {
    const savedFunding = localStorage.getItem("funding");
    return savedFunding ? parseFloat(savedFunding) : 0;
  });
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [plotRevision, setPlotRevision] = useState(0);
  const [plotData, setPlotData] = useState([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [totalDays, setTotalDays] = useState(0);

  useEffect(() => {
    localStorage.setItem("costs", JSON.stringify(costs));
    localStorage.setItem("timeSeriesData", JSON.stringify(timeSeriesData));
    localStorage.setItem("funding", funding.toString());
  }, [costs, timeSeriesData, funding]);

  useEffect(() => {
    let ws;
    let reconnectTimeout;

    const connectWebSocket = () => {
      ws = new WebSocket("ws://localhost:8083/ws");

      ws.onopen = () => {
        console.log("Connected to Spring Boot WebSocket");
        setConnected(true);
        setIsLoading(false);
      };

      ws.onclose = () => {
        console.log("Disconnected from WebSocket");
        setConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received data:", data);
          setIsLoading(false);

          // Update current day and total days from simulation data
          if (data.time !== undefined) {
            setCurrentDay(Math.floor(data.time));
          }
          if (data.planningHorizon !== undefined) {
            setTotalDays(Math.floor(data.planningHorizon));
          }

          // Store previous ranks before updating (for rankings tab)
          const oldRanks = {};
          costs.forEach((item, index) => {
            oldRanks[`${item.camp}-${item.costType}`] = index;
          });
          setPrevRanks(oldRanks);

          // Process costs for rankings
          const newCosts = [];
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
                cost,
              });
            });
          });

          // Sort costs by value for rankings
          newCosts.sort((a, b) => b.cost - a.cost);
          setCosts(newCosts);

          // Update funding
          if (data.fundingReceived !== undefined) {
            setFunding((prev) => prev + data.fundingReceived);
          }

          // Update plot data
          if (data.time !== undefined) {
            setPlotData((prevData) => {
              const newDataPoint = {
                time: data.time,
                costs: {},
              };

              Object.entries(costTypes).forEach(([dataKey, costType]) => {
                Object.entries(data[dataKey] || {}).forEach(([camp, cost]) => {
                  if (!newDataPoint.costs[camp]) {
                    newDataPoint.costs[camp] = {};
                  }
                  newDataPoint.costs[camp][costType] = cost;
                });
              });

              // Keep only last 100 points per camp/cost type
              const updatedData = [...prevData, newDataPoint];
              if (updatedData.length > 100) {
                return updatedData.slice(-100);
              }
              return updatedData;
            });

            // Increment plot revision to force update
            setPlotRevision((prev) => prev + 1);
          }
        } catch (e) {
          console.error("Error processing message:", e);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const formatCost = (cost) => {
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
          <LoadingSpinner />
          <span>Loading data...</span>
        </LoadingOverlay>
      );
    }

    const sortedCosts = [...costs].sort((a, b) => b.cost - a.cost);

    // Calculate the total height needed for the list
    const totalHeight = sortedCosts.length * 40; // Updated to match new item height

    return (
      <CostList style={{ height: totalHeight + "px" }}>
        {sortedCosts.map((item, index) => {
          const key = `${item.camp}-${item.costType}`;
          const prevRank = prevRanks[key];
          const isMoving = prevRank !== undefined && prevRank !== index;

          return (
            <CostItem
              key={key}
              costType={item.costType}
              className={isMoving ? "moving" : ""}
              index={index}
            >
              <CampName>{item.camp}</CampName>
              <CostType costType={item.costType}>{item.costType}</CostType>
              <CostValue>{formatCost(item.cost)}</CostValue>
            </CostItem>
          );
        })}
      </CostList>
    );
  };

  const renderPlots = () => {
    if (plotData.length === 0) {
      return (
        <LoadingOverlay>
          <LoadingSpinner />
          <span>Waiting for time series data...</span>
        </LoadingOverlay>
      );
    }

    const camps = [...new Set(costs.map((item) => item.camp))];
    const costTypes = [
      "Holding Cost",
      "Referral Cost",
      "Deprivation Cost",
      "Replenishment Cost",
    ];

    // Find global max across all cost types and camps
    const allCosts = plotData.flatMap((data) =>
      Object.values(data.costs).flatMap((campCosts) =>
        Object.values(campCosts).filter(
          (cost) => typeof cost === "number" && cost > 0
        )
      )
    );

    const globalMax = Math.max(1, ...allCosts);
    const ymax = globalMax * 1.1; // Add 10% padding

    // Get the full time range
    const timeMin = Math.min(...plotData.map((d) => d.time));
    const timeMax = Math.max(...plotData.map((d) => d.time));

    return (
      <div>
        <YamlUpload />
        {camps.map((camp) => (
          <CampSection key={camp}>
            <CampHeader>
              <CampTitle>{camp}</CampTitle>
            </CampHeader>

            <CostPlotsGrid>
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
                  <Plot
                    key={`${camp}-${costType}-${plotRevision}`}
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
                );
              })}
            </CostPlotsGrid>
          </CampSection>
        ))}
      </div>
    );
  };

  return (
    <Container>
      <Header>
        <Title>Refugee Camp Cost Visualization</Title>
      </Header>

      <SimulationProgress>
        <ProgressText>
          Simulation Day: {Math.floor(currentDay)} / {Math.floor(totalDays)}
        </ProgressText>
      </SimulationProgress>

      <MainGrid>
        <RankingsSection>{renderRankings()}</RankingsSection>
        <PlotsSection>{renderPlots()}</PlotsSection>
      </MainGrid>
    </Container>
  );
}

export default App;
