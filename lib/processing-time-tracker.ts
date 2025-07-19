// Processing time tracking utilities
interface ProcessingRecord {
  imageCount: number
  totalSizeMB: number
  mergeMode: boolean
  actualTime: number
  timestamp: number
  estimatedTime?: number
}

const STORAGE_KEY = 'ocr_processing_times'
const MAX_RECORDS = 50 // Keep last 50 records for analysis

export class ProcessingTimeTracker {
  // Record a new processing time
  static recordProcessingTime(record: ProcessingRecord): void {
    try {
      const existingRecords = this.getProcessingRecords()
      const updatedRecords = [record, ...existingRecords].slice(0, MAX_RECORDS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords))
    } catch (error) {
      console.warn('Failed to save processing time record:', error)
    }
  }

  // Get all processing records
  static getProcessingRecords(): ProcessingRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to load processing time records:', error)
      return []
    }
  }

  // Get average processing time for similar conditions
  static getAverageProcessingTime(imageCount: number, totalSizeMB: number, mergeMode: boolean): number | null {
    const records = this.getProcessingRecords()
    
    // Filter records with similar conditions (±2 images, ±1MB, same merge mode)
    const similarRecords = records.filter(record => {
      const imageCountDiff = Math.abs(record.imageCount - imageCount)
      const sizeDiff = Math.abs(record.totalSizeMB - totalSizeMB)
      return imageCountDiff <= 2 && sizeDiff <= 1 && record.mergeMode === mergeMode
    })

    if (similarRecords.length === 0) return null

    // Calculate weighted average (more recent records have higher weight)
    const now = Date.now()
    const weightedSum = similarRecords.reduce((sum, record) => {
      // Weight decreases with age (max 30 days)
      const ageInDays = (now - record.timestamp) / (1000 * 60 * 60 * 24)
      const weight = Math.max(0.1, 1 - (ageInDays / 30))
      return sum + (record.actualTime * weight)
    }, 0)

    const totalWeight = similarRecords.reduce((sum, record) => {
      const ageInDays = (now - record.timestamp) / (1000 * 60 * 60 * 24)
      const weight = Math.max(0.1, 1 - (ageInDays / 30))
      return sum + weight
    }, 0)

    return Math.round(weightedSum / totalWeight)
  }

  // Get processing time statistics
  static getProcessingStats(): {
    totalRecords: number
    averageTime: number
    averageAccuracy: number
    recentRecords: ProcessingRecord[]
  } {
    const records = this.getProcessingRecords()
    
    if (records.length === 0) {
      return {
        totalRecords: 0,
        averageTime: 0,
        averageAccuracy: 0,
        recentRecords: []
      }
    }

    const recordsWithEstimate = records.filter(r => r.estimatedTime && r.estimatedTime > 0)
    
    const averageTime = records.reduce((sum, r) => sum + r.actualTime, 0) / records.length
    
    let averageAccuracy = 0
    if (recordsWithEstimate.length > 0) {
      const accuracySum = recordsWithEstimate.reduce((sum, r) => {
        const accuracy = 100 - Math.abs(1 - r.actualTime / (r.estimatedTime || 1)) * 100
        return sum + Math.max(0, Math.min(100, accuracy))
      }, 0)
      averageAccuracy = accuracySum / recordsWithEstimate.length
    }

    return {
      totalRecords: records.length,
      averageTime: Math.round(averageTime),
      averageAccuracy: Math.round(averageAccuracy),
      recentRecords: records.slice(0, 10)
    }
  }

  // Clear all records (for debugging/reset)
  static clearRecords(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear processing time records:', error)
    }
  }
}
