import { Camera } from '@capacitor/camera'
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition'

import { isNativeApp } from '../lib/platform'
import { getPushRegistrationState, type PushRegistrationState } from './pushNotifications.service'

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'limited' | 'unsupported' | 'unknown'

export type DevicePermissionSnapshot = {
  microphone: PermissionState
  speechRecognition: PermissionState
  camera: PermissionState
  photos: PermissionState
  notifications: PushRegistrationState
}

function normalize(value: unknown): PermissionState {
  const text = String(value ?? 'unknown')
  if (['granted', 'denied', 'prompt', 'prompt-with-rationale', 'limited'].includes(text)) return text as PermissionState
  return 'unknown'
}

export async function getDevicePermissionSnapshot(): Promise<DevicePermissionSnapshot> {
  const notifications = await getPushRegistrationState().catch(() => 'unsupported' as PushRegistrationState)
  if (!isNativeApp()) {
    return { microphone: 'unknown', speechRecognition: 'unsupported', camera: 'unknown', photos: 'unknown', notifications }
  }

  const [speech, camera] = await Promise.all([
    SpeechRecognition.checkPermissions().catch(() => null),
    Camera.checkPermissions().catch(() => null),
  ])

  const speechState = normalize(speech?.speechRecognition)
  return {
    microphone: speechState,
    speechRecognition: speechState,
    camera: normalize(camera?.camera),
    photos: normalize(camera?.photos),
    notifications,
  }
}

export async function requestMicrophoneAndSpeech() {
  if (!isNativeApp()) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Mikrofon nije dostupan u ovom pregledniku.')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return
  }
  const result = await SpeechRecognition.requestPermissions()
  if (result.speechRecognition !== 'granted') {
    throw new Error('Mikrofon i prepoznavanje govora nisu dopušteni. Ako si dopuštenje ranije odbio, otvori Postavke telefona → FERSYS i uključi Mikrofon.')
  }
}

export async function requestCameraAndPhotos() {
  if (!isNativeApp()) return
  const result = await Camera.requestPermissions({ permissions: ['camera', 'photos'] })
  if (result.camera !== 'granted' && result.photos !== 'granted' && result.photos !== 'limited') {
    throw new Error('Kamera i fotografije nisu dopuštene. Otvori Postavke telefona → FERSYS i omogući pristup.')
  }
}
