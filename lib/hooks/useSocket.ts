import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to the socket server on port 3000 (same as Next.js server)
    const socketInstance = io("http://localhost:3000", {
      transports: ["websocket", "polling"], // Allow both for better reliability
    });

    // Set up event listeners
    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected:", socketInstance.id);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);
    });

    // Save socket instance
    setSocket(socketInstance);

    // Clean up on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
}
