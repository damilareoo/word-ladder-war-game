"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Wifi, WifiOff, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { gameService } from "@/lib/game-service"
import { getSupabaseStatus } from "@/lib/supabase"

export default function Home() {
  const [isHovering, setIsHovering] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState({
    database: false,
    realtime: false,
    testing: false,
  })

  // Test connections on mount
  useEffect(() => {
    const testConnections = async () => {
      setConnectionStatus((prev) => ({ ...prev, testing: true }))

      try {
        // Test database connection
        const dbTest = await gameService.testConnection()

        // Get Supabase status
        const supabaseStatus = getSupabaseStatus()

        // Get service status
        const serviceStatus = gameService.getStatus()

        setConnectionStatus({
          database: dbTest.success && supabaseStatus.isConfigured,
          realtime: serviceStatus.isRealtimeConnected,
          testing: false,
        })
      } catch (error) {
        console.error("Error testing connections:", error)
        setConnectionStatus({
          database: false,
          realtime: false,
          testing: false,
        })
      }
    }

    testConnections()

    // Update status periodically
    const interval = setInterval(testConnections, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-zinc-900 text-cream">
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4 max-w-md"
        >
          <motion.h1
            className="text-4xl font-extrabold tracking-tight text-cream"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-orange-500">W</span>ORD
            <br />
            <span className="text-green-500">L</span>ADDER
            <br />
            <span className="text-orange-500">W</span>AR
          </motion.h1>

          <motion.p
            className="text-base text-zinc-400 max-w-sm mx-auto line-clamp-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Form words from a single word. Climb the ladder. Flex your vocabulary skills.
          </motion.p>

          {/* Connection Status */}
          <motion.div
            className="flex items-center justify-center gap-4 text-xs py-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex items-center gap-1">
              <Database className={`h-3 w-3 ${connectionStatus.database ? "text-green-400" : "text-zinc-500"}`} />
              <span className={connectionStatus.database ? "text-green-400" : "text-zinc-500"}>
                {connectionStatus.testing ? "Testing..." : connectionStatus.database ? "Database" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {connectionStatus.realtime ? (
                <Wifi className="h-3 w-3 text-blue-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-zinc-500" />
              )}
              <span className={connectionStatus.realtime ? "text-blue-400" : "text-zinc-500"}>
                {connectionStatus.realtime ? "Live" : "Static"}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col gap-4 mt-4"
          >
            <Link href="/nickname" className="w-full">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setIsHovering(true)}
                onHoverEnd={() => setIsHovering(false)}
              >
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-base font-bold hover:from-orange-600 hover:to-orange-700 rounded-xl h-12 shadow-lg shadow-orange-500/20"
                  size="lg"
                >
                  Start Playing
                  <motion.div animate={{ x: isHovering ? 5 : 0 }} transition={{ duration: 0.2 }}>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>

            <Link href="/leaderboard" className="w-full">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  className="w-full border-green-500 text-green-500 hover:bg-green-500/10 rounded-xl h-10 text-sm"
                >
                  Global Leaderboard
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </main>
  )
}
