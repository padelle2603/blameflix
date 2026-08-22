import type { CapacitorConfig } from '@capacitor/cli';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

const config: CapacitorConfig = {
  appId: 'com.padelle.blameflix',
  appName: 'BlameFlix',
  version: rootPkg.version,
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
