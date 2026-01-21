import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAppStore } from '../stores/useAppStore'
import { GraduationCap, Loader2, Send } from 'lucide-react'
import { AnalysisType, getAnalysisTypeLabel } from '../lib/coachContext'

export default function CoachChatPanel() {
  const {
    coachMessages,
    coachLoading,
    coachConnected,
    coachPanelOpen,
    askCoach
  } = useAppStore()

  const [customQuestion, setCustomQuestion] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [coachMessages])

  // Handle custom question submit
  const handleSubmitQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (customQuestion.trim() && !coachLoading) {
      askCoach('custom', customQuestion.trim())
      setCustomQuestion('')
    }
  }

  if (!coachPanelOpen) {
    return null
  }

  return (
    <div className="flex-1 bg-surface-800 rounded-xl overflow-hidden flex flex-col min-h-0">
      {/* Messages area */}
      <div className="flex-1 scrollable-panel p-4 space-y-4 min-h-0">
        {coachMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <GraduationCap size={40} className="text-gray-600 mb-3" />
            <p className="text-gray-500 text-sm">
              {coachConnected 
                ? "Ask me anything about the position! Use the quick buttons above or type your own question."
                : "The AI Coach is ready to help. Check the connection status in the panel header above."}
            </p>
          </div>
        ) : (
          <>
            {coachMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {coachLoading && (
              <div className="flex items-center gap-2 text-accent-gold">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmitQuestion} className="p-3 border-t border-surface-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder={coachConnected ? "Ask a question..." : "Connect to LM Studio to ask questions"}
            disabled={!coachConnected || coachLoading}
            className="flex-1 bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent-gold disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!customQuestion.trim() || coachLoading || !coachConnected}
            className="bg-accent-gold text-surface-900 rounded-lg px-3 py-2 hover:bg-accent-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}

// Message bubble component
interface MessageBubbleProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    analysisType?: string
  }
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-lg px-3 py-2 ${
          isUser
            ? 'bg-accent-gold/20 text-accent-gold'
            : 'bg-surface-700 text-gray-200'
        }`}
      >
        {isUser && message.analysisType && (
          <span className="text-xs opacity-70 block mb-1">
            {getAnalysisTypeLabel(message.analysisType as AnalysisType)}
          </span>
        )}
        {isUser ? (
          <div className="text-sm">{message.content}</div>
        ) : (
          <div className="text-sm prose prose-invert prose-sm max-w-none coach-markdown">
            <ReactMarkdown
              components={{
                // Headings
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-accent-gold mt-3 mb-2 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-bold text-accent-gold mt-3 mb-2 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-bold text-accent-gold mt-2 mb-1 first:mt-0">{children}</h3>
                ),
                // Paragraphs
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                ),
                // Lists
                ul: ({ children }) => (
                  <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                // Inline code (chess moves, etc.)
                code: ({ children }) => (
                  <code className="bg-surface-600 text-accent-gold px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                // Code blocks
                pre: ({ children }) => (
                  <pre className="bg-surface-600 rounded-lg p-2 overflow-x-auto mb-2">
                    {children}
                  </pre>
                ),
                // Bold
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">{children}</strong>
                ),
                // Emphasis
                em: ({ children }) => (
                  <em className="italic text-gray-300">{children}</em>
                ),
                // Blockquotes
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-accent-gold pl-3 my-2 text-gray-300 italic">
                    {children}
                  </blockquote>
                ),
                // Horizontal rule
                hr: () => (
                  <hr className="border-surface-600 my-3" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
