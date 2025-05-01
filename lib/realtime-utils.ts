import { getSupabaseBrowserClient } from "@/lib/supabase"

// Singleton pattern for channel to avoid multiple subscriptions
let leaderboardChannel: ReturnType<typeof getSupabaseBrowserClient>["channel"] | null = null
let isSubscribed = false

/**
 * Get a singleton channel for leaderboard updates
 */
export function getLeaderboardChannel() {
  if (typeof window === "undefined") return null

  if (!leaderboardChannel) {
    try {
      const supabase = getSupabaseBrowserClient()
      leaderboardChannel = supabase.channel("leaderboard_updates")
    } catch (error) {
      console.error("Error creating leaderboard channel:", error)
      return null
    }
  }
  return leaderboardChannel
}

/**
 * Ensure the channel is subscribed (only once)
 */
export async function ensureChannelSubscribed() {
  if (typeof window === "undefined") return false

  if (!isSubscribed) {
    try {
      const channel = getLeaderboardChannel()
      if (channel && channel.state !== "joined") {
        await channel.subscribe((status) => {
          console.log(`Leaderboard channel status: ${status}`)
        })
        isSubscribed = true
      } else if (channel) {
        isSubscribed = true
      }
    } catch (error) {
      console.error("Error subscribing to channel:", error)
      return false
    }
  }
  return isSubscribed
}

/**
 * Send a refresh signal to the leaderboard
 */
export async function refreshLeaderboard(data: {
  score: number
  nickname: string
  wordCount: number
  level: number
  immediate?: boolean
}) {
  if (typeof window === "undefined") return false

  try {
    // First ensure the channel is subscribed
    await ensureChannelSubscribed()

    // Then send the message
    const channel = getLeaderboardChannel()
    if (!channel) {
      // Fallback to localStorage if channel is not available
      localStorage.setItem("wlw-refresh-leaderboard", "true")

      if (data.immediate) {
        localStorage.setItem(
          "wlw-latest-game",
          JSON.stringify({
            score: data.score,
            nickname: data.nickname,
            wordCount: data.wordCount,
            level: data.level,
            timestamp: Date.now(),
          }),
        )
      }

      return false
    }

    // Send the message with the game data for immediate updates
    await channel.send({
      type: "broadcast",
      event: "refresh",
      payload: {
        timestamp: Date.now(),
        data: data.immediate
          ? {
              score: data.score,
              nickname: data.nickname,
              wordCount: data.wordCount,
              level: data.level,
            }
          : undefined,
      },
    })

    // Set the refresh flag in localStorage as a fallback
    localStorage.setItem("wlw-refresh-leaderboard", "true")

    // Also store the latest game data for immediate updates
    if (data.immediate) {
      localStorage.setItem(
        "wlw-latest-game",
        JSON.stringify({
          score: data.score,
          nickname: data.nickname,
          wordCount: data.wordCount,
          level: data.level,
          timestamp: Date.now(),
        }),
      )
    }

    return true
  } catch (error) {
    console.error("Error sending leaderboard refresh:", error)

    // Fallback to localStorage
    localStorage.setItem("wlw-refresh-leaderboard", "true")

    if (data.immediate) {
      localStorage.setItem(
        "wlw-latest-game",
        JSON.stringify({
          score: data.score,
          nickname: data.nickname,
          wordCount: data.wordCount,
          level: data.level,
          timestamp: Date.now(),
        }),
      )
    }

    return false
  }
}

/**
 * Clean up channel when no longer needed
 */
export function cleanupLeaderboardChannel() {
  if (typeof window === "undefined") return

  if (leaderboardChannel) {
    try {
      const supabase = getSupabaseBrowserClient()
      supabase.removeChannel(leaderboardChannel)
      leaderboardChannel = null
      isSubscribed = false
    } catch (error) {
      console.error("Error cleaning up leaderboard channel:", error)
    }
  }
}
