// Enhanced scoring system with visual feedback
export function calculateScore(words: string[]): number {
  console.log("Calculating score for words:", words)

  if (!words || words.length === 0) {
    console.log("No words to calculate score for, returning 0")
    return 0
  }

  const score = words.reduce((total, word) => {
    let pointsForWord = 0

    // Enhanced scoring system
    // 3 letters = 10 points
    // 4 letters = 20 points
    // 5 letters = 35 points
    // 6 letters = 50 points
    // 7+ letters = 75 points + 25 per additional letter
    if (word.length === 3) {
      pointsForWord = 10
    } else if (word.length === 4) {
      pointsForWord = 20
    } else if (word.length === 5) {
      pointsForWord = 35
    } else if (word.length === 6) {
      pointsForWord = 50
    } else {
      pointsForWord = 75 + (word.length - 7) * 25
    }

    console.log(`Word: ${word}, Length: ${word.length}, Points: ${pointsForWord}`)
    return total + pointsForWord
  }, 0)

  console.log("Total score calculated:", score)
  return score
}

// Enhanced level calculation with better progression
export function calculateLevel(wordCount: number): number {
  console.log("Calculating level for word count:", wordCount)

  const count = typeof wordCount === "number" ? wordCount : Number.parseInt(String(wordCount), 10)
  let level = 1

  // Progressive level system
  if (count >= 50) {
    level = 10 // Master
  } else if (count >= 40) {
    level = 9 // Expert
  } else if (count >= 35) {
    level = 8 // Advanced
  } else if (count >= 30) {
    level = 7 // Skilled
  } else if (count >= 25) {
    level = 6 // Proficient
  } else if (count >= 20) {
    level = 5 // Competent
  } else if (count >= 15) {
    level = 4 // Intermediate
  } else if (count >= 10) {
    level = 3 // Developing
  } else if (count >= 5) {
    level = 2 // Beginner
  } else {
    level = 1 // Novice
  }

  console.log("Level calculated:", level)
  return level
}

// Enhanced level info with more descriptive titles
export function getLevelInfo(level: number): { title: string; description: string; color: string } {
  const levels = [
    {
      title: "Word Novice",
      description: "Just starting your word journey.",
      color: "text-zinc-400",
    },
    {
      title: "Word Seeker",
      description: "Finding your rhythm with words.",
      color: "text-blue-400",
    },
    {
      title: "Word Builder",
      description: "Developing your vocabulary skills.",
      color: "text-green-400",
    },
    {
      title: "Word Crafter",
      description: "Showing real word-forming talent.",
      color: "text-yellow-400",
    },
    {
      title: "Word Scholar",
      description: "Demonstrating impressive vocabulary.",
      color: "text-orange-400",
    },
    {
      title: "Word Artisan",
      description: "Crafting words with skill and precision.",
      color: "text-red-400",
    },
    {
      title: "Word Virtuoso",
      description: "Displaying exceptional word mastery.",
      color: "text-purple-400",
    },
    {
      title: "Word Sage",
      description: "Achieving remarkable vocabulary prowess.",
      color: "text-pink-400",
    },
    {
      title: "Word Genius",
      description: "Reaching extraordinary word-forming heights.",
      color: "text-cyan-400",
    },
    {
      title: "Word Master",
      description: "The ultimate vocabulary champion!",
      color: "text-gradient-to-r from-yellow-400 to-orange-400",
    },
  ]

  // Adjust for zero-indexing and ensure valid level
  const adjustedLevel = Math.min(Math.max(level, 1), 10) - 1
  return levels[adjustedLevel]
}

// Get word score for individual words
export function getWordScore(word: string): number {
  if (word.length === 3) return 10
  if (word.length === 4) return 20
  if (word.length === 5) return 35
  if (word.length === 6) return 50
  return 75 + (word.length - 7) * 25
}
