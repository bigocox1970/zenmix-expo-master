import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { Track } from '../types/mixer';

interface MixParams {
  mixId?: string;
  mixName?: string;
  mixDuration?: string;
  mixIsPublic?: string;
}

export function useMixLoad(
  params: MixParams,
  setTracks: (tracks: Track[]) => void,
  setMixName: (name: string) => void,
  setMixDuration: (duration: number) => void,
  initialTracks: Track[]
) {
  useEffect(() => {
    const loadMixData = async () => {
      if (params.mixId) {
        console.log('Loading mix:', params.mixId);
        
        try {
          // First, get the mix data
          const { data: mixData, error: mixError } = await supabase
            .from('mixes_v2')
            .select('*')
            .eq('id', params.mixId)
            .single();
            
          if (mixError) {
            console.error('Error fetching mix data:', mixError);
            throw mixError;
          }
          
          if (!mixData) {
            console.error('No mix data found');
            return;
          }
          
          console.log('Mix data loaded:', mixData);
          
          setMixName(mixData.name);
          
          const mixTracks = mixData.tracks;
          
          if (Array.isArray(mixTracks) && mixTracks.length > 0) {
            const newTracks: Track[] = [...initialTracks];
            
            // Get all track durations from audio_tracks table
            const trackNames = mixTracks.map(track => track.name).filter(Boolean);
            const { data: audioTracks, error: audioError } = await supabase
              .from('audio_tracks')
              .select('name, duration, url')
              .in('name', trackNames);
              
            if (audioError) {
              console.error('Error fetching track durations:', audioError);
            }
            
            // Create a map of track names to their data
            const trackDataMap = new Map();
            if (Array.isArray(audioTracks)) {
              audioTracks.forEach(track => {
                if (track.duration > 0) {  // Only store if duration is valid
                  trackDataMap.set(track.name, {
                    duration: track.duration,
                    url: track.url
                  });
                }
              });
            }
            
            // Update tracks with their durations and URLs
            mixTracks.forEach((mixTrack, idx) => {
              if (idx < newTracks.length) {
                const name = typeof mixTrack.name === 'string' ? mixTrack.name : String(mixTrack.name || '');
                const trackData = trackDataMap.get(name);
                
                // First try to get duration from audio_tracks
                let duration = trackData?.duration;
                
                // If no duration in audio_tracks, try the saved loop time from the mix
                if (!duration && mixTrack.loopTime) {
                  duration = mixTrack.loopTime;
                }
                
                // If still no duration, use the default
                if (!duration) {
                  duration = 30;
                }
                
                const url = trackData?.url || mixTrack.url;
                
                console.log(`Loading track ${idx + 1}:`, {
                  name,
                  duration,
                  volume: mixTrack.volume
                });
                
                newTracks[idx] = {
                  id: newTracks[idx].id,
                  name,
                  volume: mixTrack.volume || 1,
                  isPlaying: false,
                  loopTime: duration,  // Set loop time to match audio duration
                  progress: 0,
                  url
                };
              }
            });
            
            console.log('Setting tracks:', newTracks);
            setTracks(newTracks);
            
            // Calculate the longest track duration
            const maxTrackDuration = Math.max(...newTracks
              .filter(track => track.name) // Only consider tracks with names
              .map(track => track.loopTime || 0));
            
            // Determine which duration to use:
            // 1. If we have valid tracks with durations, use the longest track
            // 2. If the mix has a stored duration, use that
            // 3. Otherwise, use a default duration
            if (maxTrackDuration > 0) {
              console.log('Setting mix duration to match longest track:', maxTrackDuration);
              setMixDuration(maxTrackDuration);
            } else if (typeof mixData.duration === 'number' && mixData.duration > 0) {
              // Ensure we set the mix duration as a number
              const duration = mixData.duration;
              console.log('Setting mix duration from stored value:', duration);
              setMixDuration(duration);
            } else {
              // Default duration if nothing else is available
              console.log('Setting default mix duration: 300');
              setMixDuration(300);
            }
          }
        } catch (error) {
          console.error('Error loading from mixes_v2:', error);
        }
      } else if (Platform.OS === 'web') {
        const urlParams = new URLSearchParams(window.location.search);
        const mixId = urlParams.get('mixId');
        
        if (mixId) {
          try {
            const { data: mixData, error: mixError } = await supabase
              .from('mixes_v2')
              .select('*')
              .eq('id', mixId)
              .single();
              
            if (mixError) throw mixError;
            
            if (mixData) {
              setMixName(mixData.name);
              
              const mixTracks = mixData.tracks;
              if (Array.isArray(mixTracks) && mixTracks.length > 0) {
                const newTracks = [...initialTracks];
                
                // Get all track durations
                const trackNames = mixTracks.map(track => track.name).filter(Boolean);
                const { data: audioTracks } = await supabase
                  .from('audio_tracks')
                  .select('name, duration, url')
                  .in('name', trackNames);
                
                // Create duration map
                const trackDataMap = new Map();
                if (Array.isArray(audioTracks)) {
                  audioTracks.forEach(track => {
                    if (track.duration > 0) {
                      trackDataMap.set(track.name, {
                        duration: track.duration,
                        url: track.url
                      });
                    }
                  });
                }
                
                mixTracks.forEach((mixTrack, idx) => {
                  if (idx < newTracks.length) {
                    const name = mixTrack.name || '';
                    const trackData = trackDataMap.get(name);
                    
                    // Use audio track duration if available, otherwise fallback to saved loop time
                    const duration = trackData?.duration || mixTrack.loopTime || 30;
                    
                    newTracks[idx] = {
                      id: newTracks[idx].id,
                      name,
                      volume: mixTrack.volume || 1,
                      isPlaying: false,
                      loopTime: duration,
                      progress: 0,
                      url: trackData?.url || mixTrack.url || ''
                    };
                  }
                });
                setTracks(newTracks);
                
                // Calculate the longest track duration
                const maxTrackDuration = Math.max(...newTracks
                  .filter(track => track.name) // Only consider tracks with names
                  .map(track => track.loopTime || 0));
                
                // Use the longest track duration or the stored mix duration
                if (maxTrackDuration > 0) {
                  console.log('Setting mix duration to match longest track:', maxTrackDuration);
                  setMixDuration(maxTrackDuration);
                } else {
                  setMixDuration(mixData.duration || 300);
                }
              }
            }
          } catch (error) {
            console.error('Error loading from mixes_v2 (URL params):', error);
          }
        }
      }
    };
    
    loadMixData();
    
    // Set up audio mode
    const setupAudio = async () => {
      console.log('Setting up audio mode...');
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio mode set successfully.');
      } catch (err) {
        console.error('Failed to set audio mode:', err);
      }
    };
    
    setupAudio();
  }, [params.mixId]);
}

// Default export for routing
export default useMixLoad; 