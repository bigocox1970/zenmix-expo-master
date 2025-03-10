import { useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Track, PlatformSound, SimpleWebAudio } from '../types/mixer';
import { createSimpleWebAudio } from '../utils/audioUtils';

const initialTracks: Track[] = [
  { id: 'track-0', name: '', volume: 1, isPlaying: false, loopTime: 1, progress: 0 },
  { id: 'track-1', name: '', volume: 1, isPlaying: false, loopTime: 1, progress: 0 },
  { id: 'track-2', name: '', volume: 1, isPlaying: false, loopTime: 1, progress: 0 },
  { id: 'track-3', name: '', volume: 1, isPlaying: false, loopTime: 1, progress: 0 },
];

export function useMixerState() {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [masterVolume, setMasterVolume] = useState(1);
  const [isAllPlaying, setIsAllPlaying] = useState(false);
  const [mixProgress, setMixProgress] = useState(0);
  const [mixDuration, setMixDuration] = useState(300); // 5 minutes default in seconds
  const mixStartTimeRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackStartTimesRef = useRef<{ [key: string]: number }>({});

  // Master progress tracking
  useEffect(() => {
    if (isAllPlaying) {
      // Initialize mix start time if not set
      if (!mixStartTimeRef.current) {
        mixStartTimeRef.current = Date.now();
      }
      
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - (mixStartTimeRef.current || Date.now());
        const totalMixDurationMs = mixDuration * 1000; // Convert seconds to ms
        const currentProgress = Math.min(elapsed / totalMixDurationMs, 1);
        
        // Update each track's progress independently
        const updatedTracks = tracks.map(track => {
          if (track.isPlaying && track.sound) {
            const trackStartTime = trackStartTimesRef.current[track.id] || Date.now();
            const trackElapsed = Date.now() - trackStartTime;
            const trackDurationMs = (track.loopTime || 30) * 1000;
            const progressInLoop = ((trackElapsed % trackDurationMs) / trackDurationMs) * 100;
            
            if (currentProgress >= 1) {
              if (Platform.OS === 'web') {
                (track.sound as unknown as SimpleWebAudio).pause();
              } else {
                (track.sound as Audio.Sound).pauseAsync();
              }
              return { ...track, isPlaying: false, progress: 100 };
            }
            
            return { ...track, progress: progressInLoop };
          }
          return track;
        });
        
        setTracks(updatedTracks);
        
        // Update mix progress
        if (currentProgress >= 1) {
          handlePlayPauseAll();
        } else {
          setMixProgress(currentProgress);
        }
      }, 50);
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      // Reset progress when stopped
      setMixProgress(0);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isAllPlaying, mixDuration]);

  const handlePlayPause = async (trackId: string) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        if (!track.sound && track.url) {
          if (Platform.OS === 'web') {
            const webAudio = createSimpleWebAudio(track.url);
            webAudio.play();
            trackStartTimesRef.current[track.id] = Date.now();

            return { ...track, sound: webAudio as unknown as PlatformSound, isPlaying: true, progress: 0 };
          } else {
            Audio.Sound.createAsync(
              { uri: track.url },
              { volume: track.volume * masterVolume, isLooping: true }
            ).then(({ sound }) => {
              sound.playAsync();
              trackStartTimesRef.current[track.id] = Date.now();

              setTracks(prev => prev.map(t => 
                t.id === track.id ? { 
                  ...t, 
                  sound: sound as PlatformSound, 
                  isPlaying: true, 
                  progress: 0
                } : t
              ));
            });
            return track;
          }
        }

        if (track.sound) {
          if (track.isPlaying) {
            if (Platform.OS === 'web') {
              (track.sound as unknown as SimpleWebAudio).pause();
            } else {
              (track.sound as Audio.Sound).pauseAsync();
            }
            return { ...track, isPlaying: false };
          } else {
            if (Platform.OS === 'web') {
              (track.sound as unknown as SimpleWebAudio).play();
            } else {
              (track.sound as Audio.Sound).playAsync();
            }
            trackStartTimesRef.current[track.id] = Date.now();
            return { ...track, isPlaying: true };
          }
        }
      }
      return track;
    }));
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    setTracks(prev => prev.map(track => {
      if (track.id === trackId) {
        if (track.sound) {
          if (Platform.OS === 'web') {
            (track.sound as unknown as SimpleWebAudio).setVolume(volume * masterVolume);
          } else {
            (track.sound as Audio.Sound).setVolumeAsync(volume * masterVolume);
          }
        }
        return { ...track, volume };
      }
      return track;
    }));
  };

  const handleMasterVolumeChange = (value: number) => {
    tracks.forEach(track => {
      if (track.sound) {
        if (Platform.OS === 'web') {
          (track.sound as unknown as SimpleWebAudio).setVolume(track.volume * value);
        } else {
          (track.sound as Audio.Sound).setVolumeAsync(track.volume * value);
        }
      }
    });
    setMasterVolume(value);
  };

  const handlePlayPauseAll = async () => {
    if (!isAllPlaying) {
      // Starting playback
      mixStartTimeRef.current = Date.now();
      trackStartTimesRef.current = {};

      const updatedTracks = await Promise.all(
        tracks.map(async track => {
          if (track.url && !track.sound) {
            if (Platform.OS === 'web') {
              const webAudio = createSimpleWebAudio(track.url);
              await webAudio.play();
              trackStartTimesRef.current[track.id] = Date.now();
              return { ...track, sound: webAudio as unknown as PlatformSound, isPlaying: true, progress: 0 };
            } else {
              const { sound } = await Audio.Sound.createAsync(
                { uri: track.url },
                { isLooping: true, volume: track.volume * masterVolume }
              );
              await sound.playAsync();
              trackStartTimesRef.current[track.id] = Date.now();
              return { ...track, sound: sound as PlatformSound, isPlaying: true, progress: 0 };
            }
          } else if (track.sound) {
            if (Platform.OS === 'web') {
              await (track.sound as unknown as SimpleWebAudio).play();
            } else {
              await (track.sound as Audio.Sound).playAsync();
            }
            trackStartTimesRef.current[track.id] = Date.now();
            return { ...track, isPlaying: true, progress: 0 };
          }
          return track;
        })
      );
      setTracks(updatedTracks);
      setMixProgress(0);
      setIsAllPlaying(true);
    } else {
      // Stopping playback
      const updatedTracks = await Promise.all(
        tracks.map(async track => {
          if (track.sound) {
            if (Platform.OS === 'web') {
              (track.sound as unknown as SimpleWebAudio).pause();
            } else {
              await (track.sound as Audio.Sound).pauseAsync();
            }
            return { ...track, isPlaying: false, progress: 0 };
          }
          return track;
        })
      );
      setTracks(updatedTracks);
      setIsAllPlaying(false);
      setMixProgress(0);
      mixStartTimeRef.current = null;
      trackStartTimesRef.current = {};
    }
  };

  return {
    tracks,
    setTracks,
    masterVolume,
    setMasterVolume,
    isAllPlaying,
    setIsAllPlaying,
    mixProgress,
    setMixProgress,
    mixDuration,
    setMixDuration,
    mixStartTimeRef,
    handlePlayPause,
    handleVolumeChange,
    handleMasterVolumeChange,
    handlePlayPauseAll,
  };
}

// Default export for routing
export default useMixerState; 