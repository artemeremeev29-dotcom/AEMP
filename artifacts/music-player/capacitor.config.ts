import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aemp.musicplayer',
  appName: 'AEMP',
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
