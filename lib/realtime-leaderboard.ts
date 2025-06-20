import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface GameScore {
  id: string
  nickname: string
  score: number
  word_count: number
  time_taken: number
  main_word: string
  level: number
  created_at: string
}

export interface LeaderboardUpdate {
  type: "new_score" | "bulk_update" | "connection_status"
  data?: GameScore | GameScore[]
  timestamp: number
  source: "realtime" | "manual" | "system"
}

export interface LeaderboardState {
  byScore: GameScore[]
  byWords: GameScore[]
  lastUpdate: number
  isConnected: boolean
  isLoading: boolean
  error: string | null
}

// Real-time leaderboard manager class with improved error handling
class RealtimeLeaderboardManager {
  private channel: RealtimeChannel | null = null
  private subscribers: Set<(update: LeaderboardUpdate) => void> = new Set()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 2000
  private isConnected = false
  private isConnecting = false
  private connectionTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private channelName = `leaderboard_${Math.random().toString(36).substr(2, 9)}`

  constructor() {
    if (typeof window !== "undefined") {
      // Handle page visibility changes
      document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this))

      // Handle online/offline events
      window.addEventListener("online", this.handleOnline.bind(this))
      window.addEventListener("offline", this.handleOffline.bind(this))
    }
  }

  // Initialize real-time connection with better error handling
  async initialize(): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn("⚠️ Supabase not configured, real-time updates disabled")
      return false
    }

    if (this.isConnecting) {
      console.log("🔄 Already connecting, waiting...")
      return false
    }

    try {
      console.log("🚀 Initializing real-time leaderboard...")
      const success = await this.connect()
      return success
    } catch (error) {
      console.error("❌ Failed to initialize real-time leaderboard:", error)
      this.handleConnectionError(error as Error)
      return false
    }
  }

  // Connect to real-time channel with simplified configuration
  private async connect(): Promise<boolean> {
    if (this.isConnecting) {
      return false
    }

    this.isConnecting = true

    try {
      // Clean up existing connection
      await this.disconnect()

      const supabase = getSupabaseBrowserClient()

      // Create channel with simplified configuration
      this.channel = supabase.channel(this.channelName, {
        config: {
          broadcast: { self: true },
          presence: { key: "user_id" },
        },
      })

      console.log(`📡 Creating channel: ${this.channelName}`)

      // Set up event listeners with better error handling
      this.channel
        .on("broadcast", { event: "score_update" }, (payload) => {
          try {
            this.handleScoreUpdate(payload)
          } catch (error) {
            console.error("Error handling score update:", error)
          }
        })
        .on("broadcast", { event: "bulk_update" }, (payload) => {
          try {
            this.handleBulkUpdate(payload)
          } catch (error) {
            console.error("Error handling bulk update:", error)
          }
        })
        .on("presence", { event: "sync" }, () => {
          try {
            this.handlePresenceSync()
          } catch (error) {
            console.error("Error handling presence sync:", error)
          }
        })

      // Subscribe with improved error handling
      const subscribeResult = await new Promise<boolean>((resolve) => {
        let resolved = false

        // Set timeout for subscription
        this.connectionTimeout = setTimeout(() => {
          if (!resolved) {
            resolved = true
            console.warn("⏰ Real-time subscription timeout")
            resolve(false)
          }
        }, 8000)

        this.channel!.subscribe((status, err) => {
          if (resolved) return

          console.log(`📡 Channel status: ${status}`)

          if (status === "SUBSCRIBED") {
            resolved = true
            if (this.connectionTimeout) {
              clearTimeout(this.connectionTimeout)
              this.connectionTimeout = null
            }
            this.isConnected = true
            this.isConnecting = false
            this.reconnectAttempts = 0
            this.startHeartbeat()
            this.notifySubscribers({
              type: "connection_status",
              timestamp: Date.now(),
              source: "system",
            })
            console.log("✅ Real-time connection established")
            resolve(true)
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            if (!resolved) {
              resolved = true
              if (this.connectionTimeout) {
                clearTimeout(this.connectionTimeout)
                this.connectionTimeout = null
              }
              this.isConnected = false
              this.isConnecting = false
              console.error(`❌ Channel error: ${status}`, err)
              this.handleConnectionError(err || new Error(`Channel ${status}`))
              resolve(false)
            }
          }
        })
      })

      return subscribeResult
    } catch (error) {
      this.isConnecting = false
      console.error("❌ Error in connect method:", error)
      this.handleConnectionError(error as Error)
      return false
    }
  }

  // Disconnect from real-time channel
  private async disconnect(): Promise<void> {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout)
      this.connectionTimeout = null
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    if (this.channel) {
      try {
        const supabase = getSupabaseBrowserClient()
        await supabase.removeChannel(this.channel)
        console.log("🔌 Channel disconnected")
      } catch (error) {
        console.error("Error disconnecting channel:", error)
      }
      this.channel = null
    }

    this.isConnected = false
    this.isConnecting = false
  }

  // Handle score updates with validation
  private handleScoreUpdate(payload: any): void {
    try {
      console.log("📊 Received score update:", payload)

      const scoreData = payload?.payload?.score_data
      if (scoreData && this.isValidGameScore(scoreData)) {
        this.notifySubscribers({
          type: "new_score",
          data: scoreData,
          timestamp: Date.now(),
          source: "realtime",
        })
      } else {
        console.warn("⚠️ Invalid score data received:", payload)
      }
    } catch (error) {
      console.error("Error handling score update:", error)
    }
  }

  // Handle bulk updates
  private handleBulkUpdate(payload: any): void {
    try {
      console.log("📋 Received bulk update:", payload)

      const scores = payload?.payload?.scores
      if (Array.isArray(scores) && scores.every(this.isValidGameScore)) {
        this.notifySubscribers({
          type: "bulk_update",
          data: scores,
          timestamp: Date.now(),
          source: "realtime",
        })
      } else {
        console.warn("⚠️ Invalid bulk update data:", payload)
      }
    } catch (error) {
      console.error("Error handling bulk update:", error)
    }
  }

  // Handle presence sync
  private handlePresenceSync(): void {
    if (this.channel) {
      try {
        const presence = this.channel.presenceState()
        const activeUsers = Object.keys(presence).length
        console.log(`👥 Active players: ${activeUsers}`)
      } catch (error) {
        console.error("Error handling presence sync:", error)
      }
    }
  }

  // Handle connection errors with improved logic
  private handleConnectionError(error?: Error): void {
    const errorMessage = error?.message || "Unknown connection error"
    console.error("🔌 Real-time connection error:", errorMessage)

    this.isConnected = false
    this.isConnecting = false

    // Only attempt reconnection if we haven't exceeded max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)

      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

      setTimeout(() => {
        if (!this.isConnected && !this.isConnecting) {
          this.connect().catch((err) => {
            console.error("Reconnection failed:", err)
          })
        }
      }, delay)
    } else {
      console.error("❌ Max reconnection attempts reached, giving up")
      this.notifySubscribers({
        type: "connection_status",
        timestamp: Date.now(),
        source: "system",
      })
    }
  }

  // Start heartbeat to maintain connection
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.channel && this.isConnected) {
        this.channel
          .send({
            type: "broadcast",
            event: "heartbeat",
            payload: { timestamp: Date.now() },
          })
          .catch((error) => {
            console.warn("💓 Heartbeat failed:", error)
            // Don't immediately trigger reconnection on heartbeat failure
            // The subscription status will handle disconnection
          })
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  // Handle page visibility changes
  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible" && !this.isConnected && !this.isConnecting) {
      console.log("👁️ Page visible, attempting reconnection...")
      // Reset reconnect attempts when page becomes visible
      this.reconnectAttempts = 0
      this.connect().catch(console.error)
    }
  }

  // Handle online event
  private handleOnline(): void {
    console.log("🌐 Back online, attempting reconnection...")
    if (!this.isConnected && !this.isConnecting) {
      // Reset reconnect attempts when coming back online
      this.reconnectAttempts = 0
      this.connect().catch(console.error)
    }
  }

  // Handle offline event
  private handleOffline(): void {
    console.log("📴 Gone offline")
    this.isConnected = false
  }

  // Validate game score data
  private isValidGameScore(score: any): score is GameScore {
    return (
      score &&
      typeof score.id === "string" &&
      typeof score.nickname === "string" &&
      typeof score.score === "number" &&
      typeof score.word_count === "number" &&
      typeof score.level === "number" &&
      typeof score.created_at === "string" &&
      score.nickname.length > 0 &&
      score.score >= 0 &&
      score.word_count >= 0 &&
      score.level >= 1
    )
  }

  // Subscribe to updates
  subscribe(callback: (update: LeaderboardUpdate) => void): () => void {
    this.subscribers.add(callback)

    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Notify all subscribers
  private notifySubscribers(update: LeaderboardUpdate): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(update)
      } catch (error) {
        console.error("Error in subscriber callback:", error)
      }
    })
  }

  // Broadcast new score with better error handling
  async broadcastScore(score: GameScore): Promise<boolean> {
    if (!this.channel || !this.isConnected) {
      console.warn("⚠️ Cannot broadcast score: not connected")
      return false
    }

    try {
      console.log("📡 Broadcasting score:", score)

      const result = await this.channel.send({
        type: "broadcast",
        event: "score_update",
        payload: { score_data: score },
      })

      const success = result === "ok"
      if (success) {
        console.log("✅ Score broadcasted successfully")
      } else {
        console.warn("⚠️ Score broadcast failed:", result)
      }

      return success
    } catch (error) {
      console.error("❌ Error broadcasting score:", error)
      return false
    }
  }

  // Get connection status
  getConnectionStatus(): { isConnected: boolean; reconnectAttempts: number; isConnecting: boolean } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      isConnecting: this.isConnecting,
    }
  }

  // Force reconnection
  async forceReconnect(): Promise<boolean> {
    console.log("🔄 Forcing reconnection...")
    this.reconnectAttempts = 0
    await this.disconnect()
    return this.connect()
  }

  // Cleanup
  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up real-time connection...")
    this.subscribers.clear()
    await this.disconnect()

    if (typeof window !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this))
      window.removeEventListener("online", this.handleOnline.bind(this))
      window.removeEventListener("offline", this.handleOffline.bind(this))
    }
  }
}

// Singleton instance
export const realtimeLeaderboard = new RealtimeLeaderboardManager()

// Utility functions
export const initializeRealtime = () => realtimeLeaderboard.initialize()
export const subscribeToUpdates = (callback: (update: LeaderboardUpdate) => void) =>
  realtimeLeaderboard.subscribe(callback)
export const broadcastScore = (score: GameScore) => realtimeLeaderboard.broadcastScore(score)
export const getConnectionStatus = () => realtimeLeaderboard.getConnectionStatus()
export const forceReconnect = () => realtimeLeaderboard.forceReconnect()
export const cleanupRealtime = () => realtimeLeaderboard.cleanup()
