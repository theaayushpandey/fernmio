import { FC } from 'react'
import clsx from 'clsx'

export interface MessageProps {
  text: string
  mine?: boolean
  title?: string
}

const Message: FC<MessageProps> = ({ mine, text, title }) => {
  return (
    <div
      className={clsx(
        'w-full my-2 flex relative',
        mine ? 'justify-end' : 'justify-start',
      )}
    >
      <div
        className={clsx(
          'flex flex-col px-4 py-2.5 max-w-[85%] rounded-2xl shadow-sm backdrop-blur-md border',
          mine
            ? 'bg-blue-500/80 text-white border-blue-400/30 rounded-tr-sm'
            : 'bg-white/10 dark:bg-black/20 text-foreground border-white/20 dark:border-white/10 rounded-tl-sm',
        )}
      >
        <span className="font-semibold text-xs opacity-70 mb-1 w-full truncate">
          {title}
        </span>
        <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
          {text}
        </div>
      </div>
    </div>
  )
}

export default Message
