import { useCallback, useEffect } from 'react'
import type { FC } from 'react'
import CommandBar from './command-bar'
import SidePanel from './side-panel'
import { Media } from './media'
import Fullscreen from '../comps/full-screen'

import {
  IServerToClientEvent,
  ISocketMessageData,
  createRemoteConnection,
  destroyRemoteConnection,
  useRemoteState,
} from '../state'

import './main.css'
import toast from '../comps/toast'
import { MediaPanel } from './media/panel'
import Whiteboard from '../comps/whiteboard'

const App: FC = () => {
  const socket = useRemoteState(state => state.socket)

  const onPersonJoined: IServerToClientEvent['action:establish_peer_connection'] =
    useCallback(({ userId, userName, avatarUrl }) => {
      createRemoteConnection({
        userId,
        userName,
        initiator: false,
        avatarUrl,
      })
    }, [])

  const onMessage: IServerToClientEvent<ISocketMessageData>['action:message_received'] =
    useCallback(({ from, data }) => {
      if ('connection' in data) {
        createRemoteConnection({
          userId: from,
          initiator: true,
          userName: data.userName || '',
          avatarUrl: data.avatarUrl,
        })
      } else if ('sdpSignal' in data) {
        const { connections } = useRemoteState.getState()
        const conn = connections.find(c => c.userId === from)
        if (!conn) {
          console.warn(
            `sdp signal received for user ${from} but no connection exists.`,
          )
          return
        }
        try {
          conn.metaData = data.metaData
          conn.peerInstance.signal(data.sdpSignal as string)
        } catch (error) {
          console.error('sdp signal error:', error)
        }
      }
    }, [])

  const onPersonLeft: IServerToClientEvent['action:terminate_peer_connection'] =
    useCallback(({ userId }) => {
      const { connections } = useRemoteState.getState()
      const conn = connections.find(c => c.userId === userId)
      if (!conn) return
      toast(`${conn?.userName} left the meeting`)
      destroyRemoteConnection(conn)
    }, [])

  useEffect(() => {
    socket.on('action:establish_peer_connection', onPersonJoined)
    socket.on('action:message_received', onMessage)
    socket.on('action:terminate_peer_connection', onPersonLeft)
    return () => {
      socket.off('action:establish_peer_connection', onPersonJoined)
      socket.off('action:message_received', onMessage)
      socket.off('action:terminate_peer_connection', onPersonLeft)
    }
  }, [onMessage, onPersonJoined, onPersonLeft, socket])

  return (
    <Fullscreen>
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-30%] left-[-15%] w-[800px] h-[800px] bg-gradient-to-br from-blue-400/15 to-purple-400/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-30%] right-[-15%] w-[600px] h-[600px] bg-gradient-to-br from-pink-400/10 to-orange-400/10 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[10%] w-[400px] h-[400px] bg-gradient-to-br from-cyan-400/8 to-blue-400/8 rounded-full blur-[80px]" />
      </div>

      {/* Liquid Glass Meeting Container */}
      <div className="absolute inset-0 z-10 bg-background/50">
        <div className="liquid-glass-container !rounded-none !border-none w-full h-full flex flex-col overflow-hidden">
          {/* Command Bar - Top */}
          <CommandBar />

          {/* Main Content Area */}
          <div className="flex-1 relative overflow-hidden">
            <Media />
            <MediaPanel />
            <Whiteboard />
            <SidePanel />
          </div>
        </div>
      </div>
    </Fullscreen>
  )
}

export default App
