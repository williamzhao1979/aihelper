// HealthCalendar IndexedDB Database Utility
// Provides data persistence for health records, period records, and poop records

export interface HealthRecord {
  id: string
  date: string
  datetime?: string
  type: "health" | "period" | "poop"
  content?: string
  tags?: string[]
  attachments?: Array<{
    id: string
    name: string
    type: string
    size: number
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
  async saveRecord(record: Omit<HealthRecord, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const db = await this.ensureDB()
    
    return new Promise((resolve, reject) => {
      console.log("开始保存记录:", record)
      const transaction = db.transaction(["records"], "readwrite")
      const store = transaction.objectStore("records")
      
      const recordWithMetadata: HealthRecord = {
        ...record,
        id: this.generateId(),
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

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
      console.log("Database connection closed")
    }
  }
}

// Create singleton instance
const healthDB = new HealthDatabase()

export default healthDB 