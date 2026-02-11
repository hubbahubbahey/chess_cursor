import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-surface-900 text-white p-8">
          <div className="max-w-md w-full text-center">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h1 className="font-display text-2xl text-accent-gold mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-6">
              An unexpected error occurred. You can try again or reload the app.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="text-left text-xs text-gray-500 bg-surface-800 p-4 rounded-lg mb-6 overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-accent-gold text-surface-900 rounded-lg font-medium hover:bg-accent-gold/90 transition-colors"
              >
                <RotateCcw size={16} />
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-surface-700 text-gray-300 rounded-lg font-medium hover:bg-surface-600 transition-colors"
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
