import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aimp4x.musicplayer',
  appName: 'Вольт Плеер',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
