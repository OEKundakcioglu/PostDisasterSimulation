"use client";

import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register the necessary Chart.js components
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Define the structure of Camp KPI data
interface CampKPI {
  deprivationCost: {
    total: number;
  };
  // Add other KPI properties if necessary
}

// Define the structure for the ChartData prop
interface ChartData {
  data: Record<string, CampKPI>; // Record of camp names and their respective KPI data
}

export const DeprivationCostChart = ({ data }: ChartData) => {
  const chartData = {
    labels: Object.keys(data),
    datasets: [
      {
        label: "Deprivation Cost",
        data: Object.values(data).map(
          (camp) => camp.deprivationCost.total || 0
        ),
        backgroundColor: "rgba(255,99,132,0.2)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      x: { title: { display: true, text: "Camp" } },
      y: { title: { display: true, text: "Deprivation Cost" } },
    },
  };

  return <Bar data={chartData} options={options} />;
};
