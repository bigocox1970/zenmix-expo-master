import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ZenLogo from './ZenLogo';

export default function Header() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.container,
      { paddingTop: Platform.OS === 'web' ? 16 : insets.top }
    ]}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <ZenLogo size={24} color="#fff" />
          <Text style={styles.title}>ZenMix</Text>
        </View>
        <Text style={styles.subtitle}>by Medit8</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    position: Platform.OS === 'web' ? 'sticky' : 'relative',
    top: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
});