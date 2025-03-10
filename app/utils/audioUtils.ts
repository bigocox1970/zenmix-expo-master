import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { SimpleWebAudio } from '../types/mixer';

export const createSimpleWebAudio = (url: string): SimpleWebAudio => {
  const audio = new window.Audio(url);
  
  // Add timeupdate event listener for progress tracking
  let onTimeUpdateCallback: ((progress: number) => void) | null = null;
  audio.addEventListener('timeupdate', () => {
    if (onTimeUpdateCallback) {
      const progress = (audio.currentTime / audio.duration) * 100;
      onTimeUpdateCallback(progress);
    }
  });

  return {
    play: async () => {
      try {
        await audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    },
    pause: () => audio.pause(),
    setVolume: (vol: number) => {
      audio.volume = vol;
    },
    unload: () => {
      audio.pause();
      audio.src = '';
      audio.remove();
    },
    getDuration: async () => audio.duration,
    getCurrentTime: async () => audio.currentTime,
    seekTo: async (time: number) => {
      audio.currentTime = time;
      return Promise.resolve();
    },
    onProgress: (callback: (progress: number) => void) => {
      onTimeUpdateCallback = callback;
    }
  };
};

// Default export for routing
export default {
  createSimpleWebAudio
}; 