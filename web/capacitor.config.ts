import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.loop.app',
  appName: 'Loop',
  webDir: 'out',

  server: {
    url: 'https://loop-ochre-gamma.vercel.app/',
    cleartext: false, // Enforce HTTPS — prevent mixed content issues
    androidScheme: 'https', // Use HTTPS scheme for Android WebView (critical for cookies/auth)
  },

  // Android-specific WebView optimizations
  android: {
    // Prevent stale WebView cache causing infinite loading after reopening
    webContentsDebuggingEnabled: false, // Disable in production (set true for debugging)
    allowMixedContent: false, // Block mixed HTTP/HTTPS content
    captureInput: true, // Better keyboard handling
    backgroundColor: '#000000', // Prevent white flash on app resume
  },

  plugins: {
    // Splash screen — prevents white screen on app start/resume
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
