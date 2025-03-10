import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { X, Search, Play } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sound } from '../../types/mixer';

interface SoundPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectSound: (sound: Sound) => void;
  sounds: Sound[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
}

export default function SoundPicker({
  visible,
  onClose,
  onSelectSound,
  sounds,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  isLoading,
}: SoundPickerProps) {
  const filteredSounds = sounds.filter(sound => {
    const matchesCategory = selectedCategory === 'All' || sound.category === selectedCategory;
    const matchesSearch = sound.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalFullScreen}>
        <View style={styles.modalFullScreenContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Sound</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search sounds..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category && styles.categoryTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.soundsList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading sounds...</Text>
              </View>
            ) : filteredSounds.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No sounds found</Text>
              </View>
            ) : (
              <View style={styles.soundsGrid}>
                {filteredSounds.map(sound => (
                  <TouchableOpacity
                    key={sound.id}
                    style={styles.soundCard}
                    onPress={() => onSelectSound(sound)}
                  >
                    <View style={styles.soundCardContent}>
                      <View style={styles.soundIconContainer}>
                        <Play size={24} color="#fff" />
                      </View>
                      <Text style={styles.soundName} numberOfLines={2}>{sound.name}</Text>
                      <Text style={styles.soundCategory}>{sound.category}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalFullScreenContent: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  categoriesContainer: {
    marginBottom: 15,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#262626',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#6366f1',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
  },
  categoryTextActive: {
    fontWeight: 'bold',
  },
  soundsList: {
    flex: 1,
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
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  soundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  soundCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  soundCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  soundIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  soundName: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  soundCategory: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
}); 