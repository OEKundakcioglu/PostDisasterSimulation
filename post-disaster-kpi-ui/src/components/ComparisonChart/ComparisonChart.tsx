// components/ComparisonChart.tsx

"use client";

import React from "react";
import { Bar } from "react-chartjs-2";
import { CampKPI } from "../../types/kpiTypes";
import { useTheme } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface ComparisonChartProps {
  data: Record<string, CampKPI>;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data }) => {
  const theme = useTheme();
  const campNames = Object.keys(data);

  const chartData = {
    labels: campNames,
    datasets: [
      {
        label: "Replenishment Cost",
        data: campNames.map((camp) => data[camp].replenishmentCost?.total || 0),
        backgroundColor: theme.palette.primary.main,
      },
      {
        label: "Deprivation Cost",
        data: campNames.map((camp) => data[camp].deprivationCost?.total || 0),
        backgroundColor: theme.palette.secondary.main,
      },
      {
        label: "Deprived Population",
        data: campNames.map((camp) => data[camp].deprivedPopulation || 0),
        backgroundColor: theme.palette.warning.main,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: theme.palette.text.primary,
        },
      },
      title: {
        display: true,
        text: "Camp KPI Comparison",
        color: theme.palette.text.primary,
        font: {
          size: 18,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: theme.palette.text.secondary },
        title: {
          display: true,
          text: "Camp",
          color: theme.palette.text.secondary,
        },
      },
      y: {
        ticks: {
          color: theme.palette.text.secondary,
          callback: function (tickValue: string | number) {
            const value =
              typeof tickValue === "string" ? parseFloat(tickValue) : tickValue;
            return value.toLocaleString();
          },
        },
        title: {
          display: true,
          text: "Cost / Population",
          color: theme.palette.text.secondary,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default ComparisonChart;
