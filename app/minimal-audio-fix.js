// Minimal Audio Fixes for ZenMix
// This file contains simplified versions of the audio fixes
// that are less likely to cause development server issues

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// ========== iOS PLAYBACK FIX ==========

// Simplified iOS play/pause handler with duration
export const handleIOSPlayPause = async (track, onUpdateTrack) => {
  if (!track) return;
  
  try {
    // If no sound is loaded yet
    if (!track.sound && track.url) {
      // Create sound with explicit play
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { 
          isLooping: true,
          volume: track.volume,
          shouldPlay: false // Don't auto-play
        }
      );
      
      // Get the duration before playing
      const status = await sound.getStatusAsync();
      const durationMs = status.durationMillis || 0;
      const durationMinutes = Math.ceil(durationMs / 1000 / 60);
      
      // Play explicitly
      await sound.playAsync();
      
      // Update track with duration
      onUpdateTrack({ 
        ...track, 
        sound, 
        isPlaying: true,
        loopTime: durationMinutes // Set default loop time to audio duration
      });
    } 
    // If sound exists and is playing, pause it
    else if (track.sound && track.isPlaying) {
      await track.sound.pauseAsync();
      onUpdateTrack({ ...track, isPlaying: false });
    } 
    // If sound exists and is paused, play it
    else if (track.sound && !track.isPlaying) {
      await track.sound.playAsync();
      onUpdateTrack({ ...track, isPlaying: true });
    }
  } catch (error) {
    console.error('Error handling iOS play/pause:', error);
  }
};

// ========== WEB AUDIO FIX ==========

// Simplified web audio implementation with duration
export const createSimpleWebAudio = (url, initialVolume = 1) => {
  // Ensure volume is valid
  const volume = Math.max(0, Math.min(1, initialVolume));
  
  // Create audio element
  const audio = new window.Audio(url);
  audio.loop = true;
  
  // Set volume with a small delay to ensure it's applied
  setTimeout(() => {
    audio.volume = volume;
  }, 50);

  // Create a promise to get the duration
  const getDuration = () => {
    return new Promise((resolve) => {
      if (audio.duration && !isNaN(audio.duration)) {
        resolve(audio.duration);
      } else {
        audio.addEventListener('loadedmetadata', () => {
          resolve(audio.duration);
        });
      }
    });
  };
  
  return {
    // Basic audio interface
    play: async () => {
      try {
        await audio.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    },
    
    pause: () => {
      try {
        audio.pause();
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    },
    
    setVolume: (newVolume) => {
      try {
        // Ensure volume is between 0 and 1
        const safeVolume = Math.max(0, Math.min(1, newVolume));
        audio.volume = safeVolume;
        
        // Log for debugging
        console.log(`Volume set to ${safeVolume}`);
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    },
    
    unload: () => {
      try {
        audio.pause();
        audio.src = '';
      } catch (error) {
        console.error('Error unloading audio:', error);
      }
    },

    // Add method to get duration
    getDuration: async () => {
      try {
        const durationSeconds = await getDuration();
        return Math.ceil(durationSeconds / 60); // Convert to minutes and round up
      } catch (error) {
        console.error('Error getting duration:', error);
        return 1; // Default to 1 minute if we can't get duration
      }
    }
  };
};

// Add function to get audio duration for both platforms
export const getAudioDuration = async (url) => {
  if (Platform.OS === 'web') {
    const webAudio = createSimpleWebAudio(url);
    return await webAudio.getDuration();
  } else {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { volume: 0 } // Load silently
      );
      const status = await sound.getStatusAsync();
      await sound.unloadAsync(); // Clean up
      
      if (status.isLoaded) {
        // Convert milliseconds to minutes and round up
        return Math.ceil((status.durationMillis || 0) / 1000 / 60);
      }
      return 3; // Default to 3 minutes if we can't get duration
    } catch (error) {
      console.error('Error getting native audio duration:', error);
      return 3; // Default to 3 minutes on error
    }
  }
};

// Add function to update audio track duration in database
export const updateAudioTrackDuration = async (supabase, trackId, duration) => {
  try {
    const { error } = await supabase
      .from('audio_tracks')
      .update({ duration })
      .eq('id', trackId);
      
    if (error) {
      console.error('Error updating audio track duration:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in updateAudioTrackDuration:', error);
    return false;
  }
};

// Default export for routing
export default {
  handleIOSPlayPause,
  createSimpleWebAudio,
  getAudioDuration,
  updateAudioTrackDuration
}; 