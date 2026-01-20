import path from 'path'
import fs from 'fs'
import { app } from 'electron'

interface Opening {
  id: number
  name: string
  color: 'white' | 'black'
  description: string
}

interface PositionExplanation {
  coach: string        // Main coaching point in conversational tone
  insight?: string     // General chess wisdom/principle
  concept?: string     // Strategic or tactical concept name
  warning?: string     // Common mistake to avoid
}

interface Position {
  id: number
  fen: string
  opening_id: number
  parent_id: number | null
  move_san: string | null
  explanation: PositionExplanation | null
}

interface Review {
  id: number
  position_id: number
  ease_factor: number
  interval: number
  repetitions: number
  next_review: string | null
  last_review: string | null
}

interface Stats {
  id: number
  position_id: number
  attempts: number
  correct: number
  last_attempt: string | null
}

interface Database {
  openings: Opening[]
  positions: Position[]
  reviews: Review[]
  stats: Stats[]
  nextIds: {
    opening: number
    position: number
    review: number
    stats: number
  }
}

let db: Database | null = null
let dbPath: string = ''

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return db
}

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  dbPath = path.join(userDataPath, 'chess-trainer.json')
  
  // Reset and reseed data on startup
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }

  db = {
    openings: [],
    positions: [],
    reviews: [],
    stats: [],
    nextIds: {
      opening: 1,
      position: 1,
      review: 1,
      stats: 1
    }
  }
  seedInitialData()
  saveDatabase()
}

export function saveDatabase(): void {
  if (!db) return
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
}

// Query helpers
export function getOpenings(): Opening[] {
  return db?.openings || []
}

export function getPositions(openingId?: number): Position[] {
  if (!db) return []
  if (openingId !== undefined) {
    return db.positions.filter(p => p.opening_id === openingId)
  }
  return db.positions
}

export function getPosition(id: number): Position | undefined {
  return db?.positions.find(p => p.id === id)
}

export function getPositionByFen(fen: string): Position | undefined {
  return db?.positions.find(p => p.fen === fen)
}

export function getChildPositions(parentId: number): Position[] {
  return db?.positions.filter(p => p.parent_id === parentId) || []
}

export function getReview(positionId: number): Review | undefined {
  return db?.reviews.find(r => r.position_id === positionId)
}

export function getDueReviews(openingId?: number): (Review & { fen: string; move_san: string | null; explanation: string | null })[] {
  if (!db) return []
  const today = new Date().toISOString().split('T')[0]
  
  let positions = db.positions
  if (openingId !== undefined) {
    positions = positions.filter(p => p.opening_id === openingId)
  }
  
  const positionIds = new Set(positions.map(p => p.id))
  
  return db.reviews
    .filter(r => positionIds.has(r.position_id) && (r.next_review === null || r.next_review <= today))
    .map(r => {
      const pos = db!.positions.find(p => p.id === r.position_id)!
      return {
        ...r,
        fen: pos.fen,
        move_san: pos.move_san,
        explanation: pos.explanation
      }
    })
}

export function updateReview(
  positionId: number,
  easeFactor: number,
  interval: number,
  repetitions: number,
  nextReview: string
): void {
  if (!db) return
  const today = new Date().toISOString().split('T')[0]
  
  const existingIndex = db.reviews.findIndex(r => r.position_id === positionId)
  if (existingIndex >= 0) {
    db.reviews[existingIndex] = {
      ...db.reviews[existingIndex],
      ease_factor: easeFactor,
      interval,
      repetitions,
      next_review: nextReview,
      last_review: today
    }
  } else {
    db.reviews.push({
      id: db.nextIds.review++,
      position_id: positionId,
      ease_factor: easeFactor,
      interval,
      repetitions,
      next_review: nextReview,
      last_review: today
    })
  }
  saveDatabase()
}

export function getStats(positionId: number): Stats | undefined {
  return db?.stats.find(s => s.position_id === positionId)
}

export function getAllStats(): Stats[] {
  return db?.stats || []
}

export function updateStats(positionId: number, correct: boolean): void {
  if (!db) return
  const today = new Date().toISOString().split('T')[0]
  
  const existingIndex = db.stats.findIndex(s => s.position_id === positionId)
  if (existingIndex >= 0) {
    db.stats[existingIndex].attempts++
    if (correct) {
      db.stats[existingIndex].correct++
    }
    db.stats[existingIndex].last_attempt = today
  } else {
    db.stats.push({
      id: db.nextIds.stats++,
      position_id: positionId,
      attempts: 1,
      correct: correct ? 1 : 0,
      last_attempt: today
    })
  }
  saveDatabase()
}

