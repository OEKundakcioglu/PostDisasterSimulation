// app/home/KPIPage/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import KPIContent from "../../../components/KPIContent/KPIContent";
import { KPIData } from "../../../types/kpiTypes";

const KPIPage = () => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/getKPIData")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Error fetching KPI data");
        }
        return response.json();
      })
      .then((data: KPIData) => {
        setKpiData(data);
      })
      .catch(() => setError("Error fetching KPI data"));
  }, []);

  if (error) {
    return (
      <Box sx={{ padding: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!kpiData) {
    return (
      <Box sx={{ padding: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return <KPIContent kpiData={kpiData} />;
};

export default KPIPage;
