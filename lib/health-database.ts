// HealthCalendar IndexedDB Database Utility
// Provides data persistence for health records, period records, and poop records

export interface HealthRecord {
  id: string
  recordId: string          // Global unique record identifier
  uniqueOwnerId: string    // Global unique identifier for the owner
  ownerId: string          // Record owner ID (user/device identifier)
  ownerName: string        // Owner display name (user nickname)
  groupId?: string         // Family/group identifier (optional for single user)
  date: string
  datetime?: string
  type: "health" | "period" | "poop" | "meal" | "myrecord" | "item" | "checkup" | "thought"
  content?: string
  tags?: string[]
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
    url?: string  // 添加 url 字段，可选，因为有些记录可能没有URL
  }>
  // Period specific fields
  flow?: string
  pain?: string
  mood?: string
  symptoms?: string[]
  // Poop specific fields
  poopType?: string
  poopColor?: string
  poopSmell?: string
  // Meal specific fields
  mealType?: string
  foodTypes?: string[]
  mealPortion?: string
  mealCondition?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

class HealthDatabase {
  private dbName = "HealthCalendarDB"
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log("开始初始化HealthCalendar数据库...")
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error("数据库打开失败:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        console.log("HealthCalendar数据库打开成功:", this.dbName)
        console.log("数据库版本:", this.version)
        console.log("对象存储:", Array.from(this.db.objectStoreNames))
        resolve()
      }

      request.onupgradeneeded = (event) => {
        console.log("数据库需要升级，版本:", this.version)
        const db = (event.target as IDBOpenDBRequest).result

        // Create records store
        if (!db.objectStoreNames.contains("records")) {
          const recordsStore = db.createObjectStore("records", { keyPath: "id" })
          recordsStore.createIndex("date", "date", { unique: false })
          recordsStore.createIndex("type", "type", { unique: false })
          recordsStore.createIndex("datetime", "datetime", { unique: false })
          console.log("创建了records对象存储")
        }

        // Create files store for attachments
        if (!db.objectStoreNames.contains("files")) {
          const filesStore = db.createObjectStore("files", { keyPath: "id" })
          filesStore.createIndex("recordId", "recordId", { unique: false })
          console.log("创建了files对象存储")
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init()
    }
    if (!this.db) {
      throw new Error("Failed to initialize database")
    }
    return this.db
  }

  // Save a health record
  async saveRecord(record: Omit<HealthRecord, "id" | "recordId" | "createdAt" | "updatedAt">): Promise<string> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      console.log("开始保存记录:", record)
      const transaction = db.transaction(["records"], "readwrite")
      const store = transaction.objectStore("records")
      
      const recordWithMetadata: HealthRecord = {
        ...record,
        id: this.generateId(),
        recordId: this.generateRecordId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }

      console.log("准备保存的记录:", recordWithMetadata)

      const request = store.add(recordWithMetadata)

      request.onsuccess = () => {
        console.log("记录保存成功:", recordWithMetadata.id)
        resolve(recordWithMetadata.id)
      }

