import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import yaml from "yaml";

export async function GET() {
  try {
    // Define path to YAML file
    const yamlFilePath = path.join(
      process.cwd(),
      "..",
      "src",
      "main",
      "java",
      "data",
      "input_files",
      "input.yaml"
    );

    // Check if file exists
    if (!fs.existsSync(yamlFilePath)) {
      return NextResponse.json(
        { error: "Configuration file not found" },
        { status: 404 }
      );
    }

    // Read the YAML file
    const yamlContent = fs.readFileSync(yamlFilePath, "utf8");

    return NextResponse.json({
      success: true,
      data: yamlContent,
    });
  } catch (error: any) {
    console.error("Error reading configuration:", error);
    return NextResponse.json(
      { error: `Failed to read configuration: ${error.message}` },
      { status: 500 }
    );
  }
}
