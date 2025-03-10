import { useEffect } from 'react';
import { router } from 'expo-router';

// This file is deprecated and replaced by mixer2.tsx
// It now just redirects to the new mixer screen

export default function MixerScreen() {
  useEffect(() => {
    // Redirect to the new mixer screen
    router.replace('/mixer2');
  }, []);
  
  return null; // This component is not rendered
} 