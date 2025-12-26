"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeft, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"
import { createOrGetPlayer, setCurrentPlayer, getCurrentPlayer } from "@/lib/storage"

export default function NicknamePage() {
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const player = getCurrentPlayer()
    if (player) {
      setNickname(player.nickname)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const trimmedNickname = nickname.trim()

    if (!trimmedNickname) {
      setError("Please enter a nickname")
      setIsLoading(false)
      return
    }

    if (trimmedNickname.length < 2) {
      setError("Nickname must be at least 2 characters")
      setIsLoading(false)
      return
    }

    if (trimmedNickname.length > 12) {
      setError("Nickname must be 12 characters or less")
      setIsLoading(false)
      return
    }

    try {
      const player = createOrGetPlayer(trimmedNickname)
      setCurrentPlayer(trimmedNickname, player.id)
      router.push("/game")
    } catch (error) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="flex items-center px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="text-muted-foreground hover:text-foreground h-10 w-10 rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <motion.div
          className="w-full max-w-sm space-y-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="space-y-2 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Choose a nickname</h1>
            <p className="text-sm text-muted-foreground">This will appear on the leaderboard</p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Your nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setError("")
                }}
                className="h-14 bg-card border-border text-foreground placeholder:text-muted-foreground/50 text-lg text-center rounded-2xl focus-visible:ring-primary font-medium"
                maxLength={12}
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <div className="flex justify-between px-1">
                <span className={`text-xs ${error ? "text-destructive" : "text-transparent"}`}>
                  {error || "placeholder"}
                </span>
                <span className="text-xs text-muted-foreground/50">{nickname.length}/12</span>
              </div>
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 rounded-2xl h-14 text-base shadow-xl shadow-primary/25"
                size="lg"
                disabled={isLoading || nickname.trim().length < 2}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Loading...
                  </span>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>
    </main>
  )
}
