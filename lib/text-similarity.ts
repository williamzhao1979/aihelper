/**
 * Calculate text similarity using Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1

  const len1 = str1.length
  const len2 = str2.length

  // Create matrix
  const matrix: number[][] = []

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      )

      // Damerau-Levenshtein: transposition
      if (i > 1 && j > 1 && str1[i - 1] === str2[j - 2] && str1[i - 2] === str2[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost)
      }
    }
  }

  const distance = matrix[len1][len2]
  const maxLength = Math.max(len1, len2)

  return maxLength === 0 ? 1 : 1 - distance / maxLength
}

/**
 * Calculate word-level similarity for better accuracy
 */
export function calculateWordSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  const words1 = str1
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
  const words2 = str2
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)

  if (words1.length === 0 && words2.length === 0) return 1
  if (words1.length === 0 || words2.length === 0) return 0

  let matches = 0
  const maxLength = Math.max(words1.length, words2.length)

  for (let i = 0; i < Math.min(words1.length, words2.length); i++) {
    if (words1[i] === words2[i]) {
      matches++
    }
  }

  return matches / maxLength
}