function seedInitialData(): void {
  if (!db) return
  
  // King's Pawn
  const kingsPawnId = addOpening(
    "King's Pawn",
    'white',
    'Start with 1.e4 and learn the most direct way to claim the center.'
  )
  seedKingsPawn(kingsPawnId)
  
  // Queen's Pawn
  const queensPawnId = addOpening(
    "Queen's Pawn",
    'white',
    'Start with 1.d4 and build a strong, flexible central setup.'
  )
  seedQueensPawn(queensPawnId)
  
  // London System
  const londonId = addOpening(
    'London System',
    'white',
    'A reliable 1.d4 system with an early Bf4 and simple development.'
  )
  seedLondonSystem(londonId)
}

function addOpening(name: string, color: 'white' | 'black', description: string): number {
  if (!db) return 0
  const id = db.nextIds.opening++
  db.openings.push({ id, name, color, description })
  return id
}

function addPosition(
  fen: string,
  openingId: number,
  parentId: number | null,
  moveSan: string | null,
  explanation: PositionExplanation
): number {
  if (!db) return 0
  const id = db.nextIds.position++
  db.positions.push({
    id,
    fen,
    opening_id: openingId,
    parent_id: parentId,
    move_san: moveSan,
    explanation
  })
  // Also create a review entry
  db.reviews.push({
    id: db.nextIds.review++,
    position_id: id,
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: null,
    last_review: null
  })
  return id
}

function seedKingsPawn(openingId: number): void {
  const startId = addPosition(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    openingId, null, null,
    {
      coach: "Welcome! Let's explore the King's Pawn opening - one of the most popular and dynamic ways to start a chess game. We're going to push the e-pawn two squares forward. This is bold, direct, and immediately fights for the center.",
      insight: "The center of the board is like prime real estate - whoever controls it has more options and mobility for all their pieces.",
      concept: "Opening Principles",
      warning: "Don't get too attached to any single pawn. The opening is about development and control, not just pushing pawns."
    }
  )

  const e4Id = addPosition(
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    openingId, startId, 'e4',
    {
      coach: "Excellent! You've just played the most popular first move in chess history. By placing your pawn on e4, you're claiming the center and opening diagonals for both your queen and your light-squared bishop. This is aggressive, principled chess.",
      insight: "A pawn in the center is worth more than a pawn on the edge - it influences more squares and restricts your opponent's options.",
      concept: "Center Control",
      warning: "Your e4 pawn is now a target. Be ready to defend it or support it with other pieces as the game develops."
    }
  )

  const e5Id = addPosition(
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    openingId, e4Id, 'e5',
    {
      coach: "Black mirrors your move with 1...e5, and now we have a symmetrical pawn structure in the center. This is the Open Game - expect sharp, tactical battles! Both sides have equal claims to the center, so piece development becomes crucial.",
      insight: "When pawns are locked or symmetrical, the side that develops pieces faster usually gains the advantage.",
      concept: "Open Game"
    }
  )

  addPosition(
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    openingId, e5Id, 'Nf3',
    {
      coach: "Perfect! 2.Nf3 is a model developing move. Your knight jumps to its best square, attacks Black's e5 pawn immediately, and clears the way for kingside castling. This is what we call 'developing with a threat' - you improve your position while making your opponent react.",
      insight: "Knights before bishops is often wise - knights have fewer good squares, while bishops can wait to see where they'll be most effective.",
      concept: "Development",
      warning: "Don't move the same piece twice in the opening unless you have a very good reason. Get all your pieces into the game first."
    }
  )
}

