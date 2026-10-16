import { useCallback, useState } from 'react'
import type { FC, FormEvent } from 'react'
import {
  IRoom,
  useCreateFormState,
  useLocalState,
  useRemoteState,
} from '../state'

const CreateMeeting: FC = () => {
  const [userNameError, setUserNameError] = useState('')

  const preferences = useLocalState(state => state.preferences)
  const socket = useRemoteState(state => state.socket)

  const { capacity, meetingName, userName, loading, error } =
    useCreateFormState()
  const setState = useCreateFormState.setState

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!userName.trim()) {
        setUserNameError('Please enter your name')
        return
      }

      // Sync name to preferences immediately before navigating/creating
      useLocalState.setState({
        preferences: {
          ...preferences,
          userName,
        },
      })

      if (loading) return

      setState({
        error: null,
        loading: true,
      })
      const room: IRoom = {
        id: '',
        name: meetingName,
        created_by: userName,
        opts: {
          capacity: parseInt(capacity) || 0,
        },
      }
      socket.emit('request:create_room', { room }, err => {
        if (err) {
          setState({
            error: err.message,
          })
        }
        setState({
          loading: false,
        })
      })

      useLocalState.setState({
        preferences: {
          ...preferences,
          userName,
          meetingName,
        },
      })
    },
    [loading, setState, meetingName, userName, capacity, socket, preferences],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Your Name
          </label>
          <input
            className={`w-full glass-input ${userNameError ? 'ring-2 ring-red-400/50' : ''}`}
            value={userName}
            onChange={e => {
              setState({ userName: e.target.value })
              if (userNameError) setUserNameError('')
            }}
            placeholder="Alex Rivera"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Room Name
          </label>
          <input
            className="w-full glass-input"
            value={meetingName}
            onChange={e => setState({ meetingName: e.target.value })}
            placeholder="Design Sync"
          />
        </div>
      </div>

      {/* Capacity Hidden Input fallback or visual if needed */}
      <input type="hidden" value={capacity} />

      {userNameError && (
        <p className="text-xs text-red-500 text-center">{userNameError}</p>
      )}
      {error && <div className="text-sm text-red-500 text-center">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full glass-button flex items-center justify-center gap-3"
      >
        {loading && (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        <span className="material-symbols-outlined text-xl">video_call</span>
        Create Meeting
      </button>
    </form>
  )
}

export default CreateMeeting
