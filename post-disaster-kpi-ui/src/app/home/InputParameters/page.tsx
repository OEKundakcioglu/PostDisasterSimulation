// app/home/InputParameters/page.tsx
"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Button, Grid, Paper } from "@mui/material";
import { useRouter } from "next/navigation";

const InputParameters = () => {
  const router = useRouter();

  const [simulationConfig, setSimulationConfig] = useState({
    seedDemandTime: "10",
    seedDemandQuantity: "15",
    seedItemDuration: "14",
    seedSupplyDisruptionTime: "11",
    seedSupplyDisruptionDuration: "18",
    seedMigrationTime: "13",
    seedMigrationQuantity: "17",
    seedFundingTime: "13",
    seedFundingAmount: "16",
    seedReplenishmentTime: "14",
    seedTransferTime: "15",
    seedTransshipmentTime: "16",
    inventoryControlPeriod: "5",
    planningHorizon: "1080",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSimulationConfig({
      ...simulationConfig,
      [name]: value,
    });
  };

  const handleSubmit = async () => {
    const res = await fetch("/api/runSimulation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(simulationConfig),
    });

    if (res.ok) {
      router.push("/home/KPIPage");
    } else {
      alert("An error occurred while running the simulation.");
    }
  };

  return (
    <Box sx={{ padding: 4, backgroundColor: "#" }}>
      {" "}
      {/* Beige background */}
      <Typography
        variant="h4"
        gutterBottom
        sx={{ color: "#7A7265", fontWeight: "bold" }}
      >
        Simulation Input Parameters
      </Typography>
      <Paper
        sx={{
          padding: 4,
          backgroundColor: "#faf0e6",
          borderRadius: "12px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Grid container spacing={2}>
          {Object.keys(simulationConfig).map((key) => (
            <Grid item xs={12} sm={6} md={4} key={key}>
              <TextField
                fullWidth
                name={key}
                label={key}
                type="number"
                value={
                  simulationConfig[key as keyof typeof simulationConfig] || ""
                }
                onChange={handleInputChange}
                variant="outlined"
                sx={{
                  backgroundColor: "#FFF8E7",
                  borderRadius: "8px",
                }}
              />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              sx={{
                backgroundColor: "#B29477",
                color: "#FFFFFF",
                fontWeight: "bold",
                padding: "12px 24px",
                borderRadius: "8px",
                "&:hover": {
                  backgroundColor: "#A27A55",
                },
              }}
            >
              Run Simulation
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default InputParameters;
