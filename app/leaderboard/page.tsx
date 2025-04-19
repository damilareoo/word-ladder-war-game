"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowLeft, Medal, User, Star } from "lucide-react"
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
  const [scores, setScores] = useState<GameScore[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"score" | "words">("score")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
      } catch (error) {
        console.error("Error fetching leaderboard:", error)
        setError("Failed to load leaderboard. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [filter])

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // Get level title
  const getLevelTitle = (level: number) => {
    if (level === 1) return "Word Novice"
    if (level === 2) return "Word Expert"
    return "Word Guru"
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-900 text-cream">
      <motion.header
        className="sticky top-0 z-10 flex items-center justify-between bg-zinc-900/95 p-4 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="text-zinc-400 hover:text-cream">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Global Leaderboard</h1>
        <div className="w-9"></div> {/* Spacer for centering */}
      </motion.header>

      <div className="mx-auto w-full max-w-md p-4 flex-1">
        <motion.div
          className="mb-6 flex justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant={filter === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("score")}
            className={filter === "score" ? "bg-orange-500 hover:bg-orange-600" : "border-zinc-700"}
          >
            <Trophy className="mr-1 h-4 w-4" />
            Score
          </Button>
          <Button
            variant={filter === "words" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("words")}
            className={filter === "words" ? "bg-green-500 hover:bg-green-600" : "border-zinc-700"}
          >
            <Star className="mr-1 h-4 w-4" />
            Words
          </Button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-orange-500"></div>
          </div>
        ) : error ? (
          <motion.div
            className="rounded-lg bg-zinc-800 p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-400">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-xl"
            >
              Retry
            </Button>
          </motion.div>
        ) : scores.length === 0 ? (
          <motion.div
            className="rounded-lg bg-zinc-800 p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Trophy className="mx-auto mb-4 h-12 w-12 text-zinc-600" />
            <h2 className="text-xl font-bold">No scores yet</h2>
            <p className="mt-2 text-zinc-400">Play a game to see your score on the leaderboard!</p>
            <Button onClick={() => router.push("/game")} className="mt-6 bg-orange-500 hover:bg-orange-600 rounded-xl">
              Play Now
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {scores.map((score, index) => (
              <motion.div
                key={score.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 p-4 shadow-md"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold">
                  {index === 0 ? (
                    <Medal className="h-4 w-4 text-yellow-400" />
                  ) : index === 1 ? (
                    <Medal className="h-4 w-4 text-zinc-400" />
                  ) : index === 2 ? (
                    <Medal className="h-4 w-4 text-orange-400" />
                  ) : (
                    index + 1
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-zinc-500" />
                    <p className="font-medium">{score.nickname}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <p>{score.word_count} words</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-orange-500">{score.score}</p>
                  <p className="text-xs text-zinc-500">{getLevelTitle(score.level)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
