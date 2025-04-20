"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"

export default function Home() {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-zinc-900 text-cream">
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4 max-w-md"
        >
          <motion.h1
            className="text-4xl font-extrabold tracking-tight text-cream"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-orange-500">W</span>ORD
            <br />
            <span className="text-green-500">L</span>ADDER
            <br />
            <span className="text-orange-500">W</span>AR
          </motion.h1>

          <motion.p
            className="text-base text-zinc-400 max-w-sm mx-auto line-clamp-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            Form words from a single word. Climb the ladder. Flex your vocabulary skills.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col gap-4 mt-4"
          >
            <Link href="/nickname" className="w-full">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setIsHovering(true)}
                onHoverEnd={() => setIsHovering(false)}
              >
                <Button
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-base font-bold hover:from-orange-600 hover:to-orange-700 rounded-xl h-12 shadow-lg shadow-orange-500/20"
                  size="lg"
                >
                  Start Playing
                  <motion.div animate={{ x: isHovering ? 5 : 0 }} transition={{ duration: 0.2 }}>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </motion.div>
                </Button>
              </motion.div>
            </Link>

            <Link href="/leaderboard" className="w-full">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="outline"
                  className="w-full border-green-500 text-green-500 hover:bg-green-500/10 rounded-xl h-10 text-sm"
                >
                  Global Leaderboard
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <Footer />
    </main>
  )
}
