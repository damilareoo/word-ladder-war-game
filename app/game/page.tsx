"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
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

// Game duration in seconds
const GAME_DURATION = 120

// Memoized components for better performance
const MemoizedLetterTile = memo(LetterTile)

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

  const wordListRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const validWordsRef = useRef<string[]>([])
  const gameDataSavedRef = useRef<boolean>(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Keep validWordsRef in sync with validWords state
  useEffect(() => {
    validWordsRef.current = validWords
  }, [validWords])

  // Initialize game
  useEffect(() => {
    const initGame = async () => {
      // Check if user has a nickname
      const nickname = localStorage.getItem("wlw-nickname")
      if (!nickname) {
        router.push("/nickname")
        return
      }

      // Select a random word from the word list
      const randomIndex = Math.floor(Math.random() * wordList.length)
      const selectedWord = wordList[randomIndex].word.toUpperCase()
      setMainWord(selectedWord)

      // Shuffle the letters of the main word
      const shuffledLetters = [...selectedWord].sort(() => Math.random() - 0.5)
      setLetters(shuffledLetters)

      try {
        // Get definition for the main word
        const definition = await getWordDefinition(selectedWord)
        setMainWordDefinition(definition)
      } catch (error) {
        console.error("Failed to get definition:", error)
        setMainWordDefinition("A challenging word to test your vocabulary skills.")
      }

      setIsLoading(false)
    }

    initGame()
  }, [router])

  // Timer logic
  useEffect(() => {
    if (!gameStarted || gameEnded || isLoading) return

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
  }, [gameStarted, gameEnded, isLoading])

  // Start game when user interacts
  const startGame = () => {
    if (!gameStarted && !gameEnded) {
      console.log("Game started")
      setGameStarted(true)
    }
  }

  // Update score whenever validWords changes
  useEffect(() => {
    if (validWords.length > 0) {
      const newScore = calculateScore(validWords)
      console.log(`Updating score to ${newScore} based on ${validWords.length} words`)
      setScore(newScore)
    }
  }, [validWords])

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

    console.log("Game summary:", {
      score: finalScore,
      wordCount,
      level,
      timeTaken,
    })

    // Save game results to Supabase
    const nickname = localStorage.getItem("wlw-nickname") || "Anonymous"
    const playerId = localStorage.getItem("wlw-player-id")

    try {
      if (nickname && playerId) {
        const supabase = getSupabaseBrowserClient()

        // Make sure we're saving the correct data
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
        } else {
          console.log("Successfully saved to Supabase:", data)

          // Trigger a leaderboard refresh by sending a broadcast
          try {
            await supabase.channel("leaderboard_refresh").send({
              type: "broadcast",
              event: "refresh",
              payload: { timestamp: new Date().toISOString() },
            })
            console.log("Sent leaderboard refresh signal")
          } catch (broadcastError) {
            console.error("Error sending refresh broadcast:", broadcastError)
          }
        }
      }
    } catch (error) {
      console.error("Error saving score:", error)
    }

    // Store the game results in localStorage as a backup
    localStorage.setItem("wlw-last-score", finalScore.toString())
    localStorage.setItem("wlw-last-word-count", wordCount.toString())
    localStorage.setItem("wlw-last-level", level.toString())
    localStorage.setItem("wlw-last-time", timeTaken.toString())
    // Add a flag to indicate we need to refresh the leaderboard
    localStorage.setItem("wlw-refresh-leaderboard", "true")

    console.log("Game data saved to localStorage:", {
      score: finalScore,
      wordCount,
      level,
      timeTaken,
    })

    // Navigate to results page immediately
    const url = `/results?score=${finalScore}&words=${wordCount}&level=${level}&time=${timeTaken}`
    console.log("Navigating to results page:", url)
    router.push(url)
  }, [mainWord, router])

  // Handle letter selection
  const handleLetterClick = useCallback(
    (letter: string, index: number) => {
      if (!gameStarted) {
        startGame()
      }

      if (gameEnded) return

      setSelectedLetters((prev) => [...prev, letter])
      setSelectedIndices((prev) => [...prev, index])
    },
    [gameStarted, gameEnded],
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

  // Handle word submission
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
      return
    }

    // Check if word has already been submitted
    if (validWords.includes(word)) {
      console.log("Word already submitted:", word)
      setSubmittedWords((prev) => [...prev, { word, status: "duplicate" }])
      setSelectedLetters([])
      setSelectedIndices([])
      return
    }

    // Check if it's a valid English word using the dictionary API
    console.log("Checking if word is valid:", word)
    const isValid = await isValidEnglishWord(word)

    if (isValid) {
      console.log("Word is valid:", word)
      const newValidWords = [...validWords, word]
      setValidWords(newValidWords)
      setSubmittedWords((prev) => [...prev, { word, status: "valid" }])

      // Calculate and update score
      const newScore = calculateScore(newValidWords)
      console.log("New score after adding word:", newScore)
      setScore(newScore)
    } else {
      console.log("Word is invalid:", word)
      setSubmittedWords((prev) => [...prev, { word, status: "invalid" }])
    }

    setSelectedLetters([])
    setSelectedIndices([])

    // Scroll to bottom of word list
    if (wordListRef.current) {
      setTimeout(() => {
        if (wordListRef.current) {
          wordListRef.current.scrollTop = wordListRef.current.scrollHeight
        }
      }, 100)
    }
  }, [gameStarted, gameEnded, selectedLetters, validWords])

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
    <main className="flex min-h-screen flex-col bg-zinc-900 text-cream">
      {/* Header */}
      <motion.header
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
      </motion.header>

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

      {/* Word List */}
      <div ref={wordListRef} className="flex-1 space-y-1 overflow-y-auto p-2" style={{ maxHeight: "25vh" }}>
        <AnimatePresence>
          {submittedWords.map((item, index) => (
            <motion.div
              key={`${item.word}-${index}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
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

      {/* Selected Letters and Submit Button */}
      <div className="p-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1 min-h-8">
              {selectedLetters.map((letter, index) => (
                <motion.div
                  key={`selected-${index}`}
                  className="w-8 h-8 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-md flex items-center justify-center text-base font-bold cursor-pointer shadow-md"
                  onClick={() => handleSelectedLetterClick(index)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {letter}
                </motion.div>
              ))}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="h-8 text-zinc-400 border-zinc-700 text-xs"
                disabled={selectedLetters.length === 0}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button
                onClick={handleSubmitWord}
                size="sm"
                className="h-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md text-xs"
                disabled={selectedLetters.length < 3}
              >
                <Send className="h-3 w-3 mr-1" />
                Enter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Letter Tiles - Improved spacing for mobile */}
      <div className="p-2 pt-1 pb-6 mb-6">
        <div className="flex flex-wrap justify-center gap-2">
          {letters.map((letter, index) => (
            <MemoizedLetterTile
              key={`letter-${index}`}
              letter={letter}
              onClick={() => handleLetterClick(letter, index)}
              isSelected={selectedIndices.includes(index)}
              position={index}
            />
          ))}
        </div>
      </div>

      {/* Footer with proper spacing */}
      <div className="mt-auto">
        <Footer />
      </div>
    </main>
  )
}
