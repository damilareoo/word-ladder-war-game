"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowLeft, Medal, User, Star, RefreshCw } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Footer } from "@/components/footer"
import { getLeaderboardChannel, ensureChannelSubscribed, cleanupLeaderboardChannel } from "@/lib/realtime-utils"
import { motion, AnimatePresence } from "framer-motion"
import { calculateLevel, getLevelInfo } from "@/lib/game-utils"

type GameScore = {
  id: string
  nickname: string
  score: number
  word_count: number
  time_taken: number
  main_word: string
  level: number
  created_at: string
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [scoreData, setScoreData] = useState<GameScore[]>([])
  const [wordData, setWordData] = useState<GameScore[]>([])
  const [activeFilter, setActiveFilter] = useState<"score" | "words">("score")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentUpdate, setRecentUpdate] = useState<string | null>(null)

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()

      // Fetch score data - ensure no filtering by level
      const { data: scoreResults, error: scoreError } = await supabase
        .from("game_scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(50)

      if (scoreError) throw scoreError

      // Fetch word count data - ensure no filtering by level
      const { data: wordResults, error: wordError } = await supabase
        .from("game_scores")
        .select("*")
        .order("word_count", { ascending: false })
        .limit(50)

      if (wordError) throw wordError

      // Update level information based on new thresholds
      const updatedScoreResults =
        scoreResults?.map((item) => ({
          ...item,
          level: calculateLevel(item.word_count),
        })) || []

      const updatedWordResults =
        wordResults?.map((item) => ({
          ...item,
          level: calculateLevel(item.word_count),
        })) || []

      // Log the data for debugging
      console.log("Fetched score data:", updatedScoreResults)
      console.log("Fetched word data:", updatedWordResults)

      // Update state with both datasets
      setScoreData(updatedScoreResults)
      setWordData(updatedWordResults)

      // Clear localStorage flag
      localStorage.removeItem("wlw-refresh-leaderboard")
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
      setError("Failed to load leaderboard. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle real-time updates
  const handleRealtimeUpdate = useCallback(
    (payload: any) => {
      console.log("Received leaderboard refresh signal", payload)

      // If we have immediate data, update the leaderboard without a full fetch
      if (payload?.data) {
        const { nickname, score, wordCount, level } = payload.data

        // Show notification of update
        setRecentUpdate(`${nickname} just scored ${score} points!`)

        // Clear notification after 3 seconds
        setTimeout(() => {
          setRecentUpdate(null)
        }, 3000)

        // Update the leaderboard data with the new entry
        setScoreData((prev) => {
          // Create a new entry with updated level calculation
          const newEntry: GameScore = {
            id: `temp-${Date.now()}`,
            nickname,
            score,
            word_count: wordCount,
            level: calculateLevel(wordCount), // Recalculate level based on new thresholds
            time_taken: 120,
            main_word: "",
            created_at: new Date().toISOString(),
          }

          // Add to existing data and resort
          const updated = [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 50)

          return updated
        })

        // Also update word count data
        setWordData((prev) => {
          // Create a new entry with updated level calculation
          const newEntry: GameScore = {
            id: `temp-${Date.now()}`,
            nickname,
            score,
            word_count: wordCount,
            level: calculateLevel(wordCount), // Recalculate level based on new thresholds
            time_taken: 120,
            main_word: "",
            created_at: new Date().toISOString(),
          }

          // Add to existing data and resort
          const updated = [...prev, newEntry].sort((a, b) => b.word_count - a.word_count).slice(0, 50)

          return updated
        })

        // Still fetch the full data after a short delay to ensure consistency
        setTimeout(() => {
          fetchLeaderboard()
        }, 2000)
      } else {
        // If no immediate data, just fetch the full leaderboard
        fetchLeaderboard()
      }
    },
    [fetchLeaderboard],
  )

  // Initial data fetch and subscription setup
  useEffect(() => {
    // Fetch data immediately
    fetchLeaderboard()

    // Set up real-time subscription
    const setupSubscription = async () => {
      await ensureChannelSubscribed()

      const channel = getLeaderboardChannel()
      if (channel) {
        channel.on("broadcast", { event: "refresh" }, (payload) => {
          handleRealtimeUpdate(payload)
        })
      }
    }

    setupSubscription()

    // Check for latest game data in localStorage
    const latestGameStr = localStorage.getItem("wlw-latest-game")
    if (latestGameStr) {
      try {
        const latestGame = JSON.parse(latestGameStr)
        // Only use if it's recent (last 10 seconds)
        if (Date.now() - latestGame.timestamp < 10000) {
          handleRealtimeUpdate({ data: latestGame })
        }
        // Clear it after using
        localStorage.removeItem("wlw-latest-game")
      } catch (e) {
        console.error("Error parsing latest game data", e)
      }
    }

    // Cleanup subscription
    return () => {
      cleanupLeaderboardChannel()
    }
  }, [fetchLeaderboard, handleRealtimeUpdate])

  // Get level title using the updated function
  const getLevelTitle = (level: number, wordCount: number) => {
    // Recalculate level based on word count to ensure consistency
    const calculatedLevel = calculateLevel(wordCount)
    return getLevelInfo(calculatedLevel).title
  }

  // Get current data based on active filter
  const currentData = activeFilter === "score" ? scoreData : wordData

  useEffect(() => {
    // Debug logging for the leaderboard data
    if (currentData.length > 0) {
      const levelsDistribution = currentData.reduce(
        (acc, item) => {
          const level = calculateLevel(item.word_count)
          acc[level] = (acc[level] || 0) + 1
          return acc
        },
        {} as Record<number, number>,
      )

      console.log("Leaderboard data distribution by level:", levelsDistribution)
      console.log("First few items:", currentData.slice(0, 5))
    }
  }, [currentData])

  return (
    <main className="flex min-h-screen flex-col bg-zinc-900 text-cream">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-zinc-900/95 p-3 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="text-zinc-400 hover:text-cream h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-bold">Global Leaderboard</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchLeaderboard}
          className="text-zinc-400 hover:text-cream h-8 w-8"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Recent Update Notification */}
      <AnimatePresence>
        {recentUpdate && (
          <motion.div
            className="bg-green-500/20 text-green-400 text-center py-2 px-4 mx-auto rounded-full text-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {recentUpdate}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Buttons */}
      <div className="mx-auto w-full max-w-md p-2 flex-1">
        <div className="mb-3 flex justify-center gap-2">
          <Button
            variant={activeFilter === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("score")}
            className={`text-xs h-8 ${
              activeFilter === "score" ? "bg-orange-500 hover:bg-orange-600" : "border-zinc-700"
            }`}
          >
            <Trophy className="mr-1 h-3 w-3" />
            Score
          </Button>
          <Button
            variant={activeFilter === "words" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("words")}
            className={`text-xs h-8 ${
              activeFilter === "words" ? "bg-green-500 hover:bg-green-600" : "border-zinc-700"
            }`}
          >
            <Star className="mr-1 h-3 w-3" />
            Words
          </Button>
        </div>

        {/* Content */}
        {isLoading && !currentData.length ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-t-orange-500"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-zinc-800 p-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              onClick={fetchLeaderboard}
              className="mt-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs h-8"
            >
              Retry
            </Button>
          </div>
        ) : currentData.length === 0 ? (
          <div className="rounded-lg bg-zinc-800 p-6 text-center">
            <Trophy className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
            <h2 className="text-lg font-bold">No scores yet</h2>
            <p className="mt-1 text-zinc-400 text-sm">Play a game to see your score on the leaderboard!</p>
            <Button
              onClick={() => router.push("/game")}
              className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs h-8"
            >
              Play Now
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {currentData.map((item, index) => {
              // Calculate the level based on word count
              const calculatedLevel = calculateLevel(item.word_count)
              const levelTitle = getLevelInfo(calculatedLevel).title

              return (
                <motion.div
                  key={`${activeFilter}-${item.id}`}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 p-2 shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  layout
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold">
                    {index === 0 ? (
                      <Medal className="h-3 w-3 text-yellow-400" />
                    ) : index === 1 ? (
                      <Medal className="h-3 w-3 text-zinc-400" />
                    ) : index === 2 ? (
                      <Medal className="h-3 w-3 text-orange-400" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-zinc-500" />
                      <p className="font-medium text-sm">{item.nickname}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <p>{item.word_count} words</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold text-orange-500">{item.score}</p>
                    <p className="text-xs text-zinc-500">
                      {levelTitle} (Lvl {calculatedLevel})
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  )
}
