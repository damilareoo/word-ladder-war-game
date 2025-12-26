"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Trophy, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { getCurrentPlayer } from "@/lib/storage"

export default function Home() {
  const [isHovering, setIsHovering] = useState(false)
  const [hasExistingPlayer, setHasExistingPlayer] = useState(false)

  useEffect(() => {
    const player = getCurrentPlayer()
    setHasExistingPlayer(!!player)
  }, [])

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-sm space-y-10"
        >
          <div className="text-center space-y-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-none">
                <span className="text-primary">WORD</span>
                <br />
                <span className="text-secondary">LADDER</span>
                <br />
                <span className="text-foreground">WAR</span>
              </h1>
            </motion.div>

            <motion.p
              className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              Form as many words as you can from a single word. Beat the clock. Climb the ranks.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="flex flex-col gap-3"
          >
            <Link href={hasExistingPlayer ? "/game" : "/nickname"} className="w-full">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setIsHovering(true)}
                onHoverEnd={() => setIsHovering(false)}
              >
                <Button
                  className="w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 rounded-2xl h-14 text-base shadow-xl shadow-primary/25"
                  size="lg"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {hasExistingPlayer ? "Play Now" : "Start Playing"}
                  <motion.div animate={{ x: isHovering ? 4 : 0 }} transition={{ duration: 0.15 }} className="ml-2">
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>

            <Link href="/leaderboard" className="w-full">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  className="w-full border-border text-muted-foreground hover:text-foreground hover:bg-card rounded-2xl h-12 text-sm font-medium bg-transparent"
                >
                  <Trophy className="mr-2 h-4 w-4 text-secondary" />
                  Leaderboard
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div
            className="flex justify-center gap-8 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">2:00</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time Limit</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">3+</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Min Letters</p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <footer className="py-4 text-center">
        <p className="text-[10px] text-muted-foreground/40 tracking-wider">WORD LADDER WAR</p>
      </footer>
    </main>
  )
}
