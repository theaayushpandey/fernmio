import { type FC, useEffect, useState, useCallback, useRef } from 'react'
import { X } from 'lucide-react'
import { Excalidraw, serializeAsJSON } from '@excalidraw/excalidraw'
import { useRemoteState } from '../state/remote'
import { useLocalState } from '../state/local'
import { IPeerData } from '../state/types'
// Types are often better imported from the main entry if exported,
// otherwise we use the precise internal paths found in node_modules.
import {
  AppState,
  ExcalidrawImperativeAPI,
} from '@excalidraw/excalidraw/types/types'
import { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/types/element/types'

const Whiteboard: FC = () => {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null) // State for Excalidraw API
  const connections = useRemoteState(state => state.connections)
  const whiteboardActive = useLocalState(state => state.whiteboardActive)
  const isRemoteUpdate = useRef(false)

  const broadcastWhiteboard = useCallback(
    (elements: readonly NonDeletedExcalidrawElement[], appState: AppState) => {
      if (isRemoteUpdate.current) return

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const serialized = serializeAsJSON(
        elements as any,
        appState as any,
        {} as any,
        'local',
      )
      const data: IPeerData = {
        whiteboard: serialized,
      }
      const message = JSON.stringify(data)

      connections.forEach(conn => {
        try {
          if (conn.peerInstance.connected) {
            conn.peerInstance.send(message)
          }
        } catch (err) {
          console.error('Failed to send whiteboard data', err)
        }
      })
    },
    [connections],
  )

  useEffect(() => {
    const onPeerData = (dataStr: string) => {
      try {
        const data: IPeerData = JSON.parse(dataStr)
        if (data.whiteboard && excalidrawAPI) {
          const scene = JSON.parse(data.whiteboard)
          isRemoteUpdate.current = true
          excalidrawAPI.updateScene({
            elements: scene.elements,
          })
          // Reset after a short delay to allow onChange to fire
          setTimeout(() => {
            isRemoteUpdate.current = false
          }, 100)
        }
      } catch (err) {
        // Not whiteboard data or parse error
      }
    }

    connections.forEach(conn => {
      conn.peerInstance.on('data', onPeerData)
    })

    return () => {
      connections.forEach(conn => {
        conn.peerInstance.off('data', onPeerData)
      })
    }
  }, [connections, excalidrawAPI])

  if (!whiteboardActive) return null

  return (
    <div
      style={{
        height: 'calc(100% - 72px)',
        width: '100%',
        position: 'absolute',
        top: 72,
        left: 0,
        zIndex: 100,
        background: 'white',
      }}
    >
      <button
        onClick={() => useLocalState.setState({ whiteboardActive: false })}
        className="absolute top-4 right-4 z-50 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      <Excalidraw
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        excalidrawAPI={api => setExcalidrawAPI(api as any)}
        onChange={(elements, appState) => {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          broadcastWhiteboard(elements as any, appState as any)
        }}
      />
    </div>
  )
}

export default Whiteboard
