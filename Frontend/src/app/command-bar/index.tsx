import { FC, useState, useEffect } from 'react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  MessageSquare,
  Users,
  PhoneOff,
  Shield,
  Smile,
  Hand,
  MoreHorizontal,
  LayoutGrid,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react'
import {
  requestLeaveRoom,
  startMediaDevice,
  startScreenCapture,
  stopMediaDevice,
  stopScreenCapture,
  useLocalState,
  useRemoteState,
  dummyAudioDevice,
  dummyVideoDevice,
} from '../../state'
import toast, { ToastType } from '../../comps/toast'
import React, { useContext } from 'react'
import { ColorSchemeContext } from '../../utils/theme/theme-context'

interface ControlButtonProps {
  icon: FC<{ className?: string }>
  label: string
  onClick: () => void
  isActive?: boolean
  isDanger?: boolean
  disabled?: boolean
  className?: string
  hasDropdown?: boolean
}

const ControlButton: FC<ControlButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  isActive,
  isDanger,
  disabled,
  className = '',
  hasDropdown = false,
}) => (
  <div className="flex flex-col items-center gap-1">
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-2 rounded-full flex items-center justify-center transition-all duration-200
        ${isActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-700'}
        ${isDanger ? 'bg-red-600 text-white hover:bg-red-700 w-12 h-8 !rounded-full' : 'w-10 h-10'}
        ${className}
      `}
    >
      <Icon className={`${isDanger ? 'w-5 h-5' : 'w-5 h-5'}`} />
      {hasDropdown && !isDanger && (
        <div className="absolute -right-1 bottom-0">
          <ChevronDown className="w-3 h-3 text-gray-500" />
        </div>
      )}
    </button>
    {!isDanger && (
      <span className="text-[10px] font-medium text-gray-600">{label}</span>
    )}
    {isDanger && (
      <span className="text-[10px] font-medium text-gray-600">Leave</span>
    )}
  </div>
)

const Timer: FC = () => {
  const [time, setTime] = useState('00:00')

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - start) / 1000)
      const m = Math.floor(diff / 60)
        .toString()
        .padStart(2, '0')
      const s = (diff % 60).toString().padStart(2, '0')
      setTime(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return <span className="text-sm font-medium text-gray-700">{time}</span>
}

const MyCommandBar: FC = () => {
  // Popups state
  const [showReactions, setShowReactions] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // State handlers
  const toggleChats = () =>
    useLocalState.setState(s => ({
      sidePanelTab: s.sidePanelTab === 'chats' ? undefined : 'chats',
    }))
  const togglePeople = () =>
    useLocalState.setState(s => ({
      sidePanelTab: s.sidePanelTab === 'people' ? undefined : 'people',
    }))
  const toggleWhiteboard = () =>
    useLocalState.setState(s => ({
      whiteboardActive: !s.whiteboardActive,
    }))
  const toggleHand = () => {
    const { handRaised } = useLocalState.getState()
    useLocalState.setState({ handRaised: !handRaised })
    // TODO: Emit socket event
    if (!handRaised) {
      toast('You raised your hand ✋', { type: ToastType.info })
    }
  }

  const [
    currentMicId,
    currentCameraId,
    audioDevices,
    videoDevices,
    displayStreamActive,
    whiteboardActive,
    handRaised,
  ] = useLocalState(state => [
    state.currentMicId,
    state.currentCameraId,
    state.audioDevices,
    state.videoDevices,
    state.screenMediaActive,
    state.whiteboardActive,
    state.handRaised,
  ])

  const connections = useRemoteState(state => state.connections)
  const isRemoteDisplay = connections.some(c => !c.displayStream.empty)
  const [mediaBtnsDisabled, setMediaBtnsDisabled] = useState(false)

  // Theme Context
  const { colorScheme, setColorScheme } = useContext(ColorSchemeContext)
  const isDark = colorScheme === 'dark'

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setColorScheme(newTheme)
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(newTheme)
  }

  // Media handlers (Audio/Video/Screen)
  const handleAudio = async () => {
    setMediaBtnsDisabled(true)
    if (!currentMicId)
      await startMediaDevice(audioDevices[0] || dummyAudioDevice)
    else
      await stopMediaDevice(
        audioDevices.find(d => d.deviceId === currentMicId) || dummyAudioDevice,
      )
    setMediaBtnsDisabled(false)
  }

  const handleVideo = async () => {
    setMediaBtnsDisabled(true)
    if (!currentCameraId)
      await startMediaDevice(videoDevices[0] || dummyVideoDevice)
    else
      await stopMediaDevice(
        videoDevices.find(d => d.deviceId === currentCameraId) ||
          dummyVideoDevice,
      )
    setMediaBtnsDisabled(false)
  }

  const handleScreen = async () => {
    setMediaBtnsDisabled(true)
    if (!displayStreamActive) await startScreenCapture()
    else stopScreenCapture()
    setMediaBtnsDisabled(false)
  }

  const sendReaction = (emoji: string) => {
    toast(`Reaction Sent: ${emoji}`, { type: ToastType.info })
    setShowReactions(false)
  }

  return (
    <>
      <div className="fixed top-0 left-0 w-full h-[72px] bg-white border-b border-gray-200 z-[101] px-4 flex items-center justify-between shadow-sm">
        {/* Left: Security & Timer */}
        <div className="flex items-center gap-4">
          <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
          <Timer />

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          <ControlButton
            icon={MessageSquare}
            label="Chat"
            onClick={toggleChats}
          />
          <ControlButton icon={Users} label="People" onClick={togglePeople} />
          <ControlButton
            icon={MonitorUp}
            label="Whiteboard"
            onClick={toggleWhiteboard}
            isActive={whiteboardActive}
          />
          <ControlButton
            icon={Hand}
            label="Raise"
            onClick={toggleHand}
            isActive={handRaised}
          />

          <div className="relative">
            <ControlButton
              icon={Smile}
              label="React"
              onClick={() => setShowReactions(!showReactions)}
              isActive={showReactions}
            />
            {showReactions && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white shadow-xl rounded-full p-2 flex gap-2 border border-gray-100 animate-in fade-in zoom-in duration-200 z-50">
                {['👍', '❤️', '😂', '😮', '😢', '🎉'].map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="hover:scale-125 transition-transform text-xl p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ControlButton
            icon={LayoutGrid}
            label="View"
            onClick={() => {}} // Placeholder
          />

          <div className="relative">
            <ControlButton
              icon={MoreHorizontal}
              label="More"
              onClick={() => setShowMore(!showMore)}
              isActive={showMore}
            />
            {showMore && (
              <div className="absolute top-full mt-2 right-0 bg-white shadow-xl rounded-lg p-3 w-48 border border-gray-100 z-50">
                <p className="text-sm text-gray-500 text-center">
                  More features coming soon!
                </p>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-gray-300 mx-2" />

          <ControlButton
            icon={currentCameraId ? Video : VideoOff}
            label="Camera"
            onClick={handleVideo}
            isActive={!!currentCameraId}
            hasDropdown
            disabled={mediaBtnsDisabled}
          />
          <ControlButton
            icon={currentMicId ? Mic : MicOff}
            label="Mic"
            onClick={handleAudio}
            isActive={!!currentMicId}
            hasDropdown
            disabled={mediaBtnsDisabled}
          />
          <ControlButton
            icon={displayStreamActive ? MonitorOff : MonitorUp}
            label="Share"
            onClick={handleScreen}
            isActive={displayStreamActive}
            disabled={
              mediaBtnsDisabled || (!displayStreamActive && isRemoteDisplay)
            }
          />

          <div className="h-8 w-px bg-gray-300 mx-2" />

          <ControlButton
            icon={PhoneOff}
            label="Leave" // Label handled internally for danger
            onClick={requestLeaveRoom}
            isDanger
            hasDropdown
          />
        </div>
      </div>
    </>
  )
}

export default MyCommandBar
