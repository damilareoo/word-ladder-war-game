"use client"

import { memo, useCallback } from "react"
import { motion } from "framer-motion"

interface LetterTileProps {
  letter: string
  onClick: () => void
  isSelected?: boolean
  position?: number
}

// Enhanced letter tile with better visual feedback
export const LetterTile = memo(function LetterTile({ letter, onClick, isSelected = false, position }: LetterTileProps) {
  const handleClick = useCallback(() => {
    onClick()
  }, [onClick])

  return (
    <motion.button
      className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-2xl font-bold rounded-xl cursor-pointer select-none touch-manipulation group"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      initial={position !== undefined ? { y: 20, opacity: 0, scale: 0.8 } : undefined}
      animate={position !== undefined ? { y: 0, opacity: 1, scale: 1 } : undefined}
      transition={{
        delay: position !== undefined ? position * 0.05 : 0,
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      {/* Shadow Layer */}
      <div className="absolute inset-0 bg-black/40 rounded-xl translate-y-1 group-hover:translate-y-0.5 transition-transform duration-150" />

      {/* Base Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 rounded-xl border border-zinc-600/50" />

      {/* Surface Layer */}
      <div className="absolute inset-0.5 bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-lg flex items-center justify-center">
        <span className="text-white font-black tracking-wide drop-shadow-sm">{letter}</span>
      </div>

      {/* Highlight Effect */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />

      {/* Hover Glow */}
      <div className="absolute inset-0 rounded-xl bg-orange-400/0 group-hover:bg-orange-400/10 transition-colors duration-200" />
    </motion.button>
  )
})

interface SelectedLetterProps {
  letter: string
  onClick: () => void
  index: number
}

export const SelectedLetter = memo(function SelectedLetter({ letter, onClick, index }: SelectedLetterProps) {
  return (
    <motion.button
      className="relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold cursor-pointer shadow-lg touch-manipulation group border border-orange-300/30"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -20 }}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-xl bg-orange-400/20 blur-sm group-hover:bg-orange-300/30 transition-colors duration-200" />

      {/* Letter */}
      <span className="relative z-10 text-white font-black tracking-wide drop-shadow-sm">{letter}</span>

      {/* Highlight */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-xl" />
    </motion.button>
  )
})

interface EmptyTileProps {
  onClick?: () => void
  letter?: string
}

export const EmptyTile = memo(function EmptyTile({ onClick, letter }: EmptyTileProps) {
  return (
    <motion.button
      className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-xl sm:text-2xl font-bold bg-zinc-800/50 border-2 border-dashed border-zinc-600/50 rounded-xl cursor-pointer touch-manipulation hover:border-zinc-500/70 hover:bg-zinc-700/50 transition-all duration-200"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      {letter && <span className="text-zinc-500">{letter}</span>}
    </motion.button>
  )
})
