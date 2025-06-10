'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export const InventoryCircle: React.FC = () => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed bottom-8 left-8 z-50"
    >
      <div className="relative w-16 h-16">
        {/* Glassmorphism circle background */}
        <div className="absolute inset-0 rounded-full backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl" />
        
        {/* Compass image */}
        <div className="relative w-full h-full rounded-full overflow-hidden">
          <Image
            src="/assets/sprites/compass.webp"
            alt="Inventory"
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>

        {/* Hover effect overlay */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/5"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        />
      </div>
    </motion.div>
  );
}; 