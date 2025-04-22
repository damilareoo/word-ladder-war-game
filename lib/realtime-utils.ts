import { getSupabaseBrowserClient } from "@/lib/supabase"

// Singleton for the broadcast channel
let broadcastChannel: ReturnType<typeof getSupabaseBrowserClient>["channel"] | null = null

// Function to get or create the broadcast channel
export function getLeaderboardBroadcastChannel() {
  if (!broadcastChannel) {
    const supabase = getSupabaseBrowserClient()
    broadcastChannel = supabase.channel("leaderboard_refresh")
  }
  return broadcastChannel
}

// Function to send a refresh signal
export async function sendLeaderboardRefreshSignal(data: {
  score: number
  nickname: string
  wordCount: number
  level: number
}) {
  try {
    const channel = getLeaderboardBroadcastChannel()

    await channel.send({
      type: "broadcast",
      event: "refresh",
      payload: {
        timestamp: Date.now(),
        ...data,
      },
    })

    console.log("Sent leaderboard refresh signal:", data)
    return true
  } catch (error) {
    console.error("Error sending leaderboard refresh signal:", error)
    return false
  }
}

// Function to subscribe to refresh signals
export function subscribeToLeaderboardRefreshes(callback: (payload: any) => void) {
  const channel = getLeaderboardBroadcastChannel()

  channel.on("broadcast", { event: "refresh" }, (payload) => {
    console.log("Received leaderboard refresh signal:", payload)
    callback(payload)
  })

  return channel.subscribe()
}

// Function to unsubscribe from the channel
export function unsubscribeFromLeaderboard() {
  if (broadcastChannel) {
    const supabase = getSupabaseBrowserClient()
    supabase.removeChannel(broadcastChannel)
    broadcastChannel = null
  }
}
