import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Constants
const RELATIVE_YAML_PATH = [
  "..",
  "src",
  "main",
  "java",
  "data",
  "input_files",
  "input.yaml",
] as const;
const CONTENT_TYPE = "application/yaml"; // more specific than text/plain

function getYamlAbsolutePath(): string {
  return path.join(process.cwd(), ...RELATIVE_YAML_PATH);
}

export async function GET() {
  try {
    const yamlFilePath = getYamlAbsolutePath();

    if (!fs.existsSync(yamlFilePath)) {
      return NextResponse.json(
        { error: "Configuration file not found" },
        { status: 404 }
      );
    }

    const yamlContent = fs.readFileSync(yamlFilePath, "utf8");

    return new NextResponse(yamlContent, {
      headers: {
        "Content-Type": CONTENT_TYPE,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error reading configuration:", message);
    return NextResponse.json(
      { error: `Failed to read configuration: ${message}` },
      { status: 500 }
    );
  }
}
