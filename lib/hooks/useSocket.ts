import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log("Initializing socket connection...");
    
    // Connect to the socket server on port 3000 (same as Next.js server)
    const socketInstance = io("http://localhost:3000", {
      transports: ["websocket", "polling"], // Allow both for better reliability
      timeout: 20000, // Increase timeout
      forceNew: true, // Force new connection
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 5, // Try to reconnect 5 times
      reconnectionDelay: 1000, // Wait 1 second between attempts
    });

    // Set up event listeners
    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected successfully:", socketInstance.id);
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      console.log("Socket disconnected. Reason:", reason);
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);
    });

    socketInstance.on("reconnect", (attemptNumber) => {
      console.log("Socket reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
    });

    socketInstance.on("reconnect_error", (err) => {
      console.error("Socket reconnection error:", err);
    });

    socketInstance.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after all attempts");
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      console.log("Cleaning up socket connection...");
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return { socket, isConnected };
}
