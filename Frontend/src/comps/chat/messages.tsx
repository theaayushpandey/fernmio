import { nanoid } from 'nanoid'
import { FC, ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { IChatMessage, sendChat, useLocalState } from '../../state'
import { userLabel } from '../../utils/helpers'
import { Send } from 'lucide-react'

const Messages: FC<{ children: ReactNode }> = ({ children }) => {
  const [name, id] = useLocalState(state => [
    state.preferences.userName,
    state.sessionId,
  ])
  const [message, setMessage] = useState('')

  const scrolling = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    const s = scrolling.current
    if (!s) return
    s.scrollBy({ top: s.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [children])

  const handleSubmit = useCallback(() => {
    if (!message.trim()) return
    const msg: IChatMessage = {
      id: nanoid(),
      mine: true,
      text: message.trim().replace(/\n\n/g, '\n'),
      userLabel: userLabel({
        userName: name,
        userId: id,
      }),
    }
    sendChat(msg)
    setMessage('')
  }, [id, message, name])

  return (
    <div className="flex flex-col w-full h-full bg-white/5 dark:bg-black/10 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div
        ref={scrolling}
        className="flex-1 overflow-y-auto w-full p-4 space-y-4 scroll-smooth scrollbar-thin scrollbar-thumb-white/20"
      >
        {children}
      </div>

      <div className="flex-none p-4 backdrop-blur-2xl bg-white/5 dark:bg-black/20 border-t border-white/10">
        <div className="relative flex items-end w-full group">
          <textarea
            className="w-full bg-white/10 dark:bg-black/20 text-foreground rounded-2xl pl-4 pr-12 py-3 border border-white/20 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none resize-none no-scrollbar placeholder:text-foreground/40 transition-all backdrop-blur-md"
            rows={1}
            placeholder="Type your message..."
            value={message}
            onChange={e => {
              setMessage(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height =
                Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <button
            disabled={!message.trim()}
            onClick={handleSubmit}
            title="Send"
            className="absolute right-2 bottom-2 p-2 rounded-xl text-foreground/70 hover:text-blue-400 hover:bg-blue-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/70 transition-all backdrop-blur-sm"
          >
            <Send
              size={20}
              strokeWidth={2}
              className={
                message.trim()
                  ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                  : ''
              }
            />
          </button>
        </div>
        <div className="text-[10px] text-foreground/40 text-center mt-2 font-medium tracking-wide w-full flex justify-center opacity-70">
          Press Enter to send, Shift + Enter for new line
        </div>
      </div>
    </div>
  )
}

export default Messages
