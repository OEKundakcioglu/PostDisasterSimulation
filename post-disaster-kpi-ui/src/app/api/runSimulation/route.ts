import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { buildSimulationYAML, SimulationInputDTO } from "@/lib/yaml/buildSimulationYAML";

const SIMULATION_START_ENDPOINT = "/simulate/logs";
const VISUALIZATION_URL = "/home/RealTimeVisualization";
const INPUT_YAML_RELATIVE_PATH = ["..","src","main","java","data","input_files","input.yaml"] as const;
const FILE_WRITE_ENCODING: BufferEncoding = "utf8";
const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timeout); }
}

export async function POST(request: NextRequest) {
  let body: SimulationInputDTO | undefined;
  try { body = await request.json(); } catch { return NextResponse.json({ success:false, error:"Invalid JSON body" }, { status:400 }); }

  if(!body || !Array.isArray(body.items) || !Array.isArray(body.camps) || !body.simulationConfig || !body.initialState){
    return NextResponse.json({ success:false, error:"Missing required fields: simulationConfig, items, camps, initialState" }, { status:400 });
  }

  try {
    const yamlContent = buildSimulationYAML(body);
    const yamlFilePath = path.join(process.cwd(), ...INPUT_YAML_RELATIVE_PATH);
    await fs.writeFile(yamlFilePath, yamlContent, FILE_WRITE_ENCODING);
    console.log(`YAML file written to ${yamlFilePath}`);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if(!apiUrl){
      console.warn("NEXT_PUBLIC_API_URL not defined; skipping backend simulation start.");
      return NextResponse.json({ success:true, started:false, backendMessage:"API URL missing; YAML generated only.", redirectToVisualization:true, visualizationUrl:VISUALIZATION_URL });
    }

    const startUrl = `${apiUrl}${SIMULATION_START_ENDPOINT}`;
    let started = false; let backendMessage = "";
    try {
      const resp = await fetchWithTimeout(startUrl, { method:"GET", headers:{ Accept:"text/plain" } });
      backendMessage = await resp.text();
      if(resp.ok){ started = !backendMessage.includes("already running"); console.log(`Simulation start response (${resp.status}): ${backendMessage}`); }
      else { console.warn(`Backend responded ${resp.status}: ${backendMessage}`); }
    } catch (err) {
      backendMessage = `Failed to contact backend: ${err instanceof Error ? err.message : String(err)}`;
      console.error(backendMessage);
    }

    return NextResponse.json({ success:true, started, backendMessage, redirectToVisualization:true, visualizationUrl:VISUALIZATION_URL });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Simulation setup failed:", message);
    return NextResponse.json({ success:false, error:`Failed to setup simulation: ${message}` }, { status:500 });
  }
}
