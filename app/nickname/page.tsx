"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { getSupabaseBrowserClient } from "@/lib/supabase"

export default function NicknamePage() {
  const [nickname, setNickname] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!nickname.trim()) {
      setError("Please enter a nickname")
      setIsLoading(false)
      return
    }

    if (nickname.length > 15) {
      setError("Nickname must be 15 characters or less")
      setIsLoading(false)
      return
    }

    try {
      // Check if player exists
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("id")
        .eq("nickname", nickname)
        .maybeSingle()

      let playerId = existingPlayer?.id

      // If player doesn't exist, create a new one
      if (!playerId) {
        const { data: newPlayer, error } = await supabase.from("players").insert({ nickname }).select("id").single()

        if (error) throw error
        playerId = newPlayer.id
      }

      // Store nickname and player ID in localStorage
      localStorage.setItem("wlw-nickname", nickname)
      localStorage.setItem("wlw-player-id", playerId)

      // Navigate to game
      router.push("/game")
    } catch (error) {
      console.error("Error saving player:", error)
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-zinc-900 text-cream">
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <motion.div
          className="w-full max-w-md space-y-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-3xl font-bold tracking-tight text-cream">What's your nickname?</h1>
            <p className="text-zinc-400">This will appear on the leaderboard when you crush it</p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setError("")
                }}
                className="h-12 bg-zinc-800 text-lg rounded-xl"
                maxLength={15}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-lg font-bold hover:from-orange-600 hover:to-orange-700 rounded-xl h-14 shadow-lg shadow-orange-500/20"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Let's Play"}
                {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </div>

      <Footer />
    </main>
  )
}
