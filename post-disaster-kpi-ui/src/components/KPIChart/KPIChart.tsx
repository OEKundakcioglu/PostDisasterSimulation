import { FC } from "react";
import { Line } from "react-chartjs-2";

interface KPIChartProps {
  data: Record<string, number>; // Explicitly define the data type as a record of string keys and number values
  title: string;
}

const KPIChart: FC<KPIChartProps> = ({ data, title }) => {
  const chartData = {
    labels: Object.keys(data), // Array of string labels (the keys)
    datasets: [
      {
        label: title,
        data: Object.values(data), // Array of numbers (the values)
        fill: false,
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
      },
    ],
  };

  return (
    <div>
      <h2>{title}</h2>
      <Line data={chartData} />
    </div>
  );
};

export default KPIChart;
