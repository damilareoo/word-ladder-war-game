"use client"

import { memo } from "react"
import { motion } from "framer-motion"

interface LetterTileProps {
  letter: string
  onClick: () => void
  isSelected?: boolean
  position?: number
}

// Optimized letter tile component with memoization
export const LetterTile = memo(function LetterTile({ letter, onClick, isSelected = false, position }: LetterTileProps) {
  // Simplified animation for better performance on mobile
  const animationProps = {
    initial: position !== undefined ? { y: 10, opacity: 0 } : undefined,
    animate: position !== undefined ? { y: 0, opacity: 1 } : undefined,
    transition: {
      delay: position !== undefined ? position * 0.03 : 0, // Reduced delay for faster appearance
      type: "spring",
      stiffness: 500,
      damping: 15,
    },
  }

  return (
    <motion.div
      className={`relative w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center text-xl font-bold rounded-lg cursor-pointer select-none
        ${isSelected ? "opacity-40 scale-95" : "opacity-100"}`}
      whileHover={!isSelected ? { scale: 1.05, y: -3 } : undefined}
      whileTap={!isSelected ? { scale: 0.95 } : undefined}
      onClick={!isSelected ? onClick : undefined}
      {...animationProps}
    >
      {/* Base shadow */}
      <div className="absolute inset-0 bg-black/50 rounded-lg translate-y-1 blur-sm"></div>

      {/* Tile base */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black rounded-lg shadow-lg"></div>

      {/* Tile face with letter */}
      <div className="absolute inset-0.5 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-lg flex items-center justify-center text-white shadow-inner">
        <span className="transform -translate-y-0.5">{letter}</span>
      </div>

      {/* Highlight effect - simplified for better performance */}
      <div className="absolute inset-x-0 top-0 h-1/4 bg-white/10 rounded-t-lg"></div>
    </motion.div>
  )
})

interface EmptyTileProps {
  onClick?: () => void
  letter?: string
}

export const EmptyTile = memo(function EmptyTile({ onClick, letter }: EmptyTileProps) {
  return (
    <motion.div
      className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center text-xl font-bold bg-zinc-700/50 rounded-lg cursor-pointer"
      whileHover={onClick ? { scale: 1.05, y: -3 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
    >
      {letter}
    </motion.div>
  )
})
