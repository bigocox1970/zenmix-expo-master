import { Audio } from 'expo-av';
import { Platform } from 'react-native';

interface AudioPlayer {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  unload: () => Promise<void>;
  getDuration: () => Promise<number>;
  getCurrentTime: () => Promise<number>;
  seekTo: (time: number) => Promise<void>;
  isPlaying: boolean;
}

class WebAudioPlayer implements AudioPlayer {
  private audio: HTMLAudioElement;
  public isPlaying: boolean = false;

  constructor(url: string, volume: number = 1) {
    this.audio = new window.Audio(url);
    this.audio.loop = true;
    this.audio.volume = volume;
  }

  async play() {
    try {
      await this.audio.play();
      this.isPlaying = true;
    } catch (error) {
      console.error('Error playing web audio:', error);
      throw error;
    }
  }

  async pause() {
    this.audio.pause();
    this.isPlaying = false;
  }

  async setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  async unload() {
    this.audio.pause();
    this.audio.src = '';
    this.audio.remove();
    this.isPlaying = false;
  }

  async getDuration() {
    return this.audio.duration || 0;
  }

  async getCurrentTime() {
    return this.audio.currentTime || 0;
  }

  async seekTo(time: number) {
    this.audio.currentTime = time;
  }
}

class NativeAudioPlayer implements AudioPlayer {
  private sound: Audio.Sound | null = null;
  public isPlaying: boolean = false;

  constructor(private url: string, private volume: number = 1) {}

  async initialize() {
    if (!this.sound) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: this.url },
        { 
          isLooping: true,
          volume: this.volume,
          shouldPlay: false
        }
      );
      this.sound = sound;
    }
  }

  async play() {
    try {
      await this.initialize();
      if (this.sound) {
        await this.sound.playAsync();
        this.isPlaying = true;
      }
    } catch (error) {
      console.error('Error playing native audio:', error);
      throw error;
    }
  }

  async pause() {
    if (this.sound) {
      await this.sound.pauseAsync();
      this.isPlaying = false;
    }
  }

  async setVolume(volume: number) {
    if (this.sound) {
      await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    }
  }

  async unload() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
      this.isPlaying = false;
    }
  }

  async getDuration() {
    if (!this.sound) return 0;
    const status = await this.sound.getStatusAsync();
    return 'durationMillis' in status ? status.durationMillis! / 1000 : 0;
  }

  async getCurrentTime() {
    if (!this.sound) return 0;
    const status = await this.sound.getStatusAsync();
    return 'positionMillis' in status ? status.positionMillis! / 1000 : 0;
  }

  async seekTo(time: number) {
    if (this.sound) {
      await this.sound.setPositionAsync(time * 1000);
    }
  }
}

export class AudioService {
  static createPlayer(url: string, volume: number = 1): AudioPlayer {
    return Platform.OS === 'web' 
      ? new WebAudioPlayer(url, volume)
      : new NativeAudioPlayer(url, volume);
  }
}

// Default export for routing
export default AudioService; 