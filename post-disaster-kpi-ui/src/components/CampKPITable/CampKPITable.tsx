import React from "react";
import {
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Grid,
} from "@mui/material";
import { Bar } from "react-chartjs-2";
import { CampKPI } from "../../types/kpiTypes";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface CampKPITableProps {
  campKPI: CampKPI;
}

const CampKPITable: React.FC<CampKPITableProps> = ({ campKPI }) => {
  const items = Object.keys(campKPI.deprivationCost);

  // Prepare chart data
  const deprivationCostData = {
    labels: items,
    datasets: [
      {
        label: "Deprivation Cost",
        data: items.map((item) => campKPI.deprivationCost[item]),
        backgroundColor: "#D4AF37", // Gold color for premium look
      },
    ],
  };

  const replenishmentCostData = {
    labels: items,
    datasets: [
      {
        label: "Replenishment Cost",
        data: items.map((item) => campKPI.replenishmentCost[item]),
        backgroundColor: "#2C3E50", // Deep Blue color for premium look
      },
    ],
  };

  return (
    <Box>
      {/* Table for Camp KPIs */}
      <TableContainer component={Paper} sx={{ marginBottom: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              {/* Table Headers */}
              <TableCell sx={{ fontWeight: "bold", color: "#2C3E50" }}>
                Item
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Deprivation Cost
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Replenishment Cost
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Holding Cost
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Referral Cost
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Ordering Cost
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Avg Deprivation Time
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Deprived Population
              </TableCell>
              <TableCell
                sx={{ fontWeight: "bold", color: "#2C3E50" }}
                align="right"
              >
                Referral Population
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item}>
                <TableCell>{item}</TableCell>
                <TableCell align="right">
                  {formatCurrency(campKPI.deprivationCost[item])}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(campKPI.replenishmentCost[item])}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(campKPI.holdingCost[item])}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(campKPI.referralCost[item])}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(campKPI.orderingCost[item])}
                </TableCell>
                <TableCell align="right">
                  {campKPI.averageDeprivationTime[item]?.toFixed(2)}
                </TableCell>
                <TableCell align="right">
                  {campKPI.deprivedPopulation.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  {campKPI.referralPopulation.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            {/* Total row */}
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell align="right">
                {formatCurrency(
                  Object.values(campKPI.deprivationCost).reduce(
                    (a, b) => a + b,
                    0
                  )
                )}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(
                  Object.values(campKPI.replenishmentCost).reduce(
                    (a, b) => a + b,
                    0
                  )
                )}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(
                  Object.values(campKPI.holdingCost).reduce((a, b) => a + b, 0)
                )}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(
                  Object.values(campKPI.referralCost).reduce((a, b) => a + b, 0)
                )}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(
                  Object.values(campKPI.orderingCost).reduce((a, b) => a + b, 0)
                )}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">
                {campKPI.deprivedPopulation.toLocaleString()}
              </TableCell>
              <TableCell align="right">
                {campKPI.referralPopulation.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Charts */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Deprivation Cost per Item
          </Typography>
          <Bar
            data={deprivationCostData}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      const value = context.parsed.y;
                      return formatCurrency(value);
                    },
                  },
                },
              },
              scales: {
                y: {
                  ticks: {
                    callback: function (value) {
                      return formatCurrency(value as number);
                    },
                  },
                },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Replenishment Cost per Item
          </Typography>
          <Bar
            data={replenishmentCostData}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      const value = context.parsed.y;
                      return formatCurrency(value);
                    },
                  },
                },
              },
              scales: {
                y: {
                  ticks: {
                    callback: function (value) {
                      return formatCurrency(value as number);
                    },
                  },
                },
              },
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

// Utility function to format currency values
const formatCurrency = (value: number): string => {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
};

export default CampKPITable;
