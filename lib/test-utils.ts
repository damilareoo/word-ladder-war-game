import { gameService, type GameResult } from "@/lib/game-service"
import { realtimeLeaderboard } from "@/lib/realtime-leaderboard"
import { testSupabaseConnection } from "@/lib/supabase"

export interface TestResult {
  name: string
  success: boolean
  duration: number
  error?: string
  details?: any
}

export interface TestSuite {
  name: string
  results: TestResult[]
  totalDuration: number
  successRate: number
}

/**
 * Comprehensive test suite for Supabase integration
 */
export class SupabaseTestSuite {
  private results: TestResult[] = []

  /**
   * Run all tests
   */
  async runAllTests(): Promise<TestSuite> {
    console.log("🧪 Starting Supabase integration tests...")
    this.results = []

    const tests = [
      this.testConnection,
      this.testPlayerCreation,
      this.testScoreSaving,
      this.testLeaderboardFetch,
      this.testRealtimeConnection,
      this.testConcurrentScores,
      this.testErrorHandling,
      this.testCacheInvalidation,
    ]

    for (const test of tests) {
      await this.runTest(test.bind(this))
    }

    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0)
    const successCount = this.results.filter((result) => result.success).length
    const successRate = (successCount / this.results.length) * 100

    return {
      name: "Supabase Integration Tests",
      results: this.results,
      totalDuration,
      successRate,
    }
  }

  /**
   * Run a single test with timing and error handling
   */
  private async runTest(testFn: () => Promise<void>): Promise<void> {
    const testName = testFn.name.replace("bound ", "")
    const startTime = Date.now()

    try {
      await testFn()
      const duration = Date.now() - startTime
      this.results.push({
        name: testName,
        success: true,
        duration,
      })
      console.log(`✅ ${testName} passed (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      this.results.push({
        name: testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      })
      console.error(`❌ ${testName} failed (${duration}ms):`, error)
    }
  }

  /**
   * Test basic database connection
   */
  private async testConnection(): Promise<void> {
    const result = await testSupabaseConnection()
    if (!result.success) {
      throw new Error(result.error || "Connection test failed")
    }
  }

  /**
   * Test player creation and retrieval
   */
  private async testPlayerCreation(): Promise<void> {
    const testNickname = `TestPlayer_${Date.now()}`

    // Clear any existing player ID
    localStorage.removeItem("wlw-player-id")

    const result = await gameService.saveGameResult({
      nickname: testNickname,
      score: 100,
      wordCount: 5,
      timeTaken: 60,
      mainWord: "TEST",
      level: 1,
    })

    if (!result.success) {
      throw new Error(result.error || "Failed to create player")
    }

    // Verify player ID was stored
    const playerId = localStorage.getItem("wlw-player-id")
    if (!playerId) {
      throw new Error("Player ID not stored in localStorage")
    }
  }

  /**
   * Test score saving with validation
   */
  private async testScoreSaving(): Promise<void> {
    const testData: GameResult = {
      nickname: `ScoreTest_${Date.now()}`,
      score: 1500,
      wordCount: 15,
      timeTaken: 90,
      mainWord: "TESTING",
      level: 3,
    }

    const result = await gameService.saveGameResult(testData)

    if (!result.success) {
      throw new Error(result.error || "Failed to save score")
    }

    if (!result.data) {
      throw new Error("No data returned from score save")
    }

    // Validate returned data
    const { data } = result
    if (data.nickname !== testData.nickname) {
      throw new Error("Nickname mismatch in saved data")
    }
    if (data.score !== testData.score) {
      throw new Error("Score mismatch in saved data")
    }
  }

  /**
   * Test leaderboard fetching
   */
  private async testLeaderboardFetch(): Promise<void> {
    const leaderboard = await gameService.getLeaderboard(true)

    if (!leaderboard) {
      throw new Error("No leaderboard data returned")
    }

    if (!Array.isArray(leaderboard.byScore)) {
      throw new Error("Invalid byScore data structure")
    }

    if (!Array.isArray(leaderboard.byWords)) {
      throw new Error("Invalid byWords data structure")
    }

    // Verify sorting
    for (let i = 1; i < leaderboard.byScore.length; i++) {
      if (leaderboard.byScore[i].score > leaderboard.byScore[i - 1].score) {
        throw new Error("Score leaderboard not properly sorted")
      }
    }

    for (let i = 1; i < leaderboard.byWords.length; i++) {
      if (leaderboard.byWords[i].word_count > leaderboard.byWords[i - 1].word_count) {
        throw new Error("Words leaderboard not properly sorted")
      }
    }
  }

  /**
   * Test real-time connection
   */
  private async testRealtimeConnection(): Promise<void> {
    const success = await realtimeLeaderboard.initialize()

    if (!success) {
      throw new Error("Failed to initialize real-time connection")
    }

    const status = realtimeLeaderboard.getConnectionStatus()

    // Wait a bit for connection to establish
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const finalStatus = realtimeLeaderboard.getConnectionStatus()
    if (!finalStatus.isConnected) {
      throw new Error("Real-time connection not established")
    }
  }

  /**
   * Test concurrent score submissions
   */
  private async testConcurrentScores(): Promise<void> {
    const concurrentTests = 5
    const promises: Promise<any>[] = []

    for (let i = 0; i < concurrentTests; i++) {
      const testData: GameResult = {
        nickname: `Concurrent_${i}_${Date.now()}`,
        score: 1000 + i * 100,
        wordCount: 10 + i,
        timeTaken: 60 + i * 10,
        mainWord: `TEST${i}`,
        level: 2,
      }

      promises.push(gameService.saveGameResult(testData))
    }

    const results = await Promise.allSettled(promises)

    const failures = results.filter((result) => result.status === "rejected")
    if (failures.length > 0) {
      throw new Error(`${failures.length}/${concurrentTests} concurrent saves failed`)
    }

    const successes = results.filter((result) => result.status === "fulfilled") as PromiseFulfilledResult<any>[]
    const failedSaves = successes.filter((result) => !result.value.success)

    if (failedSaves.length > 0) {
      throw new Error(`${failedSaves.length}/${concurrentTests} saves returned failure`)
    }
  }

  /**
   * Test error handling and recovery
   */
  private async testErrorHandling(): Promise<void> {
    // Test with invalid data
    const invalidData: any = {
      nickname: "", // Invalid empty nickname
      score: -100, // Invalid negative score
      wordCount: "invalid", // Invalid type
      timeTaken: null, // Invalid null value
      mainWord: null, // Invalid null value
      level: 0, // Invalid level
    }

    const result = await gameService.saveGameResult(invalidData)

    // Should handle gracefully and return failure
    if (result.success) {
      throw new Error("Invalid data was accepted")
    }

    if (!result.error) {
      throw new Error("No error message provided for invalid data")
    }
  }

  /**
   * Test cache invalidation
   */
  private async testCacheInvalidation(): Promise<void> {
    // Fetch leaderboard to populate cache
    const firstFetch = await gameService.getLeaderboard()
    const firstTimestamp = firstFetch.lastUpdate

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Force refresh should bypass cache
    const secondFetch = await gameService.getLeaderboard(true)
    const secondTimestamp = secondFetch.lastUpdate

    if (secondTimestamp <= firstTimestamp) {
      throw new Error("Cache was not invalidated on force refresh")
    }
  }

  /**
   * Generate test report
   */
  generateReport(suite: TestSuite): string {
    const report = [
      `📊 ${suite.name} Report`,
      `═══════════════════════════════════`,
      `Total Tests: ${suite.results.length}`,
      `Success Rate: ${suite.successRate.toFixed(1)}%`,
      `Total Duration: ${suite.totalDuration}ms`,
      ``,
      `Test Results:`,
      `─────────────────────────────────`,
    ]

    suite.results.forEach((result) => {
      const status = result.success ? "✅" : "❌"
      const duration = `${result.duration}ms`
      const error = result.error ? ` - ${result.error}` : ""

      report.push(`${status} ${result.name} (${duration})${error}`)
    })

    return report.join("\n")
  }
}

/**
 * Quick connection test utility
 */
export async function quickConnectionTest(): Promise<{
  database: boolean
  realtime: boolean
  latency?: number
}> {
  const results = {
    database: false,
    realtime: false,
    latency: undefined as number | undefined,
  }

  try {
    // Test database connection
    const dbTest = await testSupabaseConnection()
    results.database = dbTest.success
    results.latency = dbTest.latency

    // Test real-time connection
    const rtSuccess = await realtimeLeaderboard.initialize()
    results.realtime = rtSuccess
  } catch (error) {
    console.error("Quick connection test failed:", error)
  }

  return results
}

/**
 * Simulate concurrent gameplay sessions
 */
export async function simulateConcurrentGameplay(playerCount = 3): Promise<TestResult[]> {
  const results: TestResult[] = []
  const promises: Promise<void>[] = []

  for (let i = 0; i < playerCount; i++) {
    const promise = (async () => {
      const startTime = Date.now()
      const playerName = `SimPlayer${i + 1}`

      try {
        // Simulate a game session
        const gameResult: GameResult = {
          nickname: playerName,
          score: Math.floor(Math.random() * 2000) + 500,
          wordCount: Math.floor(Math.random() * 20) + 5,
          timeTaken: Math.floor(Math.random() * 60) + 30,
          mainWord: `WORD${i + 1}`,
          level: Math.floor(Math.random() * 5) + 1,
        }

        const result = await gameService.saveGameResult(gameResult)

        const duration = Date.now() - startTime
        results.push({
          name: `${playerName} Game Session`,
          success: result.success,
          duration,
          error: result.error,
          details: { score: gameResult.score, wordCount: gameResult.wordCount },
        })
      } catch (error) {
        const duration = Date.now() - startTime
        results.push({
          name: `${playerName} Game Session`,
          success: false,
          duration,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })()

    promises.push(promise)
  }

  await Promise.all(promises)
  return results
}

/**
 * Performance benchmark for leaderboard operations
 */
export async function benchmarkLeaderboard(): Promise<{
  fetchTime: number
  cacheHitTime: number
  forceRefreshTime: number
}> {
  // Benchmark initial fetch
  const fetchStart = Date.now()
  await gameService.getLeaderboard()
  const fetchTime = Date.now() - fetchStart

  // Benchmark cache hit
  const cacheStart = Date.now()
  await gameService.getLeaderboard()
  const cacheHitTime = Date.now() - cacheStart

  // Benchmark force refresh
  const refreshStart = Date.now()
  await gameService.getLeaderboard(true)
  const forceRefreshTime = Date.now() - refreshStart

  return {
    fetchTime,
    cacheHitTime,
    forceRefreshTime,
  }
}

// Export singleton test suite
export const testSuite = new SupabaseTestSuite()
