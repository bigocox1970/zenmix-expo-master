import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Pause, Settings, Volume2, Plus, Clock } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { Track as TrackType } from '../../types/mixer';
import { formatDuration } from '../../(tabs)/minimal-audio-fix';

interface TrackProps {
  track: TrackType;
  index: number;
  onPlayPause: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onOpenSettings: (trackId: string) => void;
  onAddSound: (index: number) => void;
}

export default function Track({
  track,
  index,
  onPlayPause,
  onVolumeChange,
  onOpenSettings,
  onAddSound,
}: TrackProps) {
  if (!track.name) {
    return (
      <View style={styles.trackItem}>
        <TouchableOpacity
          style={styles.addSoundButton}
          onPress={() => onAddSound(index)}
        >
          <Plus size={16} color="#fff" />
          <Text style={styles.buttonText}>Add Sound</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate remaining time based on progress and loop time
  const calculateRemainingTime = () => {
    if (!track.loopTime) return "0:00";
    const progressPercent = track.progress / 100;
    const elapsedSeconds = track.loopTime * progressPercent;
    const remainingSeconds = Math.max(0, track.loopTime - elapsedSeconds);
    return formatDuration(Math.round(remainingSeconds));
  };

  return (
    <View style={styles.trackItem}>
      <View style={styles.trackTopHalf}>
        <View style={styles.trackInfo}>
          <Text style={styles.trackLabel}>Track {(index + 1).toString()}</Text>
          <Text style={styles.trackName}>{track.name}</Text>
          <View style={styles.durationContainer}>
            <Clock size={12} color="#666" />
            <Text style={styles.durationText}>{formatDuration(track.loopTime)}</Text>
          </View>
        </View>
        <View style={styles.trackControls}>
          <TouchableOpacity
            style={[styles.trackButton, track.isPlaying && styles.trackButtonActive]}
            onPress={() => onPlayPause(track.id)}
          >
            {track.isPlaying ? (
              <Pause size={16} color="#fff" />
            ) : (
              <Play size={16} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => onOpenSettings(track.id)}
          >
            <Settings size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.trackBottomHalf}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${track.progress}%` }]} />
          </View>
          {track.isPlaying && (
            <Text style={styles.countdownText}>{calculateRemainingTime()}</Text>
          )}
        </View>
        <View style={styles.volumeSliderContainer}>
          <Volume2 size={16} color="#fff" />
          <Slider
            minimumValue={0}
            maximumValue={1}
            value={track.volume}
            onValueChange={(value) => onVolumeChange(track.id, value)}
            minimumTrackTintColor="#6366f1"
            maximumTrackTintColor="#333"
            thumbTintColor="#fff"
            style={{ flex: 1, height: 32 }}
          />
          <Text style={styles.volumeValue}>
            {Math.round(track.volume * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  trackTopHalf: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trackBottomHalf: {
    gap: 8,
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
    marginBottom: 4,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#666',
    fontSize: 12,
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
  buttonText: {
    color: '#fff',
    fontSize: 14,
  },
  progressContainer: {
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
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  countdownText: {
    color: '#666',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  volumeSliderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
  },
  volumeValue: {
    color: '#fff',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
}); 