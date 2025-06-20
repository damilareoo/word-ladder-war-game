"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Trophy,
  ArrowLeft,
  Medal,
  User,
  Star,
  RefreshCw,
  AlertTriangle,
  Zap,
  Wifi,
  WifiOff,
  Clock,
  Database,
  RotateCcw,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { motion, AnimatePresence } from "framer-motion"
import { getLevelInfo } from "@/lib/game-utils"
import { gameService, type LeaderboardData } from "@/lib/game-service"
import { subscribeToUpdates, type LeaderboardUpdate, getConnectionStatus } from "@/lib/realtime-leaderboard"
import { getSupabaseStatus } from "@/lib/supabase"

interface ConnectionStatus {
  isConfigured: boolean
  isRealtimeConnected: boolean
  isRealtimeConnecting: boolean
  lastUpdate: number
  error?: string
}

export default function LeaderboardPage() {
  const router = useRouter()
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    byScore: [],
    byWords: [],
    lastUpdate: 0,
    isSampleData: true,
  })
  const [activeFilter, setActiveFilter] = useState<"score" | "words">("score")
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConfigured: false,
    isRealtimeConnected: false,
    isRealtimeConnecting: false,
    lastUpdate: 0,
  })
  const [recentUpdates, setRecentUpdates] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showConnectionDetails, setShowConnectionDetails] = useState(false)

  // Refs for managing subscriptions and updates
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch leaderboard data with better error handling
  const fetchLeaderboard = useCallback(async (forceRefresh = false) => {
    setIsRefreshing(true)

    try {
      console.log(`📋 Fetching leaderboard (force: ${forceRefresh})...`)
      const data = await gameService.getLeaderboard(forceRefresh)
      setLeaderboardData(data)

      setConnectionStatus((prev) => ({
        ...prev,
        lastUpdate: Date.now(),
        error: data.error,
      }))

      if (forceRefresh) {
        console.log("🔄 Leaderboard force refreshed")
      }
    } catch (error) {
      console.error("❌ Error fetching leaderboard:", error)
      setConnectionStatus((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Handle real-time updates with better error handling
  const handleRealtimeUpdate = useCallback(
    (update: LeaderboardUpdate) => {
      console.log("📡 Received real-time update:", update)

      try {
        switch (update.type) {
          case "new_score":
            if (update.data && !Array.isArray(update.data)) {
              const newScore = update.data

              // Add to recent updates
              setRecentUpdates((prev) => {
                const message = `${newScore.nickname} scored ${newScore.score} points!`
                const newUpdates = [message, ...prev].slice(0, 3) // Keep only last 3
                return newUpdates
              })

              // Update leaderboard data
              setLeaderboardData((prev) => {
                const updatedByScore = [newScore, ...prev.byScore].sort((a, b) => b.score - a.score).slice(0, 50)

                const updatedByWords = [newScore, ...prev.byWords]
                  .sort((a, b) => b.word_count - a.word_count)
                  .slice(0, 50)

                return {
                  ...prev,
                  byScore: updatedByScore,
                  byWords: updatedByWords,
                  lastUpdate: Date.now(),
                }
              })

              // Clear the update message after 5 seconds
              setTimeout(() => {
                setRecentUpdates((prev) => prev.slice(1))
              }, 5000)
            }
            break

          case "bulk_update":
            if (update.data && Array.isArray(update.data)) {
              // Refresh the entire leaderboard
              fetchLeaderboard(true)
            }
            break

          case "connection_status":
            setConnectionStatus((prev) => ({
              ...prev,
              isRealtimeConnected: true,
              lastUpdate: Date.now(),
            }))
            break
        }
      } catch (error) {
        console.error("❌ Error handling real-time update:", error)
      }
    },
    [fetchLeaderboard],
  )

  // Update connection status periodically
  const updateConnectionStatus = useCallback(() => {
    try {
      const supabaseStatus = getSupabaseStatus()
      const serviceStatus = gameService.getStatus()
      const realtimeStatus = getConnectionStatus()

      setConnectionStatus((prev) => ({
        ...prev,
        isConfigured: supabaseStatus.isConfigured,
        isRealtimeConnected: realtimeStatus.isConnected,
        isRealtimeConnecting: realtimeStatus.isConnecting,
      }))
    } catch (error) {
      console.error("Error updating connection status:", error)
    }
  }, [])

  // Initialize component
  useEffect(() => {
    console.log("🚀 Initializing leaderboard page...")

    // Initial data fetch
    fetchLeaderboard()

    // Set up real-time subscription
    try {
      unsubscribeRef.current = subscribeToUpdates(handleRealtimeUpdate)
      console.log("📡 Real-time subscription established")
    } catch (error) {
      console.error("❌ Error setting up real-time subscription:", error)
    }

    // Update connection status periodically
    const statusInterval = setInterval(updateConnectionStatus, 5000)
    updateConnectionStatus() // Initial call

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up leaderboard page...")

      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current()
        } catch (error) {
          console.error("Error unsubscribing:", error)
        }
      }

      clearInterval(statusInterval)

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [fetchLeaderboard, handleRealtimeUpdate, updateConnectionStatus])

  // Handle manual refresh
  const handleRefresh = useCallback(() => {
    console.log("🔄 Manual refresh triggered")
    fetchLeaderboard(true)
  }, [fetchLeaderboard])

  // Handle force reconnect
  const handleForceReconnect = useCallback(async () => {
    console.log("🔄 Force reconnect triggered")
    setIsRefreshing(true)

    try {
      const success = await gameService.forceReconnect()
      if (success) {
        console.log("✅ Force reconnect successful")
        // Refresh data after successful reconnection
        await fetchLeaderboard(true)
      } else {
        console.warn("⚠️ Force reconnect failed")
      }
    } catch (error) {
      console.error("❌ Error during force reconnect:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchLeaderboard])

  // Get current data based on active filter
  const currentData = activeFilter === "score" ? leaderboardData.byScore : leaderboardData.byWords

  // Format last update time
  const formatLastUpdate = (timestamp: number) => {
    if (!timestamp) return "Never"
    const diff = Date.now() - timestamp
    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return `${Math.floor(diff / 3600000)}h ago`
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-cream">
      {/* Enhanced Header with Connection Status */}
      <div className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-700/50">
        {/* Connection Status Bar */}
        <div className="px-4 py-2 border-b border-zinc-800/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {/* Database Status */}
              <div className="flex items-center gap-1">
                <Database className={`h-3 w-3 ${connectionStatus.isConfigured ? "text-green-400" : "text-red-400"}`} />
                <span className={connectionStatus.isConfigured ? "text-green-400" : "text-red-400"}>
                  {connectionStatus.isConfigured ? "Connected" : "Offline"}
                </span>
              </div>

              {/* Real-time Status */}
              <div className="flex items-center gap-1">
                {connectionStatus.isRealtimeConnecting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <RefreshCw className="h-3 w-3 text-yellow-400" />
                  </motion.div>
                ) : connectionStatus.isRealtimeConnected ? (
                  <Wifi className="h-3 w-3 text-blue-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-zinc-500" />
                )}
                <span
                  className={
                    connectionStatus.isRealtimeConnecting
                      ? "text-yellow-400"
                      : connectionStatus.isRealtimeConnected
                        ? "text-blue-400"
                        : "text-zinc-500"
                  }
                >
                  {connectionStatus.isRealtimeConnecting
                    ? "Connecting..."
                    : connectionStatus.isRealtimeConnected
                      ? "Live"
                      : "Static"}
                </span>
              </div>

              {/* Sample Data Indicator */}
              {leaderboardData.isSampleData && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-400" />
                  <span className="text-yellow-400">Sample Data</span>
                </div>
              )}

              {/* Connection Details Toggle */}
              <button
                onClick={() => setShowConnectionDetails(!showConnectionDetails)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Details
              </button>
            </div>

            {/* Last Update */}
            <div className="flex items-center gap-1 text-zinc-400">
              <Clock className="h-3 w-3" />
              <span>Updated {formatLastUpdate(connectionStatus.lastUpdate)}</span>
            </div>
          </div>

          {/* Connection Details */}
          <AnimatePresence>
            {showConnectionDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2 bg-zinc-800/50 rounded text-xs space-y-1"
              >
                <div>Database: {connectionStatus.isConfigured ? "✅ Ready" : "❌ Not configured"}</div>
                <div>
                  Real-time:{" "}
                  {connectionStatus.isRealtimeConnecting
                    ? "🔄 Connecting..."
                    : connectionStatus.isRealtimeConnected
                      ? "✅ Connected"
                      : "❌ Disconnected"}
                </div>
                {connectionStatus.error && <div className="text-red-400">Error: {connectionStatus.error}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Main Header */}
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="text-zinc-400 hover:text-cream hover:bg-zinc-800/50 h-10 w-10 rounded-full transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-bold">Global Leaderboard</h1>

          <div className="flex items-center gap-2">
            {/* Force Reconnect Button */}
            {!connectionStatus.isRealtimeConnected && connectionStatus.isConfigured && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleForceReconnect}
                className="text-yellow-400 hover:text-yellow-300 hover:bg-zinc-800/50 h-10 w-10 rounded-full transition-all duration-200"
                disabled={isRefreshing || connectionStatus.isRealtimeConnecting}
                title="Force reconnect real-time"
              >
                <RotateCcw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            )}

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="text-zinc-400 hover:text-cream hover:bg-zinc-800/50 h-10 w-10 rounded-full transition-all duration-200"
              disabled={isRefreshing}
              title="Refresh leaderboard"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Updates Notifications */}
      <div className="px-4 py-2">
        <AnimatePresence>
          {recentUpdates.map((update, index) => (
            <motion.div
              key={`${update}-${index}`}
              className="bg-green-500/20 text-green-400 text-center py-2 px-4 rounded-full text-sm flex items-center justify-center gap-2 mb-2"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Zap className="h-4 w-4" />
              <span>{update}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Error Message */}
        {connectionStatus.error && (
          <div className="bg-red-500/20 text-red-400 text-center py-2 px-4 rounded-full text-sm mb-2 flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{connectionStatus.error}</span>
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      <div className="mx-auto w-full max-w-md p-4 flex-1">
        <div className="mb-6 flex justify-center gap-3">
          <Button
            variant={activeFilter === "score" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("score")}
            className={`text-sm h-10 px-4 transition-all duration-200 ${
              activeFilter === "score"
                ? "bg-orange-500 hover:bg-orange-600 shadow-lg"
                : "border-zinc-700 hover:bg-zinc-800/50"
            }`}
          >
            <Trophy className="mr-2 h-4 w-4" />
            Score ({leaderboardData.byScore.length})
          </Button>
          <Button
            variant={activeFilter === "words" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveFilter("words")}
            className={`text-sm h-10 px-4 transition-all duration-200 ${
              activeFilter === "words"
                ? "bg-green-500 hover:bg-green-600 shadow-lg"
                : "border-zinc-700 hover:bg-zinc-800/50"
            }`}
          >
            <Star className="mr-2 h-4 w-4" />
            Words ({leaderboardData.byWords.length})
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              className="h-8 w-8 rounded-full border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </div>
        ) : currentData.length === 0 ? (
          <motion.div
            className="rounded-2xl bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 p-8 text-center border border-zinc-700/30"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Trophy className="mx-auto mb-4 h-16 w-16 text-zinc-600" />
            <h2 className="text-xl font-bold mb-2">No scores yet</h2>
            <p className="text-zinc-400 text-base mb-4">Be the first to set a score on the leaderboard!</p>
            <Button
              onClick={() => router.push("/game")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-xl text-base h-12 px-8 shadow-lg"
            >
              Play Now
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {currentData.map((item, index) => {
                const levelInfo = getLevelInfo(item.level)

                return (
                  <motion.div
                    key={`${activeFilter}-${item.id}`}
                    className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-zinc-800/50 via-zinc-700/30 to-zinc-800/50 p-4 shadow-lg border border-zinc-600/30 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{
                      duration: 0.3,
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    layout
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    {/* Rank */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700/80 text-sm font-bold flex-shrink-0 border border-zinc-600/50">
                      {index === 0 ? (
                        <Medal className="h-5 w-5 text-yellow-400" />
                      ) : index === 1 ? (
                        <Medal className="h-5 w-5 text-zinc-300" />
                      ) : index === 2 ? (
                        <Medal className="h-5 w-5 text-orange-400" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                        <p className="font-semibold text-base truncate">{item.nickname}</p>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-zinc-400">
                        <span>{item.word_count} words</span>
                        <span>•</span>
                        <span>
                          {Math.floor(item.time_taken / 60)}:{(item.time_taken % 60).toString().padStart(2, "0")}
                        </span>
                        <span>•</span>
                        <span className={levelInfo.color}>{levelInfo.title}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-orange-400">{item.score.toLocaleString()}</p>
                      <p className="text-sm text-zinc-500">Level {item.level}</p>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
