import React, { useState } from "react";
import { Box, Typography, Paper, Grid, TextField } from "@mui/material";
import dynamic from "next/dynamic";
import type Plotly from "plotly.js";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface CostIntersectionChartProps {
  deprivationCoefficient?: number;
  deprivationRate?: number;
  referralCost?: number;
}

const CostIntersectionChart: React.FC<CostIntersectionChartProps> = ({
  deprivationCoefficient = 10,
  deprivationRate = 0.1,
  referralCost = 5,
}) => {
  const [coeff, setCoeff] = useState(deprivationCoefficient);
  const [rate, setRate] = useState(deprivationRate);
  const [refCost, setRefCost] = useState(referralCost);
  const [population, setPopulation] = useState(100);

  // Calculate cost curves
  const timePoints = Array.from({ length: 101 }, (_, i) => i * 0.5); // 0 to 50 days

  const deprivationCosts = timePoints.map((t) => {
    // Linear + Exponential form: coeff*rate*t + coeff*(e^(rate*t) - 1)
    const linearTerm = coeff * rate * t;
    const exponentialTerm = coeff * (Math.exp(rate * t) - 1);
    return (linearTerm + exponentialTerm) * population;
  });

  const referralCosts = timePoints.map((t) => refCost * population * t);

  // Find intersection point (approximate)
  let intersectionTime = null;
  let intersectionCost = null;
  for (let i = 1; i < timePoints.length; i++) {
    if (
      deprivationCosts[i] >= referralCosts[i] &&
      deprivationCosts[i - 1] < referralCosts[i - 1]
    ) {
      // Linear interpolation for more accurate intersection
      const t1 = timePoints[i - 1];
      const t2 = timePoints[i];
      const d1 = deprivationCosts[i - 1];
      const d2 = deprivationCosts[i];
      const r1 = referralCosts[i - 1];
      const r2 = referralCosts[i];

      // Find exact intersection using linear interpolation
      const slope_d = (d2 - d1) / (t2 - t1);
      const slope_r = (r2 - r1) / (t2 - t1);
      const intercept_d = d1 - slope_d * t1;
      const intercept_r = r1 - slope_r * t1;

      intersectionTime = (intercept_r - intercept_d) / (slope_d - slope_r);
      intersectionCost = slope_d * intersectionTime + intercept_d;
      break;
    }
  }

  const traces: Plotly.Data[] = [
    {
      x: timePoints,
      y: deprivationCosts,
      type: "scatter",
      mode: "lines",
      name: "Deprivation Cost",
      line: { color: "#ef5350", width: 3 },
      hovertemplate: "Time: %{x:.1f} days<br>Cost: $%{y:.2f}<extra></extra>",
    },
    {
      x: timePoints,
      y: referralCosts,
      type: "scatter",
      mode: "lines",
      name: "Referral Cost",
      line: { color: "#42a5f5", width: 3 },
      hovertemplate: "Time: %{x:.1f} days<br>Cost: $%{y:.2f}<extra></extra>",
    },
  ];

  // Add intersection point marker
  if (intersectionTime !== null && intersectionCost !== null) {
    traces.push({
      x: [intersectionTime],
      y: [intersectionCost],
      type: "scatter",
      mode: "markers",
      name: "Intersection Point",
      marker: { size: 12, color: "#ff9800", symbol: "diamond" },
      hovertemplate: `Intersection<br>Time: ${intersectionTime.toFixed(
        2
      )} days<br>Cost: $${intersectionCost.toFixed(2)}<extra></extra>`,
    } as Plotly.Data);
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        Cost Intersection Analysis
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Visualizes where Deprivation Cost (exponential) intersects with Referral
        Cost (linear)
      </Typography>

      {/* Parameter Controls */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Deprivation Coefficient"
            type="number"
            size="small"
            value={coeff}
            onChange={(e) => setCoeff(parseFloat(e.target.value) || 0)}
            inputProps={{ step: 1, min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Deprivation Rate"
            type="number"
            size="small"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value) || 0)}
            inputProps={{ step: 0.01, min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Referral Cost (per person-day)"
            type="number"
            size="small"
            value={refCost}
            onChange={(e) => setRefCost(parseFloat(e.target.value) || 0)}
            inputProps={{ step: 1, min: 0 }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Population"
            type="number"
            size="small"
            value={population}
            onChange={(e) => setPopulation(parseInt(e.target.value) || 0)}
            inputProps={{ step: 10, min: 1 }}
          />
        </Grid>
      </Grid>

      {/* Intersection Info */}
      {intersectionTime !== null && intersectionCost !== null && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            bgcolor: "#fff3e0",
            borderRadius: 2,
            border: "2px solid #ff9800",
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" color="#e65100">
            Intersection Point Detected
          </Typography>
          <Typography variant="body2">
            At <strong>{intersectionTime.toFixed(2)} days</strong>, both costs
            equal <strong>${intersectionCost.toFixed(2)}</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Before this point, deprivation is cheaper. After this point,
            referral is cheaper.
          </Typography>
        </Box>
      )}

      {/* Plotly Chart */}
      <Box sx={{ width: "100%", height: 500 }}>
        <Plot
          data={traces}
          layout={{
            title: {
              text: "Cost Comparison Over Time",
            },
            xaxis: {
              title: { text: "Time (days)" },
              showgrid: true,
              gridcolor: "#e0e0e0",
            },
            yaxis: {
              title: { text: "Cost ($)" },
              showgrid: true,
              gridcolor: "#e0e0e0",
            },
            hovermode: "closest",
            showlegend: true,
            legend: {
              x: 0.02,
              y: 0.98,
              bgcolor: "rgba(255,255,255,0.9)",
              bordercolor: "#e0e0e0",
              borderwidth: 1,
            },
            margin: { l: 60, r: 30, t: 50, b: 50 },
            autosize: true,
          }}
          config={{
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
          }}
          style={{ width: "100%", height: "100%" }}
        />
      </Box>

      {/* Formula Display */}
      <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
        <Typography variant="caption" fontWeight="bold" display="block">
          Deprivation Cost Formula (Linear + Exponential):
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
          Cost = (coeff × rate × t + coeff × (e^(rate × t) - 1)) × population
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontFamily: "monospace", display: "block", mt: 0.5 }}
        >
          = ({coeff} × {rate} × t + {coeff} × (e^({rate} × t) - 1)) ×{" "}
          {population}
        </Typography>
        <Typography
          variant="caption"
          fontWeight="bold"
          display="block"
          sx={{ mt: 1 }}
        >
          Referral Cost Formula (Linear):
        </Typography>
        <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
          Cost = referralCost × population × t = {refCost} × {population} × t
        </Typography>
      </Box>
    </Paper>
  );
};

export default CostIntersectionChart;
