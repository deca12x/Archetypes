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
  const { messages, isProximityMode, activeGroupId } = useChatStore();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-black bg-opacity-80 text-white rounded-lg shadow-lg overflow-hidden z-50">
      <div
        className={`p-2 ${
          isProximityMode ? "bg-green-800" : "bg-gray-800"
        } font-bold flex justify-between items-center`}
      >
        <span>{isProximityMode ? "Proximity Chat" : "Self Chat"}</span>
        {isProximityMode && (
          <span className="text-xs bg-green-600 px-2 py-1 rounded">
            Connected
          </span>
        )}
      </div>
      <div className="h-48 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center">
            {isProximityMode
              ? "You are near other players. Say hello!"
              : "No one is nearby. Messages will only be visible to you."}
          </div>
        ) : (
          messages.map((msg: ChatMessage) => (
            <div
              key={msg.id}
              className={`p-1 rounded ${
                msg.isSelfOnly
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
              <div>{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700">
        <div className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow bg-gray-700 text-white px-2 py-1 rounded-l focus:outline-none"
            placeholder={
              isProximityMode
                ? "Chat with nearby players..."
                : "Note to self..."
            }
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 py-1 rounded-r"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
