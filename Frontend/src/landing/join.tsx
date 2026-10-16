import { useCallback, useState } from 'react'
import type { FormEvent, FC } from 'react'
import { useJoinFormState, useLocalState, useRemoteState } from '../state'

interface JoinProps {}

const JoinMeeting: FC<JoinProps> = () => {
  const [userNameError, setUserNameError] = useState('')

  const [socket] = useRemoteState(state => [state.socket])
  const [preferences] = useLocalState(state => [state.preferences])

  const { loading, error, userName, roomId } = useJoinFormState()
  const setState = useJoinFormState.setState

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      let finalUserName = userName
      // Fallback to preferences if local name is empty (since we might hide the input)
      if (!finalUserName && preferences.userName) {
        finalUserName = preferences.userName
      }

      if (!finalUserName.trim()) {
        setUserNameError('Please enter your name above')
        return
      }
      if (loading) return

      setState({
        loading: true,
        error: null,
      })
      socket.emit(
        'request:join_room',
        { userName: finalUserName, roomId },
        err => {
          if (err) {
            setState({
              error: err.message,
            })
          }
          setState({
            loading: false,
          })
        },
      )

      useLocalState.setState({
        preferences: {
          ...preferences,
          userName,
        },
      })
    },
    [loading, preferences, roomId, setState, socket, userName],
  )

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          className="flex-grow glass-input"
          value={roomId}
          onChange={e => {
            setState({ roomId: e.target.value })
            if (userNameError) setUserNameError('')
          }}
          placeholder="Enter a code or link"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="glass-button-secondary px-6"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          ) : (
            'Join'
          )}
        </button>
      </form>
      {!!(userNameError || error) && (
        <p className="text-xs text-red-500">{userNameError || error}</p>
      )}
    </div>
  )
}

export default JoinMeeting
