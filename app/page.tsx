"use client";

import { useRouter } from "next/navigation";
import { BackgroundAudio } from "@/components/BackgroundAudio";

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
        <button
          onClick={() => router.push("/game")}
          className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-lg backdrop-blur-sm transition-all duration-300 text-xl font-semibold"
        >
          Start New Game
        </button>
      </div>
    </div>
  );
} 