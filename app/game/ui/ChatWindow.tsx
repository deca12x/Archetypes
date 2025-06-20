// app/game/ui/ChatWindow.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useChatStore, ChatMessage } from "../../../lib/game/stores/chat";
import { chatService } from "../../../lib/game/utils/chatService";

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
  const [aiLoading, setAiLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Add effect to handle focus state changes
  useEffect(() => {
    console.log("Chat focus state changed:", isFocused);
    if (isFocused) {
      // Disable Phaser keyboard input when chat is focused
      const game = (window as any).__PHASER_GAME__;
      if (game) {
        console.log("Disabling Phaser keyboard input");
        game.input.keyboard.enabled = false;
      }
    } else {
      // Re-enable Phaser keyboard input when chat loses focus
      const game = (window as any).__PHASER_GAME__;
      if (game) {
        console.log("Enabling Phaser keyboard input");
        game.input.keyboard.enabled = true;
      }
    }
  }, [isFocused]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target as Node) &&
        isFocused
      ) {
        console.log("Click outside chat window detected");
        setIsFocused(false);
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFocused]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  // Separate function to send message that can be called from multiple places
  const sendMessage = async () => {
    if (inputValue.trim()) {
      setAiLoading(!isProximityMode); // Show loading indicator only for Nebula messages

      // Send the message using the chat service
      await chatService.sendMessage(inputValue);

      setInputValue("");
      setAiLoading(false);

      // Explicitly blur input after sending to return focus to game
      if (inputRef.current) {
        inputRef.current.blur();
      }
      setIsFocused(false);
    }
  };

  // Add explicit Enter key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent default to avoid form submission
      sendMessage();
    }
  };

  const formatSpriteName = (sprite: string) => {
    if (!sprite) return "";
    // Capitalize first letter and add "The "
    return "The " + sprite.charAt(0).toUpperCase() + sprite.slice(1);
  };

  return (
    <div
      ref={chatWindowRef}
      className="fixed bottom-4 right-4 w-80 bg-black bg-opacity-80 text-white rounded-lg shadow-lg overflow-hidden z-50"
    >
      <div className="h-48 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center">
            {isProximityMode
              ? "You are near other players. Say hello!"
              : "Ask Nebula anything about your subconscious."}
          </div>
        ) : (
          messages.map((msg: ChatMessage) => (
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
                {msg.sprite ? formatSpriteName(msg.sprite) : msg.username}
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
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            className="flex-grow bg-gray-700 text-white px-2 py-1 rounded-l focus:outline-none"
            placeholder={
              isProximityMode
                ? "Chat with nearby players..."
                : "Ask your subconscious mind..."
            }
          />
          <button
            type="submit"
            className="text-white px-3 py-1 rounded-r bg-purple-600"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
