"use client"

import { useState, useCallback } from "react"

export function useStatistics() {
  const [successCount, setSuccessCount] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [totalWords, setTotalWords] = useState(0)

  const incrementSuccess = useCallback(() => {
    setSuccessCount((prev) => prev + 1)
  }, [])

  const incrementAttempt = useCallback(() => {
    setAttemptCount((prev) => prev + 1)
  }, [])

  const addWords = useCallback((count: number) => {
    setTotalWords((prev) => prev + count)
  }, [])

  const reset = useCallback(() => {
    setSuccessCount(0)
    setAttemptCount(0)
    setTotalWords(0)
  }, [])

  // Calculate derived statistics
  const wordsPerMinute = totalWords > 0 ? Math.round(totalWords * 6) : 0 // Assuming 10-second intervals
  const caloriesBurned = Math.round(totalWords * 0.1) // Rough estimate

  return {
    successCount,
    attemptCount,
    totalWords,
    wordsPerMinute,
    caloriesBurned,
    incrementSuccess,
    incrementAttempt,
    addWords,
    reset,
  }
}
