import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Animated, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Plus, Play, Pause, Volume2, Trash2, Music2, ArrowRight, ArrowLeft, Check, X } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import React from 'react';

interface Track {
  id: string;
  name: string;
  volume: number;
  isPlaying: boolean;
  audioTrackId?: string;
  url?: string;
}

interface MixSettings {
  name: string;
  duration: number;
  isPublic: boolean;
}

interface AudioRef {
  element?: HTMLAudioElement;
  sound?: Audio.Sound;
}

interface TrackSettings {
  volume: number;
  loop: boolean;
  loopStart: number;
  loopEnd: number;
  eq: {
    low: number;
    mid: number;
    high: number;
  };
}

const DURATIONS = [5, 10, 15, 20, 30, 45, 60];

export default function MixerScreen() {
  const params = useLocalSearchParams<{
    selectedTrackId: string;
    selectedTrackName: string;
    mixerTrackId: string;
    mixId: string;
    mixName: string;
    mixDuration: string;
    mixIsPublic: string;
    mixTracks: string;
  }>();

  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<MixSettings>({
    name: '',
    duration: 30,
    isPublic: false,
  });

  const [tracks, setTracks] = useState<Track[]>(
    Array(8).fill(null).map((_, i) => ({
      id: `track-${i}`,
      name: '',
      volume: 1,
      isPlaying: false,
    }))
  );

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [trackSettings, setTrackSettings] = useState<{ [key: string]: TrackSettings }>({});
  const [showTrackSettings, setShowTrackSettings] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const audioRefs = useRef<{ [key: string]: AudioRef }>({});

  useEffect(() => {
    // Initialize track settings
    const initialSettings: { [key: string]: TrackSettings } = {};
    tracks.forEach(track => {
      initialSettings[track.id] = {
        volume: track.volume,
        loop: true,
        loopStart: 0,
        loopEnd: 100,
        eq: {
          low: 0,
          mid: 0,
          high: 0
        }
      };
    });
    setTrackSettings(initialSettings);
  }, []);

  const handleTrackPress = (trackId: string) => {
    setSelectedTrack(trackId);
    setShowTrackSettings(true);
  };

  const updateTrackSettings = (trackId: string, updates: Partial<TrackSettings>) => {
    setTrackSettings(prev => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        ...updates
      }
    }));

    // Update audio if playing
    const audioRef = audioRefs.current[trackId];
    if (Platform.OS === 'web' && audioRef?.element) {
      if ('volume' in updates) {
        audioRef.element.volume = updates.volume!;
      }
    } else if (audioRef?.sound) {
      if ('volume' in updates) {
        audioRef.sound.setVolumeAsync(updates.volume!);
      }
    }
  };

  const renderTrackSettings = () => {
    if (!selectedTrack) return null;
    const track = tracks.find(t => t.id === selectedTrack);
    if (!track) return null;

    const settings = trackSettings[selectedTrack];

    return (
      <Modal
        visible={showTrackSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTrackSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{track.name}</Text>
              <TouchableOpacity 
                onPress={() => setShowTrackSettings(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingLabel}>Volume</Text>
              <View style={styles.volumeControl}>
                <Volume2 size={20} color="#666" />
                <View style={styles.slider}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.sliderFill,
                        { width: `${settings.volume * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingLabel}>Equalizer</Text>
              <View style={styles.eqControls}>
                <View style={styles.eqSlider}>
                  <Text style={styles.eqLabel}>Low</Text>
                  <View style={styles.slider}>
                    <View style={styles.sliderTrack}>
                      <View 
                        style={[
                          styles.sliderFill,
                          { width: `${(settings.eq.low + 12) / 24 * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.eqSlider}>
                  <Text style={styles.eqLabel}>Mid</Text>
                  <View style={styles.slider}>
                    <View style={styles.sliderTrack}>
                      <View 
                        style={[
                          styles.sliderFill,
                          { width: `${(settings.eq.mid + 12) / 24 * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.eqSlider}>
                  <Text style={styles.eqLabel}>High</Text>
                  <View style={styles.slider}>
                    <View style={styles.sliderTrack}>
                      <View 
                        style={[
                          styles.sliderFill,
                          { width: `${(settings.eq.high + 12) / 24 * 100}%` }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingLabel}>Loop Settings</Text>
              <View style={styles.loopControls}>
                <View style={styles.loopRange}>
                  <Text style={styles.loopLabel}>Start: {settings.loopStart}%</Text>
                  <Text style={styles.loopLabel}>End: {settings.loopEnd}%</Text>
                </View>
                <View style={styles.loopSlider}>
                  <View style={styles.sliderTrack}>
                    <View 
                      style={[
                        styles.loopRegion,
                        {
                          left: `${settings.loopStart}%`,
                          width: `${settings.loopEnd - settings.loopStart}%`
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const handlePlayTrack = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || !track.url) return;

    try {
      const audioRef = audioRefs.current[trackId];
      if (Platform.OS === 'web' && audioRef?.element) {
        audioRef.element.play();
      } else if (audioRef?.sound) {
        await audioRef.sound.playAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.url },
          { shouldPlay: true, isLooping: true }
        );
        audioRefs.current[trackId] = { sound };
      }

      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, isPlaying: true } : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play track');
    }
  };

  const handlePauseTrack = async (trackId: string) => {
    try {
      const audioRef = audioRefs.current[trackId];
      if (Platform.OS === 'web' && audioRef?.element) {
        audioRef.element.pause();
      } else if (audioRef?.sound) {
        await audioRef.sound.pauseAsync();
      }

      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, isPlaying: false } : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause track');
    }
  };

  const handleAddTrack = async (trackId: string) => {
    router.push({
      pathname: '/(tabs)/library' as const,
      params: { mixerTrackId: trackId }
    });
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      const audioRef = audioRefs.current[trackId];
      if (Platform.OS === 'web' && audioRef?.element) {
        audioRef.element.pause();
        audioRef.element = undefined;
      } else if (audioRef?.sound) {
        await audioRef.sound.unloadAsync();
        audioRef.sound = undefined;
      }

      setTracks(prev => prev.map(t => 
        t.id === trackId ? { ...t, name: '', url: undefined, isPlaying: false } : t
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove track');
    }
  };

  const handlePreviewToggle = async () => {
    if (isPreviewPlaying) {
      // Stop all tracks
      for (const track of tracks) {
        if (track.isPlaying) {
          await handlePauseTrack(track.id);
        }
      }
      setIsPreviewPlaying(false);
    } else {
      // Play all tracks with audio
      for (const track of tracks) {
        if (track.url) {
          await handlePlayTrack(track.id);
        }
      }
      setIsPreviewPlaying(true);
    }
  };

  const handleSaveMix = async () => {
    if (!settings.name) {
      setError('Please enter a name for your mix');
      return;
    }

    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('mixes')
        .insert({
          name: settings.name,
          duration: settings.duration,
          is_public: settings.isPublic,
          user_id: user.id,
          tracks: tracks
            .filter(t => t.url)
            .map(t => ({
              url: t.url,
              name: t.name,
              volume: trackSettings[t.id].volume,
              eq: trackSettings[t.id].eq,
              loop: trackSettings[t.id].loop,
              loopStart: trackSettings[t.id].loopStart,
              loopEnd: trackSettings[t.id].loopEnd,
            }))
        })
        .select()
        .single();

      if (error) throw error;
      
      router.replace({
        pathname: '/(tabs)/mixer' as const,
        params: { id: data.id }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mix');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mix Creator</Text>
        <Text style={styles.subtitle}>Create your perfect meditation mix</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.trackList}>
          {tracks.map((track, index) => (
            <TouchableOpacity
              key={track.id}
              style={[
                styles.track,
                track.name && styles.trackWithAudio,
                selectedTrack === track.id && styles.trackSelected
              ]}
              onPress={() => handleTrackPress(track.id)}
            >
              <View style={styles.trackInfo}>
                <Text style={styles.trackNumber}>{index + 1}</Text>
                <Text style={styles.trackName}>
                  {track.name || 'Empty Track'}
                </Text>
              </View>
              
              <View style={styles.trackControls}>
                {track.name ? (
                  <>
                    <TouchableOpacity
                      style={styles.trackButton}
                      onPress={() => track.isPlaying ? handlePauseTrack(track.id) : handlePlayTrack(track.id)}
                    >
                      {track.isPlaying ? (
                        <Pause size={20} color="#fff" />
                      ) : (
                        <Play size={20} color="#fff" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.trackButton}
                      onPress={() => handleRemoveTrack(track.id)}
                    >
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddTrack(track.id)}
                  >
                    <Plus size={20} color="#fff" />
                    <Text style={styles.addButtonText}>Add Sound</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.mixControls}>
          <TouchableOpacity
            style={[styles.playButton, isPreviewPlaying && styles.playButtonActive]}
            onPress={handlePreviewToggle}
          >
            {isPreviewPlaying ? (
              <Pause size={24} color="#fff" />
            ) : (
              <Play size={24} color="#fff" />
            )}
            <Text style={styles.playButtonText}>
              {isPreviewPlaying ? 'Stop Preview' : 'Preview Mix'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveMix}
          >
            <Text style={styles.saveButtonText}>Save Mix</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderTrackSettings()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  trackList: {
    flex: 1,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  trackWithAudio: {
    borderColor: '#2563eb',
    borderWidth: 1,
  },
  trackSelected: {
    backgroundColor: '#1e293b',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackNumber: {
    color: '#666',
    fontSize: 16,
    marginRight: 12,
  },
  trackName: {
    color: '#fff',
    fontSize: 16,
  },
  trackControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackButton: {
    padding: 8,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  mixControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  playButtonActive: {
    backgroundColor: '#ef4444',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#262626',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  eqControls: {
    gap: 16,
  },
  eqSlider: {
    gap: 8,
  },
  eqLabel: {
    color: '#666',
    fontSize: 14,
  },
  loopControls: {
    gap: 12,
  },
  loopRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loopLabel: {
    color: '#666',
    fontSize: 14,
  },
  loopSlider: {
    height: 20,
    justifyContent: 'center',
  },
  loopRegion: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#6366f1',
    opacity: 0.5,
  },
  closeButton: {
    padding: 8,
  },
});