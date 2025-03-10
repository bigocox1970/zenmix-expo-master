import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { formatTime } from '../../utils/timeUtils';

interface MasterPlayerProps {
  isPlaying: boolean;
  progress: number;
  volume: number;
  duration: number;
  onPlayPause: () => void;
  onVolumeChange: (value: number) => void;
  onOpenSettings: () => void;
}

const MasterPlayer: React.FC<MasterPlayerProps> = ({
  isPlaying,
  progress,
  volume,
  duration,
  onPlayPause,
  onVolumeChange,
  onOpenSettings,
}) => {
  const remainingTime = duration - (progress * duration);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPlayPause} style={styles.playButton}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color="white"
        />
      </TouchableOpacity>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progress, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>-{formatTime(remainingTime)}</Text>
        </View>
      </View>

      <View style={styles.volumeContainer}>
        <Ionicons name="volume-medium" size={20} color="white" />
        <Slider
          style={styles.volumeSlider}
          minimumValue={0}
          maximumValue={1}
          value={volume}
          onValueChange={onVolumeChange}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#333"
          thumbTintColor="#fff"
        />
      </View>

      <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
        <Ionicons name="settings-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  playButton: {
    padding: 10,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  timeContainer: {
    width: 50,
    alignItems: 'center',
  },
  timeText: {
    color: '#666',
    fontSize: 12,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    gap: 8,
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  settingsButton: {
    padding: 10,
  },
});

export default MasterPlayer; 