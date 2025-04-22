"use client"

import { memo, useCallback } from "react"
import { motion } from "framer-motion"

interface LetterTileProps {
  letter: string
  onClick: () => void
  isSelected?: boolean
  position?: number
}

// Optimized letter tile component with memoization
export const LetterTile = memo(function LetterTile({ letter, onClick, isSelected = false, position }: LetterTileProps) {
  // Use useCallback to prevent unnecessary re-renders
  const handleClick = useCallback(() => {
    if (!isSelected) {
      onClick()
    }
  }, [isSelected, onClick])

  // Simplified animation for better performance on mobile
  const animationProps = {
    initial: position !== undefined ? { y: 5, opacity: 0 } : undefined,
    animate: position !== undefined ? { y: 0, opacity: 1 } : undefined,
    transition: {
      delay: position !== undefined ? position * 0.02 : 0, // Reduced delay for faster appearance
      type: "spring",
      stiffness: 400,
      damping: 20,
    },
  }

  return (
    <motion.div
      className={`relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-bold rounded-lg cursor-pointer select-none touch-manipulation
        ${isSelected ? "opacity-40 scale-95" : "opacity-100"}`}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      {...animationProps}
      style={{
        WebkitTapHighlightColor: "transparent", // Remove tap highlight on mobile
        touchAction: "manipulation", // Improve touch handling
        userSelect: "none", // Prevent text selection
      }}
    >
      {/* Base shadow - simplified for better performance */}
      <div className="absolute inset-0 bg-black/40 rounded-lg translate-y-[2px]"></div>

      {/* Tile base */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black rounded-lg"></div>

      {/* Tile face with letter */}
      <div className="absolute inset-0.5 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-lg flex items-center justify-center text-white">
        <span>{letter}</span>
      </div>

      {/* Highlight effect - simplified for better performance */}
      <div className="absolute inset-x-0 top-0 h-1/5 bg-white/10 rounded-t-lg"></div>
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
      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl font-bold bg-zinc-700/50 rounded-lg cursor-pointer touch-manipulation"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        WebkitTapHighlightColor: "transparent", // Remove tap highlight on mobile
        touchAction: "manipulation", // Improve touch handling
        userSelect: "none", // Prevent text selection
      }}
    >
      {letter}
    </motion.div>
  )
})
