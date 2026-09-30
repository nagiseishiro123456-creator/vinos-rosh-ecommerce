import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "vinos-rosh-ecommerce",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
