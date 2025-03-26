// components/ReplenishmentCostChart.tsx

"use client";

import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Box, useTheme } from "@mui/material";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface ChartDataProps {
  data: Record<string, number>;
}

const ReplenishmentCostChart: React.FC<ChartDataProps> = ({ data }) => {
  const theme = useTheme();

  const chartData = {
    labels: Object.keys(data),
    datasets: [
      {
        label: "Replenishment Cost",
        data: Object.values(data),
        borderColor: theme.palette.primary.main,
        backgroundColor: theme.palette.primary.light,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Replenishment Cost Over Time",
        font: {
          size: 18,
        },
        color: theme.palette.text.primary,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Time",
          color: theme.palette.text.secondary,
          font: {
            size: 14,
          },
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
      y: {
        title: {
          display: true,
          text: "Cost",
          color: theme.palette.text.secondary,
          font: {
            size: 14,
          },
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
    },
  };

  return (
    <Box sx={{ marginTop: 4 }}>
      <Line data={chartData} options={options} />
    </Box>
  );
};

export default ReplenishmentCostChart;
