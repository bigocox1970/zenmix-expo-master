import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Header from '@/components/Header';
import { View } from 'react-native';
import { TabletViewContainer } from '@/components/TabletViewContainer';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.frameworkReady?.();
    }
  }, []);

  return (
    <TabletViewContainer>
      <View style={{ flex: 1 }}>
        <Header />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="(tabs)" 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="auth" 
            options={{ 
              headerShown: false,
              presentation: 'modal' 
            }} 
          />
        </Stack>
        <StatusBar style="light" />
      </View>
    </TabletViewContainer>
  );
}