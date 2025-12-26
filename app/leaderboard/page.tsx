"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, ArrowLeft, Medal, User, RefreshCw, Zap } from "lucide-react"
import {
  getLeaderboardByScore,
  getLeaderboardByWordCount,
  initializeWithSampleData,
  type GameScore,
} from "@/lib/storage"
import { motion } from "framer-motion"
import { calculateLevel } from "@/lib/game-utils"

export default function LeaderboardPage() {
  const router = useRouter()
  const [scoreData, setScoreData] = useState<GameScore[]>([])
  const [wordData, setWordData] = useState<GameScore[]>([])
  const [activeFilter, setActiveFilter] = useState<"score" | "words">("score")
  const [isLoading, setIsLoading] = useState(true)

  const fetchLeaderboard = useCallback(() => {
    setIsLoading(true)

    try {
      initializeWithSampleData()

      const scores = getLeaderboardByScore(50)
      const words = getLeaderboardByWordCount(50)

      const updatedScores = scores.map((item) => ({
        ...item,
        level: calculateLevel(item.word_count),
      }))

      const updatedWords = words.map((item) => ({
        ...item,
        level: calculateLevel(item.word_count),
      }))

      setScoreData(updatedScores)
      setWordData(updatedWords)
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const currentData = activeFilter === "score" ? scoreData : wordData

  const getMedalStyle = (index: number) => {
    if (index === 0) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    if (index === 1) return "bg-zinc-400/20 text-zinc-300 border-zinc-400/30"
    if (index === 2) return "bg-orange-600/20 text-orange-400 border-orange-600/30"
    return "bg-muted text-muted-foreground border-transparent"
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="text-muted-foreground hover:text-foreground h-10 w-10 rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Leaderboard</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchLeaderboard}
          className="text-muted-foreground hover:text-foreground h-10 w-10 rounded-xl"
          disabled={isLoading}
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <div className="flex-1 px-4 py-4 overflow-hidden flex flex-col">
        <div className="mx-auto w-full max-w-md flex flex-col flex-1 overflow-hidden">
          <div className="flex gap-2 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter("score")}
              className={`flex-1 h-10 rounded-xl font-medium transition-colors ${
                activeFilter === "score"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Trophy className="mr-2 h-4 w-4" />
              By Score
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter("words")}
              className={`flex-1 h-10 rounded-xl font-medium transition-colors ${
                activeFilter === "words"
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Zap className="mr-2 h-4 w-4" />
              By Words
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            </div>
          ) : currentData.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center border border-border">
              <Trophy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h2 className="text-lg font-semibold">No scores yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">Play a game to see your score here!</p>
              <Button
                onClick={() => router.push("/game")}
                className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
              >
                Play Now
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 overscroll-contain">
              {currentData.map((item, index) => {
                const calculatedLevel = calculateLevel(item.word_count)

                return (
                  <motion.div
                    key={`${activeFilter}-${item.id}`}
                    className="flex items-center gap-3 rounded-xl bg-card p-3 border border-border/40"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold border ${getMedalStyle(index)}`}
                    >
                      {index < 3 ? <Medal className="h-4 w-4" /> : index + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="font-medium text-sm truncate">{item.nickname}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.word_count} words • Lvl {calculatedLevel}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-primary tabular-nums">{item.score}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
