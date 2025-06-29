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
  const saveRecord = useCallback(async (record: Omit<HealthRecord, "id" | "recordId" | "createdAt" | "updatedAt">) => {
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

  // Get records by owner ID
  const getRecordsByOwnerId = useCallback(async (ownerId: string): Promise<HealthRecord[]> => {
    if (!isInitialized) {
      return []
    }
    return await healthDB.getRecordsByOwnerId(ownerId)
  }, [isInitialized])

  // Get records by group ID
  const getRecordsByGroupId = useCallback(async (groupId: string): Promise<HealthRecord[]> => {
    if (!isInitialized) {
      return []
    }
    return await healthDB.getRecordsByGroupId(groupId)
  }, [isInitialized])

  // Get records by multiple owner IDs
  const getRecordsByOwnerIds = useCallback(async (ownerIds: string[]): Promise<HealthRecord[]> => {
    if (!isInitialized) {
      return []
    }
    return await healthDB.getRecordsByOwnerIds(ownerIds)
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

  // 数据迁移到多用户版本
  const migrateToMultiUser = useCallback(async () => {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }
    return await healthDB.migrateToMultiUser()
  }, [isInitialized])

  // 批量更新记录的拥有者信息
  const updateRecordsOwner = useCallback(async (
    oldOwnerId: string, 
    newOwnerId: string, 
    newOwnerName: string,
    newUniqueOwnerId?: string
  ) => {
    if (!isInitialized) {
      throw new Error('Database not initialized')
    }
    return await healthDB.updateRecordsOwner(oldOwnerId, newOwnerId, newOwnerName, newUniqueOwnerId)
  }, [isInitialized])

  // 获取数据迁移状态
  const getMigrationStatus = useCallback(async () => {
    if (!isInitialized) {
      return {
        totalRecords: 0,
        migratedRecords: 0,
        needsMigration: 0,
        migrationStatus: 'not_started' as const
      }
    }
    return await healthDB.getMigrationStatus()
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
    getRecordsByOwnerId,
    getRecordsByGroupId,
    getRecordsByOwnerIds,
    deleteRecord,
    updateRecord,
    getStatistics,
    clearAllData,
    migrateToMultiUser,
    updateRecordsOwner,
    getMigrationStatus
  }
} 