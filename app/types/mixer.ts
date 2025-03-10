import { Platform } from 'react-native';
import { Audio } from 'expo-av';

export interface SimpleWebAudio {
  play: () => Promise<void>;
  pause: () => void;
  setVolume: (volume: number) => void;
  unload: () => void;
  getDuration: () => Promise<number>;
  getCurrentTime: () => Promise<number>;
  seekTo: (time: number) => Promise<void>;
  onProgress?: (callback: (progress: number) => void) => void;
}

export type PlatformSound = {
  web: SimpleWebAudio;
  native: Audio.Sound;
}[Platform['OS'] extends 'web' ? 'web' : 'native'];

export interface Track {
  id: string;
  name: string;
  url?: string;
  volume: number;
  isPlaying: boolean;
  loopTime: number;
  progress: number;
  sound?: PlatformSound;
}

export interface WebAudio extends SimpleWebAudio {
  audio: HTMLAudioElement;
  getDuration: () => Promise<number>;
  getCurrentTime: () => Promise<number>;
  seekTo: (time: number) => Promise<void>;
}

export interface Sound {
  id: string;
  name: string;
  category: string;
  url: string;
}

export interface TrackSettings {
  loopTime: number;
  volume: number;
  isLongDuration: boolean;
}

export interface MasterSettings {
  duration: number;
  volume: number;
  isLongDuration: boolean;
  isPlaying: boolean;
  progress: number;
}

// Default export for routing
const types = {} as const;
export default types; 