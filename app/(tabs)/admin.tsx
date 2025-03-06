import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Shield, User, Ban, Crown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  subscription_type: string;
  created_at: string;
}

export default function AdminScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  async function updateUserStatus(userId: string, updates: Partial<Profile>) {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  }

  const renderUserCard = ({ item }: { item: Profile }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <User size={24} color="#666" />
            </View>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.nickname}>{item.nickname}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <Text style={styles.userId}>ID: {item.id}</Text>
        </View>
      </View>

      <View style={styles.badges}>
        {item.is_admin && (
          <View style={[styles.badge, { backgroundColor: '#7c3aed' }]}>
            <Crown size={16} color="#fff" />
            <Text style={styles.badgeText}>Admin</Text>
          </View>
        )}
        <View style={[styles.badge, { 
          backgroundColor: item.subscription_type === 'pro' ? '#2563eb' : '#374151'
        }]}>
          <Text style={styles.badgeText}>
            {item.subscription_type === 'pro' ? 'Pro' : 'Free'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, item.is_admin && styles.actionButtonActive]}
          onPress={() => updateUserStatus(item.id, { is_admin: !item.is_admin })}
        >
          <Crown size={20} color={item.is_admin ? '#7c3aed' : '#666'} />
          <Text style={[styles.actionText, item.is_admin && styles.actionTextActive]}>
            {item.is_admin ? 'Remove Admin' : 'Make Admin'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, item.is_suspended && styles.actionButtonDanger]}
          onPress={() => updateUserStatus(item.id, { is_suspended: !item.is_suspended })}
        >
          <Ban size={20} color={item.is_suspended ? '#dc2626' : '#666'} />
          <Text style={[styles.actionText, item.is_suspended && styles.actionTextDanger]}>
            {item.is_suspended ? 'Unsuspend' : 'Suspend'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Admin Dashboard</Text>
        <Text style={styles.pageSubtitle}>Manage users and system settings</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by email or nickname..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <FlatList
        data={users.filter(user => 
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.nickname.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={fetchUsers}
        refreshing={loading}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    padding: 20,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  list: {
    padding: 20,
  },
  userCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
  nickname: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  userId: {
    color: '#666',
    fontSize: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#262626',
    padding: 12,
    borderRadius: 8,
  },
  actionButtonActive: {
    backgroundColor: '#5b21b6',
  },
  actionButtonDanger: {
    backgroundColor: '#991b1b',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionTextActive: {
    color: '#fff',
  },
  actionTextDanger: {
    color: '#fff',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 12,
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
});