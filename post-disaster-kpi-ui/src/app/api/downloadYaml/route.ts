import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(
      `${API_URL}/simulate/downloadYaml?t=${timestamp}`,
      {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "YAML configuration file not found" },
        { status: 404 }
      );
    }

    const yamlContent = await response.text();

    return new NextResponse(yamlContent, {
      headers: {
        "Content-Type": "application/yaml",
        "Content-Disposition": "attachment; filename=simulation-config.yaml",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error fetching YAML file from backend:", error);
    return NextResponse.json(
      { error: "Failed to fetch YAML configuration file from backend" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
