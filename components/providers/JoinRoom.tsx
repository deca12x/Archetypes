// components/providers/JoinRoom.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/hooks/useSocket";
import { useWriteContract, useWatchContractEvent, useAccount } from "wagmi";
import { parseEther, Log } from "viem";
import { GAME_MOVES_ADDRESS, GAME_MOVES_ABI } from "@/lib/contracts/config";

interface CheckRoomResponse {
  success: boolean;
}

interface RoomErrorResponse {
  message: string;
}

// Add this type for the event log
type PlayerJoinedLog = Log & {
  args: {
    playerIndex: number;
    playerAddress: string;
    character: number;
  };
};

export default function JoinRoom() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [isWaitingForTx, setIsWaitingForTx] = useState(false);
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { address } = useAccount();

  // Updated contract interaction hooks
  const { writeContract, data: txHash, isPending } = useWriteContract();

  // Watch for the PlayerJoined event
  useWatchContractEvent({
    address: GAME_MOVES_ADDRESS,
    abi: GAME_MOVES_ABI,
    eventName: "PlayerJoined",
    onLogs(logs) {
      // Cast the logs to the correct type
      const typedLogs = logs as PlayerJoinedLog[];
      const relevantLog = typedLogs.find(
        (log) =>
          log.args.playerAddress?.toLowerCase() === address?.toLowerCase()
      );

      if (relevantLog) {
        if (roomCode) {
          localStorage.setItem("gameAction", "join");
          localStorage.setItem("roomCode", roomCode.toUpperCase());
        } else {
          localStorage.setItem("gameAction", "create");
        }
        router.push("/game");
      }
    },
  });

  const handleCreateRoom = async () => {
    try {
      setIsWaitingForTx(true);
      await writeContract({
        address: GAME_MOVES_ADDRESS,
        abi: GAME_MOVES_ABI,
        functionName: "joinGame",
        value: parseEther("0.01"),
      });
    } catch (err) {
      setError("Failed to join game contract");
    } finally {
      setIsWaitingForTx(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode || !socket) return;

    try {
      setIsWaitingForTx(true);
      await writeContract({
        address: GAME_MOVES_ADDRESS,
        abi: GAME_MOVES_ABI,
        functionName: "joinGame",
        value: parseEther("0.01"),
      });
    } catch (err) {
      setError("Failed to join game contract");
    } finally {
      setIsWaitingForTx(false);
    }
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
        disabled={isPending || isWaitingForTx}
        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400"
      >
        {isPending ? "Joining Game..." : "New Game"}
      </button>

      <div className="flex flex-col space-y-2">
        <label className="text-sm text-gray-200">Or Join Existing Game:</label>
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
            disabled={!roomCode || !isConnected || isPending || isWaitingForTx}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-r disabled:bg-gray-400"
          >
            {isPending ? "Joining..." : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
