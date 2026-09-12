export const SpeechRecognition = {
  async available() {
    return { available: false }
  },
  async checkPermissions() {
    return { speechRecognition: 'denied' }
  },
  async requestPermissions() {
    return { speechRecognition: 'denied' }
  },
  async start() {
    return { matches: [] }
  },
  async stop() {
    return undefined
  },
}
