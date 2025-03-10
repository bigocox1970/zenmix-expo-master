import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useLocalSearchParams } from 'expo-router';
import { Track, MasterPlayer, SettingsModal, SoundPicker, SaveMixModal } from '../components/mixer';
import { useMixerState } from '../hooks/useMixerState';
import { useMixSave } from '../hooks/useMixSave';
import { useMixLoad } from '../hooks/useMixLoad';
import { useSoundPicker } from '../hooks/useSoundPicker';
import { Track as TrackType, Sound as SoundType, MasterSettings } from '../types/mixer';
import { mixerStyles } from '../styles/mixer';
import { createSimpleWebAudio, getAudioDuration, updateAudioTrackDuration } from './minimal-audio-fix';
import { supabase } from '../../lib/supabase';

const initialTracks: TrackType[] = [
  { id: 'track-0', name: '', volume: 1, isPlaying: false, loopTime: 30, progress: 0 },
  { id: 'track-1', name: '', volume: 1, isPlaying: false, loopTime: 30, progress: 0 },
  { id: 'track-2', name: '', volume: 1, isPlaying: false, loopTime: 30, progress: 0 },
  { id: 'track-3', name: '', volume: 1, isPlaying: false, loopTime: 30, progress: 0 },
];

export default function MixerScreen2() {
  const params = useLocalSearchParams<{
    mixId: string;
    mixName: string;
    mixDuration: string;
    mixIsPublic: string;
  }>();

  const {
    tracks,
    setTracks,
    masterVolume,
    isAllPlaying,
    mixProgress,
    mixDuration,
    setMixDuration,
    handlePlayPause,
    handleVolumeChange,
    handleMasterVolumeChange,
    handlePlayPauseAll,
  } = useMixerState();

  const {
    isSaveMixModalVisible,
    setIsSaveMixModalVisible,
    mixName,
    setMixName,
    handleSaveMix,
  } = useMixSave();

  const {
    isSoundPickerVisible,
    setIsSoundPickerVisible,
    selectedTrackIndex,
    setSelectedTrackIndex,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    categories,
    sounds,
    isLoading,
    fetchSoundsAndCategories,
    getFilteredSounds,
  } = useSoundPicker();

  // Load mix data first
  useMixLoad(params, setTracks, setMixName, setMixDuration, initialTracks);

  // Settings state - initialize after loading mix data
  const [isSettingsModalVisible, setIsSettingsModalVisible] = React.useState(false);
  const [selectedTrackForSettings, setSelectedTrackForSettings] = React.useState<string | null>(null);
  const [masterSettings, setMasterSettings] = React.useState<MasterSettings>({
    duration: 300, // Default 5 minutes
    volume: masterVolume,
    isPlaying: isAllPlaying,
    progress: mixProgress,
    isLongDuration: false,
  });

  // Update masterSettings when mixDuration changes
  React.useEffect(() => {
    if (mixDuration > 0) {
      console.log('Updating master settings with mix duration:', mixDuration);
      setMasterSettings(prev => ({
        ...prev,
        duration: mixDuration
      }));
    }
  }, [mixDuration]);

  // Handle adding a sound to a track
  const handleAddSound = (index: number) => {
    setSelectedTrackIndex(index);
    setIsSoundPickerVisible(true);
    fetchSoundsAndCategories();
  };

  // Handle selecting a sound
  const handleSelectSound = (sound: SoundType) => {
    if (selectedTrackIndex !== null) {
      setTracks(prev => prev.map((t, index) => 
        index === selectedTrackIndex 
          ? { ...t, name: sound.name, url: sound.url, isPlaying: false }
              : t
          ));
      setIsSoundPickerVisible(false);
      setSelectedTrackIndex(null);
      setSearchQuery('');
    }
  };

  // Handle removing a track
  const handleRemoveTrack = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.sound) {
      try {
        if (Platform.OS === 'web') {
          // Web audio cleanup
          const audio = track.sound as unknown as { unload: () => void };
          audio.unload();
        } else {
          // Native audio cleanup
          const sound = track.sound as Audio.Sound;
          await sound.unloadAsync();
        }
      } catch (error) {
        console.error('Error unloading sound:', error);
      }
    }
    
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, name: '', url: undefined, sound: undefined, isPlaying: false } : t
    ));
  };

  const handleUpdateDurations = async () => {
    try {
      // Get all audio tracks
      const { data: audioTracks, error } = await supabase
        .from('audio_tracks')
        .select('*');
        
      if (error) throw error;
      
      if (Array.isArray(audioTracks)) {
        console.log(`Found ${audioTracks.length} tracks to check for duration updates`);
        
        // Update each track's duration
        for (const track of audioTracks) {
          if (track.url) {
            console.log(`Getting duration for track: ${track.name}`);
            
            try {
          if (Platform.OS === 'web') {
                const webAudio = createSimpleWebAudio(track.url);
                const durationSeconds = await webAudio.getDuration();
                console.log(`Track ${track.name} duration: ${durationSeconds} seconds`);
                
                // Only update if duration has changed
                if (durationSeconds !== track.duration) {
                  await updateAudioTrackDuration(supabase, track.id, durationSeconds);
                  console.log(`Updated duration for ${track.name}`);
                }
              } else {
                const { sound } = await Audio.Sound.createAsync(
                  { uri: track.url },
                  { volume: 0 }
                );
                const status = await sound.getStatusAsync();
                await sound.unloadAsync();
                
                if (status.isLoaded) {
                  const durationSeconds = Math.round((status.durationMillis || 0) / 1000);
                  console.log(`Track ${track.name} duration: ${durationSeconds} seconds`);
                  
                  // Only update if duration has changed
                  if (durationSeconds !== track.duration) {
                    await updateAudioTrackDuration(supabase, track.id, durationSeconds);
                    console.log(`Updated duration for ${track.name}`);
                  }
                }
              }
            } catch (error) {
              console.error(`Error getting duration for track ${track.name}:`, error);
            }
          }
        }
        
        console.log('Finished checking all track durations');
      }
    } catch (error) {
      console.error('Error updating track durations:', error);
    }
  };

    return (
    <SafeAreaView style={mixerStyles.container} edges={['bottom']}>
      <View style={mixerStyles.content}>
        <View style={mixerStyles.header}>
          <Text style={mixerStyles.title}>Mixer</Text>
          <View style={mixerStyles.headerButtons}>
            <TouchableOpacity
              style={mixerStyles.headerButton}
              onPress={() => {
                // Stop all playing tracks
                if (isAllPlaying) handlePlayPauseAll();
                // Reset to initial tracks
                const freshTracks = initialTracks.map(track => ({
                  ...track,
                  name: '',
                  url: undefined,
                  sound: undefined,
                  isPlaying: false
                }));
                setTracks(freshTracks);
                setMixName('');
                setMixDuration(30);
              }}
            >
              <Text style={mixerStyles.headerButtonText}>New Mix</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={mixerStyles.headerButton}
              onPress={() => {
                if (isAllPlaying) handlePlayPauseAll();
                tracks.forEach(track => handleRemoveTrack(track.id));
              }}
            >
              <Text style={mixerStyles.headerButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={mixerStyles.headerButton}
              onPress={() => setIsSaveMixModalVisible(true)}
            >
              <Text style={mixerStyles.headerButtonText}>Save Mix</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={mixerStyles.scrollContainer} contentContainerStyle={mixerStyles.scrollContent}>
          <View style={mixerStyles.tracksContainer}>
            {tracks.map((track, index) => (
              <Track
                key={track.id}
                track={track}
                index={index}
                onPlayPause={handlePlayPause}
                onVolumeChange={handleVolumeChange}
                onOpenSettings={(trackId) => {
                  setSelectedTrackForSettings(trackId);
                  setIsSettingsModalVisible(true);
                }}
                onAddSound={handleAddSound}
              />
            ))}
            
            {tracks.length < 8 && (
              <TouchableOpacity 
                style={mixerStyles.addTrackButton} 
                onPress={() => {
                  setTracks(prev => [
                    ...prev,
                    { id: `track-${prev.length}`, name: '', volume: 1, isPlaying: false, loopTime: 30, progress: 0 },
                  ]);
                }}
              >
                <Plus size={18} color="#fff" />
                <Text style={mixerStyles.buttonText}>Add Track</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <MasterPlayer
          isPlaying={isAllPlaying}
          progress={mixProgress}
          volume={masterVolume}
          duration={mixDuration}
          onPlayPause={handlePlayPauseAll}
          onVolumeChange={handleMasterVolumeChange}
          onOpenSettings={() => {
            setSelectedTrackForSettings(null);
            setIsSettingsModalVisible(true);
          }}
        />
      </View>

      <SoundPicker
        visible={isSoundPickerVisible}
        onClose={() => {
          setIsSoundPickerVisible(false);
          setSelectedTrackIndex(null);
          setSearchQuery('');
        }}
        onSelectSound={handleSelectSound}
        sounds={getFilteredSounds()}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isLoading={isLoading}
      />

      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        selectedTrackId={selectedTrackForSettings}
        tracks={tracks}
        masterSettings={masterSettings}
        onUpdateTrackSettings={(trackId, settings) => {
          setTracks(prev => prev.map(track => 
            track.id === trackId ? { 
              ...track, 
              loopTime: settings.loopTime,
              volume: settings.volume
            } : track
          ));
          handleVolumeChange(trackId, settings.volume);
        }}
        onUpdateMasterSettings={(settings) => {
          // Create a complete MasterSettings object by merging with current settings
          const updatedSettings: MasterSettings = {
            ...masterSettings,
            ...settings,
            // Ensure required properties are present
            duration: settings.duration ?? masterSettings.duration,
            volume: settings.volume ?? masterSettings.volume,
            isPlaying: settings.isPlaying ?? masterSettings.isPlaying,
            progress: settings.progress ?? masterSettings.progress,
            isLongDuration: settings.isLongDuration ?? masterSettings.isLongDuration
          };
          
          setMasterSettings(updatedSettings);
          
          // Only update if values are defined
          if (typeof settings.duration === 'number') {
            setMixDuration(settings.duration);
          }
          
          if (typeof settings.volume === 'number') {
            handleMasterVolumeChange(settings.volume);
          }
        }}
        onDeleteTrack={handleRemoveTrack}
      />

      <SaveMixModal
        visible={isSaveMixModalVisible}
        onClose={() => {
          setIsSaveMixModalVisible(false);
          setMixName('');
        }}
        mixName={mixName}
        onMixNameChange={setMixName}
        onSave={() => handleSaveMix(tracks, mixDuration)}
      />
    </SafeAreaView>
  );
}
