// app/api/socket/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { initSocketServer } from "@/lib/socket/socketServer";

// This is necessary for server-side socket.io in Next.js App Router
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Create Socket.io server singleton
let io: SocketIOServer;
let httpServer: any;

// Export a GET handler for WebSocket upgrade
export async function GET(req: Request) {
  const upgradeHeader = headers().get("upgrade");

  if (upgradeHeader !== "websocket") {
    return new NextResponse("Expected Upgrade to WebSocket", { status: 426 });
  }

  try {
    if (!io) {
      // Create a standalone HTTP server if not already created
      httpServer = createServer();

      // Initialize socket server with our handlers
      io = initSocketServer(httpServer);

      // Start HTTP server on a different port
      const PORT = 3001;
      httpServer.listen(PORT, () => {
        console.log(`Socket.io server running on port ${PORT}`);
      });
    }

    return new NextResponse("WebSocket connection established", {
      status: 101,
    });
  } catch (e) {
    console.error("Error in socket route:", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
