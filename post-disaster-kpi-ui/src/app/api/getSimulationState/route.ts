import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const YAML_REL_PATH = [
  "..",
  "src",
  "main",
  "java",
  "data",
  "input_files",
  "input.yaml",
] as const;

function getYamlPath() {
  return path.join(process.cwd(), ...YAML_REL_PATH);
}

export async function GET() {
  try {
    const yamlFilePath = getYamlPath();
    if (!fs.existsSync(yamlFilePath)) {
      return NextResponse.json(
        { error: "Configuration file not found" },
        { status: 404 }
      );
    }
    const yamlContent = fs.readFileSync(yamlFilePath, "utf8");
    return NextResponse.json(
      { success: true, data: yamlContent },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error reading configuration:", message);
    return NextResponse.json(
      { error: `Failed to read configuration: ${message}` },
      { status: 500 }
    );
  }
}
