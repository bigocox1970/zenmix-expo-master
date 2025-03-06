import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Modal, Switch, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LogOut, User, Camera, ChevronRight, X, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

interface Profile {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  subscription_type: string;
  default_duration: number;
  preferred_voice: string;
  preferred_background: string;
  notifications_enabled: boolean;
}

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const VOICE_OPTIONS = ['Female', 'Male', 'Neutral'];
const BACKGROUND_OPTIONS = [
  'Nature Sounds',
  'Ocean Waves',
  'Rain',
  'Forest',
  'White Noise',
  'Meditation Bells',
  'None'
];

type PreferenceType = 'duration' | 'voice' | 'background';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedNickname, setEditedNickname] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [currentPreference, setCurrentPreference] = useState<PreferenceType | null>(null);
  const [tempPreferenceValue, setTempPreferenceValue] = useState<string | number>('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.replace('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditedNickname(data.nickname);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/auth');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log out');
    }
  }

  async function handleUpdateProfile() {
    if (!profile) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: editedNickname,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, nickname: editedNickname } : null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePreference() {
    if (!profile || !currentPreference) return;

    try {
      setLoading(true);
      const updates: Partial<Profile> = {};

      switch (currentPreference) {
        case 'duration':
          updates.default_duration = Number(tempPreferenceValue);
          break;
        case 'voice':
          updates.preferred_voice = String(tempPreferenceValue);
          break;
        case 'background':
          updates.preferred_background = String(tempPreferenceValue);
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      setShowPreferenceModal(false);
      setCurrentPreference(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenPreference(type: PreferenceType) {
    setCurrentPreference(type);
    switch (type) {
      case 'duration':
        setTempPreferenceValue(profile?.default_duration || 15);
        break;
      case 'voice':
        setTempPreferenceValue(profile?.preferred_voice || 'Female');
        break;
      case 'background':
        setTempPreferenceValue(profile?.preferred_background || 'Nature Sounds');
        break;
    }
    setShowPreferenceModal(true);
  }

  function renderPreferenceOptions() {
    if (!currentPreference) return null;

    let options: (string | number)[] = [];
    switch (currentPreference) {
      case 'duration':
        options = DURATION_OPTIONS;
        break;
      case 'voice':
        options = VOICE_OPTIONS;
        break;
      case 'background':
        options = BACKGROUND_OPTIONS;
        break;
    }

    return options.map((option) => (
      <TouchableOpacity
        key={option}
        style={[
          styles.preferenceOption,
          tempPreferenceValue === option && styles.preferenceOptionSelected
        ]}
        onPress={() => setTempPreferenceValue(option)}
      >
        <Text style={[
          styles.preferenceOptionText,
          tempPreferenceValue === option && styles.preferenceOptionTextSelected
        ]}>
          {currentPreference === 'duration' ? `${option} minutes` : option}
        </Text>
        {tempPreferenceValue === option && (
          <Check size={20} color="#fff" />
        )}
      </TouchableOpacity>
    ));
  }

  async function handleUpdateAvatar() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        Alert.alert('Feature Coming Soon', 'Avatar upload will be available in the next update');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update avatar');
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No profile found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Your Profile</Text>
        <Text style={styles.pageSubtitle}>Manage your account and preferences</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={40} color="#666" />
              </View>
            )}
            <TouchableOpacity style={styles.changeAvatarButton} onPress={handleUpdateAvatar}>
              <Text style={styles.changeAvatarText}>Change Avatar</Text>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Max size: 2MB</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              style={styles.input}
              value={profile.nickname}
              onChangeText={setEditedNickname}
              placeholder="Enter nickname"
              placeholderTextColor="#666"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={profile.email}
              editable={false}
            />
            <Text style={styles.inputHint}>Email cannot be changed</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meditation Preferences</Text>
          
          <TouchableOpacity 
            style={styles.preferenceButton}
            onPress={() => handleOpenPreference('duration')}
          >
            <View>
              <Text style={styles.preferenceLabel}>Default Duration</Text>
              <Text style={styles.preferenceValue}>{profile.default_duration} minutes</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.preferenceButton}
            onPress={() => handleOpenPreference('voice')}
          >
            <View>
              <Text style={styles.preferenceLabel}>Voice Type</Text>
              <Text style={styles.preferenceValue}>{profile.preferred_voice}</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.preferenceButton}
            onPress={() => handleOpenPreference('background')}
          >
            <View>
              <Text style={styles.preferenceLabel}>Background Sound</Text>
              <Text style={styles.preferenceValue}>{profile.preferred_background}</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytics & Settings</Text>
          
          <TouchableOpacity style={styles.settingButton}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Meditation Stats</Text>
              <Text style={styles.settingDescription}>View your meditation progress and insights</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>App Settings</Text>
              <Text style={styles.settingDescription}>Configure app behavior and preferences</Text>
            </View>
            <ChevronRight size={20} color="#666" />
          </TouchableOpacity>

          <View style={styles.switchSetting}>
            <Text style={styles.switchLabel}>Enable daily meditation reminders</Text>
            <Switch
              value={profile.notifications_enabled}
              onValueChange={(value) => {
                setProfile(prev => prev ? { ...prev, notifications_enabled: value } : null);
              }}
              trackColor={{ false: '#333', true: '#2563eb' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleUpdateProfile}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showPreferenceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPreferenceModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {currentPreference === 'duration' && 'Select Duration'}
                {currentPreference === 'voice' && 'Select Voice Type'}
                {currentPreference === 'background' && 'Select Background'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowPreferenceModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.preferenceList}>
              {renderPreferenceOptions()}
            </ScrollView>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleUpdatePreference}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 0,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  changeAvatarButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  changeAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarHint: {
    color: '#666',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  inputHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  selectInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    color: '#fff',
    fontSize: 16,
  },
  settingButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#666',
    fontSize: 14,
  },
  switchSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  switchLabel: {
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 20,
  },
  preferenceButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  preferenceLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceValue: {
    color: '#666',
    fontSize: 14,
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
  closeButton: {
    padding: 4,
  },
  preferenceList: {
    marginBottom: 20,
  },
  preferenceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  preferenceOptionSelected: {
    backgroundColor: '#2563eb',
  },
  preferenceOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  preferenceOptionTextSelected: {
    fontWeight: '600',
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
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#666',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
});