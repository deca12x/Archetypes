import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  sprite?: string; // Add the sprite field
  message: string;
  timestamp: number;
  isSelfOnly?: boolean; // Flag to indicate if message is only visible to self
  isAi?: boolean; // Flag to indicate if message is from Nebula AI
}

interface ChatStore {
  messages: ChatMessage[];
  isProximityMode: boolean; // Replace isOpen with isProximityMode
  activeGroupId: string | null;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setProximityMode: (isProximityMode: boolean) => void; // New setter
  setActiveGroupId: (groupId: string | null) => void;
}

export const useChatStore = create<ChatStore>()(
  devtools((set) => ({
    messages: [],
    isProximityMode: false, // Rename from isOpen
    activeGroupId: null,
    addMessage: (message) =>
      set((state) => {
        // Limit to 20 messages
        const updatedMessages = [...state.messages, message];
        if (updatedMessages.length > 20) {
          updatedMessages.shift();
        }
        return { messages: updatedMessages };
      }),
    clearMessages: () => set(() => ({ messages: [] })),
    setProximityMode: (isProximityMode) => set(() => ({ isProximityMode })), // Rename from setIsOpen
    setActiveGroupId: (activeGroupId) => set(() => ({ activeGroupId })),
  }))
);
