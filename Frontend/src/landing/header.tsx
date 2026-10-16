import { FC } from 'react'

const Header: FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-5 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-foreground/90 rounded-xl flex items-center justify-center text-background font-bold text-lg shadow-lg">
          F
        </div>
        <span className="text-xl font-semibold tracking-tight text-foreground">
          Frenmio
        </span>
      </div>

      <div className="flex items-center gap-6 text-sm font-medium text-foreground/60">
        <a href="#" className="hover:text-foreground transition-colors">
          Help
        </a>
        <a
          href="https://github.com/swapnilnegi/mooz"
          target="_blank"
          rel="noreferrer"
          className="hover:text-foreground transition-colors"
        >
          GitHub
        </a>
      </div>
    </nav>
  )
}

export default Header
