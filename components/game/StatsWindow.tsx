import { useEffect, useState, useRef } from 'react';
import { useCharacterStore } from '@/lib/game/stores/characterStore';
import { Character } from '@/lib/game/types/character';

// Mock inventory items for now
const INVENTORY_ITEMS = [
  { id: 1, name: 'Health Potion', quantity: 3, type: 'consumable' },
  { id: 2, name: 'Energy Elixir', quantity: 2, type: 'consumable' },
  { id: 3, name: 'Magic Scroll', quantity: 1, type: 'magic' },
  { id: 4, name: 'Ancient Key', quantity: 1, type: 'key' },
  { id: 5, name: 'Treasure Map', quantity: 1, type: 'quest' },
];

export const StatsWindow = () => {
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(useCharacterStore.getState().currentCharacter);
  const [characters, setCharacters] = useState(useCharacterStore.getState().characters);
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'inventory'>('stats');
  const [wheelRotation, setWheelRotation] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const inventoryRef = useRef<HTMLDivElement>(null);

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

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setWheelRotation(scrollTop * 0.5); // Adjust rotation speed here
  };

  if (!currentCharacter) {
    return (
      <div className="fixed bottom-4 right-4 bg-red-500 text-white p-2 rounded-lg shadow-lg text-sm">
        No character selected
      </div>
    );
  }

  const stats = [
    { label: 'LVL', value: currentCharacter.stats.level },
    { label: 'HP', value: `${currentCharacter.stats.health}/${currentCharacter.stats.maxHealth}` },
    { label: 'EP', value: `${currentCharacter.stats.energy}/${currentCharacter.stats.maxEnergy}` },
    { label: 'ATK', value: currentCharacter.stats.attack },
    { label: 'DEF', value: currentCharacter.stats.defense },
    { label: 'SPD', value: currentCharacter.stats.speed },
    { label: 'XP', value: `${currentCharacter.stats.experience}/${currentCharacter.stats.experienceToNextLevel}` },
  ];

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg text-sm">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-base font-bold">{currentCharacter.name}</h2>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="text-white hover:text-gray-300 text-xs"
        >
          {isVisible ? '▼' : '▲'}
        </button>
      </div>
      
      {isVisible && (
        <div className="relative">
          {/* Tab buttons */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-2 py-1 text-xs rounded ${activeTab === 'stats' ? 'bg-white/20' : 'bg-white/5'}`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-2 py-1 text-xs rounded ${activeTab === 'inventory' ? 'bg-white/20' : 'bg-white/5'}`}
            >
              Inventory
            </button>
          </div>
          
          {/* Content area */}
          <div className="relative h-[100px]">
            {/* Stats Scroll */}
            <div 
              ref={statsRef}
              onScroll={handleScroll}
              className={`absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2 ${
                activeTab === 'stats' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } transition-opacity duration-200`}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
              }}
            >
              <div className="space-y-2">
                {stats.map((stat, index) => (
                  <div key={stat.label} className="flex justify-between items-center">
                    <span className="text-gray-400">{stat.label}</span>
                    <span>{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Scroll */}
            <div 
              ref={inventoryRef}
              onScroll={handleScroll}
              className={`absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent pr-2 ${
                activeTab === 'inventory' ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } transition-opacity duration-200`}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
              }}
            >
              <div className="space-y-2">
                {INVENTORY_ITEMS.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-gray-400">{item.name}</span>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                      x{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vault wheel decoration */}
          <div 
            className="absolute -left-2 -right-2 top-1/2 -translate-y-1/2 h-12 bg-gradient-to-r from-gray-800/50 via-gray-700/50 to-gray-800/50 rounded-full border border-gray-600/50 shadow-inner"
            style={{
              transform: `translateY(-50%) rotate(${wheelRotation}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {/* Wheel notches */}
            <div className="flex justify-around items-center h-full">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-3 bg-gray-600/50 rounded-full"
                  style={{
                    transform: `rotate(${i * 30}deg) translateX(20px)`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Inner wheel ring */}
          <div 
            className="absolute -left-1 -right-1 top-1/2 -translate-y-1/2 h-10 bg-gradient-to-r from-gray-700/30 via-gray-600/30 to-gray-700/30 rounded-full border border-gray-500/30"
            style={{
              transform: `translateY(-50%) rotate(${-wheelRotation * 0.5}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            {/* Inner wheel details */}
            <div className="flex justify-around items-center h-full">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-0.5 h-2 bg-gray-500/30 rounded-full"
                  style={{
                    transform: `rotate(${i * 45}deg) translateX(15px)`
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 