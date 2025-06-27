"use client"

import { useState, useCallback } from "react"
import { calculateSimilarity } from "@/lib/text-similarity"

export function useStatistics(currentTime: number) {
  const [successCount, setSuccessCount] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [lastProcessedText, setLastProcessedText] = useState("")

  const updateStats = useCallback(
    (recognizedText: string, similarity: number, targetText: string) => {
      // Avoid processing the same text multiple times
      if (recognizedText === lastProcessedText) return

      setLastProcessedText(recognizedText)

      // Count words
      const words = recognizedText
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0)
      setTotalWords((prev) => prev + words.length)

      // Count attempts (each complete sentence)
      if (recognizedText.trim().length > 0) {
        setAttemptCount((prev) => prev + 1)
      }

      // Count successes (similarity >= 70%)
      const actualSimilarity = calculateSimilarity(recognizedText.toLowerCase(), targetText.toLowerCase())
      if (actualSimilarity >= 0.7) {
        setSuccessCount((prev) => prev + 1)
      }
    },
    [lastProcessedText],
  )

  const resetStats = useCallback(() => {
    setSuccessCount(0)
    setAttemptCount(0)
    setTotalWords(0)
    setLastProcessedText("")
  }, [])

  // Calculate words per 10 seconds
  const wordsPerTenSeconds = currentTime > 0 ? Math.round((totalWords / currentTime) * 10) : 0

  // Calculate calories burned (rough estimate)
  const caloriesBurned = Math.round((currentTime / 60) * 2)

  return {
    successCount,
    attemptCount,
    totalWords,
    wordsPerTenSeconds,
    caloriesBurned,
    updateStats,
    resetStats,
  }
}
