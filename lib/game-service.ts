import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase"
import { calculateLevel } from "@/lib/game-utils"
import { realtimeLeaderboard, type GameScore } from "@/lib/realtime-leaderboard"

export interface GameResult {
  nickname: string
  score: number
  wordCount: number
  timeTaken: number
  mainWord: string
  level: number
}

export interface LeaderboardData {
  byScore: GameScore[]
  byWords: GameScore[]
  lastUpdate: number
  isSampleData: boolean
  error?: string
}

// Cache management
interface CacheEntry {
  data: LeaderboardData
  timestamp: number
  ttl: number
}

class GameService {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_TTL = 30000 // 30 seconds
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000
  private initializationPromise: Promise<boolean> | null = null

  constructor() {
    // Initialize real-time connection with better error handling
    if (typeof window !== "undefined") {
      this.initializeRealtime()
    }
  }

  // Initialize real-time connection with retry logic
  private async initializeRealtime(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise
      return
    }

    this.initializationPromise = (async () => {
      try {
        console.log("🚀 Initializing game service real-time connection...")
        const success = await realtimeLeaderboard.initialize()

        if (success) {
          console.log("✅ Real-time leaderboard initialized successfully")
          return true
        } else {
          console.warn("⚠️ Real-time leaderboard initialization failed, continuing without real-time features")
          return false
        }
      } catch (error) {
        console.error("❌ Error initializing real-time connection:", error)
        return false
      }
    })()

