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

// ‑‑ lazy‑load the heavy visualiser so first paint is snappy
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

  /* -------- helpers ---------------------------------------------------- */
  const downloadYaml = useCallback(async () => {
    try {
      const res = await fetch("/api/downloadYaml");
      if (!res.ok) throw new Error(res.statusText);
      const blob = new Blob([await res.text()], { type: "application/yaml" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: "simulation-config.yaml",
      });
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      /* eslint-disable no-alert */
      alert("YAML download failed – please try again.");
    }
  }, []);

  const stopAndGoToInput = useCallback(async () => {
    // 1️⃣ stop simulation (fire‑and‑forget)
    fetch("/api/stopSimulation", { method: "POST" }).catch(console.warn);

    // 2️⃣ attempt to save last config – non‑critical
    fetch("/api/downloadConfig")
      .then((r) => (r.ok ? r.text() : null))
      .then((yml) => {
        if (yml) localStorage.setItem("lastSimulationConfig", yml);
      })
      .catch(console.warn);

    // 3️⃣ redirect after brief UX pause
    setTimeout(() => router.push("/home/InputParameters"), 1_000);
  }, [router]);

  /* -------- view ------------------------------------------------------- */
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
          YAML Config
        </Button>

        <Button
          variant="contained"
          color="secondary"
          startIcon={<RestartAltIcon />}
          onClick={stopAndGoToInput}
        >
          Stop & Start New
        </Button>
      </Stack>

      {/* ------------- live charts & tables --------------------------- */}
      <SimulationVisualizer />
    </Box>
  );
}
