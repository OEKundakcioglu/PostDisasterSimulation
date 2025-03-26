// app/api/getKPIData/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dataFilePath = path.join(process.cwd(), "data", "kpiData.json");
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json(
        { error: "KPI data not found" },
        { status: 404 }
      );
    }
    const fileContent = fs.readFileSync(dataFilePath, "utf8");
    const data = JSON.parse(fileContent);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading KPI data:", error);
    return NextResponse.json(
      { error: "Failed to read KPI data" },
      { status: 500 }
    );
  }
}
