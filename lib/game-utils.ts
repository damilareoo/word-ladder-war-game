// Calculate score based on valid words
export function calculateScore(words: string[]): number {
  console.log("Calculating score for words:", words)

  if (!words || words.length === 0) {
    console.log("No words to calculate score for, returning 0")
    return 0
  }

  const score = words.reduce((total, word) => {
    let pointsForWord = 0

    // Score is based on word length
    // 3 letters = 3 points
    // 4 letters = 5 points
    // 5 letters = 8 points
    // 6+ letters = 10 points per letter
    if (word.length === 3) {
      pointsForWord = 3
    } else if (word.length === 4) {
      pointsForWord = 5
    } else if (word.length === 5) {
      pointsForWord = 8
    } else {
      pointsForWord = word.length * 10
    }

    console.log(`Word: ${word}, Length: ${word.length}, Points: ${pointsForWord}`)
    return total + pointsForWord
  }, 0)

  console.log("Total score calculated:", score)
  return score
}

// Calculate level based on word count
export function calculateLevel(wordCount: number): number {
  console.log("Calculating level for word count:", wordCount)
  let level = 1

  // Updated thresholds as requested
  if (wordCount <= 20) {
    level = 1
  } else if (wordCount <= 30) {
    level = 2
  } else {
    level = 3
  }

  console.log("Level calculated:", level)
  return level
}

// Get level info
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

  // Adjust for zero-indexing and ensure valid level
  const adjustedLevel = Math.min(Math.max(level, 1), 3) - 1
  return levels[adjustedLevel]
}
