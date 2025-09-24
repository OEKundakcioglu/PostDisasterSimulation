"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import DownloadIcon from "@mui/icons-material/Download";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import nextDynamic from "next/dynamic";

// Lazy‑load visualizer for faster initial paint
const TimeAwareSimulationVisualizer = nextDynamic(
  () =>
    import("@/components/SimulationVisualizer/TimeAwareSimulationVisualizer"),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    ),
  }
);

export default function PageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId =
    params.get("sessionId") ||
    (typeof window !== "undefined"
      ? localStorage.getItem("activeSimulationSessionId")
      : "") ||
    "";

  // Match SimulationVisualizer's expected structure (required maps)
  interface TimeStepLog {
    time: number;
    planningHorizon: number;
    cumulativeHoldingCosts: Record<string, number>;
    cumulativeReferralCosts: Record<string, number>;
    cumulativeDeprivationCosts: Record<string, number>;
    cumulativeReplenishmentCosts: Record<string, number>;
    internalPopulation?: Record<string, number>;
    externalPopulation?: Record<string, number>;
  }
  interface IncomingLog extends Partial<TimeStepLog> {
    fundingReceived?: number;
    itemQuantities?: Record<string, Record<string, number>>;
    internalPopulation?: Record<string, number>;
    externalPopulation?: Record<string, number>;
  }
  interface WSLogPayload {
    index: number;
    log: IncomingLog;
  }

  const [logs, setLogs] = useState<TimeStepLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const nextIndexRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingActiveRef = useRef(false);
  const manualCloseRef = useRef(false); // distinguish manual teardown vs network close

  const baseApi = process.env.NEXT_PUBLIC_API_URL || "";

  const normalize = useCallback((l: IncomingLog): TimeStepLog => {
    return {
      time: typeof l.time === "number" ? l.time : 0,
      planningHorizon:
        typeof l.planningHorizon === "number" ? l.planningHorizon : 0,
      cumulativeHoldingCosts: l.cumulativeHoldingCosts || {},
      cumulativeReferralCosts: l.cumulativeReferralCosts || {},
      cumulativeDeprivationCosts: l.cumulativeDeprivationCosts || {},
      cumulativeReplenishmentCosts: l.cumulativeReplenishmentCosts || {},
      internalPopulation: l.internalPopulation || {},
      externalPopulation: l.externalPopulation || {},
    };
  }, []);

  // Fetch any available logs from the backend starting at nextIndexRef
  const backfillLogs = useCallback(async () => {
    if (!sessionId || !baseApi) return;
    try {
      const r = await fetch(
        `${baseApi}/api/simulations/${encodeURIComponent(
          sessionId
        )}/logs?from=${nextIndexRef.current}`,
        { cache: "no-store" }
      );
      if (!r.ok) return;
      const j = await r.json();
      if (Array.isArray(j.logs) && j.logs.length) {
        const normalized = (j.logs as IncomingLog[]).map(normalize);
        setLogs((prev) => [...prev, ...normalized]);
        nextIndexRef.current = j.next; // advance to backend's next index
      }
    } catch {
      /* ignore */
    }
  }, [sessionId, baseApi, normalize]);

  const startPolling = useCallback(() => {
    if (!sessionId || pollingActiveRef.current) return;
    pollingActiveRef.current = true;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const r = await fetch(
          `${baseApi}/api/simulations/${encodeURIComponent(
            sessionId
          )}/logs?from=${nextIndexRef.current}`,
          { cache: "no-store" }
        );
        if (!r.ok) return;
        const j = await r.json();
        if (Array.isArray(j.logs) && j.logs.length) {
          const normalized = (j.logs as IncomingLog[]).map(normalize);
          setLogs((prev) => [...prev, ...normalized]);
          nextIndexRef.current = j.next; // backend provides next global index
        }
      } catch {
        /* ignore */
      }
    }, 1000);
  }, [sessionId, baseApi, normalize]);

  const handleNewLog = useCallback(
    (incoming: unknown) => {
      if (incoming && typeof incoming === "object") {
        const maybe = incoming as Partial<WSLogPayload> & {
          [k: string]: unknown;
        };
        // structured payload with index + log
        if (
          typeof maybe.index === "number" &&
          typeof maybe["log"] === "object" &&
          maybe["log"] !== null
        ) {
          const logObj = maybe["log"] as IncomingLog;
          if (typeof (logObj as IncomingLog).time === "number") {
            if (maybe.index >= nextIndexRef.current) {
              setLogs((prev) => [...prev, normalize(logObj)]);
              nextIndexRef.current = maybe.index + 1;
            }
            return;
          }
        }
        // legacy direct log object
        const direct = maybe as IncomingLog;
        if (typeof direct.time === "number") {
          setLogs((prev) => [...prev, normalize(direct)]);
          nextIndexRef.current += 1;
        }
      }
    },
    [normalize]
  );

  const connectWebSocket = useCallback(() => {
    if (!sessionId || !baseApi) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return; // already connecting/connected
    }
    try {
      const wsUrl =
        baseApi.replace(/^http/, "ws") +
        `/ws?sessionId=${encodeURIComponent(sessionId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      manualCloseRef.current = false;
      ws.onopen = async () => {
        setConnected(true);
        reconnectAttempts.current = 0;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        pollingActiveRef.current = false;
        // Backfill any logs produced before the socket opened
        await backfillLogs();
      };
      ws.onclose = () => {
        setConnected(false);
        if (manualCloseRef.current) return;
        if (reconnectAttempts.current < maxReconnectAttempts) {
          if (reconnectTimeoutRef.current)
            clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current += 1;
            connectWebSocket();
          }, 500 * Math.pow(2, reconnectAttempts.current));
        } else if (!pollingActiveRef.current) {
          startPolling();
        }
      };
      ws.onerror = () => {
        setConnected(false);
        ws.close();
      };
      ws.onmessage = (evt) => {
        try {
          handleNewLog(JSON.parse(evt.data));
        } catch {}
      };
    } catch {
      if (!pollingActiveRef.current) startPolling();
    }
  }, [sessionId, baseApi, handleNewLog, startPolling, backfillLogs]);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing sessionId");
      return;
    }
    // Initial backfill to draw immediate history even if WS connects a bit later
    backfillLogs();
    connectWebSocket();
    const fallbackTimer = setTimeout(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) startPolling();
    }, 2000);
    return () => {
      clearTimeout(fallbackTimer);
      if (reconnectTimeoutRef.current)
        clearTimeout(reconnectTimeoutRef.current);
      manualCloseRef.current = true;
      if (wsRef.current) wsRef.current.close();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sessionId, connectWebSocket, startPolling, backfillLogs]);

  const downloadEnv = useCallback(async () => {
    if (!sessionId) return;
    try {
      const r = await fetch(
        `${baseApi}/api/simulations/${encodeURIComponent(
          sessionId
        )}/environment?raw=true`,
        { cache: "no-store" }
      );
      if (!r.ok) throw new Error();
      const json = await r.json();
      const blob = new Blob([JSON.stringify(json, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simulation-environment.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download environment JSON");
    }
  }, [sessionId, baseApi]);

  const stopAndGoToInput = useCallback(() => {
    if (sessionId) {
      fetch(
        `${baseApi}/api/simulations/${encodeURIComponent(sessionId)}/cancel`,
        { method: "POST" }
      ).catch(() => {});
    }
    setTimeout(() => router.push("/home/InputParameters"), 800);
  }, [router, sessionId, baseApi]);

  return (
    <Box sx={{ maxWidth: 1480, mx: "auto", p: 3 }}>
      {!connected && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Live stream not available yet; falling back to polling updates.
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TimeAwareSimulationVisualizer
        logs={logs}
        onDownloadEnv={downloadEnv}
        onStopAndRestart={stopAndGoToInput}
      />
    </Box>
  );
}
