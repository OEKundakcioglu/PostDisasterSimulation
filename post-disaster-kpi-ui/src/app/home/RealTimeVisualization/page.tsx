"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Stack,
} from "@mui/material";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const SimulationVisualizer = dynamic(
  () => import("../../../components/SimulationVisualizer/SimulationVisualizer"),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    ),
  }
);

function RealTimeVisualization() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const scrollRef = useRef(0);
  useEffect(() => {
    const handleScroll = () => {
      scrollRef.current = window.scrollY;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  useLayoutEffect(() => {
    window.scrollTo(0, scrollRef.current);
  });
  const downloadYamlFile = async () => {
    try {
      const response = await fetch("/api/downloadYaml");

      if (!response.ok) {
        throw new Error(`Failed to download YAML: ${response.statusText}`);
      }

      const yamlContent = await response.text();

      const blob = new Blob([yamlContent], { type: "application/yaml" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "simulation-config.yaml";
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading YAML file:", error);
      alert("Failed to download YAML file. Please try again.");
    }
  };

  const stopAndRedirect = async () => {
    console.log("🔴 Stop requested - sending request to API...");
    try {
      const response = await fetch("/api/stopSimulation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("🔴 Stop API response status:", response.status);

      const data = await response.json();
      console.log("🔴 Stop API response data:", data);

      if (!data.success) {
        console.warn(
          "⚠️ Warning: Simulation may not have stopped properly:",
          data.error || "Unknown error"
        );
      } else {
        console.log("✅ Backend confirmed simulation stopped successfully");
      }

      // Get the current configuration from the server
      const configResponse = await fetch("/api/downloadConfig");
      if (configResponse.ok) {
        const yamlConfig = await configResponse.text();
        localStorage.setItem("lastSimulationConfig", yamlConfig);

        // Instead of trying to use undefined variables, mark that we need to preserve the last config
        localStorage.setItem("preserveLastConfig", "true");
      }

      console.log("🔄 Redirecting to input page in 1 second...");
      setTimeout(() => {
        router.push("/home/InputParameters");
      }, 1000);
    } catch (error) {
      console.error("❌ Error stopping simulation:", error);
      console.log("🔄 Redirecting to input page despite error...");
      setTimeout(() => {
        router.push("/home/InputParameters");
      }, 1000);
    }
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ color: "#000000" }}>
          Real-time Simulation Visualization
        </Typography>

        <Stack direction="row" spacing={2} sx={{ mt: 2, mb: 3 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DownloadIcon />}
            onClick={downloadYamlFile}
          >
            Download YAML Configuration
          </Button>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<RestartAltIcon />}
            onClick={stopAndRedirect}
          >
            Stop & Run New Simulation
          </Button>
        </Stack>
      </Box>

      <SimulationVisualizer
        onConnectionChange={setIsConnected}
        onLoadingChange={setIsLoading}
      />
    </Box>
  );
}

export default RealTimeVisualization;
