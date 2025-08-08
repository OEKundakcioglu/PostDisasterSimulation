// app/api/getKPIData/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const KPI_JSON_PATH = ["data", "kpiData.json"] as const;

function getKpiPath() {
  return path.join(process.cwd(), ...KPI_JSON_PATH);
}

export async function GET() {
  try {
    const dataFilePath = getKpiPath();
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json(
        { error: "KPI data not found" },
        { status: 404 }
      );
    }
    const raw = fs.readFileSync(dataFilePath, "utf8");
    const json = JSON.parse(raw);
    return NextResponse.json(json, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error reading KPI data:", message);
    return NextResponse.json(
      { error: "Failed to read KPI data" },
      { status: 500 }
    );
  }
}
