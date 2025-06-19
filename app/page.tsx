"use client";

import { useRouter } from "next/navigation";
import { BackgroundAudio } from "@/components/BackgroundAudio";
import Link from "next/link";
import { FaGithub, FaTwitter } from "react-icons/fa";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      // Store the room code and action in localStorage
      localStorage.setItem("gameAction", "join");
      localStorage.setItem("roomCode", roomCode.trim().toUpperCase());
      router.push("/game");
    }
  };

  const handleCreateNewGame = () => {
    // Clear any existing room data and set action to create
    localStorage.removeItem("gameAction");
    localStorage.removeItem("roomCode");
    router.push("/game");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <BackgroundAudio />
      
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-[120%] h-[120%] object-cover"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <source src="/assets/videos/home-background.webm" type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-black/30" /> {/* Overlay for better text visibility */}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        <h1 className="text-4xl font-bold mb-8 text-white">
          Archetypes of the Collective Unconscious
        </h1>
        
        <div className="space-y-4">
          {/* Create New Game Button */}
          <button
            onClick={handleCreateNewGame}
            className="block w-full px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all duration-300 text-xl font-semibold"
          >
            Start New Game
          </button>

          {/* Join Existing Game Button */}
          <button
            onClick={() => setShowJoinForm(!showJoinForm)}
            className="block w-full px-8 py-4 bg-blue-600/80 hover:bg-blue-600/90 text-white rounded-lg backdrop-blur-sm transition-all duration-300 text-xl font-semibold"
          >
            Join Existing Game
          </button>

          {/* Join Room Form */}
          {showJoinForm && (
            <div className="bg-black/50 p-6 rounded-lg backdrop-blur-sm mt-4">
              <h3 className="text-white text-lg font-semibold mb-4">Enter Room Code</h3>
              <div className="flex flex-col space-y-4">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit room code"
                  maxLength={6}
                  className="px-4 py-2 bg-white/20 text-white placeholder-white/70 rounded-lg border border-white/30 focus:outline-none focus:border-white/60 text-center text-lg font-mono tracking-widest"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={roomCode.length !== 6}
                  className="px-6 py-3 bg-green-600/80 hover:bg-green-600/90 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-300 font-semibold"
                >
                  Join Room
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Developer Credits Tree Map */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end space-y-2">
        {/* Deca12x */}
        <div className="flex items-center space-x-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm">
          <span className="text-white text-sm">deca12x</span>
          <div className="flex space-x-2">
            <a
              href="https://github.com/deca12x"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors"
            >
              <FaGithub size={16} />
            </a>
            <a
              href="https://twitter.com/deca12x"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors"
            >
              <FaTwitter size={16} />
            </a>
          </div>
        </div>

        {/* Blessed_ux */}
        <div className="flex items-center space-x-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm">
          <span className="text-white text-sm">blessed_ux</span>
          <div className="flex space-x-2">
            <a
              href="https://github.com/blessedux"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors"
            >
              <FaGithub size={16} />
            </a>
            <a
              href="https://twitter.com/blessed_ux"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors"
            >
              <FaTwitter size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 