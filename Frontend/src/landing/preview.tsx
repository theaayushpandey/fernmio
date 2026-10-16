import { FC, useEffect, useRef } from 'react'

export const PreviewMedia: FC<{ stream: MediaStream }> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.srcObject = stream

    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Suppress initial autoplay errors if blocked by browser,
        // the user can explicitly trigger it later if needed.
        console.warn('Autoplay prevented')
      })
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover scale-x-[-1]"
    />
  )
}
