"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  const handleCreateRoom = () => {
    // Store the choice to create a new room
    localStorage.setItem("gameAction", "create");
    router.push("/game");
  };

  const handleJoinRoom = () => {
    if (!roomCode) return;

    // Store the room code and join action
    localStorage.setItem("gameAction", "join");
    localStorage.setItem("roomCode", roomCode.toUpperCase());
    router.push("/game");
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-xs">
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
            disabled={!roomCode}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-r disabled:bg-gray-400"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
