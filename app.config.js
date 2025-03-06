export default {
  expo: {
    name: 'bolt-expo-nativewind',
    slug: 'bolt-expo-nativewind',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
      viewport: {
        width: 768,
        scale: 1.0,
        maximumScale: 1.0,
        userScalable: false
      },
      build: {
        babel: {
          include: ['@expo/vector-icons']
        }
      },
      style: {
        content: `
          #root {
            display: flex;
            justify-content: center;
            background-color: #121212;
            min-height: 100vh;
          }
          #root > * {
            max-width: 768px;
            width: 100%;
            margin: 0 auto;
            background-color: #000;
          }
        `
      }
    },
    plugins: ['expo-router'],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};