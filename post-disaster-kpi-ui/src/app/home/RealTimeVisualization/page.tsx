import React, { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import PageClient from "./PageClient";

export const dynamic = "force-dynamic";

export default function RealTimeVisualization() {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      }
    >
      <PageClient />
    </Suspense>
  );
}
