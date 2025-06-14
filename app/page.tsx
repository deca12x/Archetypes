"use client";

import { useRouter } from "next/navigation";
import { BackgroundAudio } from "@/components/BackgroundAudio";
import Link from "next/link";
import { FaGithub, FaTwitter } from "react-icons/fa";

export default function Home() {
  const router = useRouter();

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
        <Link
          href="/game"
          className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all duration-300 text-xl font-semibold"
        >
          Start New Game
        </Link>
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