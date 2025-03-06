import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import React from 'react';

const TABLET_WIDTH = 768;
const windowWidth = Dimensions.get('window').width;

export function TabletViewContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View style={[
        styles.content,
        { width: Math.min(TABLET_WIDTH, windowWidth) }
      ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

// @ts-ignore
const webStyles = StyleSheet.create({
  container: {
    width: '100vw',
    height: '100vh',
  },
  tabletView: {
    // Additional web-specific styles if needed
  },
}); 