import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'musicApp',
  webDir: 'www',
  plugins: {
    Filesystem: {
      accessFiles: true
    },
    CapacitorHttp: {
      enabled: true
    },
    android: {
      useLegacyStorage: true,
      webContentsDebuggingEnabled: true
    },
    "SplashScreen": {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: "splash",
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
