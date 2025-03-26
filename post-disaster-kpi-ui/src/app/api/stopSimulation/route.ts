import { NextResponse } from "next/server";

export async function POST() {
  console.log("🔴 API route: /api/stopSimulation called");
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    console.log("🔹 Using API URL:", apiUrl);

    if (!apiUrl) {
      console.error("❌ API URL not defined in environment variables");
      throw new Error("API URL not defined");
    }

    console.log(`🔹 Sending POST request to ${apiUrl}/simulate/stop`);
    const response = await fetch(`${apiUrl}/simulate/stop`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`🔹 Backend response status: ${response.status}`);

    if (!response.ok) {
      console.error(`❌ Backend returned error status: ${response.status}`);
      throw new Error(`Failed to stop simulation: ${response.status}`);
    }

    try {
      const responseData = await response.json();
      console.log("🔹 Backend response data:", responseData);
    } catch (e) {
      console.log("🔹 Backend didn't return JSON response");
    }

    console.log("✅ Simulation stop request successful");
    return NextResponse.json({
      success: true,
      message: "Simulation stopped successfully",
    });
  } catch (error) {
    console.error("❌ Error stopping simulation:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "Failed to stop simulation: " + errorMessage },
      { status: 500 }
    );
  }
}
