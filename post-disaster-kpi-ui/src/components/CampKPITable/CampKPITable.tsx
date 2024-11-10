// components/CampKPITable.tsx

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
  useTheme,
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface CampKPITableProps {
  campKPI: CampKPI;
}

const CampKPITable: React.FC<CampKPITableProps> = ({ campKPI }) => {
  const theme = useTheme();
  const items = Object.keys(campKPI.deprivationCost);

  // Prepare chart data
  const deprivationCostData = {
    labels: items,
    datasets: [
      {
        label: "Deprivation Cost",
        data: items.map((item) => campKPI.deprivationCost[item]),
        backgroundColor: theme.palette.customColors.deprivationCost,
      },
    ],
  };

  const replenishmentCostData = {
    labels: items,
    datasets: [
      {
        label: "Replenishment Cost",
        data: items.map((item) => campKPI.replenishmentCost[item]),
        backgroundColor: theme.palette.secondary.main,
      },
    ],
  };

  return (
    <Box sx={{ marginTop: 4 }}>
      {/* Table for Camp KPIs */}
      <TableContainer component={Paper} sx={{ marginBottom: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              {/* Table Headers */}
              <TableCell sx={{ fontWeight: "bold" }}>Item</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Deprivation Cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Replenishment Cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Holding Cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Referral Cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Ordering Cost
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Avg Deprivation Time
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                Deprived Population
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
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
              <TableCell sx={{ fontWeight: "bold" }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  Object.values(campKPI.deprivationCost).reduce(
                    (a, b) => a + b,
                    0
                  )
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  Object.values(campKPI.replenishmentCost).reduce(
                    (a, b) => a + b,
                    0
                  )
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  Object.values(campKPI.holdingCost).reduce((a, b) => a + b, 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  Object.values(campKPI.referralCost).reduce((a, b) => a + b, 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {formatCurrency(
                  Object.values(campKPI.orderingCost).reduce((a, b) => a + b, 0)
                )}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                -
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {campKPI.deprivedPopulation.toLocaleString()}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: "bold" }}>
                {campKPI.referralPopulation.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Charts */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom color="#3f3f3f">
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
                x: {
                  ticks: { color: theme.palette.text.secondary },
                },
                y: {
                  ticks: {
                    color: theme.palette.text.secondary,
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
          <Typography variant="h6" gutterBottom color="#3f3f3f">
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
                x: {
                  ticks: { color: theme.palette.text.secondary },
                },
                y: {
                  ticks: {
                    color: theme.palette.text.secondary,
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