    await this.initializationPromise
  }

  /**
   * Save game result with enhanced error handling and retry logic
   */
  async saveGameResult(
    result: GameResult,
    retryCount = 0,
  ): Promise<{
    success: boolean
    error?: string
    data?: GameScore
  }> {
    if (!isSupabaseConfigured()) {
      console.log("📝 Supabase not configured, skipping database save")
      return { success: false, error: "Database not configured" }
    }

    try {
      console.log(`💾 Saving game result (attempt ${retryCount + 1}):`, result)

      const supabase = getSupabaseBrowserClient()

      // Get or create player ID with better error handling
      const playerId = await this.getOrCreatePlayerId(result.nickname)
      if (!playerId) {
        throw new Error("Failed to get or create player ID")
      }

      const gameData = {
        player_id: playerId,
        nickname: result.nickname,
        score: result.score,
        word_count: result.wordCount,
        time_taken: result.timeTaken,
        main_word: result.mainWord,
        level: result.level,
      }

      // Save to database with timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const { data, error } = await supabase
          .from("game_scores")
          .insert(gameData)
          .select()
          .single()
          .abortSignal(controller.signal)

        clearTimeout(timeoutId)

        if (error) {
          throw error
        }

        console.log("✅ Game result saved successfully:", data)

        // Broadcast to real-time subscribers with error handling
        try {
          await this.broadcastScoreUpdate(data)
        } catch (broadcastError) {
          console.warn("⚠️ Failed to broadcast score update:", broadcastError)
          // Don't fail the entire operation if broadcast fails
        }

        // Invalidate cache
        this.invalidateCache()

        return { success: true, data }
      } catch (saveError) {
        clearTimeout(timeoutId)
        throw saveError
      }
    } catch (error) {
      console.error(`❌ Error saving game result (attempt ${retryCount + 1}):`, error)

      // Retry logic with exponential backoff
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount)
        console.log(`🔄 Retrying save in ${delay}ms...`)

        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.saveGameResult(result, retryCount + 1)
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred while saving game result",
      }
    }
  }

  /**
   * Get leaderboard with enhanced caching and error handling
   */
  async getLeaderboard(forceRefresh = false): Promise<LeaderboardData> {
    const cacheKey = "leaderboard"

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.hasValidCache(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      console.log("📋 Returning cached leaderboard data")
      return cached.data
    }

    if (!isSupabaseConfigured()) {
      console.log("📋 Supabase not configured, returning sample data")
      return this.getSampleLeaderboard()
    }

    try {
      console.log("📋 Fetching leaderboard from database...")
      const supabase = getSupabaseBrowserClient()

      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      try {
        // Fetch both leaderboards concurrently
        const [scoreResult, wordsResult] = await Promise.allSettled([
          supabase
            .from("game_scores")
            .select("*")
            .order("score", { ascending: false })
            .limit(50)
            .abortSignal(controller.signal),
          supabase
            .from("game_scores")
            .select("*")
            .order("word_count", { ascending: false })
            .limit(50)
            .abortSignal(controller.signal),
        ])

        clearTimeout(timeoutId)

        const byScore = scoreResult.status === "fulfilled" ? scoreResult.value.data || [] : []
        const byWords = wordsResult.status === "fulfilled" ? wordsResult.value.data || [] : []

        // If both failed, return sample data
        if (scoreResult.status === "rejected" && wordsResult.status === "rejected") {
          console.error("❌ Both leaderboard queries failed")
          console.error("Score query error:", scoreResult.reason)
          console.error("Words query error:", wordsResult.reason)
          return this.getSampleLeaderboard()
        }

        // Update levels and prepare data
        const leaderboardData: LeaderboardData = {
          byScore: this.updateLevels(byScore),
          byWords: this.updateLevels(byWords),
          lastUpdate: Date.now(),
          isSampleData: false,
        }

        // Cache the result
        this.setCache(cacheKey, leaderboardData)

        console.log(`✅ Leaderboard data fetched successfully (${byScore.length} by score, ${byWords.length} by words)`)
        return leaderboardData
      } catch (fetchError) {
        clearTimeout(timeoutId)
        throw fetchError
      }
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error)
      return this.getSampleLeaderboard()
    }
  }

  /**
   * Get or create player ID with enhanced error handling
   */
  private async getOrCreatePlayerId(nickname: string): Promise<string | null> {
    try {
      const supabase = getSupabaseBrowserClient()

      // Check localStorage first
      const storedPlayerId = localStorage.getItem("wlw-player-id")
      if (storedPlayerId) {
        console.log("👤 Using stored player ID:", storedPlayerId)
        return storedPlayerId
      }

      console.log("👤 Creating/finding player for nickname:", nickname)

      // Check if player exists
      const { data: existingPlayer, error: findError } = await supabase
        .from("players")
        .select("id")
        .eq("nickname", nickname)
        .maybeSingle()

      if (findError) {
        console.warn("⚠️ Error finding existing player:", findError)
      }

      if (existingPlayer) {
        console.log("👤 Found existing player:", existingPlayer.id)
        localStorage.setItem("wlw-player-id", existingPlayer.id)
        return existingPlayer.id
      }

      // Create new player
      const { data: newPlayer, error: createError } = await supabase
        .from("players")
        .insert({ nickname })
        .select("id")
        .single()

      if (createError) {
        console.error("❌ Error creating new player:", createError)
        throw createError
      }

      console.log("👤 Created new player:", newPlayer.id)
      localStorage.setItem("wlw-player-id", newPlayer.id)
      return newPlayer.id
    } catch (error) {
      console.error("❌ Error getting or creating player ID:", error)

      // Fallback to generating a UUID
      const fallbackId = crypto.randomUUID()
      console.log("👤 Using fallback player ID:", fallbackId)
      localStorage.setItem("wlw-player-id", fallbackId)
      return fallbackId
    }
  }

  /**
   * Broadcast score update to real-time subscribers
   */
  private async broadcastScoreUpdate(scoreData: GameScore): Promise<void> {
    try {
      console.log("📡 Broadcasting score update...")
      const success = await realtimeLeaderboard.broadcastScore(scoreData)

      if (success) {
        console.log("✅ Score broadcasted successfully")
      } else {
        console.warn("⚠️ Failed to broadcast score")
      }
    } catch (error) {
      console.error("❌ Error broadcasting score:", error)
      // Don't throw here - broadcasting failure shouldn't fail the save operation
    }
  }

  /**
   * Update levels based on current calculation
   */
  private updateLevels(scores: any[]): GameScore[] {
    return scores.map((score) => ({
      ...score,
      level: calculateLevel(score.word_count),
    }))
  }

  /**
   * Cache management methods
   */
  private hasValidCache(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  private setCache(key: string, data: LeaderboardData): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    })
  }

  private invalidateCache(): void {
    this.cache.clear()
    console.log("🗑️ Cache invalidated")
  }

  /**
   * Get sample leaderboard data
   */
  private getSampleLeaderboard(): LeaderboardData {
    const sampleData: GameScore[] = [
      {
        id: "sample-1",
        nickname: "WordMaster",
        score: 2500,
        word_count: 25,
        level: 5,
        time_taken: 45,
        main_word: "CHALLENGE",
        created_at: new Date().toISOString(),
      },
      {
        id: "sample-2",
        nickname: "QuickThinker",
        score: 2200,
        word_count: 22,
        level: 5,
        time_taken: 60,
        main_word: "VOCABULARY",
        created_at: new Date().toISOString(),
      },
      {
        id: "sample-3",
        nickname: "BrainPower",
        score: 1800,
        word_count: 18,
        level: 4,
        time_taken: 75,
        main_word: "DICTIONARY",
        created_at: new Date().toISOString(),
      },
      {
        id: "sample-4",
        nickname: "WordCollector",
        score: 1500,
        word_count: 30,
        level: 6,
        time_taken: 90,
        main_word: "LETTERS",
        created_at: new Date().toISOString(),
      },
      {
        id: "sample-5",
        nickname: "VocabKing",
        score: 1200,
        word_count: 15,
        level: 4,
        time_taken: 105,
        main_word: "SPELLING",
        created_at: new Date().toISOString(),
      },
    ]

    return {
      byScore: [...sampleData].sort((a, b) => b.score - a.score),
      byWords: [...sampleData].sort((a, b) => b.word_count - a.word_count),
      lastUpdate: Date.now(),
      isSampleData: true,
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured" }
    }

    try {
      const startTime = Date.now()
      const supabase = getSupabaseBrowserClient()

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const { error } = await supabase.from("players").select("id").limit(1).abortSignal(controller.signal)

        clearTimeout(timeoutId)
        const latency = Date.now() - startTime

        if (error) {
          return { success: false, error: error.message }
        }

        return { success: true, latency }
      } catch (testError) {
        clearTimeout(timeoutId)
        throw testError
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    const connectionStatus = realtimeLeaderboard.getConnectionStatus()
    return {
      isConfigured: isSupabaseConfigured(),
      isRealtimeConnected: connectionStatus.isConnected,
      isRealtimeConnecting: connectionStatus.isConnecting,
      reconnectAttempts: connectionStatus.reconnectAttempts,
      cacheSize: this.cache.size,
    }
  }

  /**
   * Force reconnect real-time connection
   */
  async forceReconnect(): Promise<boolean> {
    try {
      return await realtimeLeaderboard.forceReconnect()
    } catch (error) {
      console.error("Error forcing reconnect:", error)
      return false
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.cache.clear()
    await realtimeLeaderboard.cleanup()
  }
}

// Singleton instance
export const gameService = new GameService()

// Export types and utilities
export type { GameScore, LeaderboardData }
