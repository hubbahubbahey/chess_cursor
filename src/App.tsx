import { useEffect, useState } from 'react'
import { useAppStore } from './stores/useAppStore'
import {
  Bot,
  Swords,
  MessageCircle,
  ChevronRight,
  GraduationCap,
  ChevronLeft,
  Trash2,
  Settings,
  Zap,
  Target,
  AlertCircle,
  Lightbulb,
  Wifi,
  WifiOff,
  X,
  Check
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChessBoard from './components/ChessBoard'
import OpeningTree from './components/OpeningTree'
import TrainingMode from './components/TrainingMode'
import LessonPanel from './components/LessonPanel'
import QuizMode from './components/QuizMode'
import StatsPanel from './components/StatsPanel'
import AiControlPanel from './components/AiControlPanel'
import GameMoveList from './components/GameMoveList'
import CoachChatPanel from './components/CoachChatPanel'
import Accordion from './components/Accordion'
import Toast from './components/Toast'
import { AnalysisType } from './lib/coachContext'

function App() {
  const {
    currentView,
    loadOpenings,
    currentOpening,
    aiEnabled,
    coachPanelOpen,
    coachConnected,
    coachLoading,
    coachMessages,
    coachSettings,
    toggleCoachPanel,
    clearCoachHistory,
    checkCoachConnection,
    updateCoachSettings,
    askCoach
  } = useAppStore()

  const [showSettings, setShowSettings] = useState(false)
  const [tempEndpoint, setTempEndpoint] = useState(coachSettings.endpoint)

  useEffect(() => {
    loadOpenings()
  }, [loadOpenings])

  useEffect(() => {
    if (coachPanelOpen) {
      checkCoachConnection()
    }
  }, [coachPanelOpen, checkCoachConnection])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTempEndpoint(coachSettings.endpoint)
  }, [coachSettings.endpoint])

  const handleQuickAnalysis = (type: AnalysisType) => {
    askCoach(type)
  }

  const handleSaveSettings = () => {
    updateCoachSettings({ endpoint: tempEndpoint })
    setShowSettings(false)
  }

  const renderMainContent = () => {
    switch (currentView) {
      case 'explore':
        return (
          <div className="flex-1 flex gap-4 p-4 overflow-hidden min-w-0">
            <div className="flex-1 flex justify-center items-start min-w-0 overflow-hidden">
              <div className="flex flex-col gap-4 min-h-0 w-full max-w-full">
                <ChessBoard />
                <div className="max-h-[40vh] min-h-0 flex flex-col">
                  <CoachChatPanel />
                </div>
              </div>
            </div>
            {coachPanelOpen ? (
              <div className="w-80 flex-shrink-0 bg-surface-800 border-l border-surface-700 rounded-l-xl overflow-hidden flex flex-col min-h-0">
                {/* AI Coach Header */}
                <div className="p-4 border-b border-surface-700 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={20} className="text-accent-gold" />
                      <h3 className="font-display text-lg text-white">AI Coach</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-1.5 rounded-lg hover:bg-surface-700 transition-colors"
                        title="Settings"
                      >
                        <Settings size={16} className="text-gray-400" />
                      </button>
                      <button
                        onClick={clearCoachHistory}
                        className="p-1.5 rounded-lg hover:bg-surface-700 transition-colors"
                        title="Clear history"
                        disabled={coachMessages.length === 0}
                      >
                        <Trash2 size={16} className="text-gray-400" />
                      </button>
                      <button
                        onClick={toggleCoachPanel}
                        className="p-1.5 rounded-lg hover:bg-surface-700 transition-colors"
                        title="Close panel"
                      >
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Connection status */}
                  <div
                    className={`rounded-lg p-2.5 text-xs ${coachConnected
                      ? 'bg-green-400/10 border border-green-400/20'
                      : 'bg-red-400/10 border border-red-400/20'
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {coachConnected ? (
                          <>
                            <Wifi size={14} className="text-green-400" />
                            <span className="text-green-400 font-medium">Connected</span>
                          </>
                        ) : (
                          <>
                            <WifiOff size={14} className="text-red-400" />
                            <span className="text-red-400 font-medium">Not Connected</span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={checkCoachConnection}
                        className="px-2 py-1 text-gray-400 hover:text-gray-300 hover:bg-surface-700/50 rounded transition-colors text-xs"
                        title="Check connection status"
                      >
                        Check
                      </button>
                    </div>
                    {!coachConnected && (
                      <button
                        onClick={() => setShowSettings(true)}
                        className="mt-2 w-full px-2 py-1.5 text-xs bg-accent-gold/20 hover:bg-accent-gold/30 text-accent-gold rounded transition-colors text-center font-medium"
                        title="Open settings to configure LM Studio endpoint"
                      >
                        Configure Connection
                      </button>
                    )}
                  </div>
                </div>

                {/* Settings panel (collapsible) */}
                {showSettings && (
                  <div className="p-4 border-b border-surface-700 bg-surface-700/30">
                    <label className="block text-xs text-gray-400 mb-2">LM Studio Endpoint</label>
                    <input
                      type="text"
                      value={tempEndpoint}
                      onChange={(e) => setTempEndpoint(e.target.value)}
                      className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-gold"
                      placeholder="http://localhost:1234/v1/chat/completions"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleSaveSettings}
                        className="flex-1 flex items-center justify-center gap-1 bg-accent-gold text-surface-900 rounded-lg py-1.5 text-sm font-medium hover:bg-accent-gold/90 transition-colors"
                      >
                        <Check size={14} />
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setTempEndpoint(coachSettings.endpoint)
                          setShowSettings(false)
                        }}
                        className="flex-1 flex items-center justify-center gap-1 bg-surface-600 text-gray-300 rounded-lg py-1.5 text-sm font-medium hover:bg-surface-500 transition-colors"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick analysis buttons */}
                <div className="p-3 border-b border-surface-700 flex-shrink-0">
                  <p className="text-xs text-gray-500 mb-2">Quick Analysis</p>
                  <div className="grid grid-cols-2 gap-2">
                    <QuickButton
                      icon={<Target size={14} />}
                      label="Position"
                      onClick={() => handleQuickAnalysis('position')}
                      disabled={coachLoading || !coachConnected}
                    />
                    <QuickButton
                      icon={<Zap size={14} />}
                      label="Best Move"
                      onClick={() => handleQuickAnalysis('moves')}
                      disabled={coachLoading || !coachConnected}
                    />
                    <QuickButton
                      icon={<AlertCircle size={14} />}
                      label="Mistakes"
                      onClick={() => handleQuickAnalysis('mistakes')}
                      disabled={coachLoading || !coachConnected}
                    />
                    <QuickButton
                      icon={<Lightbulb size={14} />}
                      label="Plan"
                      onClick={() => handleQuickAnalysis('plan')}
                      disabled={coachLoading || !coachConnected}
                    />
                  </div>
                </div>

                {/* Accordion sections */}
                <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden min-h-0">
                  <Accordion title="AI Opponent" icon={<Bot size={18} />} defaultOpen={true}>
                    <AiControlPanel />
                  </Accordion>
                  {aiEnabled ? (
                    <Accordion title="Game Moves" icon={<Swords size={18} />} defaultOpen={true}>
                      <GameMoveList />
                    </Accordion>
                  ) : (
                    <>
                      <Accordion
                        title="Your Coach"
                        icon={<MessageCircle size={18} />}
                        defaultOpen={true}
                      >
                        <LessonPanel />
                      </Accordion>
                      <Accordion
                        title="Move Tree"
                        icon={<ChevronRight size={18} />}
                        defaultOpen={false}
                      >
                        <OpeningTree />
                      </Accordion>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={toggleCoachPanel}
                className="fixed right-0 top-1/2 -translate-y-1/2 bg-surface-800 hover:bg-surface-700 p-3 rounded-l-xl shadow-lg transition-colors group"
                title="Open AI Coach"
              >
                <div className="flex flex-col items-center gap-2">
                  <GraduationCap size={24} className="text-accent-gold" />
                  <ChevronLeft size={16} className="text-gray-400 group-hover:text-white" />
                </div>
              </button>
            )}
          </div>
        )
      case 'train':
        return <TrainingMode />
      case 'quiz':
        return <QuizMode />
      case 'stats':
        return <StatsPanel />
      default:
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="font-display text-3xl text-accent-gold mb-4">
                Welcome to Chess Opening Trainer
              </h2>
              <p className="text-gray-400 max-w-md">
                Select an opening from the sidebar to begin exploring openings, or start a training
                session to practice your moves.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="h-screen flex flex-col bg-surface-900">
      {/* Title bar drag region */}
      <div className="h-8 drag-region bg-surface-800/50 flex items-center px-4">
        <span className="no-drag text-sm text-gray-500 font-display">Chess Opening Trainer</span>
        {currentOpening && (
          <span className="no-drag ml-4 text-sm text-accent-gold">{currentOpening.name}</span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        {renderMainContent()}
      </div>

      {/* Toast notifications */}
      <Toast />
    </div>
  )
}

// Quick analysis button component
interface QuickButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled: boolean
}

function QuickButton({ icon, label, onClick, disabled }: QuickButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  )
}

export default App