function seedQueensPawn(openingId: number): void {
  const startId = addPosition(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    openingId, null, null,
    {
      coach: "Let's explore the Queen's Pawn opening! Unlike 1.e4 which leads to open, tactical battles, 1.d4 tends to create more strategic, closed positions. This is chess at a slower pace, where long-term planning matters more than quick attacks.",
      insight: "The d-pawn is protected by the queen from the start, which makes d4 inherently more solid than e4.",
      concept: "Opening Principles"
    }
  )

  const d4Id = addPosition(
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
    openingId, startId, 'd4',
    {
      coach: "You've played 1.d4 - a move favored by world champions like Kasparov and Carlsen when they want a solid, strategic game. Your pawn controls the e5 and c5 squares, and unlike e4, this pawn is already defended by your queen.",
      insight: "In d4 openings, the battle often revolves around the e4 and c4 squares. Control these, and you'll have a space advantage.",
      concept: "Center Control"
    }
  )

  const d5Id = addPosition(
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
    openingId, d4Id, 'd5',
    {
      coach: "Black responds symmetrically with 1...d5, establishing their own stake in the center. Now we have a classic Queen's Pawn structure. The pawns are head-to-head, and the character of the game depends on how we choose to break this tension.",
      insight: "Pawn tension in the center is like a loaded spring - whoever releases it first often determines the nature of the middlegame.",
      concept: "Pawn Structure"
    }
  )

  addPosition(
    'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
    openingId, d5Id, 'c4',
    {
      coach: "This is the famous Queen's Gambit! Despite the name, it's not a true gambit because Black can't safely keep the pawn. By playing c4, you're challenging Black's d5 pawn and fighting for more space in the center. If Black takes, you'll recapture with your pieces and have a strong central presence.",
      insight: "The Queen's Gambit is one of the oldest and most respected openings - it's been played at the highest levels for over 500 years.",
      concept: "Queen's Gambit",
      warning: "If Black takes on c4, don't rush to recapture. Often it's better to develop first and win the pawn back later with moves like Qa4+ or a4-a5."
    }
  )

  addPosition(
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/5N2/PPP1PPPP/RNBQKB1R b KQkq - 1 2',
    openingId, d5Id, 'Nf3',
    {
      coach: "A flexible alternative! 2.Nf3 develops a piece without committing to the Queen's Gambit just yet. This keeps your options open - you can still play c4 next move, or you might go for a different setup entirely. Flexibility is a key virtue in the opening.",
      insight: "When you're not sure of the best plan, make a move that keeps multiple options open. Good moves are rarely bad moves.",
      concept: "Flexible Development"
    }
  )
}

function seedLondonSystem(openingId: number): void {
  const startId = addPosition(
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    openingId, null, null,
    {
      coach: "Welcome to the London System! This is one of the most practical and low-maintenance openings in chess. You'll learn a solid setup that you can play against almost anything Black throws at you. It's a favorite of club players and grandmasters alike.",
      insight: "A reliable opening you know well is worth more than a 'better' opening you don't understand. The London rewards consistency.",
      concept: "System Opening"
    }
  )

  const d4Id = addPosition(
    'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1',
    openingId, startId, 'd4',
    {
      coach: "We start with 1.d4, claiming central space. In the London System, our plan is straightforward: we'll develop the dark-squared bishop to f4 early (before playing e3), then set up a solid pawn structure with e3 and c3. Simple, effective, and hard to crack.",
      insight: "The London System is called a 'system' because you play the same setup regardless of what your opponent does. Less memorization, more understanding.",
      concept: "The London Setup"
    }
  )

  const d5Id = addPosition(
    'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6 0 2',
    openingId, d4Id, 'd5',
    {
      coach: "Black plays 1...d5, which is the most common response. This is exactly what we want to see! Now comes the signature move of the London System. We're going to develop our bishop to f4 before playing e3 - this is crucial because once we play e3, the bishop would be trapped inside the pawn chain.",
      insight: "Always ask yourself: will this pawn move block any of my pieces? Develop bishops before locking them in with pawns.",
      concept: "Bishop Development",
      warning: "If you play e3 before Bf4, your dark-squared bishop becomes a 'tall pawn' - stuck behind your pawns with limited scope."
    }
  )

  addPosition(
    'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2',
    openingId, d5Id, 'Bf4',
    {
      coach: "This is the London System in action! Your bishop is now actively placed outside the pawn chain, eyeing the b8-h2 diagonal. From here, our typical plan is: e3 to support d4, Nf3 and Nbd2 for the knights, c3 for extra central support, and Be2 followed by castling. Solid as a rock!",
      insight: "The bishop on f4 does three jobs: it controls key squares, it's ready to retreat to safety if attacked, and it often targets weaknesses on c7 or b8.",
      concept: "London System",
      warning: "Watch out for ...Nh5 attacking your bishop! You can simply retreat to g3 or h2, keeping the bishop safe while maintaining its influence."
    }
  )
}
