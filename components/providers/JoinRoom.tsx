"use client";

import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../lib/hooks/useSocket";

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
        className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all duration-300 text-xl font-semibold"
      >
        Start New Game
      </button>

      <div className="flex flex-col space-y-2">
        <label className="text-sm text-white">Or Join Existing Game:</label>
        <div className="flex">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter Room Code"
            className="flex-1 px-3 py-2 border border-white/20 bg-black/30 rounded-l text-white backdrop-blur-sm"
            maxLength={6}
          />
          <button
            onClick={handleJoinRoom}
            disabled={!roomCode || !isConnected}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-r backdrop-blur-sm transition-all duration-300 disabled:bg-gray-500/30 disabled:text-gray-400"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
