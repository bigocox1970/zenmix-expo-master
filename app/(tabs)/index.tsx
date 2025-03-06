import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Clock, Calendar, TrendingUp, CirclePlay as PlayCircle, Timer, ChevronRight, Terminal } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface SessionStats {
  totalSessions: number;
  totalMinutes: number;
  averageSessionLength: number;
  streak: number;
}

interface RecommendedMix {
  id: string;
  name: string;
  duration: number;
  imageUrl: string;
  category: string;
}

export default function HomeScreen() {
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    totalMinutes: 0,
    averageSessionLength: 0,
    streak: 0,
  });
  const [recommendedMixes, setRecommendedMixes] = useState<RecommendedMix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const [greeting, setGreeting] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    fetchUserStats();
    fetchRecommendedMixes();
    fetchUserProfile();
    setGreeting(getGreeting());
  }, []);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }

  async function fetchUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single();

      if (profile?.nickname) {
        setNickname(profile.nickname);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }

  async function fetchUserStats() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data: sessions, error } = await supabase
        .from('meditation_sessions')
        .select('duration')
        .eq('user_id', user.id);

      if (error) throw error;

      if (sessions) {
        const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
        setStats({
          totalSessions: sessions.length,
          totalMinutes,
          averageSessionLength: sessions.length ? Math.round(totalMinutes / sessions.length) : 0,
          streak: calculateStreak(sessions),
        });
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  async function fetchRecommendedMixes() {
    try {
      setLoading(true);
      const { data: mixes, error } = await supabase
        .from('mixes')
        .select('*')
        .eq('is_public', true)
        .limit(5);

      if (error) throw error;

      const recommendations: RecommendedMix[] = [
        {
          id: '1',
          name: 'Morning Calm',
          duration: 15,
          imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
          category: 'Morning',
        },
        {
          id: '2',
          name: 'Peaceful Night',
          duration: 20,
          imageUrl: 'https://images.unsplash.com/photo-1507502707541-f369a3b18502?w=800',
          category: 'Evening',
        },
        {
          id: '3',
          name: 'Focus Flow',
          duration: 30,
          imageUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800',
          category: 'Focus',
        },
      ];

      setRecommendedMixes(recommendations);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }

  function calculateStreak(sessions: any[]): number {
    return 5; // Placeholder
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.welcomeTitle}>{nickname}</Text>
          </View>
          <TouchableOpacity 
            style={styles.startButton}
            onPress={() => router.push('/(tabs)/mixer')}
          >
            <PlayCircle size={24} color="#fff" />
            <Text style={styles.startButtonText}>Start Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsConsole}>
          <View style={styles.consoleHeader}>
            <Terminal size={16} color="#6366f1" />
            <Text style={styles.consoleTitle}>Meditation Stats</Text>
          </View>
          <View style={styles.consoleContent}>
            <Text style={styles.consoleLine}>
              <Text style={styles.consolePrompt}>$</Text>
              <Text style={styles.consoleCommand}> stats.sessions</Text>
              <Text style={styles.consoleOutput}> → {stats.totalSessions} total</Text>
            </Text>
            <Text style={styles.consoleLine}>
              <Text style={styles.consolePrompt}>$</Text>
              <Text style={styles.consoleCommand}> stats.duration</Text>
              <Text style={styles.consoleOutput}> → {stats.totalMinutes} minutes</Text>
            </Text>
            <Text style={styles.consoleLine}>
              <Text style={styles.consolePrompt}>$</Text>
              <Text style={styles.consoleCommand}> stats.average</Text>
              <Text style={styles.consoleOutput}> → {stats.averageSessionLength} min/session</Text>
            </Text>
            <Text style={styles.consoleLine}>
              <Text style={styles.consolePrompt}>$</Text>
              <Text style={styles.consoleCommand}> stats.streak</Text>
              <Text style={styles.consoleOutput}> → {stats.streak} days</Text>
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.recommendationsScroll}
          >
            {recommendedMixes.map((mix) => (
              <TouchableOpacity 
                key={mix.id}
                style={[styles.recommendationCard, { width: width * 0.7 }]}
                onPress={() => router.push({
                  pathname: '/(tabs)/mixer',
                  params: { mixId: mix.id }
                })}
              >
                <Image 
                  source={{ uri: mix.imageUrl }}
                  style={styles.recommendationImage}
                />
                <View style={styles.recommendationContent}>
                  <View>
                    <Text style={styles.recommendationCategory}>{mix.category}</Text>
                    <Text style={styles.recommendationTitle}>{mix.name}</Text>
                    <Text style={styles.recommendationDuration}>{mix.duration} minutes</Text>
                  </View>
                  <ChevronRight size={20} color="#6366f1" />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/library')}
            >
              <Text style={styles.quickActionTitle}>Browse Library</Text>
              <Text style={styles.quickActionDescription}>
                Explore our collection of meditation tracks and mixes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.quickActionTitle}>View Progress</Text>
              <Text style={styles.quickActionDescription}>
                Track your meditation journey and achievements
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#6366f1',
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  startButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsConsole: {
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#262626',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  consoleTitle: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  consoleContent: {
    padding: 16,
  },
  consoleLine: {
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  consolePrompt: {
    color: '#6366f1',
    fontWeight: '600',
  },
  consoleCommand: {
    color: '#818cf8',
  },
  consoleOutput: {
    color: '#10b981',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  seeAllButton: {
    color: '#6366f1',
    fontSize: 16,
  },
  recommendationsScroll: {
    paddingLeft: 20,
  },
  recommendationCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
  },
  recommendationImage: {
    width: '100%',
    height: 160,
  },
  recommendationContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recommendationCategory: {
    color: '#6366f1',
    fontSize: 14,
    marginBottom: 4,
  },
  recommendationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationDuration: {
    color: '#666',
    fontSize: 14,
  },
  quickActions: {
    padding: 20,
    gap: 12,
  },
  quickActionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  quickActionDescription: {
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
});