'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PixelExplosion } from './PixelExplosion';
import { InventoryCircle } from './InventoryCircle';
import { useChatStore, ChatMessage } from '../lib/game/stores/chat';
import { useIsInGame } from '@/lib/hooks/useIsInGame';

interface ChatWindowProps {
  onSendMessage: (message: string) => void;
  username: string;
  playerId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  onSendMessage,
  username,
  playerId,
}) => {
  const { messages, isProximityMode, activeGroupId, addMessage } = useChatStore();
  const [inputValue, setInputValue] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [explodingMessageId, setExplodingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(`nebula-${Date.now()}`);
  const isInGame = useIsInGame();

  // Handle focus state for game controls
  useEffect(() => {
    if (isFocused) {
      const game = (window as any).__PHASER_GAME__;
      if (game) {
        game.input.keyboard.enabled = false;
      }
    } else {
      const game = (window as any).__PHASER_GAME__;
      if (game) {
        game.input.keyboard.enabled = true;
      }
    }
  }, [isFocused]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    addMessage({
      id: Date.now().toString(),
      playerId: playerId,
      username: username,
      message: inputValue,
      timestamp: Date.now(),
    });

    if (isProximityMode) {
      // In proximity mode, send message to other players
      onSendMessage(inputValue);
    } else {
      // Not in proximity mode, send message to Nebula
      await handleNebulaChat(inputValue);
    }

    setInputValue('');
  };

  const handleNebulaChat = async (message: string) => {
    try {
      setAiLoading(true);
      console.log("Sending to Nebula:", message);

      const response = await fetch("http://localhost:8000/api/nebula-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get response from Nebula: ${response.status}`);
      }

      const data = await response.json();
      console.log("Nebula API response:", data);

      if (!data.response) {
        throw new Error("Received empty response from Nebula");
      }

      // Add the AI response to the chat
      addMessage({
        id: Date.now().toString(),
        playerId: "nebula-ai",
        username: "Nebula",
        message: data.response,
        timestamp: Date.now(),
        isAi: true,
      });
    } catch (error: any) {
      console.error("Error querying Nebula:", error);
      addMessage({
        id: Date.now().toString(),
        playerId: "nebula-ai",
        username: "Nebula",
        message: `Error: ${error?.message || "Unknown error"}`,
        timestamp: Date.now(),
        isAi: true,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleMessageExplode = (messageId: string) => {
    setExplodingMessageId(messageId);
    setTimeout(() => {
      // Remove the message from the store
      const updatedMessages = messages.filter(msg => msg.id !== messageId);
      useChatStore.setState({ messages: updatedMessages });
      setExplodingMessageId(null);
    }, 800);
  };

  if (!isInGame) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          {/* Inventory Circle */}
          <InventoryCircle />
          
          {/* Glassmorphism chat window */}
          <div className="backdrop-blur-lg bg-white/10 rounded-2xl shadow-2xl border border-white/20 p-2 min-h-[100px] max-h-[100px] overflow-hidden">
            {/* Messages container */}
            <div className="h-[60px] overflow-y-auto pb-2">
              <AnimatePresence>
                {messages.length === 0 ? (
                  <div className="text-white/80 text-center py-2 text-sm font-medium">
                    {isProximityMode
                      ? "You are near other players. Say hello!"
                      : "Ask Nebula anything about your subconscious."}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ 
                        opacity: 0,
                        scale: 0,
                        transition: {
                          duration: 0.3,
                          ease: "easeInOut"
                        }
                      }}
                      className={`mb-1 relative ${
                        msg.playerId === "nebula-ai" 
                          ? 'flex justify-center' 
                          : msg.playerId === playerId
                          ? 'flex justify-end'
                          : 'flex justify-start'
                      }`}
                    >
                      <motion.div
                        className={`max-w-[80%] rounded-xl px-3 py-1 cursor-pointer text-sm ${
                          msg.playerId === "nebula-ai"
                            ? 'bg-purple-500/40 backdrop-blur-sm text-white'
                            : msg.playerId === playerId
                            ? 'bg-blue-500/40 backdrop-blur-sm text-white'
                            : 'bg-green-500/40 backdrop-blur-sm text-white'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => handleMessageExplode(msg.id)}
                      >
                        <div className="font-bold text-xs mb-0.5">
                          {msg.username}
                          {msg.isSelfOnly && " (only visible to you)"}
                        </div>
                        <div className="text-xs font-medium">{msg.message}</div>
                        {explodingMessageId === msg.id && (
                          <PixelExplosion />
                        )}
                      </motion.div>
                    </motion.div>
                  ))
                )}
                {aiLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-purple-400 py-1 text-xs font-medium"
                  >
                    Nebula is thinking...
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSubmit} className="mt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1 text-white placeholder-white/70 border border-white/20 focus:outline-none focus:border-white/40 text-sm font-medium"
                  placeholder={
                    isProximityMode
                      ? "Chat with nearby players..."
                      : "Ask your subconscious mind..."
                  }
                />
                <motion.button
                  type="submit"
                  className="bg-purple-500/40 hover:bg-purple-500/50 backdrop-blur-sm text-white px-4 py-1 rounded-xl transition-colors text-sm font-medium"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Send
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}; 