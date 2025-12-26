export type GameScore = {
  id: string
  nickname: string
  score: number
  word_count: number
  time_taken: number
  main_word: string
  level: number
  created_at: string
}

export type Player = {
  id: string
  nickname: string
  created_at: string
}

// Storage keys
const STORAGE_KEYS = {
  PLAYERS: "wlw-players",
  SCORES: "wlw-scores",
  NICKNAME: "wlw-nickname",
  PLAYER_ID: "wlw-player-id",
  LAST_SCORE: "wlw-last-score",
  LAST_WORD_COUNT: "wlw-last-word-count",
  LAST_LEVEL: "wlw-last-level",
  LAST_TIME: "wlw-last-time",
  MAIN_WORD: "wlw-main-word",
  GAME_TIMESTAMP: "wlw-game-timestamp",
} as const

// Generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

// Get all players from localStorage
export function getPlayers(): Player[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLAYERS)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Get all scores from localStorage
export function getScores(): GameScore[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCORES)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

// Save players to localStorage
function savePlayers(players: Player[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players))
}

// Save scores to localStorage
function saveScores(scores: GameScore[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores))
}

// Find player by nickname
export function findPlayerByNickname(nickname: string): Player | undefined {
  const players = getPlayers()
  return players.find((p) => p.nickname.toLowerCase() === nickname.toLowerCase())
}

// Create or get player
export function createOrGetPlayer(nickname: string): Player {
  let player = findPlayerByNickname(nickname)

  if (!player) {
    player = {
      id: generateId(),
      nickname,
      created_at: new Date().toISOString(),
    }
    const players = getPlayers()
    players.push(player)
    savePlayers(players)
  }

  return player
}

// Save game score
export function saveGameScore(data: {
  player_id: string
  nickname: string
  score: number
  word_count: number
  time_taken: number
  main_word: string
  level: number
}): GameScore {
  const scores = getScores()

  const newScore: GameScore = {
    id: generateId(),
    nickname: data.nickname,
    score: data.score,
    word_count: data.word_count,
    time_taken: data.time_taken,
    main_word: data.main_word,
    level: data.level,
    created_at: new Date().toISOString(),
  }

  scores.push(newScore)

  // Keep only top 100 scores to prevent localStorage from getting too large
  const sortedScores = scores.sort((a, b) => b.score - a.score).slice(0, 100)
  saveScores(sortedScores)

  return newScore
}

// Get leaderboard by score
export function getLeaderboardByScore(limit = 50): GameScore[] {
  const scores = getScores()
  return scores.sort((a, b) => b.score - a.score).slice(0, limit)
}

// Get leaderboard by word count
export function getLeaderboardByWordCount(limit = 50): GameScore[] {
  const scores = getScores()
  return scores.sort((a, b) => b.word_count - a.word_count).slice(0, limit)
}

// Get current player info
export function getCurrentPlayer(): { nickname: string; id: string } | null {
  if (typeof window === "undefined") return null

  const nickname = localStorage.getItem(STORAGE_KEYS.NICKNAME)
  const id = localStorage.getItem(STORAGE_KEYS.PLAYER_ID)

  if (nickname && id) {
    return { nickname, id }
  }

  return null
}

// Set current player info
export function setCurrentPlayer(nickname: string, id: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.NICKNAME, nickname)
  localStorage.setItem(STORAGE_KEYS.PLAYER_ID, id)
}

// Save last game results
export function saveLastGameResults(data: {
  score: number
  wordCount: number
  level: number
  timeTaken: number
}): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.LAST_SCORE, data.score.toString())
  localStorage.setItem(STORAGE_KEYS.LAST_WORD_COUNT, data.wordCount.toString())
  localStorage.setItem(STORAGE_KEYS.LAST_LEVEL, data.level.toString())
  localStorage.setItem(STORAGE_KEYS.LAST_TIME, data.timeTaken.toString())
  localStorage.setItem(STORAGE_KEYS.GAME_TIMESTAMP, Date.now().toString())
}

// Get last game results
export function getLastGameResults(): {
  score: number
  wordCount: number
  level: number
  timeTaken: number
} | null {
  if (typeof window === "undefined") return null

  try {
    const score = Number.parseInt(localStorage.getItem(STORAGE_KEYS.LAST_SCORE) || "0", 10)
    const wordCount = Number.parseInt(localStorage.getItem(STORAGE_KEYS.LAST_WORD_COUNT) || "0", 10)
    const level = Number.parseInt(localStorage.getItem(STORAGE_KEYS.LAST_LEVEL) || "1", 10)
    const timeTaken = Number.parseInt(localStorage.getItem(STORAGE_KEYS.LAST_TIME) || "120", 10)

    return { score, wordCount, level, timeTaken }
  } catch {
    return null
  }
}

// Clear all game data (for testing/reset)
export function clearAllData(): void {
  if (typeof window === "undefined") return
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key)
  })
}

// Sample data for new users
export const SAMPLE_LEADERBOARD: GameScore[] = [
  {
    id: "sample-1",
    nickname: "WordMaster",
    score: 250,
    word_count: 15,
    time_taken: 120,
    main_word: "CHALLENGE",
    level: 2,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "sample-2",
    nickname: "LexiconPro",
    score: 180,
    word_count: 12,
    time_taken: 118,
    main_word: "VOCABULARY",
    level: 2,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "sample-3",
    nickname: "WordSmith",
    score: 150,
    word_count: 8,
    time_taken: 115,
    main_word: "DICTIONARY",
    level: 1,
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: "sample-4",
    nickname: "LetterNinja",
    score: 120,
    word_count: 7,
    time_taken: 110,
    main_word: "ELABORATE",
    level: 1,
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: "sample-5",
    nickname: "VocabHero",
    score: 100,
    word_count: 6,
    time_taken: 105,
    main_word: "ADVENTURE",
    level: 1,
    created_at: new Date(Date.now() - 432000000).toISOString(),
  },
]

// Initialize with sample data if empty
export function initializeWithSampleData(): void {
  if (typeof window === "undefined") return

  const scores = getScores()
  if (scores.length === 0) {
    saveScores(SAMPLE_LEADERBOARD)
  }
}
