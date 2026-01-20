import { useEffect } from 'react'
import { useAppStore } from './stores/useAppStore'
import { Bot, Swords, MessageCircle, ChevronRight } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChessBoard from './components/ChessBoard'
import OpeningTree from './components/OpeningTree'
import TrainingMode from './components/TrainingMode'
import LessonPanel from './components/LessonPanel'
import QuizMode from './components/QuizMode'
import StatsPanel from './components/StatsPanel'
import AiControlPanel from './components/AiControlPanel'
import GameMoveList from './components/GameMoveList'
import CoachPanel from './components/CoachPanel'
import CoachChatPanel from './components/CoachChatPanel'
import Accordion from './components/Accordion'

function App() {
  const { currentView, loadOpenings, currentOpening, aiEnabled } = useAppStore()

  useEffect(() => {
    loadOpenings()
  }, [loadOpenings])

  const renderMainContent = () => {
    switch (currentView) {
      case 'explore':
        return (
          <div className="flex-1 flex gap-4 p-4 overflow-hidden min-w-0">
            <div className="flex-1 flex justify-center items-start min-w-0 overflow-hidden">
              <div className="flex flex-col gap-4 min-h-0 w-full max-w-full">
                <ChessBoard />
                <div className="max-h-[40vh] min-h-0">
                  <CoachChatPanel />
                </div>
              </div>
            </div>
            <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-hidden min-h-0">
              <Accordion
                title="AI Opponent"
                icon={<Bot size={18} />}
                defaultOpen={true}
              >
                <AiControlPanel />
              </Accordion>
              {aiEnabled ? (
                <Accordion
                  title="Game Moves"
                  icon={<Swords size={18} />}
                  defaultOpen={true}
                >
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
                Select an opening from the sidebar to begin exploring openings,
                or start a training session to practice your moves.
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
        <span className="no-drag text-sm text-gray-500 font-display">
          Chess Opening Trainer
        </span>
        {currentOpening && (
          <span className="no-drag ml-4 text-sm text-accent-gold">
            {currentOpening.name}
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        {renderMainContent()}
        <CoachPanel />
      </div>
    </div>
  )
}

export default App
