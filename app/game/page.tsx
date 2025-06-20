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
import { LetterTile, SelectedLetter } from "@/components/letter-tile"
import { refreshLeaderboard } from "@/lib/realtime-utils"
import { trackGameStart, trackGameComplete, trackWordSubmitted } from "@/lib/analytics"

// Prevent prerendering of this page
export const dynamic = "force-dynamic"
export const dynamicParams = true

// Game duration in seconds
const GAME_DURATION = 120

// Memoized components for better performance
const MemoizedLetterTile = memo(LetterTile)
const MemoizedSelectedLetter = memo(SelectedLetter)

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
  const [letters, setLetters] = useState<Array<{ letter: string; visible: boolean }>>([])
  const [selectedLetters, setSelectedLetters] = useState<Array<{ letter: string; index: number }>>([])

  // Refs for touch handling
  const lastTouchTimeRef = useRef<number>(0)
  const touchCooldownRef = useRef<boolean>(false)
  const processingSubmissionRef = useRef<boolean>(false)

  const wordListRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const validWordsRef = useRef<string[]>([])
  const gameDataSavedRef = useRef<boolean>(false)
  const timerRef = useRef<any>(null)
  const endGameTimeoutRef = useRef<any>(null)
  const supabaseRef = useRef<any>(null)
  const mainWordRef = useRef<string>("")

  // Clear current selection and return all selected letters to the pool
  const clearSelection = useCallback(() => {
    // Make all selected letters visible again
    setLetters((prev) => {
      const newLetters = [...prev]
      selectedLetters.forEach(({ index }) => {
        newLetters[index].visible = true
      })
      return newLetters
    })

    // Clear selected letters
    setSelectedLetters([])
  }, [selectedLetters])

  // Start game when user interacts
  const startGame = useCallback(() => {
    if (!gameStarted && !gameEnded) {
      console.log("Game started")
      setGameStarted(true)

      // Track game start after a small delay to ensure analytics is loaded
      if (typeof window !== "undefined") {
        setTimeout(() => {
          trackGameStart(mainWordRef.current)
        }, 100)
      }
    }
  }, [gameStarted, gameEnded])

  // Save game data to Supabase
  const saveGameData = useCallback(async (finalScore: number, wordCount: number, level: number, timeTaken: number) => {
    if (!supabaseRef.current) return false

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
        main_word: mainWordRef.current,
        level: level,
      }

      console.log("Saving game data to Supabase:", gameData)

      // Use upsert to ensure data is saved even if there's a conflict
      const { data, error } = await supabaseRef.current.from("game_scores").upsert(gameData).select()

      if (error) {
        console.error("Error saving to Supabase:", error)
        return false
      }

      console.log("Successfully saved to Supabase:", data)

      // Trigger a leaderboard refresh with immediate broadcast
      await refreshLeaderboard({
        score: finalScore,
        nickname,
        wordCount,
        level,
        immediate: true,
      })

      return true
    } catch (error) {
      console.error("Error saving score:", error)
      return false
    }
  }, [])

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

    // Log level information for debugging
    console.log(`Game ended with ${wordCount} words, calculated level: ${level}`)

    // Track game completion
    if (typeof window !== "undefined") {
      trackGameComplete(finalScore, wordCount, level)
    }

    console.log("Game summary:", {
      score: finalScore,
      wordCount,
      level,
      timeTaken,
    })

    // Store the game results in localStorage immediately
    if (typeof window !== "undefined") {
      localStorage.setItem("wlw-last-score", finalScore.toString())
      localStorage.setItem("wlw-last-word-count", wordCount.toString())
      localStorage.setItem("wlw-last-level", level.toString())
      localStorage.setItem("wlw-last-time", timeTaken.toString())
      localStorage.setItem("wlw-game-timestamp", Date.now().toString())
    }

    // Save game data to Supabase in the background
    saveGameData(finalScore, wordCount, level, timeTaken).then((success) => {
      if (!success && typeof window !== "undefined") {
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
    // Initialize Supabase client
    if (typeof window !== "undefined") {
      supabaseRef.current = getSupabaseBrowserClient()
    }

    const initGame = async () => {
      // Check if user has a nickname
      if (typeof window !== "undefined") {
        const nickname = localStorage.getItem("wlw-nickname")
        if (!nickname) {
          router.push("/nickname")
          return
        }
      }

      try {
        // Select a random word from the word list
        const randomIndex = Math.floor(Math.random() * wordList.length)
        const selectedWord = wordList[randomIndex].word.toUpperCase()
        setMainWord(selectedWord)
        mainWordRef.current = selectedWord

        // Shuffle the letters of the main word and set them as visible
        const shuffledLetters = [...selectedWord]
          .map((letter) => ({
            letter,
            visible: true,
          }))
          .sort(() => Math.random() - 0.5)

        setLetters(shuffledLetters)

        // Store the main word in localStorage for reference
        if (typeof window !== "undefined") {
          localStorage.setItem("wlw-main-word", selectedWord)
        }

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

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (endGameTimeoutRef.current) {
        clearTimeout(endGameTimeoutRef.current)
      }
    }
  }, [router])

  // Timer logic with optimized interval
  useEffect(() => {
    if (!gameStarted || gameEnded || isLoading || typeof window === "undefined") return

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          // End game immediately when timer reaches 0
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

  // Update score whenever validWords changes
  useEffect(() => {
    if (validWords.length > 0) {
      const newScore = calculateScore(validWords)
      setScore(newScore)
    }
  }, [validWords])

  // Handle letter selection with improved touch handling for mobile
  const handleLetterClick = useCallback(
    (letter: string, index: number) => {
      // Prevent interaction if game has ended
      if (gameEnded) return

      // Start game if not started
      if (!gameStarted) {
        startGame()
      }

      // Implement touch cooldown to prevent accidental double taps
      if (touchCooldownRef.current) {
        return
      }

      // Set cooldown flag
      touchCooldownRef.current = true

      // Add letter to selection and hide it from the available letters
      setSelectedLetters((prev) => [...prev, { letter, index }])

      // Update the letters array to mark this letter as not visible
      setLetters((prev) => {
        const newLetters = [...prev]
        newLetters[index].visible = false
        return newLetters
      })

      // Reset cooldown after a short delay
      setTimeout(() => {
        touchCooldownRef.current = false
      }, 100)
    },
    [gameStarted, gameEnded, startGame],
  )

  // Handle letter removal with improved touch handling
  const handleSelectedLetterClick = useCallback(
    (selectedIndex: number) => {
      // Prevent interaction during cooldown
      if (touchCooldownRef.current) {
        return
      }

      // Set cooldown flag
      touchCooldownRef.current = true

      // Get the letter that was clicked
      const removedLetter = selectedLetters[selectedIndex]

      // Remove the letter from selected letters
      setSelectedLetters((prev) => prev.filter((_, i) => i !== selectedIndex))

      // Make the letter visible again in the original letters array
      setLetters((prev) => {
        const newLetters = [...prev]
        newLetters[removedLetter.index].visible = true
        return newLetters
      })

      // Reset cooldown after a short delay
      setTimeout(() => {
        touchCooldownRef.current = false
      }, 100)
    },
    [selectedLetters],
  )

  // Handle word submission with optimized validation and immediate feedback
  const handleSubmitWord = useCallback(async () => {
    // Prevent multiple submissions at once
    if (processingSubmissionRef.current) {
      return
    }

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
    console.log("Submitting word:", word)

    try {
      // Check if word is at least 3 letters
      if (word.length < 3) {
        console.log("Word too short:", word)
        // Immediately show as invalid
        setSubmittedWords((prev) => [...prev, { word, status: "invalid" }])

        // Track invalid word submission
        if (typeof window !== "undefined") {
          trackWordSubmitted(word, false)
        }

        // Return letters to the pool
        clearSelection()
        processingSubmissionRef.current = false
        return
      }

      // Check if word has already been submitted
      if (validWords.includes(word)) {
        console.log("Word already submitted:", word)
        // Immediately show as duplicate
        setSubmittedWords((prev) => [...prev, { word, status: "duplicate" }])

        // Track duplicate word submission
        if (typeof window !== "undefined") {
          trackWordSubmitted(word, false)
        }

        // Return letters to the pool
        clearSelection()
        processingSubmissionRef.current = false
        return
      }

      // Optimistically assume the word is valid for immediate feedback
      // Add to submitted words with "valid" status right away
      setSubmittedWords((prev) => [...prev, { word, status: "valid" }])

      // Check if it's a valid English word using the dictionary API
      console.log("Checking if word is valid:", word)
      const isValid = await isValidEnglishWord(word)

      if (isValid) {
        console.log("Word is valid:", word)
        const newValidWords = [...validWords, word]
        setValidWords(newValidWords)

        // Calculate and update score
        const newScore = calculateScore(newValidWords)
        console.log("New score after adding word:", newScore)
        setScore(newScore)

        // Track valid word submission
        if (typeof window !== "undefined") {
          trackWordSubmitted(word, true)
        }
      } else {
        // If the word is actually invalid, update the status
        console.log("Word is invalid:", word)
        setSubmittedWords((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (updated[lastIndex]?.word === word) {
            updated[lastIndex] = { word, status: "invalid" }
          }
          return updated
        })

        // Track invalid word submission
        if (typeof window !== "undefined") {
          trackWordSubmitted(word, false)
        }
      }
    } catch (error) {
      console.error("Error validating word:", error)
      // If there's an error, mark as invalid
      setSubmittedWords((prev) => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        if (updated[lastIndex]?.word === word) {
          updated[lastIndex] = { word, status: "invalid" }
        }
        return updated
      })
    } finally {
      // Clear the selected letters and return them to the pool
      clearSelection()

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

      // Reset processing flag
      processingSubmissionRef.current = false
    }
  }, [gameStarted, gameEnded, selectedLetters, validWords, startGame, clearSelection])

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }, [])

  // Memoize the letter tiles to prevent unnecessary re-renders
  const letterTiles = useMemo(() => {
    return letters
      .map(
        (item, index) =>
          item.visible && (
            <MemoizedLetterTile
              key={`letter-${index}`}
              letter={item.letter}
              onClick={() => handleLetterClick(item.letter, index)}
              position={index}
            />
          ),
      )
      .filter(Boolean) // Filter out null/undefined values (hidden letters)
  }, [letters, handleLetterClick])

  // Memoize the selected letter tiles
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
      <div className="p-3">
        <div className="flex flex-col gap-3">
          {/* Selected Letters Area */}
          <div className="min-h-14 p-2 bg-zinc-800/50 rounded-xl flex flex-wrap gap-2 items-center">
            <AnimatePresence>
              {selectedLetters.length > 0 ? (
                selectedLetterTiles
              ) : (
                <motion.p
                  className="text-zinc-500 text-sm w-full text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Select letters to form a word
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={clearSelection}
              className="flex-1 h-10 text-zinc-400 border-zinc-700 text-sm touch-manipulation"
              disabled={selectedLetters.length === 0}
              style={{
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              onClick={handleSubmitWord}
              className="flex-1 h-10 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md text-sm touch-manipulation"
              disabled={selectedLetters.length < 3 || processingSubmissionRef.current}
              style={{
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <Send className="h-4 w-4 mr-1" />
              Submit
            </Button>
          </div>
        </div>
      </div>

      {/* Letter Tiles - Improved spacing and touch response for mobile */}
      <div className="p-3 pt-1 pb-6 mb-6">
        <div className="flex flex-wrap justify-center gap-3 touch-manipulation">{letterTiles}</div>
      </div>

      {/* Footer with proper spacing */}
      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  )
}
