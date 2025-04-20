"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowLeft, Medal, User, Star, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Footer } from "@/components/footer"

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
  const searchParams = useSearchParams()
  const [scores, setScores] = useState<GameScore[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"score" | "words">("score")
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0) // Used to force refresh

  // Check if we need to refresh the leaderboard
  const shouldRefresh =
    searchParams.get("refresh") === "true" || localStorage.getItem("wlw-refresh-leaderboard") === "true"

  // Function to fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseBrowserClient()

      // Determine sort order based on filter
      const orderColumn = filter === "score" ? "score" : "word_count"
      const ascending = false // Always descending for both score and words

      console.log(`Fetching leaderboard sorted by ${orderColumn} in descending order`)

      // Make sure we're getting scores > 0 for score and word_count filters
      let query = supabase.from("game_scores").select("*")

      if (filter === "score") {
        query = query.gt("score", 0)
      } else if (filter === "words") {
        query = query.gt("word_count", 0)
      }

      const { data, error } = await query.order(orderColumn, { ascending }).limit(50)

      if (error) {
        console.error("Supabase query error:", error)
        setError("Failed to load leaderboard. Please try again.")
        throw error
      }

      console.log("Leaderboard data count:", data?.length || 0)

      if (!data || data.length === 0) {
        console.log("No leaderboard data found")
      }

      setScores(data || [])

      // Clear the refresh flag
      localStorage.removeItem("wlw-refresh-leaderboard")
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
      setError("Failed to load leaderboard. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch leaderboard data when component mounts or filter changes
  useEffect(() => {
    fetchLeaderboard()

    // Set up real-time subscription for leaderboard updates
    const supabase = getSupabaseBrowserClient()

    // Listen for changes to the game_scores table
    const scoresChannel = supabase
      .channel("game_scores_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_scores",
        },
        () => {
          // Refresh the leaderboard when data changes
          console.log("Game scores changed, refreshing leaderboard")
          fetchLeaderboard()
        },
      )
      .subscribe()

    // Listen for the custom refresh event from the results page
    const refreshChannel = supabase
      .channel("leaderboard_refresh")
      .on("broadcast", { event: "refresh" }, () => {
        console.log("Received refresh signal, updating leaderboard")
        fetchLeaderboard()
      })
      .subscribe()

    // If we should refresh, do it immediately
    if (shouldRefresh) {
      console.log("Should refresh flag detected, refreshing leaderboard")
      fetchLeaderboard()
    }

    // Clean up subscriptions when component unmounts
    return () => {
      supabase.removeChannel(scoresChannel)
      supabase.removeChannel(refreshChannel)
    }
  }, [filter, refreshKey, shouldRefresh])

  // Get level title
  const getLevelTitle = (level: number) => {
    if (level === 1) return "Word Novice"
    if (level === 2) return "Word Expert"
    return "Word Guru"
  }

  // Manual refresh function
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1) // Increment refresh key to trigger useEffect
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-900 text-cream">
      <motion.header
        className="sticky top-0 z-10 flex items-center justify-between bg-zinc-900/95 p-3 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
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
          onClick={handleRefresh}
          className="text-zinc-400 hover:text-cream h-8 w-8"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </motion.header>

      <div className="mx-auto w-full max-w-md p-2 flex-1">
        <motion.div
          className="mb-3 flex justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant={filter === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("score")}
            className={`text-xs h-8 ${filter === "score" ? "bg-orange-500 hover:bg-orange-600" : "border-zinc-700"}`}
          >
            <Trophy className="mr-1 h-3 w-3" />
            Score
          </Button>
          <Button
            variant={filter === "words" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("words")}
            className={`text-xs h-8 ${filter === "words" ? "bg-green-500 hover:bg-green-600" : "border-zinc-700"}`}
          >
            <Star className="mr-1 h-3 w-3" />
            Words
          </Button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-t-orange-500"></div>
          </div>
        ) : error ? (
          <motion.div
            className="rounded-lg bg-zinc-800 p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-400 text-sm">{error}</p>
            <Button onClick={handleRefresh} className="mt-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs h-8">
              Retry
            </Button>
          </motion.div>
        ) : scores.length === 0 ? (
          <motion.div
            className="rounded-lg bg-zinc-800 p-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Trophy className="mx-auto mb-3 h-8 w-8 text-zinc-600" />
            <h2 className="text-lg font-bold">No scores yet</h2>
            <p className="mt-1 text-zinc-400 text-sm">Play a game to see your score on the leaderboard!</p>
            <Button
              onClick={() => router.push("/game")}
              className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs h-8"
            >
              Play Now
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {scores.map((score, index) => (
              <motion.div
                key={score.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 p-2 shadow-md"
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
                    <p className="font-medium text-sm">{score.nickname}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <p>{score.word_count} words</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-base font-bold text-orange-500">{score.score}</p>
                  <p className="text-xs text-zinc-500">{getLevelTitle(score.level)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  )
}
