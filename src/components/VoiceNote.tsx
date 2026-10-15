import { LoaderCircle, Mic, RotateCcw, Square } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { voiceNoteUrl } from '../lib/operations'
import { Button } from './ui'

const MAX_SECONDS = 180
const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

const voiceRecordingSupported = () =>
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && 'MediaRecorder' in window

/** Records one voice note in the browser; `onChange` gets the finished clip, or undefined after a re-record. */
export function VoiceRecorder({ onChange, disabled }: { onChange: (clip?: Blob) => void; disabled?: boolean }) {
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [clipUrl, setClipUrl] = useState<string>()
  const [error, setError] = useState<string>()
  const recorder = useRef<MediaRecorder>(undefined)
  const stream = useRef<MediaStream>(undefined)
  const timer = useRef<number>(undefined)

  const release = () => {
    window.clearInterval(timer.current)
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = undefined
  }
  useEffect(
    () => () => {
      if (recorder.current?.state === 'recording') recorder.current.stop()
      release()
    },
    [],
  )
  useEffect(() => () => (clipUrl ? URL.revokeObjectURL(clipUrl) : undefined), [clipUrl])

  if (!voiceRecordingSupported()) return <p className="text-xs text-stone-600">{t('admin.reports.voiceUnsupported')}</p>

  const start = async () => {
    setError(undefined)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (caught) {
      console.error('voice note: getUserMedia failed', caught)
      const denied = caught instanceof DOMException && (caught.name === 'NotAllowedError' || caught.name === 'SecurityError')
      setError(t(denied ? 'admin.reports.voiceDenied' : 'admin.reports.voiceFailed'))
      return
    }
    const mimeType = MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
    let media: MediaRecorder
    try {
      media = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined)
    } catch (caught) {
      console.error('voice note: MediaRecorder failed', caught)
      release()
      setError(t('admin.reports.voiceFailed'))
      return
    }
    const chunks: Blob[] = []
    media.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data)
    media.onerror = (event) => {
      console.error('voice note: recorder error', event)
      release()
      setRecording(false)
      setError(t('admin.reports.voiceFailed'))
    }
    media.onstop = () => {
      const clip = new Blob(chunks, { type: media.mimeType || mimeType || 'audio/webm' })
      release()
      setRecording(false)
      if (clip.size === 0) {
        console.error('voice note: empty recording')
        setError(t('admin.reports.voiceFailed'))
        return
      }
      setClipUrl(URL.createObjectURL(clip))
      onChange(clip)
    }
    recorder.current = media
    try {
      media.start()
    } catch (caught) {
      console.error('voice note: start failed', caught)
      release()
      setError(t('admin.reports.voiceFailed'))
      return
    }
    setSeconds(0)
    setRecording(true)
    timer.current = window.setInterval(() => {
      setSeconds((value) => {
        if (value + 1 >= MAX_SECONDS) media.stop()
        return value + 1
      })
    }, 1000)
  }
  const stop = () => recorder.current?.stop()
  const redo = () => {
    setClipUrl(undefined)
    onChange(undefined)
  }

  return (
    <div className="grid gap-2">
      <p className="font-semibold text-ink">{t('admin.reports.voiceTitle')}</p>
      {clipUrl ? (
        <div className="grid gap-2">
          <audio controls src={clipUrl} className="w-full" />
          <div>
            <Button disabled={disabled} onClick={redo}>
              <RotateCcw size={15} />
              {t('admin.reports.voiceRedo')}
            </Button>
          </div>
        </div>
      ) : recording ? (
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={stop}>
            <Square size={15} />
            {t('admin.reports.voiceStop')}
          </Button>
          <span role="status" className="text-xs font-semibold text-red-700 tabular-nums">
            {t('admin.reports.voiceRecording')} {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </div>
      ) : (
        <div>
          <Button disabled={disabled} onClick={() => void start()}>
            <Mic size={15} />
            {t('admin.reports.voiceRecord')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

/** Plays a review's voice note from a short-lived signed URL. */
export function VoicePlayer({ voiceKey }: { voiceKey: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string>()
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    voiceNoteUrl(voiceKey).then(
      (signed) => live && setUrl(signed),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [voiceKey])
  if (failed) return <p className="text-xs text-red-700">{t('admin.reports.voiceLoadFailed')}</p>
  if (!url)
    return (
      <LoaderCircle
        size={16}
        className="animate-spin motion-reduce:animate-none"
        aria-label={t('admin.reports.voiceTitle')}
      />
    )
  return <audio controls preload="none" src={url} aria-label={t('admin.reports.voiceTitle')} className="w-full" />
}
