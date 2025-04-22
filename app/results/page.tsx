"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, BarChart3, ArrowRight, Home, Check, Copy } from "lucide-react"
import { motion } from "framer-motion"
import { getLevelInfo } from "@/lib/game-utils"
import { Footer } from "@/components/footer"
import { refreshLeaderboard, cleanupLeaderboardChannel } from "@/lib/realtime-utils"
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

  // Track if we've already refreshed the leaderboard
  const leaderboardRefreshed = useRef(false)

  // Load game data from URL parameters or localStorage
  useEffect(() => {
    // Get nickname from localStorage
    const storedNickname = localStorage.getItem("wlw-nickname")
    if (!storedNickname) {
      router.push("/nickname")
      return
    }
    setNickname(storedNickname)

    // Try to get data from URL parameters first
    const scoreParam = searchParams.get("score")
    const wordsParam = searchParams.get("words")
    const levelParam = searchParams.get("level")
    const timeParam = searchParams.get("time")

    let gameData = null

    // If URL params exist and are valid, use them
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

          gameData = { score: parsedScore, wordCount: parsedWords, level: parsedLevel }
        }
      } catch (error) {
        console.error("Error parsing URL parameters:", error)
      }
    }

    // If URL params failed, try localStorage
    if (!gameData) {
      try {
        const lastScore = Number.parseInt(localStorage.getItem("wlw-last-score") || "0", 10)
        const lastWordCount = Number.parseInt(localStorage.getItem("wlw-last-word-count") || "0", 10)
        const lastLevel = Number.parseInt(localStorage.getItem("wlw-last-level") || "1", 10)
        const lastTime = Number.parseInt(localStorage.getItem("wlw-last-time") || "120", 10)

        if (!isNaN(lastScore) && !isNaN(lastWordCount) && !isNaN(lastLevel) && !isNaN(lastTime)) {
          setScore(lastScore)
          setWordCount(lastWordCount)
          setLevel(lastLevel)
          setTimeTaken(lastTime)

          gameData = { score: lastScore, wordCount: lastWordCount, level: lastLevel }
        }
      } catch (error) {
        console.error("Error loading from localStorage:", error)
      }
    }

    // Refresh leaderboard if we have valid game data
    if (gameData && !leaderboardRefreshed.current) {
      refreshLeaderboard({
        score: gameData.score,
        nickname: storedNickname,
        wordCount: gameData.wordCount,
        level: gameData.level,
      }).then(() => {
        leaderboardRefreshed.current = true
      })
    }

    // Clean up the channel when component unmounts
    return () => {
      cleanupLeaderboardChannel()
    }
  }, [router, searchParams])

  // Get level info
  const levelInfo = getLevelInfo(level)

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Create share text
  const getShareText = () => {
    return `🔤 I scored ${score} points with ${wordCount} words in Word Ladder War and reached Level ${level}: ${levelInfo.title}! Can you beat me? #WordLadderWar`
  }

  // Share results
  const handleShare = async () => {
    const shareText = getShareText()
    setShareMessage("")

    // Track share attempt
    trackGameEvent({
      name: "result_share",
      properties: {
        score,
        word_count: wordCount,
        level,
      },
    })

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText)
        setShareSuccess(true)
        setShareMessage("Copied to clipboard!")

        // Try Web Share API as a bonus
        if (navigator.share) {
          try {
            await navigator.share({
              title: "Word Ladder War Results",
              text: shareText,
              url: window.location.origin,
            })
          } catch (error) {
            // Ignore share errors since clipboard worked
          }
        }
      } else {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement("textarea")
        textArea.value = shareText
        textArea.style.position = "fixed"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = document.execCommand("copy")
        document.body.removeChild(textArea)

        if (successful) {
          setShareSuccess(true)
          setShareMessage("Copied to clipboard!")
        } else {
          throw new Error("Copy failed")
        }
      }
    } catch (error) {
      console.error("Sharing failed:", error)
      setShareMessage("Unable to share. Try copying your score manually.")
    }

    // Clear success state after a delay
    if (shareSuccess) {
      setTimeout(() => {
        setShareSuccess(false)
        setShareMessage("")
      }, 3000)
    }
  }

  // Handle play again with smooth transition
  const handlePlayAgain = () => {
    // Track play again
    trackGameEvent({
      name: "play_again",
      properties: {
        from: "results",
        previous_score: score,
      },
    })

    setIsTransitioning(true)
    setTimeout(() => {
      router.push("/game")
    }, 100)
  }

  // Navigate to leaderboard
  const handleViewLeaderboard = () => {
    // Track leaderboard view
    trackGameEvent({
      name: "view_leaderboard",
      properties: {
        from: "results",
      },
    })

    router.push("/leaderboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-zinc-900 text-cream">
      <div className="flex flex-1 flex-col items-center justify-center p-4 w-full">
        <motion.div
          className="w-full max-w-md space-y-4 my-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div className="space-y-4 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 p-4 text-center shadow-lg">
            <h1 className="text-xl font-bold">Game Over, {nickname}!</h1>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-xs text-zinc-400">Score</p>
                  <p className="text-2xl font-bold text-orange-500">{score}</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-zinc-400">Words</p>
                  <p className="text-2xl font-bold text-green-500">{wordCount}</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-zinc-400">Time</p>
                  <p className="text-2xl font-bold text-blue-500">{formatTime(timeTaken)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-zinc-400">Current Level</p>
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <p className="text-lg font-bold">{level}</p>
                </div>
                <p className="text-base font-medium text-yellow-500">{levelInfo.title}</p>
                <p className="text-xs text-zinc-400 line-clamp-2">{levelInfo.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleShare}
                  className="w-full gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl h-10 shadow-lg"
                  size="sm"
                >
                  {shareSuccess ? (
                    <>
                      <Check className="h-4 w-4" />
                      {shareMessage || "Copied to clipboard!"}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy My Score
                    </>
                  )}
                </Button>
              </motion.div>

              {shareMessage && !shareSuccess && <p className="text-xs text-red-400">{shareMessage}</p>}
            </div>
          </motion.div>

          <div className="flex gap-2">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={handlePlayAgain}
                className="w-full gap-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl shadow-lg text-sm h-10"
                size="sm"
              >
                Play Again
                <ArrowRight className="h-3 w-3" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={handleViewLeaderboard}
                variant="outline"
                className="w-full gap-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl text-sm h-10"
                size="sm"
              >
                <BarChart3 className="h-3 w-3" />
                Leaderboard
              </Button>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} className="flex justify-center">
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="flex gap-1 text-zinc-500 hover:text-zinc-300 text-sm h-8"
              size="sm"
            >
              <Home className="h-3 w-3" />
              Home
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </main>
  )
}
