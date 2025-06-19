"use client";

import React from "react";
import { useAddress, useDisconnect } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import JoinRoom from "../components/providers/JoinRoom";
import { FaGithub, FaTwitter } from "react-icons/fa";
import { BackgroundAudio } from "../components/BackgroundAudio";

export default function Home() {
  const address = useAddress();
  const disconnect = useDisconnect();
  const router = useRouter();

  useEffect(() => {
    if (!address) {
      router.push("/login");
    }
  }, [address, router]);

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <div className="absolute inset-0 bg-black/30" />{" "}
        {/* Overlay for better text visibility */}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center">
        <h1 className="text-4xl font-bold mb-8 text-white">
          Archetypes of the Collective Unconscious
        </h1>

        {/* Join Room Component */}
        <div className="flex flex-col items-center">
          <JoinRoom />
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
