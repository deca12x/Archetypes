"use client";

import React from "react";
import { useState, useEffect } from "react";
import { FaCopy, FaCheck } from "react-icons/fa";

interface RoomCodeDisplayProps {
  roomCode: string | null;
}

export default function RoomCodeDisplay({ roomCode }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  // Reset copied state after showing the checkmark
  useEffect(() => {
    if (copied) {
      setShowCopied(true);
      const timer = setTimeout(() => {
        setShowCopied(false);
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const copyToClipboard = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
    }
  };

  // Determine display text based on roomCode state
  let displayText = roomCode;
  let label = "Game Code:";
  let showCopyButton = true;

  if (roomCode === null) {
    displayText = "Waiting...";
    showCopyButton = false;
  } else if (roomCode === "Connecting...") {
    displayText = "Connecting...";
    showCopyButton = false;
  }

  return (
    <div className="fixed top-4 left-4 z-[1000] flex items-center bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-white">
      <div className="mr-2">{label}</div>
      <div className="font-bold">{displayText}</div>
      {showCopyButton && (
        <button
          onClick={copyToClipboard}
          className="ml-2 p-1 hover:bg-gray-700 rounded transition-colors"
          title="Copy game code"
        >
          {showCopied ? (
            <FaCheck className="text-green-400" />
          ) : (
            <FaCopy className="text-gray-300 hover:text-white" />
          )}
        </button>
      )}
    </div>
  );
}
