import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

    // Read the YAML file
    const yamlContent = fs.readFileSync(yamlFilePath, "utf8");

    return new NextResponse(yamlContent, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error: any) {
    console.error("Error reading configuration:", error);
    return NextResponse.json(
      { error: `Failed to read configuration: ${error.message}` },
      { status: 500 }
    );
  }
}
