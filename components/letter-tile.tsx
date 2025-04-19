"use client"

import { motion } from "framer-motion"

interface LetterTileProps {
  letter: string
  onClick: () => void
  isSelected?: boolean
  position?: number
}

export function LetterTile({ letter, onClick, isSelected = false, position }: LetterTileProps) {
  return (
    <motion.div
      className={`relative w-14 h-14 flex items-center justify-center text-2xl font-bold rounded-lg cursor-pointer select-none
        ${isSelected ? "opacity-40 scale-95" : "opacity-100"}`}
      whileHover={!isSelected ? { scale: 1.05, y: -3 } : {}}
      whileTap={!isSelected ? { scale: 0.95 } : {}}
      onClick={!isSelected ? onClick : undefined}
      initial={position !== undefined ? { y: 20, opacity: 0 } : {}}
      animate={position !== undefined ? { y: 0, opacity: 1 } : {}}
      transition={{
        delay: position !== undefined ? position * 0.05 : 0,
        type: "spring",
        stiffness: 500,
        damping: 15,
      }}
    >
      {/* Base shadow */}
      <div className="absolute inset-0 bg-black/50 rounded-lg translate-y-1 blur-sm"></div>

      {/* Tile base */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black rounded-lg shadow-lg"></div>

      {/* Tile face with letter */}
      <div className="absolute inset-0.5 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-lg flex items-center justify-center text-white shadow-inner">
        <span className="transform -translate-y-0.5">{letter}</span>
      </div>

      {/* Highlight effect */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-white/10 rounded-t-lg"></div>
    </motion.div>
  )
}

interface EmptyTileProps {
  onClick?: () => void
  letter?: string
}

export function EmptyTile({ onClick, letter }: EmptyTileProps) {
  return (
    <motion.div
      className="w-14 h-14 flex items-center justify-center text-2xl font-bold bg-zinc-700/50 rounded-lg cursor-pointer"
      whileHover={onClick ? { scale: 1.05, y: -3 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
      onClick={onClick}
    >
      {letter}
    </motion.div>
  )
}
