/**
 * Safely check if Vercel Analytics is available
 */
const isAnalyticsAvailable = (): boolean => {
  try {
    return typeof window !== "undefined" && typeof window.va !== "undefined" && typeof window.va.track === "function"
  } catch (error) {
    console.error("Error checking analytics availability:", error)
    return false
  }
}

type GameEvent = {
  name: string
  properties?: Record<string, string | number | boolean>
}

/**
 * Track a custom game event
 */
export function trackGameEvent({ name, properties }: GameEvent): void {
  // Only track if analytics is available and we're on the client
  if (typeof window === "undefined") return

  try {
    if (isAnalyticsAvailable()) {
      window.va.track(name, properties)
      console.log(`[Analytics] Tracked event: ${name}`, properties)
    } else {
      // Log that analytics is not available
      console.log(`[Analytics] Not available for event: ${name}`)
    }
  } catch (error) {
    // Silently fail if tracking fails
    console.error("[Analytics] Error tracking event:", error)
  }
}

/**
 * Track when a user starts a game
 */
export function trackGameStart(mainWord: string): void {
  if (typeof window === "undefined") return

  try {
    trackGameEvent({
      name: "game_started",
      properties: {
        main_word: mainWord,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error("Error tracking game start:", error)
  }
}

/**
 * Track when a user completes a game
 */
export function trackGameComplete(score: number, wordCount: number, level: number): void {
  if (typeof window === "undefined") return

  try {
    trackGameEvent({
      name: "game_completed",
      properties: {
        score,
        word_count: wordCount,
        level,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error("Error tracking game completion:", error)
  }
}

/**
 * Track when a user submits a valid word
 */
export function trackWordSubmitted(word: string, isValid: boolean): void {
  if (typeof window === "undefined") return

  try {
    trackGameEvent({
      name: "word_submitted",
      properties: {
        word,
        is_valid: isValid,
        length: word.length,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error("Error tracking word submission:", error)
  }
}
