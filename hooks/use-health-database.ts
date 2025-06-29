import { useState, useEffect, useCallback } from 'react'
import healthDB, { HealthRecord } from '@/lib/health-database'

export function useHealthDatabase() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize database
  useEffect(() => {
    const initDB = async () => {
      try {
        setIsLoading(true)
        setError(null)
        await healthDB.init()
        setIsInitialized(true)
      } catch (err) {
        console.error('Failed to initialize database:', err)
        setError('数据库初始化失败')
      } finally {
        setIsLoading(false)
      }
    }

    initDB()
  }, [])

  // Save record
  const saveRecord = useCallback(async (record: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">) => {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }
    return await healthDB.saveRecord(record)
  }, [isInitialized])

  // Get all records
  const getAllRecords = useCallback(async (): Promise<HealthRecord[]> => {
    if (!isInitialized) {
      return []
    }
    return await healthDB.getAllRecords()
  }, [isInitialized])

  // Get records by date
  const getRecordsByDate = useCallback(async (date: string): Promise<HealthRecord[]> => {
    if (!isInitialized) {
      return []
    }
    return await healthDB.getRecordsByDate(date)
  }, [isInitialized])

  // Get records by type
  const getRecordsByType = useCallback(async (type: HealthRecord["type"]): Promise<HealthRecord[]> => {
    if (!isInitialized) {
      return []
    }
    return await healthDB.getRecordsByType(type)
  }, [isInitialized])

  // Get record by ID
  const getRecordById = useCallback(async (id: string): Promise<HealthRecord | null> => {
    if (!isInitialized) {
      return null
    }
    return await healthDB.getRecord(id)
  }, [isInitialized])

  // Delete record
  const deleteRecord = useCallback(async (id: string) => {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }
    return await healthDB.deleteRecord(id)
  }, [isInitialized])

  // Update record
  const updateRecord = useCallback(async (id: string, updates: Partial<HealthRecord>) => {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }
    return await healthDB.updateRecord(id, updates)
  }, [isInitialized])

  // Get statistics
  const getStatistics = useCallback(async () => {
    if (!isInitialized) {
      return {
        totalRecords: 0,
        recordsByType: {},
        recordsByMonth: {}
      }
    }
    return await healthDB.getStatistics()
  }, [isInitialized])

  // Clear all data
  const clearAllData = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }
    return await healthDB.clearAllData()
  }, [isInitialized])

  return {
    isInitialized,
    isLoading,
    error,
    saveRecord,
    getAllRecords,
    getRecordsByDate,
    getRecordsByType,
    getRecordById,
    deleteRecord,
    updateRecord,
    getStatistics,
    clearAllData
  }
} 