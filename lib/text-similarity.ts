export function calculateSimilarity(text1: string, text2: string): number {
  const str1 = text1.toLowerCase().trim()
  const str2 = text2.toLowerCase().trim()

  if (str1 === str2) return 1
  if (str1.length === 0 || str2.length === 0) return 0

  // Levenshtein distance algorithm
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= str1.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= str2.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= str1.length; i++) {
    for (let j = 1; j <= str2.length; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      )
    }
  }

  const distance = matrix[str1.length][str2.length]
  const maxLength = Math.max(str1.length, str2.length)

  return 1 - distance / maxLength
}
