import React, { useEffect, useState } from 'react';

interface LoadingProps {
  progress?: number;
  currentAsset?: string;
  totalAssets?: number;
  loadedAssets?: number;
}

export const Loading: React.FC<LoadingProps> = ({
  progress = 0,
  currentAsset = '',
  totalAssets = 0,
  loadedAssets = 0
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="text-white text-xl font-bold mb-4">
        LOADING{dots}
      </div>
      
      {/* Progress bar */}
      <div className="w-64 h-2 bg-white/20 rounded-full mb-2">
        <div 
          className="h-full bg-white rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Loading details */}
      <div className="text-white/80 text-sm font-mono space-y-1">
        {currentAsset && (
          <div className="text-center">
            Loading: {currentAsset}
          </div>
        )}
        {totalAssets > 0 && (
          <div className="text-center">
            Assets: {loadedAssets}/{totalAssets}
          </div>
        )}
        <div className="text-center">
          Progress: {progress.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default Loading;
