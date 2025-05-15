"use client";

import { useEffect } from "react";
import GameComponent from "./GameComponent";
import { StatsWindow } from "@/components/game/StatsWindow";
import { useCharacterStore } from "@/lib/game/stores/characterStore";

export default function GamePage() {
  // Initialize character store
  useEffect(() => {
    console.log('GamePage: Initializing character store');
    const store = useCharacterStore.getState();
    store.initializeCharacters();
    store.setCurrentCharacter('wizard');
    
    // Debug log store state
    console.log('GamePage: Character store state:', {
      currentCharacter: store.currentCharacter,
      characters: Array.from(store.characters.entries())
    });
  }, []);

  return (
    <div className="relative w-full h-screen">
      <GameComponent />
      <StatsWindow />
    </div>
  );
}
