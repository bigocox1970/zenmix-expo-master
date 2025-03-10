import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { X, Volume2, Trash2 } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { Track, TrackSettings, MasterSettings } from '../../types/mixer';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTrackId: string | null;
  tracks: Track[];
  masterSettings: MasterSettings;
  onUpdateTrackSettings: (trackId: string, settings: TrackSettings) => void;
  onUpdateMasterSettings: (settings: Partial<MasterSettings>) => void;
  onDeleteTrack?: (trackId: string) => void;
}

export default function SettingsModal({
  visible,
  onClose,
  selectedTrackId,
  tracks,
  masterSettings,
  onUpdateTrackSettings,
  onUpdateMasterSettings,
  onDeleteTrack,
}: SettingsModalProps) {
  const track = tracks.find(t => t.id === selectedTrackId);
  const [tempLoopTime, setTempLoopTime] = useState(track?.loopTime || 30);
  const [tempDuration, setTempDuration] = useState(masterSettings.duration);
  const [tempVolume, setTempVolume] = useState(
    selectedTrackId ? track?.volume || 1 : masterSettings.volume
  );
  const [isLongDuration, setIsLongDuration] = useState(
    selectedTrackId ? false : masterSettings.isLongDuration
  );

  // Update tempDuration when masterSettings.duration changes
  useEffect(() => {
    if (!selectedTrackId) {
      setTempDuration(masterSettings.duration);
    }
  }, [masterSettings.duration, selectedTrackId]);

  // Update state when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (selectedTrackId) {
        const selectedTrack = tracks.find(t => t.id === selectedTrackId);
        if (selectedTrack) {
          console.log(`Setting modal loop time for track ${selectedTrackId} to:`, selectedTrack.loopTime);
          setTempLoopTime(selectedTrack.loopTime || 30);
          setTempVolume(selectedTrack.volume || 1);
        }
      } else {
        console.log('Setting modal master duration to:', masterSettings.duration);
        setTempDuration(masterSettings.duration);
        setTempVolume(masterSettings.volume);
        setIsLongDuration(masterSettings.isLongDuration);
      }
    }
  }, [visible, selectedTrackId, tracks, masterSettings]);

  const handleSave = () => {
    const volume = Math.min(Math.max(tempVolume, 0), 1);
    
    if (selectedTrackId) {
      const maxDuration = isLongDuration ? 28800 : 3600; // 8 hours or 1 hour
      onUpdateTrackSettings(selectedTrackId, {
        loopTime: Math.min(tempLoopTime, maxDuration),
        volume,
        isLongDuration
      });
    } else {
      const maxDuration = isLongDuration ? 28800 : 3600;
      onUpdateMasterSettings({
        duration: Math.min(tempDuration, maxDuration),
        volume,
        isLongDuration
      });
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    } else {
      const minutesValue = Math.floor(seconds / 60);
      const secondsValue = Math.floor(seconds % 60);
      return `${minutesValue}m ${secondsValue}s`;
    }
  };

  const getMaxDuration = () => isLongDuration ? 28800 : 3600;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.settingsModalContainer}>
        <View style={[
          styles.settingsModalContent,
          Platform.OS === 'web' && styles.settingsModalWebContent
        ]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedTrackId ? 'Track Settings' : 'Master Settings'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.settingsForm}>
            <View style={styles.settingsGroup}>
              <Text style={styles.settingsLabel}>Volume</Text>
              <View style={styles.settingsVolumeContainer}>
                <Volume2 size={20} color="#fff" />
                <Slider
                  minimumValue={0}
                  maximumValue={1}
                  value={tempVolume}
                  onValueChange={setTempVolume}
                  minimumTrackTintColor="#6366f1"
                  maximumTrackTintColor="#333"
                  thumbTintColor="#fff"
                  style={{ flex: 1, height: 40 }}
                />
                <Text style={styles.volumeValue}>
                  {Math.round(tempVolume * 100)}%
                </Text>
              </View>
            </View>

            <View style={styles.settingsGroup}>
              <View style={styles.settingsLabelRow}>
                <Text style={styles.settingsLabel}>
                  {selectedTrackId ? 'Loop Duration' : 'Mix Duration'}
                </Text>
                <Text style={styles.durationValue}>
                  {formatTime(selectedTrackId ? tempLoopTime : tempDuration)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.longDurationToggle}
                onPress={() => {
                  setIsLongDuration(!isLongDuration);
                  const newMax = !isLongDuration ? 28800 : 3600;
                  if (selectedTrackId) {
                    setTempLoopTime(Math.min(tempLoopTime, newMax));
                  } else {
                    setTempDuration(Math.min(tempDuration, newMax));
                  }
                }}
              >
                <View style={[
                  styles.checkbox,
                  isLongDuration && styles.checkboxChecked
                ]}>
                  {isLongDuration && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Extended Duration (up to 8 hours)</Text>
              </TouchableOpacity>
              
              <Slider
                minimumValue={1}
                maximumValue={getMaxDuration()}
                value={selectedTrackId ? tempLoopTime : tempDuration}
                onValueChange={(value) => {
                  const roundedValue = Math.round(value);
                  if (selectedTrackId) {
                    setTempLoopTime(roundedValue);
                  } else {
                    setTempDuration(roundedValue);
                  }
                }}
                minimumTrackTintColor="#6366f1"
                maximumTrackTintColor="#333"
                thumbTintColor="#fff"
                style={{ width: '100%', height: 40 }}
              />
              <View style={styles.durationLabels}>
                <Text style={styles.durationLabel}>1s</Text>
                <Text style={styles.durationLabel}>
                  {isLongDuration ? '8h' : '60m'}
                </Text>
              </View>
            </View>
          </View>

          {selectedTrackId && onDeleteTrack && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                onDeleteTrack(selectedTrackId);
                onClose();
              }}
            >
              <Trash2 size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Track</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  settingsModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
  },
  settingsModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
  },
  settingsModalWebContent: {
    maxWidth: 500,
    marginBottom: 40,
    borderRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsForm: {
    gap: 20,
    padding: 16,
  },
  settingsGroup: {
    gap: 8,
  },
  settingsLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsVolumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  volumeValue: {
    color: '#fff',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  settingsLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  longDurationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
  },
  durationLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  durationLabel: {
    color: '#666',
    fontSize: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 