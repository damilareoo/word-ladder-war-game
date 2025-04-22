type GameEvent = {
  name: string
  properties?: Record<string, string | number | boolean>
}

/**
 * Track a custom game event
 */
export function trackGameEvent({ name, properties }: GameEvent): void {
  // Check if window and Vercel Analytics are available
  if (typeof window !== "undefined" && window.va) {
    // Track the event using Vercel Analytics
    window.va.track(name, properties)
  }
}

/**
 * Track when a user starts a game
 */
export function trackGameStart(mainWord: string): void {
  trackGameEvent({
    name: "game_started",
    properties: {
      main_word: mainWord,
      timestamp: Date.now(),
    },
  })
}

/**
 * Track when a user completes a game
 */
export function trackGameComplete(score: number, wordCount: number, level: number): void {
  trackGameEvent({
    name: "game_completed",
    properties: {
      score,
      word_count: wordCount,
      level,
      timestamp: Date.now(),
    },
  })
}

/**
 * Track when a user submits a valid word
 */
export function trackWordSubmitted(word: string, isValid: boolean): void {
  trackGameEvent({
    name: "word_submitted",
    properties: {
      word,
      is_valid: isValid,
      length: word.length,
      timestamp: Date.now(),
    },
  })
}
