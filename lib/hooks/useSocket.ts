import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Connect to the main server port with explicit configuration
    const socketInstance = io({
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      path: "/socket.io/",
      autoConnect: true,
    });

    // Add handlers for debugging connection issues
    socketInstance.on("connect", () => {
      console.log(`Socket connected successfully [id=${socketInstance.id}]`);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      // If websocket fails, socket.io will automatically try polling
      console.log(
        "Current transport:",
        socketInstance.io.engine.transport.name
      );
    });

    socketInstance.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      if (reason === "io server disconnect") {
        // Server initiated disconnect, try reconnecting
        socketInstance.connect();
      }
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      if (socketInstance.connected) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Use the socket's own connected property instead of maintaining our own state
  return { socket, isConnected: socket?.connected ?? false };
}
