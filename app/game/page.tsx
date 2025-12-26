"use client"

import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Clock, Send, Trophy, ArrowLeft, RotateCcw } from "lucide-react"
import { wordList } from "@/lib/word-list"
import { getWordDefinition, isValidEnglishWord } from "@/lib/dictionary"
import { calculateScore, calculateLevel } from "@/lib/game-utils"
import { motion, AnimatePresence } from "framer-motion"
import { saveGameScore, saveLastGameResults, getCurrentPlayer } from "@/lib/storage"
import { LetterTile, SelectedLetter } from "@/components/letter-tile"
import { trackGameStart, trackGameComplete, trackWordSubmitted } from "@/lib/analytics"

export const dynamic = "force-dynamic"
export const dynamicParams = true

const GAME_DURATION = 120

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
  const [letters, setLetters] = useState<Array<{ letter: string; visible: boolean }>>([])
  const [selectedLetters, setSelectedLetters] = useState<Array<{ letter: string; index: number }>>([])
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(
    null,
  )

  const lastTouchTimeRef = useRef<number>(0)
  const touchCooldownRef = useRef<boolean>(false)
  const processingSubmissionRef = useRef<boolean>(false)
  const wordListRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const validWordsRef = useRef<string[]>([])
  const gameDataSavedRef = useRef<boolean>(false)
  const timerRef = useRef<any>(null)
  const endGameTimeoutRef = useRef<any>(null)
  const mainWordRef = useRef<string>("")
  const feedbackTimeoutRef = useRef<any>(null)

  const showFeedback = useCallback((text: string, type: "success" | "error" | "info") => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    setFeedbackMessage({ text, type })
    feedbackTimeoutRef.current = setTimeout(() => setFeedbackMessage(null), 1500)
  }, [])

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

  const startGame = useCallback(() => {
    if (!gameStarted && !gameEnded) {
      setGameStarted(true)
      if (typeof window !== "undefined") {
        setTimeout(() => {
          trackGameStart(mainWordRef.current)
        }, 100)
      }
    }
  }, [gameStarted, gameEnded])

  const saveGameData = useCallback(async (finalScore: number, wordCount: number, level: number, timeTaken: number) => {
    const player = getCurrentPlayer()
    if (!player) return false

    try {
      saveGameScore({
        player_id: player.id,
        nickname: player.nickname,
        score: finalScore,
        word_count: wordCount,
        time_taken: timeTaken,
        main_word: mainWordRef.current,
        level: level,
      })
      return true
    } catch (error) {
      return false
    }
  }, [])

  const endGame = useCallback(async () => {
    if (gameDataSavedRef.current) return
    setGameEnded(true)
    gameDataSavedRef.current = true

    const currentValidWords = validWordsRef.current
    const finalScore = calculateScore(currentValidWords)
    setScore(finalScore)

    const timeTaken = startTimeRef.current
      ? Math.min(GAME_DURATION, Math.floor((Date.now() - startTimeRef.current) / 1000))
      : GAME_DURATION

    const wordCount = currentValidWords.length
    const level = calculateLevel(wordCount)

    if (typeof window !== "undefined") {
      trackGameComplete(finalScore, wordCount, level)
    }

    saveLastGameResults({ score: finalScore, wordCount, level, timeTaken })
    saveGameData(finalScore, wordCount, level, timeTaken)

    const url = `/results?score=${finalScore}&words=${wordCount}&level=${level}&time=${timeTaken}&ts=${Date.now()}`
    router.push(url)
  }, [router, saveGameData])

  useEffect(() => {
    validWordsRef.current = validWords
  }, [validWords])

  useEffect(() => {
    const initGame = async () => {
      if (typeof window !== "undefined") {
        const player = getCurrentPlayer()
        if (!player) {
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
        setMainWordDefinition("A challenging word to test your vocabulary skills.")
      } finally {
        setIsLoading(false)
      }
    }

    initGame()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (endGameTimeoutRef.current) clearTimeout(endGameTimeoutRef.current)
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    }
  }, [router])

  useEffect(() => {
    if (!gameStarted || gameEnded || isLoading || typeof window === "undefined") return

    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameStarted, gameEnded, isLoading, endGame])

  useEffect(() => {
    if (validWords.length > 0) {
      const newScore = calculateScore(validWords)
      setScore(newScore)
    }
  }, [validWords])

  const handleLetterClick = useCallback(
    (letter: string, index: number) => {
      if (gameEnded) return
      if (!gameStarted) startGame()
      if (touchCooldownRef.current) return

      touchCooldownRef.current = true
      setSelectedLetters((prev) => [...prev, { letter, index }])
      setLetters((prev) => {
        const newLetters = [...prev]
        newLetters[index].visible = false
        return newLetters
      })

      setTimeout(() => {
        touchCooldownRef.current = false
      }, 80)
    },
    [gameStarted, gameEnded, startGame],
  )

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
      }, 80)
    },
    [selectedLetters],
  )

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
        showFeedback("Min 3 letters", "error")
        if (typeof window !== "undefined") trackWordSubmitted(word, false)
        clearSelection()
        processingSubmissionRef.current = false
        return
      }

      if (validWords.includes(word)) {
        setSubmittedWords((prev) => [...prev, { word, status: "duplicate" }])
        showFeedback("Already found", "info")
        if (typeof window !== "undefined") trackWordSubmitted(word, false)
        clearSelection()
        processingSubmissionRef.current = false
        return
      }

      setSubmittedWords((prev) => [...prev, { word, status: "valid" }])
      const isValid = await isValidEnglishWord(word)

      if (isValid) {
        const newValidWords = [...validWords, word]
        setValidWords(newValidWords)
        const newScore = calculateScore(newValidWords)
        setScore(newScore)
        const pointsEarned =
          word.length <= 3 ? 1 : word.length <= 4 ? 2 : word.length <= 5 ? 3 : word.length <= 6 ? 5 : 8
        showFeedback(`+${pointsEarned} pts`, "success")
        if (typeof window !== "undefined") trackWordSubmitted(word, true)
      } else {
        setSubmittedWords((prev) => {
          const updated = [...prev]
          const lastIndex = updated.length - 1
          if (updated[lastIndex]?.word === word) {
            updated[lastIndex] = { word, status: "invalid" }
          }
          return updated
        })
        showFeedback("Not a word", "error")
        if (typeof window !== "undefined") trackWordSubmitted(word, false)
      }
    } catch (error) {
      setSubmittedWords((prev) => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        if (updated[lastIndex]?.word === word) {
          updated[lastIndex] = { word, status: "invalid" }
        }
        return updated
      })
      showFeedback("Try again", "error")
    } finally {
      clearSelection()
      if (wordListRef.current) {
        setTimeout(() => {
          if (wordListRef.current) {
            wordListRef.current.scrollTo({ top: wordListRef.current.scrollHeight, behavior: "smooth" })
          }
        }, 50)
      }
      processingSubmissionRef.current = false
    }
  }, [gameStarted, gameEnded, selectedLetters, validWords, startGame, clearSelection, showFeedback])

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }, [])

  const timeProgress = (timeLeft / GAME_DURATION) * 100
  const isLowTime = timeLeft <= 30
  const isCriticalTime = timeLeft <= 10

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
      .filter(Boolean)
  }, [letters, handleLetterClick])

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading challenge...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground overscroll-none">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="text-muted-foreground hover:text-foreground h-10 w-10 rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Clock
              className={`h-4 w-4 ${isCriticalTime ? "text-destructive animate-pulse" : isLowTime ? "text-yellow-500" : "text-muted-foreground"}`}
            />
            <span
              className={`font-mono text-lg font-bold tabular-nums ${isCriticalTime ? "text-destructive" : isLowTime ? "text-yellow-500" : "text-foreground"}`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${isCriticalTime ? "bg-destructive" : isLowTime ? "bg-yellow-500" : "bg-primary"}`}
              initial={{ width: "100%" }}
              animate={{ width: `${timeProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-secondary/10 px-3 py-1.5 rounded-xl">
          <Trophy className="h-4 w-4 text-secondary" />
          <span className="font-mono text-lg font-bold tabular-nums text-secondary">{validWords.length}</span>
        </div>
      </header>

      <section className="px-4 py-6 text-center border-b border-border/30">
        <motion.h1
          className="text-3xl sm:text-4xl font-bold tracking-wider text-foreground"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {mainWord}
        </motion.h1>
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 max-w-xs mx-auto leading-relaxed">
          {mainWordDefinition}
        </p>

        <motion.div
          className="mt-4 inline-flex items-baseline gap-1 bg-card px-4 py-2 rounded-xl border border-border/50"
          key={score}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <span className="text-3xl font-bold text-primary tabular-nums">{score}</span>
          <span className="text-sm text-muted-foreground">pts</span>
        </motion.div>
      </section>

      <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-hidden">
        {/* Found words */}
        <div
          ref={wordListRef}
          className="min-h-[52px] max-h-16 overflow-y-auto rounded-xl bg-card/30 px-3 py-2.5 border border-border/30 overscroll-contain"
        >
          {submittedWords.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-1">
              {gameStarted ? "Form words from the letters below" : "Tap a letter to start"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence mode="popLayout">
                {submittedWords.slice(-15).map((item, index) => (
                  <motion.span
                    key={`${item.word}-${index}`}
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                      item.status === "valid"
                        ? "bg-secondary/20 text-secondary"
                        : item.status === "duplicate"
                          ? "bg-yellow-500/15 text-yellow-400"
                          : "bg-destructive/15 text-destructive line-through"
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.word}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="relative flex items-center justify-center min-h-[60px] bg-card/50 rounded-xl border border-border/40 px-3">
          <AnimatePresence mode="popLayout">
            {selectedLetterTiles.length > 0 ? (
              <div className="flex items-center gap-1.5">{selectedLetterTiles}</div>
            ) : (
              <motion.span
                className="text-sm text-muted-foreground/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Tap letters to spell
              </motion.span>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {feedbackMessage && (
              <motion.div
                className={`absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs font-medium ${
                  feedbackMessage.type === "success"
                    ? "bg-secondary text-secondary-foreground"
                    : feedbackMessage.type === "error"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-yellow-500 text-yellow-950"
                }`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {feedbackMessage.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            disabled={selectedLetters.length === 0}
            className="h-11 px-5 rounded-xl border-border/60 text-muted-foreground hover:text-foreground bg-transparent disabled:opacity-30"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitWord}
            disabled={selectedLetters.length === 0}
            className="h-11 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold disabled:opacity-30 shadow-lg shadow-primary/20"
          >
            <Send className="h-4 w-4 mr-2" />
            Submit
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center py-2">
          <div className="flex flex-wrap justify-center gap-2.5 max-w-[280px] sm:max-w-xs">{letterTiles}</div>
        </div>
      </div>

      <footer className="px-4 py-3 text-center border-t border-border/30">
        <p className="text-[10px] text-muted-foreground/50 tracking-wide">
          {!gameStarted ? "TAP A LETTER TO BEGIN" : `${letters.filter((l) => l.visible).length} LETTERS REMAINING`}
        </p>
      </footer>
    </main>
  )
}
