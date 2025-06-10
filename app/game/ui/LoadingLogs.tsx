import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type LogType = 'info' | 'warn' | 'error';

interface LoadingLog {
  message: string;
  type: LogType;
  timestamp: number;
}

interface LoadingProgress {
  progress: number;
  currentAsset: string;
  totalAssets: number;
  loadedAssets: number;
}

export const LoadingLogs: React.FC = () => {
  const [logs, setLogs] = useState<LoadingLog[]>([]);
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleConsole = (type: LogType, ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');

      setLogs(prev => [...prev, {
        message,
        type,
        timestamp: Date.now()
      }]);

      // Auto-hide after 5 seconds of no new logs
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timeout);
    };

    // Override console methods
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error
    };

    console.log = (...args) => {
      originalConsole.log(...args);
      handleConsole('info', ...args);
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      handleConsole('warn', ...args);
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      handleConsole('error', ...args);
    };

    // Cleanup
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, []);

  const handleProgressUpdate = (data: LoadingProgress) => {
    setProgress(data);
    setIsVisible(true);
  };

  useEffect(() => {
    // Listen for progress updates
    const handleProgress = (event: CustomEvent<LoadingProgress>) => {
      handleProgressUpdate(event.detail);
    };

    window.addEventListener('loadingProgress' as any, handleProgress as any);
    return () => {
      window.removeEventListener('loadingProgress' as any, handleProgress as any);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed bottom-4 left-4 z-50 w-96 max-h-96 overflow-y-auto bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white shadow-lg"
        >
          {progress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Loading Progress</span>
                <span className="text-sm">{Math.round(progress.progress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-blue-500"
                />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {progress.currentAsset}
              </div>
            </motion.div>
          )}
          
          <div className="space-y-2">
            <AnimatePresence>
              {logs.map((log, index) => (
                <motion.div
                  key={log.timestamp}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`text-sm ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warn' ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  {log.message}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 