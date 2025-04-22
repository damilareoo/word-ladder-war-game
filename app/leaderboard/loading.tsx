export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 text-cream">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-orange-500"></div>
        <p>Loading leaderboard...</p>
      </div>
    </div>
  )
}
