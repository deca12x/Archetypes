'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MissionBubbleProps {
  header: string;
  text: string;
  position?: { x: number; y: number };
  onComplete?: () => void;
}

export const MissionBubble: React.FC<MissionBubbleProps> = ({
  header,
  text,
  position,
  onComplete,
}) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        onAnimationComplete={onComplete}
        className="fixed z-50"
        style={position ? {
          left: position.x,
          top: position.y,
        } : {
          left: '50%',
          top: '20%',
          transform: 'translateX(-50%)',
        }}
      >
        <div className="relative">
          {/* Pixel art mission bubble */}
          <div className="bg-black/90 border-2 border-yellow-500 px-6 py-4 rounded-none shadow-lg max-w-md">
            {/* Header with pixel art arrow */}
            <div className="flex items-center gap-2 mb-2">
              <div className="text-yellow-500 text-lg font-mono tracking-wider">
                {header}
              </div>
              <div className="w-4 h-4 border-t-2 border-r-2 border-yellow-500 transform rotate-45" />
            </div>
            
            {/* Content */}
            <div className="text-gray-300 text-sm font-mono tracking-wide leading-relaxed">
              {text}
            </div>
            
            {/* Pixel art corner decorations */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-500" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-500" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-500" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 