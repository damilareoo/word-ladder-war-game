"use client"

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Clock, Send, Trophy, AlertCircle, ArrowLeft, X, Target, Zap, Wifi, WifiOff } from "lucide-react"
import { wordList } from "@/lib/word-list"
import { getWordDefinition, isValidEnglishWord } from "@/lib/dictionary"
import { calculateScore, calculateLevel } from "@/lib/game-utils"
import { motion, AnimatePresence } from "framer-motion"
import { Footer } from "@/components/footer"
import { LetterTile, SelectedLetter } from "@/components/letter-tile"
import { trackGameStart, trackGameComplete, trackWordSubmitted } from "@/lib/analytics"
import { gameService } from "@/lib/game-service"
import { subscribeToUpdates, getConnectionStatus } from "@/lib/realtime-leaderboard"

// Prevent prerendering of this page
export const dynamic = "force-dynamic"
export const dynamicParams = true

// Game duration in seconds
const GAME_DURATION = 120

// Memoized components for better performance
const MemoizedLetterTile = memo(LetterTile)
const MemoizedSelectedLetter = memo(SelectedLetter)

export default function GamePage() {
  const router = useRouter()
  const [mainWord, setMainWord] = useState("")
  const [mainWordDefinition, setMainWordDefinition] = useState("")
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [score, setScore] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [validWords, setValidWords] = useState<string[]>([])
  const [submittedWords, setSubmittedWords] = useState<{ word: string; status: "valid" | "invalid" | "duplicate" }[]>(
    [],
  )
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false, reconnectAttempts: 0 })

  // New state for letter tile gameplay
  const [letters, setLetters] = useState<Array<{ letter: string; visible: boolean }>>([])
  const [selectedLetters, setSelectedLetters] = useState<Array<{ letter: string; index: number }>>([])

  // Refs for touch handling and game state
  const touchCooldownRef = useRef<boolean>(false)
  const processingSubmissionRef = useRef<boolean>(false)
  const wordListRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const validWordsRef = useRef<string[]>([])
  const gameDataSavedRef = useRef<boolean>(false)
  const timerRef = useRef<any>(null)
  const mainWordRef = useRef<string>("")
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Update connection status periodically
  useEffect(() => {
    const updateStatus = () => {
      const status = getConnectionStatus()
      setConnectionStatus(status)
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000)

    return () => clearInterval(interval)
  }, [])

  // Set up real-time subscription for connection monitoring
  useEffect(() => {
    unsubscribeRef.current = subscribeToUpdates((update) => {
      if (update.type === "connection_status") {
        setConnectionStatus((prev) => ({ ...prev, isConnected: true }))
      }
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  // Clear current selection and return all selected letters to the pool
  const clearSelection = useCallback(() => {
    setLetters((prev) => {
      const newLetters = [...prev]
      selectedLetters.forEach(({ index }) => {
        newLetters[index].visible = true
      })
      return newLetters
    })
    setSelectedLetters([])
  }, [selectedLetters])

  // Start game when user interacts
  const startGame = useCallback(() => {
    if (!gameStarted && !gameEnded) {
      console.log("Game started")
      setGameStarted(true)
      startTimeRef.current = Date.now()

      // Track game start
      if (typeof window !== "undefined") {
        setTimeout(() => {
          trackGameStart(mainWordRef.current)
        }, 100)
      }
    }
  }, [gameStarted, gameEnded])

  // End game and save results with enhanced error handling
  const endGame = useCallback(async () => {
    if (gameDataSavedRef.current) return

    console.log("Game ended")
    setGameEnded(true)
    gameDataSavedRef.current = true

    const currentValidWords = validWordsRef.current
    const finalScore = calculateScore(currentValidWords)
    const timeTaken = startTimeRef.current
      ? Math.min(GAME_DURATION, Math.floor((Date.now() - startTimeRef.current) / 1000))
      : GAME_DURATION
    const wordCount = currentValidWords.length
    const level = calculateLevel(wordCount)
    const nickname = localStorage.getItem("wlw-nickname") || "Anonymous"

    setScore(finalScore)

    // Track game completion
    if (typeof window !== "undefined") {
      trackGameComplete(finalScore, wordCount, level)
    }

    // Store results in localStorage immediately
    if (typeof window !== "undefined") {
      localStorage.setItem("wlw-last-score", finalScore.toString())
      localStorage.setItem("wlw-last-word-count", wordCount.toString())
      localStorage.setItem("wlw-last-level", level.toString())
      localStorage.setItem("wlw-last-time", timeTaken.toString())
      localStorage.setItem("wlw-game-timestamp", Date.now().toString())
    }

    // Save to database with enhanced error handling
    try {
      console.log("💾 Saving game result to database...")
      const result = await gameService.saveGameResult({
        nickname,
        score: finalScore,
        wordCount,
        timeTaken,
        mainWord: mainWordRef.current,
        level,
      })

      if (result.success) {
        console.log("✅ Game result saved successfully")
        // Real-time broadcast is handled automatically by the service
      } else {
        console.warn("⚠️ Failed to save to database:", result.error)
        localStorage.setItem("wlw-retry-save", "true")
      }
    } catch (error) {
      console.error("❌ Error saving game result:", error)
      localStorage.setItem("wlw-retry-save", "true")
    }

    // Navigate to results page
    const url = `/results?score=${finalScore}&words=${wordCount}&level=${level}&time=${timeTaken}&ts=${Date.now()}`
    router.push(url)
  }, [router])

  // Keep validWordsRef in sync
  useEffect(() => {
    validWordsRef.current = validWords
  }, [validWords])

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      if (typeof window !== "undefined") {
        const nickname = localStorage.getItem("wlw-nickname")
        if (!nickname) {
          router.push("/nickname")
          return
        }
      }

      try {
        const randomIndex = Math.floor(Math.random() * wordList.length)
        const selectedWord = wordList[randomIndex].word.toUpperCase()
        setMainWord(selectedWord)
        mainWordRef.current = selectedWord

        const shuffledLetters = [...selectedWord]
          .map((letter) => ({ letter, visible: true }))
          .sort(() => Math.random() - 0.5)

        setLetters(shuffledLetters)

        if (typeof window !== "undefined") {
          localStorage.setItem("wlw-main-word", selectedWord)
        }

        const definition = await getWordDefinition(selectedWord)
        setMainWordDefinition(definition)
      } catch (error) {
        console.error("Failed to initialize game:", error)
        setMainWordDefinition("A challenging word to test your vocabulary skills.")
      } finally {
        setIsLoading(false)
      }
    }

    initGame()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [router])

  // Timer logic
  useEffect(() => {
    if (!gameStarted || gameEnded || isLoading) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameStarted, gameEnded, isLoading, endGame])

  // Update score when valid words change
  useEffect(() => {
    if (validWords.length > 0) {
      setScore(calculateScore(validWords))
    }
  }, [validWords])

  // Handle letter selection
  const handleLetterClick = useCallback(
    (letter: string, index: number) => {
      if (gameEnded || touchCooldownRef.current) return

      if (!gameStarted) {
        startGame()
      }

      touchCooldownRef.current = true
      setSelectedLetters((prev) => [...prev, { letter, index }])
      setLetters((prev) => {
        const newLetters = [...prev]
        newLetters[index].visible = false
        return newLetters
      })

      setTimeout(() => {
        touchCooldownRef.current = false
      }, 100)
    },
    [gameStarted, gameEnded, startGame],
  )

  // Handle selected letter removal
  const handleSelectedLetterClick = useCallback(
    (selectedIndex: number) => {
      if (touchCooldownRef.current) return

      touchCooldownRef.current = true
      const removedLetter = selectedLetters[selectedIndex]

      setSelectedLetters((prev) => prev.filter((_, i) => i !== selectedIndex))
      setLetters((prev) => {
        const newLetters = [...prev]
        newLetters[removedLetter.index].visible = true
        return newLetters
      })

      setTimeout(() => {
        touchCooldownRef.current = false
      }, 100)
    },
    [selectedLetters],
  )

  // Handle word submission
  const handleSubmitWord = useCallback(async () => {
    if (processingSubmissionRef.current) return

    processingSubmissionRef.current = true

    if (!gameStarted) {
      startGame()
      processingSubmissionRef.current = false
      return
    }

    if (gameEnded || selectedLetters.length === 0) {
      processingSubmissionRef.current = false
      return
    }

    const word = selectedLetters.map((item) => item.letter).join("")

    try {
      if (word.length < 3) {
        setSubmittedWords((prev) => [...prev, { word, status: "invalid" }])
        trackWordSubmitted(word, false)
        clearSelection()
        return
      }

      if (validWords.includes(word)) {
        setSubmittedWords((prev) => [...prev, { word, status: "duplicate" }])
        trackWordSubmitted(word, false)
        clearSelection()
        return
      }

      setSubmittedWords((prev) => [...prev, { word, status: "valid" }])

      const isValid = await isValidEnglishWord(word)

      if (isValid) {
        const newValidWords = [...validWords, word]
        setValidWords(newValidWords)
        trackWordSubmitted(word, true)
      } else {
        setSubmittedWords((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (updated[lastIndex]?.word === word) {
            updated[lastIndex] = { word, status: "invalid" }
          }
          return updated
        })
        trackWordSubmitted(word, false)
      }
    } catch (error) {
      console.error("Error validating word:", error)
      setSubmittedWords((prev) => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        if (updated[lastIndex]?.word === word) {
          updated[lastIndex] = { word, status: "invalid" }
        }
        return updated
      })
    } finally {
      clearSelection()

      if (wordListRef.current) {
        setTimeout(() => {
          wordListRef.current?.scrollTo({
            top: wordListRef.current.scrollHeight,
            behavior: "smooth",
          })
        }, 50)
      }

      processingSubmissionRef.current = false
    }
  }, [gameStarted, gameEnded, selectedLetters, validWords, startGame, clearSelection])

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  // Get progress percentage
  const getProgressPercentage = useCallback(() => {
    return ((GAME_DURATION - timeLeft) / GAME_DURATION) * 100
  }, [timeLeft])

  // Memoized letter tiles
  const letterTiles = useMemo(() => {
    return letters
      .map((item, index) =>
        item.visible ? (
          <MemoizedLetterTile
            key={`letter-${index}`}
            letter={item.letter}
            onClick={() => handleLetterClick(item.letter, index)}
            position={index}
          />
        ) : null,
      )
      .filter(Boolean)
  }, [letters, handleLetterClick])

  // Memoized selected letter tiles
  const selectedLetterTiles = useMemo(() => {
    return selectedLetters.map((item, index) => (
      <MemoizedSelectedLetter
        key={`selected-${index}`}
        letter={item.letter}
        onClick={() => handleSelectedLetterClick(index)}
        index={index}
      />
    ))
  }, [selectedLetters, handleSelectedLetterClick])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-cream">
        <div className="text-center">
          <motion.div
            className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          <motion.p
            className="text-lg font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Loading your challenge...
          </motion.p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-cream">
      {/* Enhanced Header with Progress Bar and Connection Status */}
      <motion.header
        className="sticky top-0 z-20 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-700/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Progress Bar */}
        <div className="h-1 bg-zinc-800">
          <motion.div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: `${getProgressPercentage()}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Header Content */}
        <div className="flex items-center justify-between p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/")}
              className="text-zinc-400 hover:text-cream hover:bg-zinc-800/50 h-10 w-10 rounded-full transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1">
              {connectionStatus.isConnected ? (
                <Wifi className="h-4 w-4 text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-zinc-500" />
              )}
              <span className={`text-xs ${connectionStatus.isConnected ? "text-green-400" : "text-zinc-500"}`}>
                {connectionStatus.isConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>

          {/* Game Stats */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Timer */}
            <motion.div
              className="flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-2 shadow-lg backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Clock className={`h-4 w-4 ${timeLeft <= 10 ? "text-red-400" : "text-orange-400"}`} />
              <span className={`font-mono text-sm font-bold ${timeLeft <= 10 ? "text-red-400" : "text-cream"}`}>
                {formatTime(timeLeft)}
              </span>
            </motion.div>

            {/* Word Count */}
            <motion.div
              className="flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-2 shadow-lg backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Trophy className="h-4 w-4 text-green-400" />
              <span className="font-mono text-sm font-bold">{validWords.length}</span>
            </motion.div>

            {/* Current Score */}
            <motion.div
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/20 to-orange-400/20 border border-orange-500/30 px-3 py-2 shadow-lg backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Target className="h-4 w-4 text-orange-400" />
              <span className="font-mono text-sm font-bold text-orange-400">{score.toLocaleString()}</span>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Game Area */}
      <div className="flex flex-1 flex-col">
        {/* Hero Section - Main Word Display */}
        <motion.section
          className="relative px-4 py-6 sm:px-6 sm:py-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Background Decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent" />

          <div className="relative z-10 max-w-2xl mx-auto">
            {/* Main Word */}
            <motion.h1
              className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 mb-3"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {mainWord}
            </motion.h1>

            {/* Definition */}
            <motion.p
              className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto leading-relaxed"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {mainWordDefinition}
            </motion.p>
          </div>
        </motion.section>

        {/* Word Formation Area */}
        <div className="flex-1 px-4 sm:px-6 space-y-6">
          {/* Selected Letters Display */}
          <motion.section
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="bg-gradient-to-r from-zinc-800/50 via-zinc-700/50 to-zinc-800/50 rounded-2xl p-4 sm:p-6 border border-zinc-600/30 shadow-xl backdrop-blur-sm">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-400" />
                  Form Your Word
                </h2>
                {selectedLetters.length > 0 && (
                  <span className="text-sm text-zinc-400">
                    {selectedLetters.length} letter{selectedLetters.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Selected Letters Container */}
              <div className="min-h-20 flex flex-wrap gap-2 sm:gap-3 items-center justify-center p-4 rounded-xl bg-zinc-900/50 border border-zinc-600/20">
                <AnimatePresence mode="popLayout">
                  {selectedLetters.length > 0 ? (
                    selectedLetterTiles
                  ) : (
                    <motion.div
                      className="text-center text-zinc-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <p className="text-sm sm:text-base">Tap letters below to form a word</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={clearSelection}
                  className="flex-1 h-12 sm:h-14 text-zinc-300 border-zinc-600 hover:bg-zinc-700/50 hover:border-zinc-500 transition-all duration-200 rounded-xl"
                  disabled={selectedLetters.length === 0}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={handleSubmitWord}
                  className="flex-2 h-12 sm:h-14 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg text-white font-semibold transition-all duration-200 rounded-xl"
                  disabled={selectedLetters.length < 3 || processingSubmissionRef.current}
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Submit Word
                </Button>
              </div>
            </div>
          </motion.section>

          {/* Letter Tiles Grid */}
          <motion.section
            className="pb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="max-w-sm mx-auto">
              <div className="grid grid-cols-4 gap-3 sm:gap-4 place-items-center">{letterTiles}</div>
            </div>
          </motion.section>
        </div>

        {/* Words History Sidebar */}
        <motion.aside
          className="px-4 sm:px-6 pb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <div className="bg-zinc-800/30 rounded-2xl border border-zinc-700/30 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-700/30">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-green-400" />
                Your Words ({submittedWords.length})
              </h3>
            </div>

            {/* Words List */}
            <div
              ref={wordListRef}
              className="h-32 sm:h-40 overflow-y-auto p-3 space-y-2"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <AnimatePresence>
                {submittedWords.length > 0
                  ? submittedWords.map((item, index) => (
                      <motion.div
                        key={`${item.word}-${index}`}
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`px-3 py-2 rounded-lg text-center font-medium text-sm transition-all duration-200 ${
                          item.status === "valid"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : item.status === "duplicate"
                              ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {item.word}
                        {item.status === "valid" && (
                          <span className="ml-2 text-xs opacity-75">+{calculateScore([item.word])}</span>
                        )}
                      </motion.div>
                    ))
                  : !gameStarted &&
                    !gameEnded && (
                      <motion.div
                        className="flex flex-col items-center justify-center h-full text-zinc-500 py-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                      >
                        <AlertCircle className="mb-2 h-6 w-6" />
                        <p className="text-sm text-center">Words you form will appear here</p>
                      </motion.div>
                    )}
              </AnimatePresence>
            </div>
          </div>
        </motion.aside>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
