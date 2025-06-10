'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface PixelExplosionProps {
  onComplete?: () => void;
}

export const PixelExplosion: React.FC<PixelExplosionProps> = ({ onComplete }) => {
  const pixels = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {pixels.map((i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/80 rounded-sm"
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: [
              Math.random() * 100 - 50,
              Math.random() * 200 - 100,
              Math.random() * 300 - 150,
            ],
            y: [
              Math.random() * 100 - 50,
              Math.random() * 200 - 100,
              Math.random() * 300 - 150,
            ],
            opacity: [1, 0.8, 0],
            scale: [1, 0.5, 0],
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
            times: [0, 0.5, 1],
          }}
          onAnimationComplete={i === pixels.length - 1 ? onComplete : undefined}
        />
      ))}
    </div>
  );
}; 