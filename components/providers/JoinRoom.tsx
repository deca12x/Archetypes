"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/hooks/useSocket";

// Define the response types
interface CheckRoomResponse {
  success: boolean;
}

interface RoomErrorResponse {
  message: string;
}

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { socket, isConnected } = useSocket();

  const handleCreateRoom = () => {
    // Store the choice to create a new room
    localStorage.setItem("gameAction", "create");
    router.push("/game");
  };

  const handleJoinRoom = () => {
    if (!roomCode || !socket) return;

    setError(""); // Clear any previous errors

    // Setup a one-time listener for room errors
    socket.once("roomError", (response: RoomErrorResponse) => {
      console.error(`Room error: ${response.message}`);
      setError(response.message);
      // Remove stored values since we're not joining
      localStorage.removeItem("gameAction");
      localStorage.removeItem("roomCode");
    });

    // Check if room exists and has space before navigating
    socket.emit(
      "checkRoom",
      { roomId: roomCode.toUpperCase() },
      (response: CheckRoomResponse) => {
        if (response.success) {
          // Room exists and has space, proceed with join
          localStorage.setItem("gameAction", "join");
          localStorage.setItem("roomCode", roomCode.toUpperCase());
          router.push("/game");
        } else {
          // Room error handled by the error listener above
        }
      }
    );
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-xs">
      {error && (
        <div className="bg-red-500 text-white p-2 rounded text-center">
          {error}
        </div>
      )}

      <button
        onClick={handleCreateRoom}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
      >
        Create New Room
      </button>

      <div className="flex flex-col space-y-2">
        <label className="text-sm text-gray-200">Or Join Existing Room:</label>
        <div className="flex">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter Room Code"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l text-black"
            maxLength={6}
          />
          <button
            onClick={handleJoinRoom}
            disabled={!roomCode || !isConnected}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-r disabled:bg-gray-400"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
