import { FC, FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import fscreen from 'fscreen'
import {
  IRoom,
  useCreateFormState,
  useJoinFormState,
  useLocalState,
  useRemoteState,
  startMediaDevice,
  stopMediaDevice,
  updateDevicesList,
} from '../state'
import { PreviewMedia } from './preview'

const AUTH_SESSION_KEY = 'frenmio-auth'

const Landing: FC = () => {
  const [authName, setAuthName] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [authError, setAuthError] = useState('')
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(AUTH_SESSION_KEY) === '1',
  )

  const autoStartTriedRef = useRef(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const [
    userStream,
    currentMicId,
    currentCameraId,
    audioDevices,
    videoDevices,
    preferences,
  ] = useLocalState(state => [
    state.userStream,
    state.currentMicId,
    state.currentCameraId,
    state.audioDevices,
    state.videoDevices,
    state.preferences,
  ])

  const socket = useRemoteState(state => state.socket)

  const {
    loading: createLoading,
    error: createError,
    meetingName,
    userName,
  } = useCreateFormState()
  const setCreateState = useCreateFormState.setState

  const { loading: joinLoading, error: joinError, roomId } = useJoinFormState()
  const setJoinState = useJoinFormState.setState

  const handleGoogleCredentialResponse = useCallback(
    (response: { credential: string }) => {
      try {
        const base64Url = response.credential.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          window
            .atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''),
        )

        const payload = JSON.parse(jsonPayload)
        const name = payload.name || payload.given_name || 'Google User'
        const picture = payload.picture || ''

        const currentPrefs = useLocalState.getState().preferences
        useLocalState.setState({
          preferences: {
            ...currentPrefs,
            userName: name,
            avatarUrl: picture,
          },
        })
        setCreateState({ userName: name })
        setJoinState({ userName: name })

        sessionStorage.setItem(AUTH_SESSION_KEY, '1')
        setAuthenticated(true)
        setAuthError('')
      } catch (err) {
        console.error('Google Sign-In Error:', err)
        setAuthError('Google Sign-In failed. Please try again.')
      }
    },
    [setCreateState, setJoinState],
  )

  useEffect(() => {
    if (authenticated) return

    let checkInterval: ReturnType<typeof setInterval> | null = null

    const initGoogle = () => {
      const google = (
        window as Window & {
          google?: {
            accounts?: {
              id?: {
                initialize: (config: {
                  client_id: string
                  callback: (response: { credential: string }) => void
                }) => void
                renderButton: (element: HTMLElement, options: object) => void
              }
            }
          }
        }
      ).google

      if (google?.accounts?.id && googleBtnRef.current) {
        if (checkInterval) clearInterval(checkInterval)
        const clientId =
          process.env.REACT_APP_GOOGLE_CLIENT_ID ||
          '1047648358482-example.apps.googleusercontent.com'

        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        })

        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
        })
      }
    }

    checkInterval = setInterval(initGoogle, 500)
    initGoogle()

    return () => {
      if (checkInterval) clearInterval(checkInterval)
    }
  }, [authenticated, handleGoogleCredentialResponse])

  const handleSignOut = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    const currentPrefs = useLocalState.getState().preferences
    useLocalState.setState({
      preferences: {
        ...currentPrefs,
        userName: '',
        avatarUrl: '',
      },
    })
    setCreateState({ userName: '' })
    setJoinState({ userName: '' })
    setAuthenticated(false)
  }

  const hasLiveVideoTrack = userStream
    .getVideoTracks()
    .some(track => track.enabled && track.readyState === 'live')

  const hasMicActive = !!currentMicId

  useEffect(() => {
    if (fscreen.fullscreenElement) {
      fscreen.exitFullscreen()
    }
    updateDevicesList().catch(() => {})
  }, [])

  // Auto-start camera
  useEffect(() => {
    if (
      !authenticated ||
      hasLiveVideoTrack ||
      autoStartTriedRef.current ||
      !videoDevices.length
    ) {
      return
    }
    autoStartTriedRef.current = true
    void startMediaDevice(videoDevices[0])
  }, [authenticated, hasLiveVideoTrack, videoDevices])

  const toggleMic = async () => {
    if (currentMicId) {
      const device = audioDevices.find(d => d.deviceId === currentMicId)
      if (device) stopMediaDevice(device)
      return
    }
    if (audioDevices.length) {
      await startMediaDevice(audioDevices[0])
    }
  }

  const toggleCam = async () => {
    if (hasLiveVideoTrack || currentCameraId) {
      const activeDevice = videoDevices.find(
        d => d.deviceId === currentCameraId,
      )
      if (activeDevice) {
        stopMediaDevice(activeDevice)
      } else {
        userStream.getVideoTracks().forEach(track => {
          const fallbackDevice = videoDevices.find(
            device => device.deviceId === track.getSettings().deviceId,
          )
          if (fallbackDevice) {
            stopMediaDevice(fallbackDevice)
          } else {
            track.stop()
            userStream.removeTrack(track)
          }
        })
      }
      return
    }

    await updateDevicesList()
    const firstVideoDevice = useLocalState.getState().videoDevices[0]
    if (firstVideoDevice) {
      await startMediaDevice(firstVideoDevice)
    }
  }

  const handleAuthSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!authName.trim()) {
      setAuthError('Name is required.')
      return
    }
    if (authCode.trim().length < 4) {
      setAuthError('Passcode must be at least 4 characters.')
      return
    }

    useLocalState.setState({
      preferences: { ...preferences, userName: authName.trim() },
    })
    setCreateState({ userName: authName.trim() })
    setJoinState({ userName: authName.trim() })

    sessionStorage.setItem(AUTH_SESSION_KEY, '1')
    setAuthenticated(true)
    setAuthError('')
  }

  const handleCreateMeeting = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (createLoading) return

      const finalUserName = userName || preferences.userName || 'Guest'
      if (!finalUserName.trim()) return

      setCreateState({ loading: true, error: null })

      const room: IRoom = {
        id: '',
        name: meetingName || 'New Meeting',
        created_by: finalUserName,
        opts: { capacity: 10 },
      }

      socket.emit('request:create_room', { room }, err => {
        if (err) setCreateState({ error: err.message })
        setCreateState({ loading: false })
      })

      useLocalState.setState({
        preferences: { ...preferences, userName: finalUserName, meetingName },
      })
    },
    [createLoading, meetingName, preferences, setCreateState, socket, userName],
  )

  const handleJoinMeeting = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (joinLoading || !roomId.trim()) return

      const finalUserName = userName || preferences.userName || 'Guest'

      setJoinState({ loading: true, error: null })

      socket.emit(
        'request:join_room',
        { userName: finalUserName, roomId: roomId.trim() },
        err => {
          if (err) setJoinState({ error: err.message })
          setJoinState({ loading: false })
        },
      )

      useLocalState.setState({
        preferences: { ...preferences, userName: finalUserName },
      })
    },
    [joinLoading, preferences, roomId, setJoinState, socket, userName],
  )

  // Auth screen
  if (!authenticated) {
    return (
      <div className="gmeet-lobby">
        <header className="gmeet-lobby-header">
          <div className="gmeet-logo">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="#1a73e8">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            <span>Frenmio</span>
          </div>
        </header>
        <main className="gmeet-lobby-main" style={{ justifyContent: 'center' }}>
          <div className="gmeet-lobby-auth">
            <h1>Welcome to Frenmio</h1>
            <p>Enter your details to continue</p>
            <form onSubmit={handleAuthSubmit}>
              <input
                value={authName}
                onChange={e => {
                  setAuthName(e.target.value)
                  setAuthError('')
                }}
                placeholder="Your name"
                className="gmeet-lobby-input"
              />
              <input
                type="password"
                value={authCode}
                onChange={e => {
                  setAuthCode(e.target.value)
                  setAuthError('')
                }}
                placeholder="Passcode"
                className="gmeet-lobby-input"
              />
              {authError && <p className="gmeet-error">{authError}</p>}
              <button
                type="submit"
                className="gmeet-btn-primary"
                style={{ width: '100%', marginTop: 8 }}
              >
                Continue
              </button>
            </form>
            <div className="gmeet-divider" style={{ margin: '16px 0' }}>
              <span>or</span>
            </div>
            <div
              ref={googleBtnRef}
              style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
              }}
            ></div>
          </div>
        </main>
      </div>
    )
  }

  // Pre-meeting lobby with video preview
  return (
    <div className="gmeet-lobby">
      <header
        className="gmeet-lobby-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div className="gmeet-logo">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#1a73e8">
            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
          </svg>
          <span>Frenmio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            {preferences.userName || userName}
          </span>
          {preferences.avatarUrl && (
            <img
              src={preferences.avatarUrl}
              alt="Avatar"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
          )}
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(231, 76, 60, 0.1)',
              border: '1px solid rgba(231, 76, 60, 0.2)',
              borderRadius: '4px',
              color: '#e74c3c',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.2)'
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(231, 76, 60, 0.1)'
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="gmeet-lobby-main">
        {/* Video Preview Section */}
        <div className="gmeet-lobby-preview">
          <div className="gmeet-video-container">
            {hasLiveVideoTrack ? (
              <PreviewMedia stream={userStream} />
            ) : (
              <div className="gmeet-video-placeholder">
                {preferences.avatarUrl ? (
                  <img
                    src={preferences.avatarUrl}
                    alt="Profile"
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid rgba(255, 255, 255, 0.2)',
                      marginBottom: '16px',
                    }}
                  />
                ) : (
                  <div className="gmeet-avatar-large">
                    {(userName || preferences.userName || 'G')
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                )}
                <p>Camera is off</p>
              </div>
            )}
          </div>

          {/* Media Controls */}
          <div className="gmeet-media-controls">
            <button
              onClick={toggleMic}
              className={`gmeet-control-btn ${!hasMicActive ? 'off' : ''}`}
              title={
                hasMicActive ? 'Turn off microphone' : 'Turn on microphone'
              }
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                {hasMicActive ? (
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                ) : (
                  <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                )}
              </svg>
            </button>
            <button
              onClick={toggleCam}
              className={`gmeet-control-btn ${!hasLiveVideoTrack ? 'off' : ''}`}
              title={hasLiveVideoTrack ? 'Turn off camera' : 'Turn on camera'}
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                {hasLiveVideoTrack ? (
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                ) : (
                  <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Form Section */}
        <div className="gmeet-lobby-form">
          <h2>Ready to join?</h2>

          <form onSubmit={handleCreateMeeting}>
            <label className="gmeet-label">Your name</label>
            <input
              value={userName}
              onChange={e => setCreateState({ userName: e.target.value })}
              placeholder="Enter your name"
              className="gmeet-lobby-input"
            />

            <label className="gmeet-label">Room name</label>
            <input
              value={meetingName}
              onChange={e => setCreateState({ meetingName: e.target.value })}
              placeholder="Enter room name"
              className="gmeet-lobby-input"
            />

            {createError && <p className="gmeet-error">{createError}</p>}

            <button
              type="submit"
              disabled={createLoading}
              className="gmeet-btn-primary"
              style={{ width: '100%', marginTop: 16 }}
            >
              {createLoading ? 'Creating...' : 'Create Meeting'}
            </button>
          </form>

          <div className="gmeet-divider">
            <span>or join existing</span>
          </div>

          <form onSubmit={handleJoinMeeting}>
            <input
              value={roomId}
              onChange={e => setJoinState({ roomId: e.target.value })}
              placeholder="Enter meeting code"
              className="gmeet-lobby-input"
            />
            {joinError && <p className="gmeet-error">{joinError}</p>}
            <button
              type="submit"
              disabled={joinLoading || !roomId.trim()}
              className="gmeet-btn-secondary"
              style={{ width: '100%', marginTop: 8 }}
            >
              {joinLoading ? 'Joining...' : 'Join Meeting'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default Landing
