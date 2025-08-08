import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const FILENAME = "simulation-config.yaml";
const COMMON_NO_CACHE = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

async function fetchWithTimeout(url: string, ms = 8000, init?: RequestInit) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function GET() {
  if (!API_URL) {
    return NextResponse.json(
      { error: "Backend API URL not configured" },
      { status: 500 }
    );
  }
  try {
    const url = `${API_URL}/simulate/downloadYaml?t=${Date.now()}`;
    const response = await fetchWithTimeout(url, 8000, {
      cache: "no-store",
      headers: COMMON_NO_CACHE,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "YAML configuration file not found" },
        { status: response.status }
      );
    }

    const yamlContent = await response.text();

    return new NextResponse(yamlContent, {
      headers: {
        "Content-Type": "application/yaml",
        "Content-Disposition": `attachment; filename=${FILENAME}`,
        ...COMMON_NO_CACHE,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const aborted = message.includes("AbortError");
    return NextResponse.json(
      {
        error: aborted
          ? "Request for YAML timed out"
          : "Failed to fetch YAML configuration file from backend",
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
