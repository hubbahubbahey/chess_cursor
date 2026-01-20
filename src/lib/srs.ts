/**
 * SM-2 Spaced Repetition Algorithm Implementation
 * 
 * Based on the SuperMemo 2 algorithm by Piotr Wozniak
 * https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5

export interface ReviewResult {
  easeFactor: number
  interval: number
  repetitions: number
  nextReview: string
}

export interface ReviewData {
  easeFactor: number
  interval: number
  repetitions: number
}

/**
 * Quality ratings:
 * 0 - Complete blackout, no recall
 * 1 - Incorrect response, but upon seeing correct answer, remembered
 * 2 - Incorrect response, but correct answer seemed easy to recall
 * 3 - Correct response with serious difficulty
 * 4 - Correct response after hesitation
 * 5 - Perfect response, instant recall
 */

/**
 * Map user-friendly difficulty to SM-2 quality rating
 */
export function difficultyToQuality(difficulty: 'again' | 'hard' | 'good' | 'easy'): ReviewQuality {
  switch (difficulty) {
    case 'again': return 1  // Will reset the card
    case 'hard': return 3   // Correct but difficult
    case 'good': return 4   // Correct with some hesitation
    case 'easy': return 5   // Perfect recall
  }
}

/**
 * Calculate the next review parameters based on the SM-2 algorithm
 */
export function calculateNextReview(
  quality: ReviewQuality,
  currentData: ReviewData
): ReviewResult {
  let { easeFactor, interval, repetitions } = currentData

  // If quality is below 3, reset the repetitions (card needs to be relearned)
  if (quality < 3) {
    repetitions = 0
    interval = 1 // Review tomorrow
  } else {
    // Successful recall
    if (repetitions === 0) {
      interval = 1 // First successful review: 1 day
    } else if (repetitions === 1) {
      interval = 6 // Second successful review: 6 days
    } else {
      // Subsequent reviews: multiply previous interval by ease factor
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  }

  // Update ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  
  // Ease factor should never go below 1.3
  easeFactor = Math.max(1.3, newEaseFactor)

  // Calculate the next review date
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + interval)
  const nextReview = nextDate.toISOString().split('T')[0]

  return {
    easeFactor: Math.round(easeFactor * 100) / 100, // Round to 2 decimal places
    interval,
    repetitions,
    nextReview
  }
}

/**
 * Calculate time until next review in human-readable format
 */
export function getTimeUntilReview(nextReviewDate: string): string {
  const next = new Date(nextReviewDate)
  const now = new Date()
  const diffMs = next.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Due now'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays < 7) return `In ${diffDays} days`
  if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`
  if (diffDays < 365) return `In ${Math.floor(diffDays / 30)} months`
  return `In ${Math.floor(diffDays / 365)} years`
}

/**
 * Get the projected intervals for each difficulty level
 */
export function getProjectedIntervals(currentData: ReviewData): {
  again: number
  hard: number
  good: number
  easy: number
} {
  return {
    again: 1,
    hard: calculateNextReview(3, currentData).interval,
    good: calculateNextReview(4, currentData).interval,
    easy: calculateNextReview(5, currentData).interval
  }
}

/**
 * Format interval as human-readable string
 */
export function formatInterval(days: number): string {
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week' : `${weeks} weeks`
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return months === 1 ? '1 month' : `${months} months`
  }
  const years = Math.floor(days / 365)
  return years === 1 ? '1 year' : `${years} years`
}

/**
 * Get mastery level based on repetitions and ease factor
 */
export function getMasteryLevel(repetitions: number, easeFactor: number): {
  level: 'new' | 'learning' | 'reviewing' | 'mastered'
  color: string
  label: string
} {
  if (repetitions === 0) {
    return { level: 'new', color: 'gray', label: 'New' }
  }
  if (repetitions < 3) {
    return { level: 'learning', color: 'yellow', label: 'Learning' }
  }
  if (easeFactor >= 2.5 && repetitions >= 5) {
    return { level: 'mastered', color: 'green', label: 'Mastered' }
  }
  return { level: 'reviewing', color: 'blue', label: 'Reviewing' }
}
