import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.fersys.app',
  appName: 'FERSYS Business',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
