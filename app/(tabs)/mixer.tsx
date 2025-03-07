import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { Plus, Play, Pause, Save, Volume2, Trash2, Music2, Search, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { TabletModal } from '@/components/TabletModal';
import LoginOverlay from '@/components/LoginOverlay';

// Track interface
interface Track {
  id: string;
  name: string;
  volume: number;
  isPlaying: boolean;
  audioTrackId?: string;
  url?: string;
  loopTime: number; // Loop time in seconds
}

// Library track interface
interface LibraryTrack {
  id: string;
  name: string;
  category: string;
  url: string;
  is_built_in: boolean;
}

// Add interface for track progress
interface TrackProgress {
  [key: string]: {
    current: number;
    duration: number;
    percent: number;
  };
}

// Add an interface for the audio references
interface AudioRef {
  element?: HTMLAudioElement;
  sound?: Audio.Sound;
  loopHandler?: EventListener;
}

export default function MixerScreen() {
  const params = useLocalSearchParams();
  
  // Log params for debugging
  useEffect(() => {
    console.log('Mixer params:', JSON.stringify(params, null, 2));
  }, [params]);
  
  const [settings, setSettings] = useState({
    name: '',
    duration: 30,
    isPublic: false,
  });

  // Initialize with only 4 tracks
  const [tracks, setTracks] = useState<Track[]>([
    { id: 'track-0', name: '', volume: 1, isPlaying: false, loopTime: 30 },
    { id: 'track-1', name: '', volume: 1, isPlaying: false, loopTime: 30 },
    { id: 'track-2', name: '', volume: 1, isPlaying: false, loopTime: 30 },
    { id: 'track-3', name: '', volume: 1, isPlaying: false, loopTime: 30 },
  ]);

  const [masterProgress, setMasterProgress] = useState(0);
  const [isMasterPlaying, setIsMasterPlaying] = useState(false);
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number | null>(null);
  const [libraryTracks, setLibraryTracks] = useState<LibraryTrack[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: AudioRef }>({});
  const progressInterval = useRef<NodeJS.Timeout>();
  const [trackProgress, setTrackProgress] = useState<TrackProgress>({});
  const progressTimers = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [showVolumeSlider, setShowVolumeSlider] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Format time in MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add a new track (up to 8 total)
  const addNewTrack = () => {
    if (tracks.length < 8) {
      setTracks(prev => [
        ...prev,
        { id: `track-${prev.length}`, name: '', volume: 1, isPlaying: false, loopTime: 30 },
      ]);
    }
  };

  // Handle adding a sound to a track
  const handleAddSound = (index: number) => {
    console.log(`Opening sound picker for track ${index + 1}`);
    
    // Reset search and category filters when opening the picker
    setSearchQuery('');
    setActiveCategory('all');
    
    // Set the selected track index
    setSelectedTrackIndex(index);
    
    // Fetch library tracks before showing the picker
    fetchLibraryTracks().then(() => {
      console.log('Showing sound picker after fetching tracks');
      setShowSoundPicker(true);
    }).catch(err => {
      console.error('Error fetching tracks before showing picker:', err);
      // Still show the picker even if fetching fails
      setShowSoundPicker(true);
    });
  };

  // Load mix data from params if available
  useEffect(() => {
    const loadMixData = async () => {
      console.log('Checking for mix data in params:', params);
      
      // Check if we have mix data in params
      if (params.mixId) {
        console.log(`Loading mix: ${params.mixId}`);
        
        try {
          // Set mix settings
          setSettings({
            name: params.mixName as string || 'Untitled Mix',
            duration: parseInt(params.mixDuration as string) || 30,
            isPublic: (params.mixIsPublic as string) === 'true',
          });
          
          // Fetch mix tracks directly from database
          console.log('Fetching mix tracks directly from database...');
          const { data: mixTracksData, error } = await supabase
            .from('mix_tracks')
            .select(`
              *,
              track:track_id (*)
            `)
            .eq('mix_id', params.mixId);
            
          if (error) {
            console.error('Error fetching mix tracks:', error);
            throw error;
          }
          
          console.log('Mix tracks fetched from database:', mixTracksData);
          
          if (Array.isArray(mixTracksData) && mixTracksData.length > 0) {
            // Create new tracks array based on mix tracks
            const newTracks: Track[] = [...tracks]; // Create a copy of the tracks array
            
            // Update tracks with mix data
            mixTracksData.forEach((mixTrack, idx) => {
              if (idx < newTracks.length && mixTrack.track) {
                console.log(`Adding track ${idx + 1}:`, mixTrack.track);
                newTracks[idx] = {
                  id: newTracks[idx].id,
                  name: mixTrack.track.name,
                  volume: mixTrack.volume || 1,
                  isPlaying: false,
                  audioTrackId: mixTrack.track.id,
                  url: mixTrack.track.url,
                  loopTime: newTracks[idx].loopTime,
                };
              } else {
                console.log(`Track ${idx + 1} not added:`, 
                  idx < newTracks.length ? 'Index in range' : 'Index out of range',
                  mixTrack.track ? 'Track data exists' : 'No track data'
                );
              }
            });
            
            console.log('Final tracks array:', newTracks);
            setTracks(newTracks);
          } else {
            console.log('No mix tracks found or empty array returned');
          }
        } catch (err) {
          console.error('Error loading mix data:', err);
          alert('Failed to load mix data. Please try again.');
        }
      }
    };
    
    loadMixData();
    
    // Request audio permissions on mount
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

    // Clean up on unmount
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      
      // Clear all track progress timers
      Object.keys(progressTimers.current).forEach(key => {
        clearInterval(progressTimers.current[key]);
      });
      
      // Clean up any audio
      Object.keys(audioRefs.current).forEach(async (key) => {
        const audioRef = audioRefs.current[key];
        if (audioRef?.sound) {
          try {
            await audioRef.sound.unloadAsync();
          } catch (err) {
            console.error('Error unloading sound:', err);
          }
        }
      });
    };
  }, []);

  useEffect(() => {
    checkAuthStatus();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  async function checkAuthStatus() {
    try {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  }

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchLibraryTracks = useCallback(async () => {
    console.log('Fetching library tracks...');

    try {
      setIsLoadingLibrary(true);
      
      const fetchPromise = supabase
        .from('audio_tracks')
        .select('*')
        .order('name');
      
      const { data, error } = await fetchPromise;
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Library tracks fetched:', data ? data.length : 0, 'tracks');
      
      // Check if data is valid
      if (!data || !Array.isArray(data)) {
        console.error('Invalid data format received:', data);
        throw new Error('Invalid data format received from server');
      }
      
      // Log the first few tracks to help with debugging
      if (data.length > 0) {
        console.log('Sample tracks:', data.slice(0, 3));
      } else {
        console.log('No tracks found in the database');
      }
      
      setLibraryTracks(data);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      
      // More specific error message based on the error type
      let errorMessage = 'Failed to load sounds. Please try again.';
      if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  // Handle selecting a sound from the library
  const handleSelectSound = (sound: LibraryTrack) => {
    console.log('Selected sound:', sound);
    if (selectedTrackIndex === null) return;
    
    setTracks(prev => prev.map((track, idx) => 
      idx === selectedTrackIndex 
        ? { ...track, name: sound.name, url: sound.url, audioTrackId: sound.id }
        : track
    ));
    
    setShowSoundPicker(false);
    setSelectedTrackIndex(null);
  };

  // Preview a sound
  const handlePreviewSound = async (sound: LibraryTrack) => {
    try {
      // If already playing this sound, stop it
      if (playingPreviewId === sound.id) {
        const audioRef = audioRefs.current[sound.id];
        
        if (Platform.OS === 'web') {
          if (audioRef?.element) {
            try {
              audioRef.element.pause();
              audioRef.element.src = '';
            } catch (err) {
              console.error('Error stopping web preview:', err);
            }
          }
        } else {
          if (audioRef?.sound) {
            try {
              await audioRef.sound.stopAsync();
              await audioRef.sound.unloadAsync();
            } catch (err) {
              console.error('Error stopping mobile preview:', err);
            }
          }
        }
        
        delete audioRefs.current[sound.id];
        setPlayingPreviewId(null);
        return;
      }
      
      // Stop any currently playing preview
      if (playingPreviewId) {
        const audioRef = audioRefs.current[playingPreviewId];
        
        if (Platform.OS === 'web') {
          if (audioRef?.element) {
            try {
              audioRef.element.pause();
              audioRef.element.src = '';
            } catch (err) {
              console.error('Error stopping previous web preview:', err);
            }
          }
        } else {
          if (audioRef?.sound) {
            try {
              await audioRef.sound.stopAsync();
              await audioRef.sound.unloadAsync();
            } catch (err) {
              console.error('Error stopping previous mobile preview:', err);
            }
          }
        }
        
        delete audioRefs.current[playingPreviewId];
      }
      
      // Play the new sound
      if (Platform.OS === 'web') {
        try {
          const audioElement = new window.Audio(sound.url);
          
          // Add event listeners before playing
          audioElement.addEventListener('error', (e: Event) => {
            console.error('Preview audio element error:', e);
          });
          
          // Safe event handler for ended
          audioElement.onended = function() {
            try {
              setPlayingPreviewId(null);
              delete audioRefs.current[sound.id];
            } catch (err: unknown) {
              console.error('Error in ended handler:', err);
            }
          };
          
          // Play the audio
          audioElement.play().catch((err: Error) => {
            console.error('Error playing preview audio element:', err);
          });
          
          // Store the element
          audioRefs.current[sound.id] = { element: audioElement };
          setPlayingPreviewId(sound.id);
        } catch (err) {
          console.error('Error setting up web preview audio:', err);
        }
      } else {
        try {
          const { sound: audioSound } = await Audio.Sound.createAsync(
            { uri: sound.url },
            { shouldPlay: true }
          );
          
          audioRefs.current[sound.id] = { sound: audioSound };
          setPlayingPreviewId(sound.id);
          
          // When sound finishes playing
          audioSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingPreviewId(null);
              delete audioRefs.current[sound.id];
            }
          });
        } catch (err) {
          console.error('Error setting up mobile preview audio:', err);
        }
      }
    } catch (err) {
      console.error('Error previewing sound:', err);
    }
  };

  // Play a single track
  const handlePlayTrack = async (trackId: string) => {
    console.log(`Playing track ${trackId}`);
    
    try {
      // Find the track
      const track = tracks.find(t => t.id === trackId);
      if (!track || !track.url) {
        console.error('Track not found or has no URL');
        return;
      }
      
      // Update track state to playing
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, isPlaying: true } : t
      ));
      
      // Play the audio
      if (Platform.OS === 'web') {
        // For web, create an audio element
        const audioElement = new window.Audio(track.url);
        
        // Set loop behavior based on track settings
        audioElement.loop = true;
        
        // Set volume based on track settings
        audioElement.volume = track.volume;
        
        // Add a data attribute to identify this audio element
        audioElement.dataset.trackId = trackId;
        
        // Initialize progress state
        setTrackProgress(prev => ({
          ...prev,
          [trackId]: {
            current: 0,
            duration: 0,
            percent: 0
          }
        }));
        
        // Set up metadata loaded event to get duration
        audioElement.addEventListener('loadedmetadata', () => {
          setTrackProgress(prev => ({
            ...prev,
            [trackId]: {
              ...prev[trackId],
              duration: audioElement.duration || 0
            }
          }));
        });
        
        // Set up loop time handling
        if (track.loopTime > 0) {
          // Create a function to handle looping at specific time
          const handleCustomLoop = (audioElement: HTMLAudioElement, loopTimeMinutes: number) => {
            // Convert minutes to seconds for comparison
            const loopTimeSeconds = loopTimeMinutes * 60;
            
            // Only apply custom loop if loopTime is greater than 0
            if (loopTimeMinutes > 0 && audioElement.currentTime >= loopTimeSeconds) {
              audioElement.currentTime = 0;
            }
          };
          
          // Add timeupdate event listener for custom loop
          audioElement.addEventListener('timeupdate', () => handleCustomLoop(audioElement, track.loopTime));
          
          // Store the handler reference for cleanup
          audioRefs.current[trackId] = { 
            element: audioElement,
            loopHandler: () => handleCustomLoop(audioElement, track.loopTime)
          };
        } else {
          // Store the audio element reference without custom loop
          audioRefs.current[trackId] = { element: audioElement };
        }
        
        // Play the audio
        await audioElement.play();
        
        // Start tracking progress
        startTrackProgressTracking(trackId, audioElement);
      } else {
        // For native, use Expo Audio
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.url },
          { 
            shouldPlay: true,
            isLooping: true,
            volume: track.volume,
            progressUpdateIntervalMillis: 100,
            positionMillis: 0,
          },
          (status) => {
            if (status.isLoaded) {
              // Update progress
              const current = status.positionMillis / 1000;
              const duration = status.durationMillis ? status.durationMillis / 1000 : 0;
              const percent = duration > 0 ? (current / duration) * 100 : 0;
              
              // Handle custom loop time
              if (track.loopTime > 0 && current >= track.loopTime) {
                sound.setPositionAsync(0).catch(err => 
                  console.error('Error resetting position:', err)
                );
              }
              
              setTrackProgress(prev => ({
                ...prev,
                [trackId]: { current, duration, percent }
              }));
            }
          }
        );
        
        // Store the sound reference
        audioRefs.current[trackId] = { sound };
        
        // Start tracking progress
        startTrackProgressTracking(trackId, null, sound);
      }
    } catch (err) {
      console.error('Error playing track:', err);
      
      // Reset playing state on error
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, isPlaying: false } : t
      ));
    }
  };

  // Start tracking progress for a track
  const startTrackProgressTracking = (
    trackId: string, 
    audioElement?: HTMLAudioElement | null, 
    sound?: Audio.Sound | null
  ) => {
    // Clear any existing timer
    if (progressTimers.current[trackId]) {
      clearInterval(progressTimers.current[trackId]);
    }
    
    // Set up progress tracking
    if (Platform.OS === 'web' && audioElement) {
      // For web, set up an interval to update progress
      progressTimers.current[trackId] = setInterval(() => {
        try {
          if (audioElement && !audioElement.paused) {
            setTrackProgress(prev => ({
              ...prev,
              [trackId]: {
                current: audioElement.currentTime,
                duration: audioElement.duration || 0,
                percent: audioElement.duration ? (audioElement.currentTime / audioElement.duration) * 100 : 0
              }
            }));
          }
        } catch (err) {
          console.error('Error updating web track progress:', err);
        }
      }, 250); // Update more frequently for smoother progress
    } else if (sound) {
      // Mobile needs interval to update progress
      progressTimers.current[trackId] = setInterval(async () => {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            setTrackProgress(prev => ({
              ...prev,
              [trackId]: {
                current: status.positionMillis / 1000,
                duration: status.durationMillis ? status.durationMillis / 1000 : 0,
                percent: status.durationMillis ? (status.positionMillis / status.durationMillis) * 100 : 0
              }
            }));
          }
        } catch (err) {
          console.error('Error updating track progress:', err);
        }
      }, 500);
    }
  };

  // Pause a single track
  const handlePauseTrack = async (trackId: string) => {
    console.log(`Pausing track ${trackId}`);
    
    try {
      // Update track state to not playing
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, isPlaying: false } : t
      ));
      
      // Pause the audio
      if (Platform.OS === 'web') {
        const audioRef = audioRefs.current[trackId];
        if (audioRef?.element) {
          audioRef.element.pause();
        }
      } else {
        const audioRef = audioRefs.current[trackId];
        if (audioRef?.sound) {
          await audioRef.sound.pauseAsync();
        }
      }
      
      // Clear progress tracking
      if (progressTimers.current[trackId]) {
        clearInterval(progressTimers.current[trackId]);
        delete progressTimers.current[trackId];
      }
    } catch (err) {
      console.error('Error pausing track:', err);
    }
  };

  // Remove a track's sound
  const handleRemoveTrack = async (trackId: string) => {
    console.log(`Removing track ${trackId}`);
    
    try {
      // First pause the track if it's playing
      if (tracks.find(t => t.id === trackId)?.isPlaying) {
        await handlePauseTrack(trackId);
      }
      
      // Clean up audio resources
      const audioRef = audioRefs.current[trackId];
      if (Platform.OS === 'web') {
        if (audioRef?.element) {
          audioRef.element.pause();
          audioRef.element.src = '';
          
          // Remove custom loop event listener if it exists
          if (audioRef.loopHandler) {
            audioRef.element.removeEventListener('timeupdate', audioRef.loopHandler);
          }
        }
      } else {
        if (audioRef?.sound) {
          await audioRef.sound.unloadAsync();
        }
      }
      
      // Remove the audio reference
      delete audioRefs.current[trackId];
      
      // Clear the track name and URL
      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, name: '', url: undefined, audioTrackId: undefined, isPlaying: false } : t
      ));
    } catch (err) {
      console.error('Error removing track:', err);
    }
  };

  // Toggle master play/pause
  const handleMasterPlayPause = async () => {
    try {
      if (isMasterPlaying) {
        // Pause all tracks
      for (const track of tracks) {
        if (track.isPlaying) {
          await handlePauseTrack(track.id);
        }
      }
        
        // Stop progress tracking
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
        
        setIsMasterPlaying(false);
      } else {
        // Play all tracks that have audio
        const tracksWithAudio = tracks.filter(track => track.url);
        
        if (tracksWithAudio.length === 0) {
          alert('Add sounds to tracks before playing');
        return;
      }

        for (const track of tracksWithAudio) {
          await handlePlayTrack(track.id);
        }
        
        // Start progress tracking
        const startTime = Date.now();
        const duration = settings.duration * 60 * 1000; // Convert minutes to ms
        
        progressInterval.current = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / duration) * 100, 100);
          setMasterProgress(progress);
          
          if (progress >= 100) {
            // Stop all tracks when complete
            tracks.forEach(async track => {
              if (track.isPlaying) {
                await handlePauseTrack(track.id);
              }
            });
            
            if (progressInterval.current) {
              clearInterval(progressInterval.current);
            }
            
            setIsMasterPlaying(false);
          }
        }, 100);
        
        setIsMasterPlaying(true);
      }
    } catch (error) {
      console.error('Error controlling master playback:', error);
    }
  };

  // Handle volume change for a track
  const handleVolumeChange = (trackId: string, newVolume: number) => {
    console.log(`Changing volume for track ${trackId} to ${newVolume}`);
    
    // Update the track's volume in state
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, volume: newVolume } : track
    ));
    
    // Update the audio element or sound object volume
    if (Platform.OS === 'web') {
      // For web, find the audio element for this track in audioRefs
      const audioRef = audioRefs.current[trackId];
      if (audioRef?.element) {
        audioRef.element.volume = newVolume;
        console.log(`Set web audio volume to ${newVolume}`);
      } else {
        console.log(`No audio element found for track ${trackId}`);
      }
    } else {
      // For native, update the Audio.Sound object's volume
      const audioRef = audioRefs.current[trackId];
      if (audioRef?.sound) {
        audioRef.sound.setVolumeAsync(newVolume)
          .then(() => console.log(`Set native audio volume to ${newVolume}`))
          .catch((err: Error) => console.error('Error setting volume:', err));
      } else {
        console.log(`No sound object found for track ${trackId}`);
      }
    }
  };

  // Handle loop time change for a track
  const handleLoopTimeChange = (trackId: string, newLoopTime: number) => {
    console.log(`Changing loop time for track ${trackId} to ${newLoopTime} minutes`);
    
    // Update the track's loop time in state (convert to minutes)
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, loopTime: newLoopTime } : track
    ));
  };

  // Save mix to database
  const saveMix = async () => {
    if (!settings.name) {
      alert('Please enter a name for your mix');
      return;
    }

    try {
      // Check if we're updating an existing mix or creating a new one
      const isUpdate = params.mixId ? true : false;
      let mixId = params.mixId as string;

      console.log(`${isUpdate ? 'Updating' : 'Creating new'} mix: ${settings.name}`);

      // If creating a new mix, insert into mixes table
      if (!isUpdate) {
        const { data: newMix, error: mixError } = await supabase
          .from('mixes')
          .insert({
            name: settings.name,
            duration: settings.duration,
            is_public: settings.isPublic,
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (mixError) {
          console.error('Error creating mix:', mixError);
          throw mixError;
        }

        mixId = newMix.id;
        console.log('Created new mix with ID:', mixId);
      } else {
        // Update existing mix
        const { error: updateError } = await supabase
          .from('mixes')
          .update({
            name: settings.name,
            duration: settings.duration,
            is_public: settings.isPublic
          })
          .eq('id', mixId);

        if (updateError) {
          console.error('Error updating mix:', updateError);
          throw updateError;
        }

        // Delete existing mix tracks to replace them
        const { error: deleteError } = await supabase
          .from('mix_tracks')
          .delete()
          .eq('mix_id', mixId);

        if (deleteError) {
          console.error('Error deleting existing mix tracks:', deleteError);
          throw deleteError;
        }
      }

      // Insert mix tracks for tracks that have audio
      const tracksWithAudio = tracks.filter(track => track.audioTrackId && track.url);
      
      if (tracksWithAudio.length === 0) {
        alert('Your mix needs at least one sound to save.');
        return;
      }

      // Prepare mix tracks for insertion
      const mixTracks = tracksWithAudio.map(track => ({
        mix_id: mixId,
        track_id: track.audioTrackId,
        volume: track.volume
      }));

      // Insert mix tracks
      const { error: tracksError } = await supabase
        .from('mix_tracks')
        .insert(mixTracks);

      if (tracksError) {
        console.error('Error saving mix tracks:', tracksError);
        throw tracksError;
      }

      console.log('Successfully saved mix and tracks');
      alert(`Mix "${settings.name}" saved!`);

      // If it's a new mix, update the URL to include the mix ID
      if (!isUpdate) {
        router.setParams({ mixId });
      }
    } catch (err) {
      console.error('Error saving mix:', err);
      alert('Failed to save mix. Please try again.');
    }
  };

  // Toggle volume slider visibility
  const toggleVolumeSlider = (trackId: string) => {
    setShowVolumeSlider(prev => prev === trackId ? null : trackId);
  };

  // Optimize the sound picker for performance
  const renderSoundItem = useCallback(({ item }: { item: LibraryTrack }) => (
    <View style={styles.soundCard}>
      <View style={styles.soundInfo}>
        <View style={styles.soundIcon}>
          <Music2 size={20} color="#fff" />
        </View>
        <Text style={styles.soundName}>{item.name}</Text>
      </View>

      <View style={styles.soundActions}>
            <TouchableOpacity
              style={[
            styles.previewButton,
            playingPreviewId === item.id && styles.previewButtonActive
          ]}
          onPress={() => handlePreviewSound(item)}
        >
          {playingPreviewId === item.id ? (
            <Pause size={20} color="#fff" />
          ) : (
            <Play size={20} color="#fff" />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.selectButton}
          onPress={() => handleSelectSound(item)}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.selectButtonText}>Add to Track</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [playingPreviewId, handlePreviewSound, handleSelectSound]);

  // Render the sound picker modal with optimizations
  const renderSoundPicker = () => {
    // Calculate the filtered tracks for debugging
    const filteredTracks = libraryTracks.filter(track => 
      (activeCategory === 'all' || track.category === activeCategory) &&
      (searchQuery === '' || track.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    console.log(`Displaying ${filteredTracks.length} tracks after filtering (category: ${activeCategory}, search: "${searchQuery}")`);

    return (
      <TabletModal
        visible={showSoundPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSoundPicker(false)}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.soundPickerContainer} edges={['top', 'left', 'right']}>
          <View style={styles.soundPickerHeader}>
            <Text style={styles.soundPickerTitle}>
              Select Sound for Track {selectedTrackIndex !== null ? (selectedTrackIndex + 1).toString() : ''}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowSoundPicker(false)}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInput}>
              <Search size={20} color="#666" />
              <TextInput
                style={styles.searchField}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search sounds..."
                placeholderTextColor="#666"
                    />
                  </View>
                </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {['all', 'nature', 'music', 'meditation', 'voice', 'binaural'].map(category => {
              const categoryDisplayName = category.charAt(0).toUpperCase() + category.slice(1);
              return (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    activeCategory === category && styles.activeCategoryButton
                  ]}
                  onPress={() => setActiveCategory(category)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    activeCategory === category && styles.activeCategoryButtonText
                  ]}>
                    {categoryDisplayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {isLoadingLibrary ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading sounds...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTracks}
              renderItem={renderSoundItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.soundsList}
              initialNumToRender={8}
              maxToRenderPerBatch={5}
              windowSize={3}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
              getItemLayout={(data, index) => (
                {length: 80, offset: 80 * index, index}
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No sounds found</Text>
                  <Text style={styles.emptySubtext}>
                    {libraryTracks.length > 0 
                      ? "Try changing your search or category filter" 
                      : "No tracks available in the database"}
                  </Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </TabletModal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mixer</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <X size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.nameInput}
          placeholder="Enter mix name"
          placeholderTextColor="#666"
          value={settings.name}
          onChangeText={(text) => setSettings({...settings, name: text})}
        />
        
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.tracksContainer}>
            {tracks.map((track, index) => (
              <View key={track.id} style={styles.trackItem}>
                <View style={styles.trackHeader}>
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackLabel}>Track {(index + 1).toString()}</Text>
                    <Text style={styles.trackName}>{track.name || 'Empty'}</Text>
                  </View>
                  
                  {track.name ? (
                    <View style={styles.trackControls}>
                      <TouchableOpacity
                        style={[styles.trackButton, track.isPlaying && styles.trackButtonActive]}
                        onPress={() => track.isPlaying ? handlePauseTrack(track.id) : handlePlayTrack(track.id)}
                      >
                        {track.isPlaying ? (
                          <Pause size={16} color="#fff" />
                        ) : (
                          <Play size={16} color="#fff" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.trackButton, showVolumeSlider === track.id && styles.trackButtonActive]}
                        onPress={() => toggleVolumeSlider(track.id)}
                      >
                        <Volume2 size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.trackButton}
                        onPress={() => handleRemoveTrack(track.id)}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addSoundButton}
                      onPress={() => handleAddSound(index)}
                    >
                      <Plus size={16} color="#fff" />
                      <Text style={styles.buttonText}>Add Sound</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Track progress bar - only show if track has a name */}
                {track.name && (
                  <View style={styles.trackProgressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${trackProgress[track.id]?.percent || 0}%` 
                          }
                        ]} 
                      />
                    </View>
                    <View style={styles.timeDisplay}>
                      <Text style={styles.timeText}>
                        {formatTime(trackProgress[track.id]?.current || 0)}
                      </Text>
                      <Text style={styles.timeText}>
                        {formatTime(trackProgress[track.id]?.duration || 0)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Add volume slider below track controls if visible */}
                {showVolumeSlider === track.id && (
                  <View style={styles.volumeSliderContainer}>
                    <Text style={styles.volumeLabel}>Volume: {Math.round(track.volume * 100)}%</Text>
                    <View style={styles.sliderContainer}>
                      <TouchableOpacity 
                        style={styles.volumeButton}
                        onPress={() => handleVolumeChange(track.id, Math.max(0, track.volume - 0.1))}
                      >
                        <Text style={styles.volumeButtonText}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.sliderTrack}>
                        <View style={[styles.sliderFill, { width: `${track.volume * 100}%` }]} />
                      </View>
                      <TouchableOpacity 
                        style={styles.volumeButton}
                        onPress={() => handleVolumeChange(track.id, Math.min(1, track.volume + 0.1))}
                      >
                        <Text style={styles.volumeButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={[styles.volumeLabel, { marginTop: 12 }]}>
                      Loop Time: {track.loopTime} {track.loopTime === 1 ? 'minute' : 'minutes'}
                      {track.loopTime === 0 && ' (disabled)'}
                    </Text>
                    <View style={styles.sliderContainer}>
                      <TouchableOpacity 
                        style={styles.volumeButton}
                        onPress={() => handleLoopTimeChange(track.id, Math.max(0, track.loopTime - 1))}
                      >
                        <Text style={styles.volumeButtonText}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.sliderTrack}>
                        <View style={[styles.sliderFill, { width: `${(track.loopTime / 120) * 100}%` }]} />
                      </View>
                      <TouchableOpacity 
                        style={styles.volumeButton}
                        onPress={() => handleLoopTimeChange(track.id, Math.min(120, track.loopTime + 1))}
                      >
                        <Text style={styles.volumeButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
            
            {tracks.length < 8 && (
              <TouchableOpacity 
                style={styles.addTrackButton} 
                onPress={addNewTrack}
              >
                <Plus size={18} color="#fff" />
                <Text style={styles.buttonText}>Add Track</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* SoundCloud-style player */}
      <View style={styles.player}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
                    <View 
                      style={[
                styles.progressFill, 
                { width: `${masterProgress}%` }
                      ]} 
                    />
                  </View>
                </View>
        
        <View style={styles.playerControls}>
          <TouchableOpacity
            style={[styles.playButton, isMasterPlaying && styles.pauseButton]}
            onPress={handleMasterPlayPause}
          >
            {isMasterPlaying ? (
              <Pause size={24} color="#fff" />
            ) : (
              <Play size={24} color="#fff" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveMix}
          >
            <Save size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {renderSoundPicker()}

      <LoginOverlay 
        visible={isAuthenticated === false} 
        message="Please log in to create and save your meditation mixes."
        onLogin={() => setIsAuthenticated(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  nameInput: {
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  tracksContainer: {
    flex: 1,
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackLabel: {
    color: '#666',
    fontSize: 12,
  },
  trackName: {
    color: '#fff',
    fontSize: 16,
  },
  trackControls: {
    flexDirection: 'row',
    gap: 8,
  },
  trackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackButtonActive: {
    backgroundColor: '#6366f1',
  },
  addSoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  addTrackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262626',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  trackProgressContainer: {
    marginTop: 8,
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
    minWidth: 2, // Ensure it's always visible when there's progress
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  player: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    padding: 12,
  },
  progressContainer: {
    marginBottom: 8,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    backgroundColor: '#ef4444',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformContainer: {
    marginTop: 4,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    gap: 1,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1,
    flex: 1,
  },
  // Sound picker styles
  soundPickerContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  soundPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    zIndex: 10,
  },
  soundPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 15,
    zIndex: 5,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchField: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  activeCategoryButton: {
    backgroundColor: '#6366f1',
  },
  categoryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  activeCategoryButtonText: {
    fontWeight: 'bold',
  },
  soundsList: {
    padding: 15,
  },
  soundCard: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  soundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  soundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  soundName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  soundActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  previewButtonActive: {
    backgroundColor: '#6366f1',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  selectButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  volumeSliderContainer: {
    marginTop: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 8,
  },
  volumeLabel: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
  },
  volumeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
