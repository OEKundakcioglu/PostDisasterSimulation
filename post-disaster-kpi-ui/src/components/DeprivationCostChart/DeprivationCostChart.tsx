// components/DeprivationCostChart.tsx

"use client";

import React from "react";
import { Bar } from "react-chartjs-2";
import { CampKPI } from "../../types/kpiTypes";
import { useTheme } from "@mui/material/styles"; // Import from @mui/material/styles
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface DeprivationCostChartProps {
  data: Record<string, CampKPI>;
}

const DeprivationCostChart: React.FC<DeprivationCostChartProps> = ({
  data,
}) => {
  const theme = useTheme();
  const campNames = Object.keys(data);

  const chartData = {
    labels: campNames,
    datasets: [
      {
        label: "Deprivation Cost",
        data: campNames.map((camp) => data[camp].deprivationCost.total || 0),
        backgroundColor: theme.palette.customColors.deprivationCost, // Use the custom color
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Deprivation Cost by Camp",
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
            return formatCurrency(value);
          },
        },
        title: {
          display: true,
          text: "Cost",
          color: theme.palette.text.secondary,
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

// Utility function to format currency values
const formatCurrency = (value: number): string => {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
};

export default DeprivationCostChart;
