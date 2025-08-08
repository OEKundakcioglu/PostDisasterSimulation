"use client";

import React, { useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
} from "@mui/material";
import { useRouter } from "next/navigation";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import dynamic from "next/dynamic";

// Constants
const DOWNLOAD_FILENAME = "simulation-config.yaml";
const STOP_REDIRECT_DELAY_MS = 1000;

// Lazy‑load visualizer for faster initial paint
const SimulationVisualizer = dynamic(
  () => import("@/components/SimulationVisualizer/SimulationVisualizer"),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function RealTimeVisualization() {
  const router = useRouter();

  // Download current YAML directly from backend via API route
  const downloadYaml = useCallback(async () => {
    try {
      const res = await fetch("/api/downloadYaml", { cache: "no-store" });
      if (!res.ok) throw new Error(res.statusText);
      const text = await res.text();
      const blob = new Blob([text], { type: "application/yaml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = DOWNLOAD_FILENAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // eslint-disable-next-line no-alert
      alert("YAML download failed – please try again.");
    }
  }, []);

  // Stop simulation then return to input screen
  const stopAndGoToInput = useCallback(() => {
    // Fire-and-forget stop
    fetch("/api/stopSimulation", { method: "POST" }).catch(console.warn);

    // Try to persist last config (non-critical)
    fetch("/api/downloadConfig")
      .then((r) => (r.ok ? r.text() : null))
      .then((yml) => {
        if (yml) localStorage.setItem("lastSimulationConfig", yml);
      })
      .catch(console.warn);

    // Navigate after short pause
    setTimeout(
      () => router.push("/home/InputParameters"),
      STOP_REDIRECT_DELAY_MS
    );
  }, [router]);

  return (
    <Box sx={{ maxWidth: 1480, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: "#000000" }}>
        Real-time Simulation Visualization
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={downloadYaml}
        >
          YAML Config
        </Button>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<RestartAltIcon />}
          onClick={stopAndGoToInput}
        >
          Stop & Start New
        </Button>
      </Stack>

      <SimulationVisualizer />
    </Box>
  );
}
