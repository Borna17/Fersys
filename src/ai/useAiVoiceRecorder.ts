import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  transcribeAiAudio,
} from '../services/aiAssistant.service'

export function useAiVoiceRecorder(
  onTranscript: (
    value: string,
  ) => void,
) {
  const [
    isRecording,
    setIsRecording,
  ] = useState(false)

  const [
    isTranscribing,
    setIsTranscribing,
  ] = useState(false)

  const [voiceError, setVoiceError] =
    useState('')

  const recorderRef =
    useRef<MediaRecorder | null>(
      null,
    )

  const streamRef =
    useRef<MediaStream | null>(
      null,
    )

  const chunksRef =
    useRef<Blob[]>([])

  useEffect(() => {
    return () => {
      if (
        recorderRef.current &&
        recorderRef.current
          .state !== 'inactive'
      ) {
        recorderRef.current.stop()
      }

      streamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop(),
        )
    }
  }, [])

  async function startRecording() {
    if (
      isRecording ||
      isTranscribing
    ) {
      return
    }

    try {
      setVoiceError('')

      if (
        !navigator.mediaDevices
          ?.getUserMedia
      ) {
        throw new Error(
          'Ovaj preglednik ne podržava mikrofon.',
        )
      }

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true,
          })

      streamRef.current =
        stream

      chunksRef.current = []

      const mimeType =
        MediaRecorder.isTypeSupported(
          'audio/webm;codecs=opus',
        )
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported(
                'audio/mp4',
              )
            ? 'audio/mp4'
            : ''

      const recorder =
        mimeType
          ? new MediaRecorder(
              stream,
              {
                mimeType,
              },
            )
          : new MediaRecorder(
              stream,
            )

      recorderRef.current =
        recorder

      recorder.ondataavailable = (
        event,
      ) => {
        if (
          event.data.size > 0
        ) {
          chunksRef.current.push(
            event.data,
          )
        }
      }

      recorder.onstop =
        async () => {
          setIsRecording(
            false,
          )

          streamRef.current
            ?.getTracks()
            .forEach(
              (track) =>
                track.stop(),
            )

          streamRef.current =
            null

          const blob =
            new Blob(
              chunksRef.current,
              {
                type:
                  recorder.mimeType ||
                  'audio/webm',
              },
            )

          if (
            blob.size === 0
          ) {
            setVoiceError(
              'Snimka je prazna.',
            )
            return
          }

          try {
            setIsTranscribing(
              true,
            )

            const text =
              await transcribeAiAudio(
                blob,
              )

            onTranscript(text)
          } catch (value) {
            setVoiceError(
              value instanceof Error
                ? value.message
                : 'Govor nije moguće prepoznati.',
            )
          } finally {
            setIsTranscribing(
              false,
            )
          }
        }

      recorder.start()
      setIsRecording(true)
    } catch (value) {
      setVoiceError(
        value instanceof Error
          ? value.message
          : 'Mikrofon nije moguće pokrenuti.',
      )
    }
  }

  function stopRecording() {
    if (
      recorderRef.current &&
      recorderRef.current
        .state !== 'inactive'
    ) {
      recorderRef.current.stop()
    }
  }

  return {
    isRecording,
    isTranscribing,
    voiceError,
    startRecording,
    stopRecording,
  }
}
