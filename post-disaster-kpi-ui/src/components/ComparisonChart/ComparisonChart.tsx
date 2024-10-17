"use client";

import { Bar } from "react-chartjs-2";
import { CampKPI } from "../../types/kpiTypes"; // Import the CampKPI type

// Define the props interface for the chart component
interface ChartData {
  data: Record<string, CampKPI>;
}

export const ComparisonChart = ({ data }: ChartData) => {
  const chartData = {
    labels: Object.keys(data), // Camps (e.g., Camp 1, Camp 2)
    datasets: [
      {
        label: "Replenishment Cost",
        data: Object.values(data).map(
          (camp) => camp.replenishmentCost?.total || 0 // Safely access total replenishment cost
        ),
        backgroundColor: "rgba(255,99,132,0.2)",
        borderColor: "rgba(255,99,132,1)",
        borderWidth: 1,
      },
      {
        label: "Deprivation Cost",
        data: Object.values(data).map(
          (camp) => camp.deprivationCost?.total || 0 // Safely access total deprivation cost
        ),
        backgroundColor: "rgba(54,162,235,0.2)",
        borderColor: "rgba(54,162,235,1)",
        borderWidth: 1,
      },
      {
        label: "Deprived Population",
        data: Object.values(data).map(
          (camp) => camp.deprivedPopulation || 0 // Safely access deprived population
        ),
        backgroundColor: "rgba(75,192,192,0.2)",
        borderColor: "rgba(75,192,192,1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      x: { title: { display: true, text: "Camp" } },
      y: { title: { display: true, text: "Cost / Population" } },
    },
  };

  return <Bar data={chartData} options={options} />;
};
