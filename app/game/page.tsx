"use client"

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Clock, Send, Trophy, AlertCircle, ArrowLeft, X } from "lucide-react"
import { wordList } from "@/lib/word-list"
import { getWordDefinition, isValidEnglishWord } from "@/lib/dictionary"
import { calculateScore, calculateLevel } from "@/lib/game-utils"
import { motion, AnimatePresence } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Footer } from "@/components/footer"
import { LetterTile } from "@/components/letter-tile"
import { refreshLeaderboard } from "@/lib/realtime-utils"
import { trackGameStart, trackGameComplete, trackWordSubmitted } from "@/lib/analytics"

// Game duration in seconds
const GAME_DURATION = 120

// Memoized components for better performance
const MemoizedLetterTile = memo(LetterTile)

// Memoized motion components
const MotionHeader = memo(({ children, ...props }: any) => <motion.header {...props}>{children}</motion.header>)

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

  // New state for letter tile gameplay
  const [letters, setLetters] = useState<string[]>([])
  const [selectedLetters, setSelectedLetters] = useState<string[]>([])
  const [selectedIndices, setSelectedIndices] = useState<number[]>([])
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null)

  const wordListRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const validWordsRef = useRef<string[]>([])
  const gameDataSavedRef = useRef<boolean>(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const endGameTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = useRef(getSupabaseBrowserClient()).current

  // End game and calculate final score
  const endGame = useCallback(async () => {
    if (gameDataSavedRef.current) return // Prevent multiple saves

    console.log("Game ended")
    setGameEnded(true)
    gameDataSavedRef.current = true

    // Get the current valid words
    const currentValidWords = validWordsRef.current
    console.log("Valid words at game end:", currentValidWords)

    // Calculate final score based on valid words
    const finalScore = calculateScore(currentValidWords)
    console.log("Final score calculated:", finalScore)
    setScore(finalScore)

    // Calculate time taken
    const timeTaken = startTimeRef.current
      ? Math.min(GAME_DURATION, Math.floor((Date.now() - startTimeRef.current) / 1000))
      : GAME_DURATION

    // Calculate word count and level
    const wordCount = currentValidWords.length
    const level = calculateLevel(wordCount)

    // Track game completion
    trackGameComplete(finalScore, wordCount, level)

    console.log("Game summary:", {
      score: finalScore,
      wordCount,
      level,
      timeTaken,
    })

    // Store the game results in localStorage immediately
    localStorage.setItem("wlw-last-score", finalScore.toString())
    localStorage.setItem("wlw-last-word-count", wordCount.toString())
    localStorage.setItem("wlw-last-level", level.toString())
    localStorage.setItem("wlw-last-time", timeTaken.toString())
    localStorage.setItem("wlw-game-timestamp", Date.now().toString())

    // Save game data to Supabase in the background
    saveGameData(finalScore, wordCount, level, timeTaken).then((success) => {
      if (!success) {
        console.log("Failed to save to Supabase, will retry on results page")
        localStorage.setItem("wlw-retry-save", "true")
      }
    })

    // Navigate to results page immediately
    const url = `/results?score=${finalScore}&words=${wordCount}&level=${level}&time=${timeTaken}&ts=${Date.now()}`
    console.log("Navigating to results page:", url)
    router.push(url)
  }, [router, saveGameData])

  // Keep validWordsRef in sync with validWords state
  useEffect(() => {
    validWordsRef.current = validWords
  }, [validWords])

  // Initialize game with optimized loading
  useEffect(() => {
    const initGame = async () => {
      // Check if user has a nickname
      const nickname = localStorage.getItem("wlw-nickname")
      if (!nickname) {
        router.push("/nickname")
        return
      }

      try {
        // Select a random word from the word list
        const randomIndex = Math.floor(Math.random() * wordList.length)
        const selectedWord = wordList[randomIndex].word.toUpperCase()
        setMainWord(selectedWord)

        // Shuffle the letters of the main word
        const shuffledLetters = [...selectedWord].sort(() => Math.random() - 0.5)
        setLetters(shuffledLetters)

        // Store the main word in localStorage for reference
        localStorage.setItem("wlw-main-word", selectedWord)

        // Get definition for the main word
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

    // Add event listeners for better mobile performance
    document.addEventListener("touchstart", handleTouchStart)
    document.addEventListener("touchend", handleTouchEnd)

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (endGameTimeoutRef.current) {
        clearTimeout(endGameTimeoutRef.current)
      }
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [router])

  // Touch event handlers for better mobile performance
  const handleTouchStart = useCallback(() => {
    setTouchStartTime(Date.now())
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (touchStartTime && Date.now() - touchStartTime < 300) {
      // This was a quick tap, no need to do anything special
    }
    setTouchStartTime(null)
  }, [touchStartTime])

  // Timer logic with optimized interval
  useEffect(() => {
    if (!gameStarted || gameEnded || isLoading) return

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Use requestAnimationFrame for smoother timer updates
    let lastUpdateTime = Date.now()
    const updateTimer = () => {
      const now = Date.now()
      if (now - lastUpdateTime >= 1000) {
        lastUpdateTime = now
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame()
            return 0
          }
          return prev - 1
        })
      }

      if (!gameEnded) {
        timerRef.current = requestAnimationFrame(updateTimer) as unknown as NodeJS.Timeout
      }
    }

    timerRef.current = requestAnimationFrame(updateTimer) as unknown as NodeJS.Timeout

    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current as unknown as number)
      }
    }
  }, [gameStarted, gameEnded, isLoading, endGame])

  // Start game when user interacts
  const startGame = useCallback(() => {
    if (!gameStarted && !gameEnded) {
      console.log("Game started")
      setGameStarted(true)

      // Track game start after a small delay to ensure analytics is loaded
      setTimeout(() => {
        trackGameStart(mainWord)
      }, 100)
    }
  }, [gameStarted, gameEnded, mainWord])

  // Update score whenever validWords changes
  useEffect(() => {
    if (validWords.length > 0) {
      const newScore = calculateScore(validWords)
      setScore(newScore)
    }
  }, [validWords])

  // Save game data to Supabase
  const saveGameData = useCallback(
    async (finalScore: number, wordCount: number, level: number, timeTaken: number) => {
      const nickname = localStorage.getItem("wlw-nickname") || "Anonymous"
      const playerId = localStorage.getItem("wlw-player-id")

      if (!nickname || !playerId) {
        console.error("Missing player information")
        return false
      }

      try {
        // Game data to save
        const gameData = {
          player_id: playerId,
          nickname,
          score: finalScore,
          word_count: wordCount,
          time_taken: timeTaken,
          main_word: mainWord,
          level: level,
        }

        console.log("Saving game data to Supabase:", gameData)

        // Use upsert to ensure data is saved even if there's a conflict
        const { data, error } = await supabase.from("game_scores").upsert(gameData).select()

        if (error) {
          console.error("Error saving to Supabase:", error)
          return false
        }

        console.log("Successfully saved to Supabase:", data)

        // Trigger a leaderboard refresh
        await refreshLeaderboard({
          score: finalScore,
          nickname,
          wordCount,
          level,
        })

        return true
      } catch (error) {
        console.error("Error saving score:", error)
        return false
      }
    },
    [mainWord, supabase],
  )

  // Handle letter selection with debounce for better mobile performance
  const handleLetterClick = useCallback(
    (letter: string, index: number) => {
      if (!gameStarted) {
        startGame()
      }

      if (gameEnded) return

      // Debounce to prevent double-taps on mobile
      const now = Date.now()
      if (touchStartTime && now - touchStartTime < 50) {
        return
      }

      setSelectedLetters((prev) => [...prev, letter])
      setSelectedIndices((prev) => [...prev, index])
    },
    [gameStarted, gameEnded, startGame, touchStartTime],
  )

  // Handle letter removal
  const handleSelectedLetterClick = useCallback((index: number) => {
    setSelectedLetters((prev) => {
      const newSelectedLetters = [...prev]
      newSelectedLetters.splice(index, 1)
      return newSelectedLetters
    })

    setSelectedIndices((prev) => {
      const newSelectedIndices = [...prev]
      newSelectedIndices.splice(index, 1)
      return newSelectedIndices
    })
  }, [])

  // Handle word submission with optimized validation
  const handleSubmitWord = useCallback(async () => {
    if (!gameStarted) {
      startGame()
      return
    }

    if (gameEnded || selectedLetters.length === 0) return

    const word = selectedLetters.join("")
    console.log("Submitting word:", word)

    // Check if word is at least 3 letters
    if (word.length < 3) {
      console.log("Word too short:", word)
      setSubmittedWords((prev) => [...prev, { word, status: "invalid" }])
      setSelectedLetters([])
      setSelectedIndices([])

      // Track invalid word submission
      trackWordSubmitted(word, false)
      return
    }

    // Check if word has already been submitted
    if (validWords.includes(word)) {
      console.log("Word already submitted:", word)
      setSubmittedWords((prev) => [...prev, { word, status: "duplicate" }])
      setSelectedLetters([])
      setSelectedIndices([])

      // Track duplicate word submission
      trackWordSubmitted(word, false)
      return
    }

    // Show loading state for better UX
    setSubmittedWords((prev) => [...prev, { word, status: "invalid" }])

    // Check if it's a valid English word using the dictionary API
    console.log("Checking if word is valid:", word)
    const isValid = await isValidEnglishWord(word)

    if (isValid) {
      console.log("Word is valid:", word)
      const newValidWords = [...validWords, word]
      setValidWords(newValidWords)

      // Update the last submitted word status
      setSubmittedWords((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { word, status: "valid" }
        return updated
      })

      // Calculate and update score
      const newScore = calculateScore(newValidWords)
      console.log("New score after adding word:", newScore)
      setScore(newScore)

      // Track valid word submission
      trackWordSubmitted(word, true)
    } else {
      // Word is already marked as invalid in the loading state
      console.log("Word is invalid:", word)

      // Track invalid word submission
      trackWordSubmitted(word, false)
    }

    setSelectedLetters([])
    setSelectedIndices([])

    // Scroll to bottom of word list with smooth animation
    if (wordListRef.current) {
      setTimeout(() => {
        if (wordListRef.current) {
          wordListRef.current.scrollTo({
            top: wordListRef.current.scrollHeight,
            behavior: "smooth",
          })
        }
      }, 50)
    }
  }, [gameStarted, gameEnded, selectedLetters, validWords, startGame])

  // Clear current selection
  const clearSelection = useCallback(() => {
    setSelectedLetters([])
    setSelectedIndices([])
  }, [])

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  // Memoize the letter tiles to prevent unnecessary re-renders
  const letterTiles = useMemo(() => {
    return letters.map((letter, index) => (
      <MemoizedLetterTile
        key={`letter-${index}`}
        letter={letter}
        onClick={() => handleLetterClick(letter, index)}
        isSelected={selectedIndices.includes(index)}
        position={index}
      />
    ))
  }, [letters, selectedIndices, handleLetterClick])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-between bg-zinc-900 text-cream">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-orange-500"></div>
            <p>Loading your challenge...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-zinc-900 text-cream overscroll-none">
      {/* Header */}
      <MotionHeader
        className="sticky top-0 z-10 flex items-center justify-between bg-zinc-900/95 p-3 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="text-zinc-400 hover:text-cream h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <motion.div
          className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Clock className="h-3 w-3 text-orange-500" />
          <span className={`font-mono text-xs font-bold ${timeLeft <= 10 ? "text-red-500" : "text-cream"}`}>
            {formatTime(timeLeft)}
          </span>
        </motion.div>

        <motion.div
          className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-1"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Trophy className="h-3 w-3 text-green-500" />
          <span className="font-mono text-xs font-bold">{validWords.length}</span>
        </motion.div>
      </MotionHeader>

      {/* Main Word and Score */}
      <motion.div
        className="flex flex-col items-center justify-center p-2 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-cream">{mainWord}</h1>
        <p className="mt-1 max-w-md text-xs text-zinc-400 line-clamp-2">{mainWordDefinition}</p>

        {/* Display current score */}
        <div className="mt-2 px-4 py-1 bg-gradient-to-r from-orange-600/30 to-orange-500/30 rounded-full shadow-md border border-orange-500/30">
          <span className="text-base font-bold text-orange-500">Score: {score}</span>
        </div>
      </motion.div>

      {/* Word List - Optimized for mobile */}
      <div
        ref={wordListRef}
        className="flex-1 space-y-1 overflow-y-auto p-2 overscroll-contain"
        style={{
          maxHeight: "25vh",
          WebkitOverflowScrolling: "touch", // For smoother scrolling on iOS
        }}
      >
        <AnimatePresence>
          {submittedWords.map((item, index) => (
            <motion.div
              key={`${item.word}-${index}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`rounded-xl p-1 text-center font-medium text-sm ${
                item.status === "valid"
                  ? "bg-green-500/20 text-green-400"
                  : item.status === "duplicate"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {item.word}
            </motion.div>
          ))}
        </AnimatePresence>

        {!gameStarted && !gameEnded && (
          <motion.div
            className="mt-4 text-center text-zinc-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <AlertCircle className="mx-auto mb-1 h-5 w-5" />
            <p className="text-sm">Tap on letters to form words</p>
          </motion.div>
        )}
      </div>

      {/* Selected Letters and Submit Button - Optimized for mobile */}
      <div className="p-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1 min-h-8">
              {selectedLetters.map((letter, index) => (
                <motion.div
                  key={`selected-${index}`}
                  className="w-8 h-8 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-md flex items-center justify-center text-base font-bold cursor-pointer shadow-md touch-manipulation"
                  onClick={() => handleSelectedLetterClick(index)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    WebkitTapHighlightColor: "transparent", // Remove tap highlight on mobile
                  }}
                >
                  {letter}
                </motion.div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="h-8 text-zinc-400 border-zinc-700 text-xs touch-manipulation"
                disabled={selectedLetters.length === 0}
                style={{
                  WebkitTapHighlightColor: "transparent", // Remove tap highlight on mobile
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button
                onClick={handleSubmitWord}
                size="sm"
                className="h-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md text-xs touch-manipulation"
                disabled={selectedLetters.length < 3}
                style={{
                  WebkitTapHighlightColor: "transparent", // Remove tap highlight on mobile
                }}
              >
                <Send className="h-3 w-3 mr-1" />
                Enter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Letter Tiles - Improved spacing and touch response for mobile */}
      <div className="p-2 pt-1 pb-6 mb-6">
        <div className="flex flex-wrap justify-center gap-2 touch-manipulation">{letterTiles}</div>
      </div>

      {/* Footer with proper spacing */}
      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  )
}