      request.onerror = () => {
        console.error("保存记录失败:", request.error)
        reject(request.error)
      }
    })
  }

  // Update an existing record
  async updateRecord(id: string, updates: Partial<HealthRecord>): Promise<void> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readwrite")
      const store = transaction.objectStore("records")
      
      // First get the existing record
      const getRequest = store.get(id)
      
      getRequest.onsuccess = () => {
        const existingRecord = getRequest.result
        if (!existingRecord) {
          reject(new Error("Record not found"))
          return
        }

        const updatedRecord: HealthRecord = {
          ...existingRecord,
          ...updates,
          updatedAt: new Date()
        }

        const putRequest = store.put(updatedRecord)
        
        putRequest.onsuccess = () => {
          console.log("Record updated successfully:", id)
          resolve()
        }

        putRequest.onerror = () => {
          console.error("Failed to update record:", putRequest.error)
          reject(putRequest.error)
        }
      }

      getRequest.onerror = () => {
        console.error("Failed to get record for update:", getRequest.error)
        reject(getRequest.error)
      }
    })
  }

  // Get a single record by ID
  async getRecord(id: string): Promise<HealthRecord | null> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      console.log("getRecord: 开始获取记录，ID:", id)
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result || null
        console.log("getRecord: 获取到的记录:", result)
        resolve(result)
      }

      request.onerror = () => {
        console.error("Failed to get record:", request.error)
        reject(request.error)
      }
    })
  }

  // Get all records
  async getAllRecords(): Promise<HealthRecord[]> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      console.log("开始获取所有记录...")
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = () => {
        const records = request.result || []
        console.log("获取到的记录数量:", records.length)
        console.log("所有记录:", records)
        // Sort by date descending (newest first)
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(records)
      }

      request.onerror = () => {
        console.error("获取记录失败:", request.error)
        reject(request.error)
      }
    })
  }

  // Get records by type
  async getRecordsByType(type: HealthRecord["type"]): Promise<HealthRecord[]> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const index = store.index("type")
      const request = index.getAll(type)

      request.onsuccess = () => {
        const records = request.result || []
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(records)
      }

      request.onerror = () => {
        console.error("Failed to get records by type:", request.error)
        reject(request.error)
      }
    })
  }

  // Get records by date range
  async getRecordsByDateRange(startDate: string, endDate: string): Promise<HealthRecord[]> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const index = store.index("date")
      const request = index.getAll(IDBKeyRange.bound(startDate, endDate))

      request.onsuccess = () => {
        const records = request.result || []
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(records)
      }

      request.onerror = () => {
        console.error("Failed to get records by date range:", request.error)
        reject(request.error)
      }
    })
  }

  // Get records for a specific date
  async getRecordsByDate(date: string): Promise<HealthRecord[]> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const index = store.index("date")
      const request = index.getAll(date)

      request.onsuccess = () => {
        const records = request.result || []
        records.sort((a, b) => new Date(b.datetime || b.date).getTime() - new Date(a.datetime || a.date).getTime())
        resolve(records)
      }

      request.onerror = () => {
        console.error("Failed to get records by date:", request.error)
        reject(request.error)
      }
    })
  }

  // Delete a record
  async deleteRecord(id: string): Promise<void> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readwrite")
      const store = transaction.objectStore("records")
      const request = store.delete(id)

      request.onsuccess = () => {
        console.log("Record deleted successfully:", id)
        resolve()
      }

      request.onerror = () => {
        console.error("Failed to delete record:", request.error)
        reject(request.error)
      }
    })
  }

  // Save file attachment
  async saveFile(file: File, recordId: string): Promise<string> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["files"], "readwrite")
      const store = transaction.objectStore("files")
      
      const fileRecord = {
        id: this.generateId(),
        recordId,
        name: file.name,
        type: file.type,
        size: file.size,
        data: file,
        createdAt: new Date()
      }

      const request = store.add(fileRecord)

      request.onsuccess = () => {
        console.log("File saved successfully:", fileRecord.id)
        resolve(fileRecord.id)
      }

      request.onerror = () => {
        console.error("Failed to save file:", request.error)
        reject(request.error)
      }
    })
  }

  // Get file attachment
  async getFile(fileId: string): Promise<File | null> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["files"], "readonly")
      const store = transaction.objectStore("files")
      const request = store.get(fileId)

      request.onsuccess = () => {
        resolve(request.result?.data || null)
      }

      request.onerror = () => {
        console.error("Failed to get file:", request.error)
        reject(request.error)
      }
    })
  }

  // Delete file attachment
  async deleteFile(fileId: string): Promise<void> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["files"], "readwrite")
      const store = transaction.objectStore("files")
      const request = store.delete(fileId)

      request.onsuccess = () => {
        console.log("File deleted successfully:", fileId)
        resolve()
      }

      request.onerror = () => {
        console.error("Failed to delete file:", request.error)
        reject(request.error)
      }
    })
  }

  // Get statistics
  async getStatistics(): Promise<{
    totalRecords: number
    recordsByType: Record<string, number>
    recordsByMonth: Record<string, number>
  }> {
    const records = await this.getAllRecords()
    
    const recordsByType: Record<string, number> = {}
    const recordsByMonth: Record<string, number> = {}
    
    records.forEach(record => {
      // Count by type
      recordsByType[record.type] = (recordsByType[record.type] || 0) + 1
      
      // Count by month (YYYY-MM format)
      const month = record.date.substring(0, 7)
      recordsByMonth[month] = (recordsByMonth[month] || 0) + 1
    })

    return {
      totalRecords: records.length,
      recordsByType,
      recordsByMonth
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records", "files"], "readwrite")
      
      const recordsStore = transaction.objectStore("records")
      const filesStore = transaction.objectStore("files")
      
      const recordsRequest = recordsStore.clear()
      const filesRequest = filesStore.clear()

      let completed = 0
      const checkComplete = () => {
        completed++
        if (completed === 2) {
          console.log("All data cleared successfully")
          resolve()
        }
      }

      recordsRequest.onsuccess = checkComplete
      filesRequest.onsuccess = checkComplete

      recordsRequest.onerror = () => {
        console.error("Failed to clear records:", recordsRequest.error)
        reject(recordsRequest.error)
      }

      filesRequest.onerror = () => {
        console.error("Failed to clear files:", filesRequest.error)
        reject(filesRequest.error)
      }
    })
  }

  // Export all data
  async exportData(): Promise<string> {
    const records = await this.getAllRecords()
    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      records
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  // Import data
  async importData(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData)
      
      if (!importData.records || !Array.isArray(importData.records)) {
        throw new Error("Invalid data format")
      }

      // Clear existing data first
      await this.clearAllData()

      // Import records
      for (const record of importData.records) {
        await this.saveRecord(record)
      }

      console.log("Data imported successfully")
    } catch (error) {
      console.error("Failed to import data:", error)
      throw error
    }
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // Generate record ID
  private generateRecordId(): string {
    // Use UUID v4 format or timestamp + random number
    return `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log("Database connection closed")
    }
  }

  // Get records by owner ID
  async getRecordsByOwnerId(ownerId: string): Promise<HealthRecord[]> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = () => {
        const allRecords = request.result || []
        const filteredRecords = allRecords.filter(record => 
          record.ownerId === ownerId || record.uniqueOwnerId === ownerId
        )
        filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(filteredRecords)
      }

      request.onerror = () => {
        console.error("Failed to get records by owner ID:", request.error)
        reject(request.error)
      }
    })
  }

  // Get records by group ID
  async getRecordsByGroupId(groupId: string): Promise<HealthRecord[]> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = () => {
        const allRecords = request.result || []
        const filteredRecords = allRecords.filter(record => record.groupId === groupId)
        filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(filteredRecords)
      }

      request.onerror = () => {
        console.error("Failed to get records by group ID:", request.error)
        reject(request.error)
      }
    })
  }

  // Get records by multiple owner IDs
  async getRecordsByOwnerIds(ownerIds: string[]): Promise<HealthRecord[]> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = () => {
        const allRecords = request.result || []
        const filteredRecords = allRecords.filter(record => 
          ownerIds.includes(record.ownerId) || ownerIds.includes(record.uniqueOwnerId)
        )
        filteredRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        resolve(filteredRecords)
      }

      request.onerror = () => {
        console.error("Failed to get records by owner IDs:", request.error)
        reject(request.error)
      }
    })
  }

  // 数据迁移：为现有记录添加多用户字段
  async migrateToMultiUser(): Promise<{ migrated: number, errors: number }> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readwrite")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = async () => {
        const allRecords = request.result || []
        let migrated = 0
        let errors = 0

        console.log(`开始迁移 ${allRecords.length} 条记录到多用户版本...`)

        for (const record of allRecords) {
          try {
            // 检查记录是否已经有必要的多用户字段
            if (!record.uniqueOwnerId || !record.ownerId || !record.ownerName) {
              // 为记录添加默认的多用户字段
              const updatedRecord: HealthRecord = {
                ...record,
                uniqueOwnerId: record.uniqueOwnerId || `user_001`,
                ownerId: record.ownerId || `device_001`,
                ownerName: record.ownerName || "本人",
                recordId: record.recordId || this.generateRecordId(),
                updatedAt: new Date()
              }

              // 更新记录
              await new Promise<void>((resolveUpdate, rejectUpdate) => {
                const updateRequest = store.put(updatedRecord)
                updateRequest.onsuccess = () => {
                  migrated++
                  resolveUpdate()
                }
                updateRequest.onerror = () => {
                  errors++
                  console.error(`迁移记录失败 ${record.id}:`, updateRequest.error)
                  rejectUpdate(updateRequest.error)
                }
              })
            } else {
              // 记录已经有必要的字段，跳过
              console.log(`记录 ${record.id} 已符合多用户格式，跳过`)
            }
          } catch (error) {
            errors++
            console.error(`迁移记录 ${record.id} 时出错:`, error)
          }
        }

        console.log(`数据迁移完成: 成功 ${migrated} 条，失败 ${errors} 条`)
        resolve({ migrated, errors })
      }

      request.onerror = () => {
        console.error("获取记录失败:", request.error)
        reject(request.error)
      }
    })
  }

  // 批量更新记录的拥有者信息
  async updateRecordsOwner(
    oldOwnerId: string, 
    newOwnerId: string, 
    newOwnerName: string,
    newUniqueOwnerId?: string
  ): Promise<{ updated: number, errors: number }> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readwrite")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = async () => {
        const allRecords = request.result || []
        let updated = 0
        let errors = 0

        console.log(`开始更新拥有者为 ${newOwnerName} 的记录...`)

        for (const record of allRecords) {
          try {
            // 检查记录是否匹配旧的拥有者ID
            if (record.ownerId === oldOwnerId || record.uniqueOwnerId === oldOwnerId) {
              const updatedRecord: HealthRecord = {
                ...record,
                ownerId: newOwnerId,
                uniqueOwnerId: newUniqueOwnerId || newOwnerId,
                ownerName: newOwnerName,
                updatedAt: new Date()
              }

              // 更新记录
              await new Promise<void>((resolveUpdate, rejectUpdate) => {
                const updateRequest = store.put(updatedRecord)
                updateRequest.onsuccess = () => {
                  updated++
                  resolveUpdate()
                }
                updateRequest.onerror = () => {
                  errors++
                  console.error(`更新记录失败 ${record.id}:`, updateRequest.error)
                  rejectUpdate(updateRequest.error)
                }
              })
            }
          } catch (error) {
            errors++
            console.error(`更新记录 ${record.id} 时出错:`, error)
          }
        }

        console.log(`记录更新完成: 成功 ${updated} 条，失败 ${errors} 条`)
        resolve({ updated, errors })
      }

      request.onerror = () => {
        console.error("获取记录失败:", request.error)
        reject(request.error)
      }
    })
  }

  // 获取数据迁移状态
  async getMigrationStatus(): Promise<{
    totalRecords: number
    migratedRecords: number
    needsMigration: number
    migrationStatus: 'not_started' | 'in_progress' | 'completed' | 'error'
  }> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readonly")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = () => {
        const allRecords = request.result || []
        const totalRecords = allRecords.length
        const migratedRecords = allRecords.filter(record => 
          record.uniqueOwnerId && record.ownerId && record.ownerName
        ).length
        const needsMigration = totalRecords - migratedRecords

        let migrationStatus: 'not_started' | 'in_progress' | 'completed' | 'error' = 'not_started'
        if (needsMigration === 0 && totalRecords > 0) {
          migrationStatus = 'completed'
        } else if (needsMigration > 0) {
          migrationStatus = 'not_started'
        }

        resolve({
          totalRecords,
          migratedRecords,
          needsMigration,
          migrationStatus
        })
      }

      request.onerror = () => {
        console.error("获取迁移状态失败:", request.error)
        reject(request.error)
      }
    })
  }

  // 修复没有正确用户字段的记录
  async fixRecordsWithoutUserFields(): Promise<{ fixed: number, errors: number }> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(["records"], "readwrite")
      const store = transaction.objectStore("records")
      const request = store.getAll()

      request.onsuccess = async () => {
        const allRecords = request.result || []
        let fixed = 0
        let errors = 0

        console.log(`开始修复 ${allRecords.length} 条记录的用户字段...`)

        for (const record of allRecords) {
          try {
            // 检查记录是否缺少用户字段
            if (!record.uniqueOwnerId || !record.ownerId || !record.ownerName) {
              const updatedRecord: HealthRecord = {
                ...record,
                uniqueOwnerId: record.uniqueOwnerId || `user_001`,
                ownerId: record.ownerId || `device_001`,
                ownerName: record.ownerName || "本人",
                recordId: record.recordId || this.generateRecordId(),
                updatedAt: new Date()
              }

              // 更新记录
              await new Promise<void>((resolveUpdate, rejectUpdate) => {
                const updateRequest = store.put(updatedRecord)
                updateRequest.onsuccess = () => {
                  fixed++
                  console.log(`修复记录 ${record.id}:`, {
                    old: { uniqueOwnerId: record.uniqueOwnerId, ownerId: record.ownerId, ownerName: record.ownerName },
                    new: { uniqueOwnerId: updatedRecord.uniqueOwnerId, ownerId: updatedRecord.ownerId, ownerName: updatedRecord.ownerName }
                  })
                  resolveUpdate()
                }
                updateRequest.onerror = () => {
                  errors++
                  console.error(`修复记录失败 ${record.id}:`, updateRequest.error)
                  rejectUpdate(updateRequest.error)
                }
              })
            }
          } catch (error) {
            errors++
            console.error(`修复记录 ${record.id} 时出错:`, error)
          }
        }

        console.log(`记录修复完成: 成功 ${fixed} 条，失败 ${errors} 条`)
        resolve({ fixed, errors })
      }

      request.onerror = () => {
        console.error("获取记录失败:", request.error)
        reject(request.error)
      }
    })
  }
}

// Create singleton instance
const healthDB = new HealthDatabase()

export default healthDB 