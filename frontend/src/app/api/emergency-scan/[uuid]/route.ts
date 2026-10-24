import { NextResponse } from "next/server";
import { getApiBase, PROD_API_URL } from "@/lib/api";

export async function GET(
  request: Request,
  context: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await context.params;
  const base = getApiBase();
  
  let res: Response | null = null;
  try {
    res = await fetch(`${base}/api/records/emergency-scan/${uuid}/`, {
      cache: "no-store",
    });
  } catch {
    // If local fetch threw network error, attempt cloud
  }

  if ((!res || !res.ok) && base !== PROD_API_URL) {
    try {
      res = await fetch(`${PROD_API_URL}/api/records/emergency-scan/${uuid}/`, {
        cache: "no-store",
      });
    } catch {
      // both failed
    }
  }

  try {
    if (!res || !res.ok) {
      return NextResponse.json(
        { error: "Emergency profile not found" },
        { status: res ? res.status : 404 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Emergency scan proxy error:", err);
    return NextResponse.json(
      { error: "Failed to connect to backend clinical database." },
      { status: 502 }
    );
  }
}
