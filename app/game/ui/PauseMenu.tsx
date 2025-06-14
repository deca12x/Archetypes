import React from 'react';

interface PauseMenuProps {
  isVisible: boolean;
  onResume: () => void;
}

const PauseMenu: React.FC<PauseMenuProps> = ({ isVisible, onResume }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Tutorial Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src="/assets/images/tutorial_overlay.webp" 
            alt="Tutorial Controls"
            className="max-w-[80%] max-h-[80%] object-contain"
          />
        </div>
        
        {/* Pause Menu Content */}
        <div className="relative z-10 text-center">
          <h1 className="text-6xl font-bold text-white mb-8 animate-pulse">PAUSE</h1>
          <button
            onClick={onResume}
            className="px-6 py-3 text-white text-xl hover:text-opacity-80 transition-all duration-200"
          >
            Press ESC to Resume
          </button>
        </div>
      </div>
    </div>
  );
};

export default PauseMenu; 