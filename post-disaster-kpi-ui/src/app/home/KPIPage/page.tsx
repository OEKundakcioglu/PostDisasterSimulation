// app/home/KPIPage/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  useTheme,
} from "@mui/material";
import KPIContent from "../../../components/KPIContent/KPIContent";
import { KPIData } from "../../../types/kpiTypes";
import { useRouter } from "next/navigation";

const KPIPage = () => {
  const router = useRouter();
  const theme = useTheme();
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [yamlDownloadUrl, setYamlDownloadUrl] = useState<string | null>(null);

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
        setYamlDownloadUrl("/azizi.yaml");
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
      <Box
        sx={{
          padding: 4,
          textAlign: "center",
          color: theme.palette.text.primary,
        }}
      >
        <CircularProgress color="primary" />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 4 }}>
      <KPIContent kpiData={kpiData} />

      {/* Button to Download YAML File */}
      {yamlDownloadUrl && (
        <Button
          variant="contained"
          href={yamlDownloadUrl}
          download
          sx={{
            marginTop: 4,
            marginRight: 2,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          Download YAML File
        </Button>
      )}

      {/* Button to Return to Input Parameters Page */}
      <Button
        variant="contained"
        onClick={() => router.push("/home/InputParameters")}
        sx={{
          marginTop: 4,
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          fontWeight: "bold",
          padding: "12px 24px",
          borderRadius: "8px",
          "&:hover": {
            backgroundColor: theme.palette.primary.dark,
          },
        }}
      >
        Run Another Simulation
      </Button>
    </Box>
  );
};

export default KPIPage;
