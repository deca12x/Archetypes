"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface ParallaxBackgroundProps {
  layers: string[];
  className?: string;
}

export const ParallaxBackground = ({ layers, className = "" }: ParallaxBackgroundProps) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentLayer, setCurrentLayer] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLayer((prev) => (prev + 1) % layers.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [layers.length]);

  return (
    <div className={`absolute inset-0 w-full h-full ${className}`}>
      {layers.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0 w-full h-full transition-transform duration-200"
          style={{
            transform: `translate(${mousePosition.x * (0.1 + index * 0.1)}px, ${
              mousePosition.y * (0.1 + index * 0.1)
            }px)`,
            opacity: currentLayer === index ? 1 : 0,
            transition: "opacity 2s ease-in-out",
          }}
        >
          <Image
            src={src}
            alt={`Background Layer ${index + 1}`}
            fill
            className="object-cover"
            priority
          />
        </div>
      ))}
    </div>
  );
}; 