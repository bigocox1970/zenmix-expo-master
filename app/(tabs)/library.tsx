import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { Music2, Users, Play, Pause, CreditCard as Edit, Trash2, Upload, Check, ChevronDown, Volume2, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Track {
  id: string;
  name: string;
  category: string;
  url: string;
  created_at: string;
  category_id: string;
  user_id: string;
  is_public: boolean;
  is_built_in: boolean;
  duration: number;
}

interface Mix {
  id: string;
  name: string;
  duration: number;
  is_public: boolean;
  created_at: string;
  user_id: string;
}

interface AudioRef {
  element?: HTMLAudioElement;
  sound?: Audio.Sound;
  progress?: number;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'nature', label: 'Nature' },
  { id: 'music', label: 'Music' },
  { id: 'beats', label: 'Beats' },
  { id: 'voice', label: 'Voice Guided' },
];

const TABS = [
  { id: 'built-in', label: 'Built-in Sounds', icon: Music2 },
  { id: 'my-library', label: 'My Library', icon: Music2 },
  { id: 'community', label: 'Community', icon: Users },
];

export default function LibraryScreen() {
  const { selectMode, trackId } = useLocalSearchParams<{ selectMode: string; trackId: string }>();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [activeTab, setActiveTab] = useState('built-in');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showMyMixes, setShowMyMixes] = useState(false);
  const [mixes, setMixes] = useState<Mix[]>([]);
  const [isLoadingMixes, setIsLoadingMixes] = useState(false);
  const [playingProgress, setPlayingProgress] = useState<{ [key: string]: number }>({});
  const audioRef = useRef<AudioRef>({});
  const progressInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      }).catch(console.error);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (Platform.OS === 'web' && audioRef.current?.element) {
        audioRef.current.element.pause();
        audioRef.current.element.src = '';
      } else if (audioRef.current?.sound) {
        audioRef.current.sound.unloadAsync();
      }
      audioRef.current = {};
    };
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [activeTab, activeCategory]);

  useEffect(() => {
    if (activeTab === 'my-library' && showMyMixes) {
      fetchMixes();
    }
  }, [activeTab, showMyMixes]);

  async function fetchMixes() {
    try {
      setIsLoadingMixes(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('mixes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMixes(data || []);
    } catch (err) {
      console.error('Error fetching mixes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mixes');
    } finally {
      setIsLoadingMixes(false);
    }
  }

  async function fetchTracks() {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from('audio_tracks').select('*');

      if (activeTab === 'built-in') {
        query = query.eq('is_built_in', true);
      } else if (activeTab === 'my-library') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          query = query.eq('user_id', user.id);
        }
      } else if (activeTab === 'community') {
        query = query.eq('is_public', true).eq('is_built_in', false);
      }

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory.toLowerCase());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTracks(data || []);
    } catch (err) {
      console.error('Error fetching tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tracks');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Please sign in to upload tracks');
      }

      setIsLoading(true);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('audio')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('audio_tracks')
        .insert({
          name: file.name,
          url: publicUrl,
          category: activeCategory === 'all' ? 'music' : activeCategory,
          user_id: user.id,
          is_public: false,
          is_built_in: false,
        });

      if (dbError) throw dbError;

      fetchTracks();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  }

  async function playSound(track: Track) {
    try {
      setIsLoading(true);

      // Stop currently playing track
      if (Platform.OS === 'web' && audioRef.current?.element) {
        audioRef.current.element.pause();
        audioRef.current.element.src = '';
      } else if (audioRef.current?.sound) {
        await audioRef.current.sound.unloadAsync();
      }
      
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }

      if (playingTrackId === track.id) {
        setPlayingTrackId(null);
        setPlayingProgress(prev => ({ ...prev, [track.id]: 0 }));
        return;
      }

      if (Platform.OS === 'web') {
        const audioElement = new window.Audio(track.url);
        audioElement.loop = true;
        await audioElement.play();
        audioRef.current = { element: audioElement };

        progressInterval.current = setInterval(() => {
          if (audioElement.duration) {
            const progress = (audioElement.currentTime / audioElement.duration) * 100;
            setPlayingProgress(prev => ({ ...prev, [track.id]: progress }));
          }
        }, 100);
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: track.url },
          { 
            shouldPlay: true,
            isLooping: true,
            progressUpdateIntervalMillis: 100,
          },
          (status) => {
            if (status.isLoaded && status.durationMillis) {
              const progress = (status.positionMillis / status.durationMillis) * 100;
              setPlayingProgress(prev => ({ ...prev, [track.id]: progress }));
            }
          }
        );

        audioRef.current = { sound };
        await sound.playAsync();
      }

      setPlayingTrackId(track.id);
    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingTrackId(null);
      setPlayingProgress(prev => ({ ...prev, [track.id]: 0 }));
    } finally {
      setIsLoading(false);
    }
  }

  const handleTrackSelect = (track: Track) => {
    if (selectMode === 'true' && trackId) {
      setSelectedTrack(track);
      setShowConfirmModal(true);
    } else {
      playSound(track);
    }
  };

  const handleConfirmTrackSelection = () => {
    if (selectedTrack && trackId) {
      router.push({
        pathname: '/(tabs)/mixer',
        params: {
          selectedTrackId: selectedTrack.id,
          selectedTrackName: selectedTrack.name,
          mixerTrackId: trackId
        }
      });
    }
  };

  const handleMixPress = async (mixId: string) => {
    try {
      // Fetch mix details
      const { data: mix, error: mixError } = await supabase
        .from('mixes')
        .select('*')
        .eq('id', mixId)
        .single();

      if (mixError) throw mixError;

      // Fetch mix tracks
      const { data: mixTracks, error: tracksError } = await supabase
        .from('mix_tracks')
        .select(`
          *,
          track:track_id (
            id,
            name,
            url
          )
        `)
        .eq('mix_id', mixId);

      if (tracksError) throw tracksError;

      // Navigate to mixer with mix data
      router.push({
        pathname: '/(tabs)/mixer',
        params: {
          mixId,
          mixName: mix.name,
          mixDuration: mix.duration,
          mixIsPublic: mix.is_public,
          mixTracks: JSON.stringify(mixTracks)
        }
      });
    } catch (err) {
      console.error('Error loading mix:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mix');
    }
  };

  const renderTrack = ({ item }: { item: Track }) => {
    const isPlaying = playingTrackId === item.id;
    const progress = playingProgress[item.id] || 0;

    return (
      <TouchableOpacity 
        style={styles.trackItem}
        onPress={() => handleTrackSelect(item)}
      >
        <View style={styles.trackInfo}>
          <View style={[styles.trackIcon, isPlaying && styles.trackIconPlaying]}>
            <Music2 size={20} color={isPlaying ? '#6366f1' : '#fff'} />
          </View>
          <View>
            <Text style={styles.trackName}>{item.name}</Text>
            {isPlaying && (
              <Text style={styles.playingText}>Now Playing</Text>
            )}
          </View>
        </View>

        <View style={styles.trackMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>

          {!selectMode && (
            <View style={styles.trackActions}>
              <TouchableOpacity 
                style={[styles.actionButton, isPlaying && styles.actionButtonActive]}
                onPress={() => playSound(item)}
                disabled={isLoading}
              >
                {isPlaying ? (
                  <Pause size={16} color="#fff" />
                ) : (
                  <Play size={16} color="#6366f1" />
                )}
              </TouchableOpacity>
              {!item.is_built_in && (
                <>
                  <TouchableOpacity style={styles.actionButton}>
                    <Edit size={16} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {isPlaying && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderMix = ({ item }: { item: Mix }) => (
    <TouchableOpacity 
      style={styles.mixItem}
      onPress={() => handleMixPress(item.id)}
    >
      <View style={styles.mixInfo}>
        <View style={styles.mixIcon}>
          <Music2 size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.mixName}>{item.name}</Text>
          <Text style={styles.mixDuration}>{item.duration} minutes</Text>
        </View>
      </View>
      
      <View style={styles.mixMeta}>
        {item.is_public && (
          <View style={styles.publicBadge}>
            <Text style={styles.publicText}>Public</Text>
          </View>
        )}
        <TouchableOpacity style={styles.editButton}>
          <Edit size={16} color="#6366f1" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Audio Library</Text>
        <Text style={styles.pageSubtitle}>
          Explore our collection of meditation sounds, music, and guided sessions
        </Text>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <tab.icon 
              size={20} 
              color={activeTab === tab.id ? '#fff' : '#666'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              activeCategory === category.id && styles.activeCategoryButton
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text style={[
              styles.categoryButtonText,
              activeCategory === category.id && styles.activeCategoryButtonText
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[
              styles.viewButton,
              viewMode === 'list' && styles.activeViewButton
            ]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[
              styles.viewButtonText,
              viewMode === 'list' && styles.activeViewButtonText
            ]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.viewButton,
              viewMode === 'grid' && styles.activeViewButton
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Text style={[
              styles.viewButtonText,
              viewMode === 'grid' && styles.activeViewButtonText
            ]}>
              Grid
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.uploadButton}
          onPress={handleUpload}
          disabled={isLoading}
        >
          <Upload size={16} color="#fff" />
          <Text style={styles.uploadButtonText}>
            {isLoading ? 'Uploading...' : 'Upload Audio'}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'my-library' && (
        <TouchableOpacity 
          style={styles.myMixesButton}
          onPress={() => setShowMyMixes(!showMyMixes)}
        >
          <View style={styles.myMixesHeader}>
            <Music2 size={20} color="#6366f1" />
            <Text style={styles.myMixesTitle}>My Mixes</Text>
            <ChevronDown 
              size={20} 
              color="#6366f1"
              style={[
                styles.myMixesArrow,
                showMyMixes && styles.myMixesArrowOpen
              ]} 
            />
          </View>
        </TouchableOpacity>
      )}

      {activeTab === 'my-library' && showMyMixes ? (
        <FlatList
          data={mixes}
          renderItem={renderMix}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            isLoadingMixes ? (
              <Text style={styles.loadingText}>Loading mixes...</Text>
            ) : (
              <Text style={styles.emptyText}>No mixes found</Text>
            )
          }
        />
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderTrack}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tracks found</Text>
          }
        />
      )}

      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Add Track to Mix</Text>
            <Text style={styles.confirmText}>
              Do you want to add "{selectedTrack?.name}" to Track {parseInt(trackId || '0') + 1}?
            </Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, styles.confirmButtonConfirm]}
                onPress={handleConfirmTrackSelection}
              >
                <Check size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Add Track</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {isLoading && !tracks.length ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tracks...</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  pageHeader: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  tabsContainer: {
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 16,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  categoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#1a1a1a',
  },
  activeCategoryButton: {
    backgroundColor: '#6366f1',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: 14,
  },
  activeCategoryButtonText: {
    color: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 2,
  },
  viewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeViewButton: {
    backgroundColor: '#333',
  },
  viewButtonText: {
    color: '#666',
    fontSize: 14,
  },
  activeViewButtonText: {
    color: '#fff',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 20,
  },
  trackItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackIconPlaying: {
    backgroundColor: '#818cf8',
  },
  trackName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  playingText: {
    color: '#6366f1',
    fontSize: 12,
    marginTop: 2,
  },
  trackMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: '#374151',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
  },
  trackActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#818cf8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  confirmTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  confirmText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonCancel: {
    backgroundColor: '#262626',
  },
  confirmButtonConfirm: {
    backgroundColor: '#6366f1',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  myMixesButton: {
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  myMixesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  myMixesTitle: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  myMixesArrow: {
    transform: [{ rotate: '0deg' }],
  },
  myMixesArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  mixItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mixInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mixIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mixName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  mixDuration: {
    color: '#666',
    fontSize: 14,
  },
  mixMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicBadge: {
    backgroundColor: '#374151',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  publicText: {
    color: '#fff',
    fontSize: 12,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 2,
    backgroundColor: '#262626',
    marginTop: 8,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
});