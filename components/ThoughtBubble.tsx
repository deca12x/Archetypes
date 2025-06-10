'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThoughtBubbleProps {
  message: string;
  position: { x: number; y: number };
  onComplete?: () => void;
}

export const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({
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
          {/* Thought bubble */}
          <div className="bg-purple-500/40 backdrop-blur-sm text-white px-4 py-2 rounded-2xl shadow-lg border border-white/20">
            <div className="text-sm font-medium">{message}</div>
          </div>
          
          {/* Connecting line */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-purple-500/40" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 