import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export const BackgroundAudio = () => {
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Initialize YouTube player when API is ready
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('youtube-player', {
        height: '0',
        width: '0',
        videoId: 'hVFaaUEIpzE',
        playerVars: {
          'autoplay': 1,
          'controls': 0,
          'disablekb': 1,
          'enablejsapi': 1,
          'fs': 0,
          'rel': 0,
          'loop': 1,
          'playlist': 'hVFaaUEIpzE'
        },
        events: {
          'onReady': (event: any) => {
            event.target.playVideo();
            event.target.setVolume(50); // Set initial volume to 50%
          },
          'onError': (event: any) => {
            console.error('YouTube player error:', event);
          }
        }
      });
    };

    // Cleanup function
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, []);

  return (
    <div id="youtube-player" style={{ display: 'none' }} />
  );
}; 