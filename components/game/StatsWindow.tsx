import { useEffect, useState } from 'react';
import { useCharacterStore } from '@/lib/game/stores/characterStore';
import { Character } from '@/lib/game/types/character';

export const StatsWindow = () => {
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(useCharacterStore.getState().currentCharacter);
  const [characters, setCharacters] = useState(useCharacterStore.getState().characters);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = useCharacterStore.subscribe(
      (state) => {
        console.log('StatsWindow: Store updated, new state:', state);
        setCurrentCharacter(state.currentCharacter);
        setCharacters(state.characters);
      }
    );

    // Initial state
    const store = useCharacterStore.getState();
    console.log('StatsWindow: Initial store state:', store);
    setCurrentCharacter(store.currentCharacter);
    setCharacters(store.characters);

    return () => {
      unsubscribe();
    };
  }, []);

  if (!currentCharacter) {
    return (
      <div className="fixed top-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg">
        No character selected
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">{currentCharacter.name}</h2>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-white hover:text-gray-300"
        >
          {isVisible ? '▼' : '▲'}
        </button>
      </div>
      
      {isVisible && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>Level:</div>
            <div>{currentCharacter.stats.level}</div>
            <div>Health:</div>
            <div>{currentCharacter.stats.health}/{currentCharacter.stats.maxHealth}</div>
            <div>Energy:</div>
            <div>{currentCharacter.stats.energy}/{currentCharacter.stats.maxEnergy}</div>
            <div>Attack:</div>
            <div>{currentCharacter.stats.attack}</div>
            <div>Defense:</div>
            <div>{currentCharacter.stats.defense}</div>
            <div>Speed:</div>
            <div>{currentCharacter.stats.speed}</div>
            <div>Experience:</div>
            <div>{currentCharacter.stats.experience}/{currentCharacter.stats.experienceToNextLevel}</div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold mb-2">Abilities:</h3>
            <ul className="list-disc list-inside">
              {currentCharacter.abilities.map((ability) => (
                <li key={ability.name} className={ability.isUnlocked ? 'text-white' : 'text-gray-400'}>
                  {ability.name} ({ability.energyCost} EP)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}; 