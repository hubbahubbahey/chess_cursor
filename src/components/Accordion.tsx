import { useState, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export default function Accordion({
  title,
  icon,
  defaultOpen = false,
  children,
  className = ''
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`bg-surface-800 rounded-xl overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-accent-gold">{icon}</span>}
          <h3 className="font-display text-lg text-white">{title}</h3>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t border-surface-700 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  )
}
