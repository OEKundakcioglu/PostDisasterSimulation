"use client";

import { Line } from "react-chartjs-2";

interface ChartData {
  data: Record<string, number>;
}

const ReplenishmentCostChart = ({ data }: ChartData) => {
  const chartData = {
    labels: Object.keys(data),
    datasets: [
      {
        label: "Replenishment Cost",
        data: Object.values(data),
        borderColor: "rgba(75,192,192,1)",
        backgroundColor: "rgba(75,192,192,0.2)",
        fill: true,
      },
    ],
  };

  const options = {
    scales: {
      x: { title: { display: true, text: "Items" } },
      y: { title: { display: true, text: "Cost" } },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default ReplenishmentCostChart;
