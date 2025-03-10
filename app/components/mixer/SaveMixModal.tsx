import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Platform } from 'react-native';
import { X } from 'lucide-react-native';

interface SaveMixModalProps {
  visible: boolean;
  onClose: () => void;
  mixName: string;
  onMixNameChange: (name: string) => void;
  onSave: () => void;
}

export default function SaveMixModal({
  visible,
  onClose,
  mixName,
  onMixNameChange,
  onSave,
}: SaveMixModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.saveMixModalContainer}>
        <View style={[
          styles.saveMixModalContent,
          Platform.OS === 'web' && styles.saveMixModalWebContent
        ]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Save Mix</Text>
            <TouchableOpacity 
              onPress={onSave}
              style={[
                styles.saveButton,
                !mixName.trim() && styles.saveButtonDisabled
              ]}
              disabled={!mixName.trim()}
            >
              <Text style={[
                styles.saveButtonText,
                !mixName.trim() && styles.saveButtonTextDisabled
              ]}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.saveMixForm}>
            <Text style={styles.saveMixLabel}>Mix Name</Text>
            <TextInput
              style={styles.saveMixInput}
              placeholder="Enter mix name..."
              placeholderTextColor="#666"
              value={mixName}
              onChangeText={onMixNameChange}
              autoFocus
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  saveMixModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveMixModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  saveMixModalWebContent: {
    width: 400,
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
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonTextDisabled: {
    color: '#666',
  },
  saveMixForm: {
    gap: 12,
    marginTop: 20,
  },
  saveMixLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveMixInput: {
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
}); 