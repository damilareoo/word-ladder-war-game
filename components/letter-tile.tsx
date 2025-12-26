"use client"

import { memo, useCallback } from "react"
import { motion } from "framer-motion"

interface LetterTileProps {
  letter: string
  onClick: () => void
  isSelected?: boolean
  position?: number
}

export const LetterTile = memo(function LetterTile({ letter, onClick, isSelected = false, position }: LetterTileProps) {
  const handleClick = useCallback(() => {
    onClick()
  }, [onClick])

  return (
    <motion.button
      className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl cursor-pointer select-none touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-95 transition-transform"
      whileTap={{ scale: 0.92 }}
      onClick={handleClick}
      initial={position !== undefined ? { y: 8, opacity: 0 } : undefined}
      animate={position !== undefined ? { y: 0, opacity: 1 } : undefined}
      transition={{
        delay: position !== undefined ? position * 0.03 : 0,
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      {/* Shadow layer */}
      <div className="absolute inset-0 bg-black/40 rounded-2xl translate-y-1" />

      {/* Tile body */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-600 to-zinc-800 rounded-2xl" />

      {/* Tile face */}
      <div className="absolute inset-[3px] bg-gradient-to-b from-zinc-500 to-zinc-700 rounded-[13px] flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">{letter}</span>
      </div>

      {/* Top shine */}
      <div className="absolute inset-x-2 top-1.5 h-3 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl" />
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
      className="relative w-11 h-11 sm:w-12 sm:h-12 bg-primary rounded-xl flex items-center justify-center cursor-pointer shadow-md shadow-primary/30 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground active:scale-95 transition-transform"
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.5, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: -12 }}
      whileTap={{ scale: 0.9 }}
      transition={{
        duration: 0.2,
        delay: index * 0.02,
        type: "spring",
        stiffness: 500,
        damping: 30,
      }}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      <span className="text-xl sm:text-2xl font-bold text-primary-foreground">{letter}</span>
    </motion.button>
  )
})

interface EmptyTileProps {
  onClick?: () => void
  letter?: string
}

export const EmptyTile = memo(function EmptyTile({ onClick, letter }: EmptyTileProps) {
  return (
    <motion.div
      className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-muted/30 rounded-2xl cursor-pointer touch-manipulation border border-border/30"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      {letter && <span className="text-muted-foreground">{letter}</span>}
    </motion.div>
  )
})
