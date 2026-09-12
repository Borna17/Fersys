export type SpeechRecognitionPermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'

export const SpeechRecognition: {
  available(): Promise<{ available: boolean }>
  checkPermissions(): Promise<{ speechRecognition: SpeechRecognitionPermissionState }>
  requestPermissions(): Promise<{ speechRecognition: SpeechRecognitionPermissionState }>
  start(options?: {
    language?: string
    maxResults?: number
    prompt?: string
    popup?: boolean
    partialResults?: boolean
  }): Promise<{ matches?: string[] }>
  stop(): Promise<void>
}
