"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BarChart3, ArrowRight, Home, Check, Copy, Star } from "lucide-react"
import { motion } from "framer-motion"
import { getLevelInfo } from "@/lib/game-utils"
import { getLastGameResults, getCurrentPlayer } from "@/lib/storage"
import { trackGameEvent } from "@/lib/analytics"

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [nickname, setNickname] = useState("")
  const [shareSuccess, setShareSuccess] = useState(false)
  const [score, setScore] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [level, setLevel] = useState(1)
  const [timeTaken, setTimeTaken] = useState(120)
  const [shareMessage, setShareMessage] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const player = getCurrentPlayer()
    if (!player) {
      router.push("/nickname")
      return
    }
    setNickname(player.nickname)

    const scoreParam = searchParams.get("score")
    const wordsParam = searchParams.get("words")
    const levelParam = searchParams.get("level")
    const timeParam = searchParams.get("time")

    if (scoreParam && wordsParam && levelParam && timeParam) {
      try {
        const parsedScore = Number.parseInt(scoreParam, 10)
        const parsedWords = Number.parseInt(wordsParam, 10)
        const parsedLevel = Number.parseInt(levelParam, 10)
        const parsedTime = Number.parseInt(timeParam, 10)

        if (!isNaN(parsedScore) && !isNaN(parsedWords) && !isNaN(parsedLevel) && !isNaN(parsedTime)) {
          setScore(parsedScore)
          setWordCount(parsedWords)
          setLevel(parsedLevel)
          setTimeTaken(parsedTime)
          return
        }
      } catch (error) {}
    }

    const lastGame = getLastGameResults()
    if (lastGame) {
      setScore(lastGame.score)
      setWordCount(lastGame.wordCount)
      setLevel(lastGame.level)
      setTimeTaken(lastGame.timeTaken)
    }
  }, [router, searchParams])

  const levelInfo = getLevelInfo(level)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getShareText = () => {
    return `I scored ${score} points with ${wordCount} words in Word Ladder War! Level ${level}: ${levelInfo.title} Can you beat me? #WordLadderWar`
  }

  const handleShare = async () => {
    const shareText = getShareText()
    setShareMessage("")

    trackGameEvent({
      name: "result_share",
      properties: { score, word_count: wordCount, level },
    })

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText)
        setShareSuccess(true)
        setShareMessage("Copied!")

        if (navigator.share) {
          try {
            await navigator.share({
              title: "Word Ladder War Results",
              text: shareText,
              url: window.location.origin,
            })
          } catch (error) {}
        }
      }
    } catch (error) {
      setShareMessage("Unable to share")
    }

    setTimeout(() => {
      setShareSuccess(false)
      setShareMessage("")
    }, 2000)
  }

  const handlePlayAgain = () => {
    trackGameEvent({
      name: "play_again",
      properties: { from: "results", previous_score: score },
    })
    setIsTransitioning(true)
    setTimeout(() => {
      router.push("/game")
    }, 100)
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-sm space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="space-y-6 rounded-3xl bg-card p-6 border border-border"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Game Over</p>
              <h1 className="text-xl font-semibold mt-1">
                Great job, <span className="text-primary">{nickname}</span>!
              </h1>
            </div>

            <div className="text-center py-4">
              <motion.p
                className="text-6xl font-bold text-primary tabular-nums"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                {score}
              </motion.p>
              <p className="text-sm text-muted-foreground mt-1">points</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-background/50">
                <p className="text-2xl font-bold text-secondary tabular-nums">{wordCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Words</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50">
                <p className="text-2xl font-bold text-foreground tabular-nums">{formatTime(timeTaken)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Time</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background/50">
                <p className="text-2xl font-bold text-yellow-500 tabular-nums">{level}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Level</p>
              </div>
            </div>

            <div className="text-center p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="text-lg font-semibold text-yellow-500">{levelInfo.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{levelInfo.description}</p>
            </div>

            <Button
              onClick={handleShare}
              variant="outline"
              className="w-full gap-2 border-border text-muted-foreground hover:text-foreground rounded-xl h-11 font-medium bg-transparent"
            >
              {shareSuccess ? (
                <>
                  <Check className="h-4 w-4 text-secondary" />
                  {shareMessage || "Copied!"}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Share Score
                </>
              )}
            </Button>
          </motion.div>

          <div className="flex gap-3">
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                onClick={handlePlayAgain}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl h-12 font-semibold shadow-lg shadow-primary/20"
              >
                Play Again
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button
                onClick={() => router.push("/leaderboard")}
                variant="outline"
                className="w-full gap-2 border-border text-muted-foreground hover:text-foreground hover:bg-card rounded-2xl h-12 font-medium bg-transparent"
              >
                <BarChart3 className="h-4 w-4" />
                Rankings
              </Button>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} className="flex justify-center">
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="gap-1.5 text-muted-foreground hover:text-foreground text-sm h-9"
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </main>
  )
}
