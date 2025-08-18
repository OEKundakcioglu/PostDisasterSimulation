import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.BACKEND_API_URL || "http://localhost:8083";

export async function DELETE(req: NextRequest) {
  if (!API_URL)
    return NextResponse.json(
      { error: "Backend URL not configured" },
      { status: 500 }
    );
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const r = await fetch(`${API_URL}/api/simulations/${id}`, {
    method: "DELETE",
  });
  const json = await r.json().catch(() => null);
  return NextResponse.json(json ?? { error: "No response" }, {
    status: r.ok ? 200 : r.status,
  });
}
