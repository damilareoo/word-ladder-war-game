// Calculate score based on valid words
export function calculateScore(words: string[]): number {
  if (!words || words.length === 0) {
    return 0
  }

  return words.reduce((total, word) => {
    let pointsForWord = 0

    if (word.length === 3) {
      pointsForWord = 3
    } else if (word.length === 4) {
      pointsForWord = 5
    } else if (word.length === 5) {
      pointsForWord = 8
    } else {
      pointsForWord = word.length * 10
    }

    return total + pointsForWord
  }, 0)
}

export function calculateLevel(wordCount: number): number {
  const count = typeof wordCount === "number" ? wordCount : Number.parseInt(String(wordCount), 10)

  if (count <= 10) {
    return 1
  } else if (count <= 20) {
    return 2
  } else {
    return 3
  }
}

export function getLevelInfo(level: number): { title: string; description: string } {
  const levels = [
    {
      title: "Word Novice",
      description: "You're just getting started on your word journey.",
    },
    {
      title: "Word Expert",
      description: "Your vocabulary skills are impressive.",
    },
    {
      title: "Word Guru",
      description: "You've mastered the art of wordplay!",
    },
  ]

  const adjustedLevel = Math.min(Math.max(level, 1), 3) - 1
  return levels[adjustedLevel]
}
