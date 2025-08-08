import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const STOP_ENDPOINT = "/simulate/stop";

async function fetchWithTimeout(url: string, ms = 8000, init?: RequestInit) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function POST() {
  if (!API_URL) {
    return NextResponse.json(
      { success: false, error: "API URL not defined" },
      { status: 500 }
    );
  }
  try {
    const url = `${API_URL}${STOP_ENDPOINT}`;
    const response = await fetchWithTimeout(url, 8000, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to stop simulation: ${response.status}`,
        },
        { status: response.status }
      );
    }

    let details: unknown = null;
    try {
      details = await response.json();
    } catch {
      /* ignore non-json */
    }

    return NextResponse.json({
      success: true,
      message: "Simulation stopped successfully",
      details,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const aborted = message.includes("AbortError");
    return NextResponse.json(
      {
        success: false,
        error: aborted
          ? "Stop request timed out"
          : `Failed to stop simulation: ${message}`,
      },
      { status: 500 }
    );
  }
}
