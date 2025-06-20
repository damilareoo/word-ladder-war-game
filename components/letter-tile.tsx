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
    onClick()
  }, [onClick])

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
      className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl font-bold rounded-lg cursor-pointer select-none touch-manipulation"
      whileTap={{ scale: 0.95 }}
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
        <span className="text-2xl">{letter}</span>
      </div>

      {/* Highlight effect - simplified for better performance */}
      <div className="absolute inset-x-0 top-0 h-1/5 bg-white/10 rounded-t-lg"></div>
    </motion.div>
  )
})

interface SelectedLetterProps {
  letter: string
  onClick: () => void
  index: number
}

export const SelectedLetter = memo(function SelectedLetter({ letter, onClick, index }: SelectedLetterProps) {
  return (
    <motion.div
      className="relative w-10 h-10 bg-gradient-to-br from-orange-500/80 to-orange-600/80 rounded-lg flex items-center justify-center text-xl font-bold cursor-pointer shadow-md touch-manipulation"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -10 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
      }}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      <span className="text-white text-xl">{letter}</span>
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
      className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-xl font-bold bg-zinc-700/50 rounded-lg cursor-pointer touch-manipulation"
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
