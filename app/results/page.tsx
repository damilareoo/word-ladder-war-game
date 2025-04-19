"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Trophy, Share2, BarChart3, ArrowRight, Home, Check, Copy } from "lucide-react"
import { motion } from "framer-motion"
import { getLevelInfo } from "@/lib/game-utils"
import { Footer } from "@/components/footer"

// Define a hardcoded production URL - replace with your actual production URL
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

  // Share results
  const handleShare = async () => {
    const shareText = getShareText()
    setShareMessage("")

    // Get the current URL for sharing - use window.location.origin if available, otherwise use hardcoded URL
    const shareUrl = typeof window !== "undefined" ? window.location.origin : PRODUCTION_URL

    try {
      // Check if Web Share API is available and if we're in a secure context
      if (typeof navigator !== "undefined" && navigator.share && window.isSecureContext) {
        try {
          await navigator.share({
            title: "Word Ladder War Results",
            text: shareText,
            url: shareUrl,
          })
          setShareSuccess(true)
          setTimeout(() => setShareSuccess(false), 3000)
        } catch (shareError) {
          console.error("Web Share API error:", shareError)
          // Fall back to clipboard if sharing fails
          await copyToClipboard(shareText)
        }
      } else {
        // Web Share API not available, use clipboard
        await copyToClipboard(shareText)
      }
    } catch (err) {
      console.error("Error in share handling:", err)
      setShareMessage("Unable to share. Try copying your score manually.")
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        setShareSuccess(true)
        setShareMessage("Score copied to clipboard!")
        setTimeout(() => {
          setShareSuccess(false)
          setShareMessage("")
        }, 3000)
      } else {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement("textarea")
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          const successful = document.execCommand("copy")
          if (successful) {
            setShareSuccess(true)
            setShareMessage("Score copied to clipboard!")
            setTimeout(() => {
              setShareSuccess(false)
              setShareMessage("")
            }, 3000)
          } else {
            throw new Error("Copy command failed")
          }
        } catch (err) {
          setShareMessage("Could not copy to clipboard. Please try again.")
        }

        document.body.removeChild(textArea)
      }
    } catch (clipErr) {
      console.error("Could not copy text:", clipErr)
      setShareMessage("Could not copy to clipboard. Please try again.")
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-zinc-900 text-cream">
      <div className="flex flex-1 flex-col items-center justify-center p-4 w-full">
        <motion.div
          className="w-full max-w-md space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div className="space-y-6 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 p-6 text-center shadow-lg">
            <h1 className="text-2xl font-bold">Game Over, {nickname}!</h1>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-zinc-400">Score</p>
                  <p className="text-3xl font-bold text-orange-500">{score}</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-zinc-400">Words</p>
                  <p className="text-3xl font-bold text-green-500">{wordCount}</p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-zinc-400">Time</p>
                  <p className="text-3xl font-bold text-blue-500">{formatTime(timeTaken)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-zinc-400">Current Level</p>
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <p className="text-xl font-bold">{level}</p>
                </div>
                <p className="text-lg font-medium text-yellow-500">{levelInfo.title}</p>
                <p className="text-sm text-zinc-400 line-clamp-2">{levelInfo.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleShare}
                  className="w-full gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-xl h-12 shadow-lg"
                  size="lg"
                >
                  {shareSuccess ? (
                    <>
                      <Check className="h-5 w-5" />
                      {shareMessage || "Shared!"}
                    </>
                  ) : (
                    <>
                      {typeof navigator !== "undefined" && navigator.share && window.isSecureContext ? (
                        <Share2 className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                      {typeof navigator !== "undefined" && navigator.share && window.isSecureContext
                        ? "Share My Score"
                        : "Copy My Score"}
                    </>
                  )}
                </Button>
              </motion.div>

              {shareMessage && !shareSuccess && <p className="text-sm text-red-400">{shareMessage}</p>}
            </div>
          </motion.div>

          <div className="flex gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={() => router.push("/game")}
                className="w-full gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl shadow-lg"
              >
                Play Again
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                onClick={() => router.push("/leaderboard")}
                variant="outline"
                className="w-full gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl"
              >
                <BarChart3 className="h-4 w-4" />
                Leaderboard
              </Button>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} className="flex justify-center">
            <Button
              onClick={() => router.push("/")}
              variant="ghost"
              className="flex gap-2 text-zinc-500 hover:text-zinc-300"
            >
              <Home className="h-4 w-4" />
              Home
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </main>
  )
}
