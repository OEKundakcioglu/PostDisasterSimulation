import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.BACKEND_API_URL || "http://localhost:8083";

interface CreateSimulationPayload {
  [k: string]: unknown;
}

async function fetchJson(url: string, options: RequestInit) {
  const r = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  return { ok: r.ok, status: r.status, json: await r.json().catch(() => null) };
}

export async function POST(req: NextRequest) {
  if (!API_URL)
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    );
  let body: CreateSimulationPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { ok, status, json } = await fetchJson(`${API_URL}/api/simulations`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return NextResponse.json(json ?? { error: "No response" }, {
    status: ok ? 200 : status,
  });
}
