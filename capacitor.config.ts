import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'hr.fersys.app',
  appName: 'FERSYS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
