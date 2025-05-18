// app/game/ui/ChatWindow.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChatStore, ChatMessage } from "../../../lib/game/stores/chat";

interface ChatWindowProps {
  onSendMessage: (message: string) => void;
  username: string;
  playerId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  onSendMessage,
  username,
  playerId,
}) => {
  const { messages, isProximityMode, activeGroupId, addMessage } =
    useChatStore();
  const [inputValue, setInputValue] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(`nebula-${Date.now()}`);

  // Add effect to handle focus state changes
  useEffect(() => {
    if (isFocused) {
      // Disable Phaser keyboard input when chat is focused
      const game = (window as any).__PHASER_GAME__;
      if (game) {
        game.input.keyboard.enabled = false;
      }
    } else {
      // Re-enable Phaser keyboard input when chat loses focus
      const game = (window as any).__PHASER_GAME__;
      if (game) {
        game.input.keyboard.enabled = true;
      }
    }
  }, [isFocused]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      if (isProximityMode) {
        // In proximity mode, send message to other players
        onSendMessage(inputValue);
      } else {
        // Not in proximity mode, send message to Nebula
        // First add the user message to chat
        addMessage({
          id: Date.now().toString(),
          playerId: playerId,
          username: username,
          message: inputValue,
          timestamp: Date.now(),
          isAi: true, // Mark as part of AI conversation
        });

        // Then send to Nebula
        handleNebulaChat(inputValue);
      }

      setInputValue("");
    }
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
        throw new Error(
          `Failed to get response from Nebula: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("Nebula API response:", data);

      if (!data.response) {
        console.error("Empty response from Nebula API:", data);
        throw new Error("Received empty response from Nebula");
      }

      // Add the AI response to the chat
      addMessage({
        id: Date.now().toString(),
        playerId: "nebula-ai",
        username: "Nebula",
        message: data.response || "No response", // Fallback message if empty
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

  // Filter messages based on chat mode
  const filteredMessages = messages.filter((msg) => {
    if (isProximityMode) {
      // In proximity mode, only show non-AI messages
      return !msg.isAi;
    } else {
      // In Nebula mode, only show AI messages
      return msg.isAi;
    }
  });

  console.log(
    "Current messages:",
    messages.map((m) => ({
      id: m.id,
      from: m.username,
      content: m.message.substring(0, 20),
      isAi: m.isAi,
    }))
  );
  console.log(
    "Filtered messages:",
    filteredMessages.map((m) => ({
      id: m.id,
      from: m.username,
      content: m.message.substring(0, 20),
      isAi: m.isAi,
    }))
  );

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-black bg-opacity-80 text-white rounded-lg shadow-lg overflow-hidden z-50">
      <div
        className={`p-2 ${
          isProximityMode ? "bg-green-800" : "bg-purple-800"
        } font-bold flex justify-between items-center`}
      >
        <span>{isProximityMode ? "Proximity Chat" : "Nebula AI Chat"}</span>
        <div className="flex space-x-2">
          {isProximityMode && (
            <span className="text-xs bg-green-600 px-2 py-1 rounded">
              Players Nearby
            </span>
          )}
        </div>
      </div>
      <div className="h-48 overflow-y-auto p-2 space-y-2">
        {filteredMessages.length === 0 ? (
          <div className="text-gray-400 text-center">
            {isProximityMode
              ? "You are near other players. Say hello!"
              : "Ask Nebula anything about blockchain, crypto, web3, or gaming!"}
          </div>
        ) : (
          filteredMessages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`p-1 rounded ${
                msg.playerId === "nebula-ai"
                  ? "bg-purple-800"
                  : msg.isSelfOnly
                  ? "bg-gray-700 italic"
                  : msg.playerId === playerId
                  ? "bg-blue-900"
                  : "bg-green-900"
              }`}
            >
              <div className="font-bold text-xs">
                {msg.username === username ? "You" : msg.username}
                {msg.isSelfOnly && " (only visible to you)"}
              </div>
              <div>{msg.message || "<empty message>"}</div>
            </div>
          ))
        )}
        {aiLoading && (
          <div className="text-center text-purple-400">
            Nebula is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="flex-grow bg-gray-700 text-white px-2 py-1 rounded-l focus:outline-none"
            placeholder={
              isProximityMode
                ? "Chat with nearby players..."
                : "Ask Nebula about blockchain..."
            }
          />
          <button
            type="submit"
            className={`text-white px-3 py-1 rounded-r ${
              isProximityMode ? "bg-green-600" : "bg-purple-600"
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
