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
    const supabase = getSupabaseBrowserClient()
    leaderboardChannel = supabase.channel("leaderboard_updates")
  }
  return leaderboardChannel
}

/**
 * Ensure the channel is subscribed (only once)
 */
export async function ensureChannelSubscribed() {
  if (typeof window === "undefined") return false

  if (!isSubscribed) {
    const channel = getLeaderboardChannel()
    if (channel && channel.state !== "joined") {
      await channel.subscribe()
      isSubscribed = true
    } else if (channel) {
      isSubscribed = true
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
}) {
  if (typeof window === "undefined") return false

  try {
    // First ensure the channel is subscribed
    await ensureChannelSubscribed()

    // Then send the message
    const channel = getLeaderboardChannel()
    if (!channel) return false

    await channel.send({
      type: "broadcast",
      event: "refresh",
      payload: {
        timestamp: Date.now(),
      },
    })

    // Set the refresh flag in localStorage as a fallback
    localStorage.setItem("wlw-refresh-leaderboard", "true")

    return true
  } catch (error) {
    console.error("Error sending leaderboard refresh:", error)
    return false
  }
}

/**
 * Clean up channel when no longer needed
 */
export function cleanupLeaderboardChannel() {
  if (typeof window === "undefined") return

  if (leaderboardChannel) {
    const supabase = getSupabaseBrowserClient()
    supabase.removeChannel(leaderboardChannel)
    leaderboardChannel = null
    isSubscribed = false
  }
}
