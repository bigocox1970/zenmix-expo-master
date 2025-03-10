import { Platform } from 'react-native';
import { Audio } from 'expo-av';

// Add getDuration method to web audio implementation
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

    getDuration: () => {
      return new Promise((resolve) => {
        if (audio.duration && !isNaN(audio.duration)) {
          // Store exact duration in seconds
          const durationSeconds = Math.round(audio.duration);
          resolve(durationSeconds);
        } else {
          // If duration isn't available yet, wait for it to load
          audio.addEventListener('loadedmetadata', () => {
            const durationSeconds = Math.round(audio.duration);
            resolve(durationSeconds);
          });
          
          // Handle errors
          audio.addEventListener('error', () => {
            console.error('Error loading audio duration');
            resolve(180); // Default to 180 seconds (3 minutes) if we can't get duration
          });
        }
      });
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
        // Convert milliseconds to seconds and round to nearest second
        return Math.round((status.durationMillis || 0) / 1000);
      }
      return 180; // Default to 180 seconds if we can't get duration
    } catch (error) {
      console.error('Error getting native audio duration:', error);
      return 180; // Default to 180 seconds on error
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
    console.log(`Updated track ${trackId} duration to ${duration} seconds`);
    return true;
  } catch (error) {
    console.error('Error in updateAudioTrackDuration:', error);
    return false;
  }
};

// Helper function to format duration as MM:SS
export const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Default export for routing
export default {
  createSimpleWebAudio,
  getAudioDuration,
  updateAudioTrackDuration,
  formatDuration
}; 