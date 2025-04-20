"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, BarChart3, ArrowRight, Home, Check, Copy } from "lucide-react"
import { motion } from "framer-motion"
import { getLevelInfo } from "@/lib/game-utils"
import { Footer } from "@/components/footer"
import { getSupabaseBrowserClient } from "@/lib/supabase"

// Define a hardcoded production URL
const PRODUCTION_URL = "https://word-ladder-war.vercel.app"

export default function ResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [nickname, setNickname] = useState("")
  const [shareSuccess, setShareSuccess] = useState(false)
  const [score, setScore] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [level, setLevel] = useState(1)
  const [timeTaken, setTimeTaken] = useState(120)
  const [dataSource, setDataSource] = useState<"url" | "localStorage" | "none">("none")
  const [shareMessage, setShareMessage] = useState("")
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    // Get nickname from localStorage
    const storedNickname = localStorage.getItem("wlw-nickname")
    if (!storedNickname) {
      console.log("No nickname found, redirecting to nickname page")
      router.push("/nickname")
      return
    }
    setNickname(storedNickname)

    // Get results from URL params first
    const scoreParam = searchParams.get("score")
    const wordsParam = searchParams.get("words")
    const levelParam = searchParams.get("level")
    const timeParam = searchParams.get("time")

    console.log("URL params:", { scoreParam, wordsParam, levelParam, timeParam })

    // If URL params exist, use them
    if (scoreParam && wordsParam && levelParam && timeParam) {
      try {
        const parsedScore = Number.parseInt(scoreParam, 10)
        const parsedWords = Number.parseInt(wordsParam, 10)
        const parsedLevel = Number.parseInt(levelParam, 10)
        const parsedTime = Number.parseInt(timeParam, 10)

        console.log("Parsed URL params:", {
          parsedScore,
          parsedWords,
          parsedLevel,
          parsedTime,
        })

        if (isNaN(parsedScore) || isNaN(parsedWords) || isNaN(parsedLevel) || isNaN(parsedTime)) {
          throw new Error("Invalid URL parameters")
        }

        setScore(parsedScore)
        setWordCount(parsedWords)
        setLevel(parsedLevel)
        setTimeTaken(parsedTime)
        setDataSource("url")

        console.log("Using URL params for game results")
      } catch (error) {
        console.error("Error parsing URL params:", error)
        // Fall back to localStorage if URL params are invalid
        loadFromLocalStorage()
      }
    }
    // Otherwise, try to get from localStorage as fallback
    else {
      loadFromLocalStorage()
    }

    // Trigger a leaderboard refresh by sending a notification to the Supabase channel
    // This ensures the leaderboard is updated immediately after a game
    const refreshLeaderboard = async () => {
      try {
        const supabase = getSupabaseBrowserClient()

        // Send a notification to the leaderboard channel
        await supabase.channel("leaderboard_refresh").send({
          type: "broadcast",
          event: "refresh",
          payload: { timestamp: new Date().toISOString() },
        })

        console.log("Sent leaderboard refresh signal")
      } catch (error) {
        console.error("Error refreshing leaderboard:", error)
      }
    }

    refreshLeaderboard()
  }, [router, searchParams])

  // Function to load data from localStorage
  const loadFromLocalStorage = () => {
    const lastScore = localStorage.getItem("wlw-last-score")
    const lastWordCount = localStorage.getItem("wlw-last-word-count")
    const lastLevel = localStorage.getItem("wlw-last-level")
    const lastTime = localStorage.getItem("wlw-last-time")

    console.log("localStorage values:", {
      lastScore,
      lastWordCount,
      lastLevel,
      lastTime,
    })

    if (lastScore && lastWordCount && lastLevel && lastTime) {
      try {
        const parsedScore = Number.parseInt(lastScore, 10)
        const parsedWords = Number.parseInt(lastWordCount, 10)
        const parsedLevel = Number.parseInt(lastLevel, 10)
        const parsedTime = Number.parseInt(lastTime, 10)

        console.log("Parsed localStorage values:", {
          parsedScore,
          parsedWords,
          parsedLevel,
          parsedTime,
        })

        if (isNaN(parsedScore) || isNaN(parsedWords) || isNaN(parsedLevel) || isNaN(parsedTime)) {
          throw new Error("Invalid localStorage values")
        }

        setScore(parsedScore)
        setWordCount(parsedWords)
        setLevel(parsedLevel)
        setTimeTaken(parsedTime)
        setDataSource("localStorage")

        console.log("Using localStorage for game results")
      } catch (error) {
        console.error("Error parsing localStorage values:", error)
        setDataSource("none")
      }
    } else {
      console.log("No game results found in localStorage")
      setDataSource("none")
    }
  }

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

  // Share results - completely revised to handle permission errors better
  const handleShare = async () => {
    const shareText = getShareText()
    setShareMessage("")

    // Always default to clipboard method for more reliability
    try {
      // First try clipboard API as it's more widely supported
      await copyToClipboard(shareText)

      // Only try Web Share API if we're in a secure context and it's available
      // This is now a secondary option after we've already copied to clipboard
      if (typeof navigator !== "undefined" && navigator.share && window.isSecureContext) {
        try {
          // Get the current URL for sharing
          const shareUrl = typeof window !== "undefined" ? window.location.origin : PRODUCTION_URL

          await navigator.share({
            title: "Word Ladder War Results",
            text: shareText,
            url: shareUrl,
          })

          // If we get here, both clipboard and share worked
          setShareSuccess(true)
          setShareMessage("Shared successfully!")
        } catch (shareError: any) {
          // Web Share API failed, but clipboard worked, so still show success
          console.log("Web Share API not available or failed:", shareError?.message || shareError)
          // We already copied to clipboard, so keep the success state
        }
      }
    } catch (err) {
      console.error("All sharing methods failed:", err)
      setShareMessage("Unable to share. Try copying your score manually.")
      setShareSuccess(false)
    }

    // Clear success state after a delay
    if (shareSuccess) {
      setTimeout(() => {
        setShareSuccess(false)
        setShareMessage("")
      }, 3000)
    }
  }

  // Copy to clipboard helper - improved with better fallbacks
  const copyToClipboard = async (text: string): Promise<boolean> => {
    // Try the modern clipboard API first
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        setShareSuccess(true)
        setShareMessage("Score copied to clipboard!")
        return true
      } catch (clipErr) {
        console.log("Clipboard API failed, trying fallback:", clipErr)
        // Fall through to fallback
      }
    }

    // Fallback for browsers without clipboard API
    try {
      const textArea = document.createElement("textarea")
      textArea.value = text
      // Make the textarea out of viewport
      textArea.style.position = "fixed"
      textArea.style.left = "-999999px"
      textArea.style.top = "-999999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)

      if (successful) {
        setShareSuccess(true)
        setShareMessage("Score copied to clipboard!")
        return true
      } else {
        throw new Error("execCommand copy failed")
      }
    } catch (err) {
      console.error("All clipboard methods failed:", err)
      setShareMessage("Could not copy to clipboard. Please try again.")
      setShareSuccess(false)
      throw err
    }
  }

  // Handle play again with smooth transition
  const handlePlayAgain = () => {
    setIsTransitioning(true)
    // Use a shorter timeout for faster transition
    setTimeout(() => {
      router.push("/game")
    }, 200)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-zinc-900 text-cream">
      <div className="flex flex-1 flex-col items-center justify-center p-4 w-full">
        <motion.div
          className="w-full max-w-md space-y-4 my-4" // Reduced space-y to fit better on mobile
          initial={{ opacity: 0 }}
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          transition={{ duration: 0.3 }}
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
                onClick={() => router.push("/leaderboard")}
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
