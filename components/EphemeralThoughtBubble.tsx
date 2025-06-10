'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EphemeralThoughtBubbleProps {
  message: string;
  position: { x: number; y: number };
  onComplete?: () => void;
}

export const EphemeralThoughtBubble: React.FC<EphemeralThoughtBubbleProps> = ({
  message,
  position,
  onComplete,
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        onAnimationComplete={onComplete}
        className="fixed z-50"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <div className="relative">
          {/* Pixel art thought bubble */}
          <div className="bg-black/80 border-2 border-purple-500 px-4 py-2 rounded-none shadow-lg">
            <div className="text-purple-400 text-sm font-mono tracking-wider">
              {message}
            </div>
          </div>
          
          {/* Pixel art connecting line */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0.5 h-4 bg-purple-500" />
            <div className="w-2 h-2 bg-purple-500 transform -translate-x-1/2" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 