import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.padelle.blameflix',
  appName: 'BlameFlix',
  webDir: 'www',
  backgroundColor: '#141210',
  android: {
    backgroundColor: '#141210'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#E04334'
    }
  }
};

export default config;
