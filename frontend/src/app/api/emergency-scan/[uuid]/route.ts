import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await context.params;
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/records/emergency-scan/${uuid}/`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Emergency profile not found" },
        { status: res.status }
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
