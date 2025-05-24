// app/api/socket/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";

// This is necessary for server-side socket.io in Next.js App Router
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Export a GET handler for WebSocket upgrade
export async function GET(req: Request) {
  return new NextResponse("WebSocket server is handled by main server", {
    status: 200,
  });
}
