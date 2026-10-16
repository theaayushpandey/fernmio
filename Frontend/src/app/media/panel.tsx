import { useLocalState, useRemoteState } from '../../state'
import { FC, ReactNode } from 'react'
import { X, Camera, Mic, MonitorUp, MessageSquare } from 'lucide-react'

const ActionButton: FC<{
  onClick: () => void
  icon: ReactNode
  label: string
}> = ({ onClick, icon, label }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 dark:bg-black/10 dark:hover:bg-black/20 border border-black/5 dark:border-white/5 transition-all outline-none focus:ring-2 focus:ring-blue-500/50"
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
)

export const MediaPanel: React.FC = () => {
  const connections = useRemoteState(state => state.connections)

  const [
    showEmptyMediaPanel,
    currentCameraId,
    currentMicId,
    displayMediaActive,
    screenShareButtonRef,
    cameraButtonRef,
    micButtonRef,
    chatsButtonRef,
  ] = useLocalState(state => [
    state.showEmptyMediaPanel,
    state.currentCameraId,
    state.currentMicId,
    state.screenMediaActive,
    state.screenShareButtonRef,
    state.cameraButtonRef,
    state.micButtonRef,
    state.chatsButtonRef,
  ])

  const showMediaPanel =
    showEmptyMediaPanel &&
    !connections.length &&
    !currentCameraId &&
    !currentMicId &&
    !displayMediaActive

  if (!showMediaPanel) return null

  const handleClick = (ref?: React.RefObject<HTMLButtonElement>) => () => {
    ref?.current?.focus()
    ref?.current?.click()
  }

  const dismissPanel = () => {
    useLocalState.setState({
      showEmptyMediaPanel: false,
    })
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="flex flex-col gap-3 p-4 sm:p-5 liquid-glass-container backdrop-blur-2xl bg-white/60 dark:bg-black/40 border border-white/20 shadow-2xl rounded-2xl max-w-lg w-[calc(100vw-2rem)]">
        {/* Header / Close */}
        <div className="flex justify-between items-start">
          <h3 className="text-gray-900 dark:text-white font-semibold flex-1 pr-6">
            Welcome to the room!
          </h3>
          <button
            onClick={dismissPanel}
            className="p-1 -m-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          You can join the conversation using your camera, microphone, or start
          sharing your screen. If you prefer to stay quiet, just head over to
          the chats.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-1">
          <ActionButton
            onClick={handleClick(cameraButtonRef)}
            icon={<Camera className="w-4 h-4 text-blue-500" />}
            label="Camera"
          />
          <ActionButton
            onClick={handleClick(micButtonRef)}
            icon={<Mic className="w-4 h-4 text-blue-500" />}
            label="Microphone"
          />
          <ActionButton
            onClick={handleClick(screenShareButtonRef)}
            icon={<MonitorUp className="w-4 h-4 text-purple-500" />}
            label="Share Screen"
          />
          <ActionButton
            onClick={handleClick(chatsButtonRef)}
            icon={<MessageSquare className="w-4 h-4 text-green-500" />}
            label="Open Chat"
          />
        </div>
      </div>
    </div>
  )
}
