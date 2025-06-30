/**
 * OneDrive同步管理器
 * 处理健康数据的同步逻辑
 */

import { OneDriveClient, OneDriveFile, OneDriveFolder } from './onedrive-client'

export interface SyncStatus {
  lastSyncTime: Date | null
  syncStatus: 'idle' | 'syncing' | 'error'
  pendingChanges: number
  conflicts: SyncConflict[]
  deviceId: string
  networkStatus: 'online' | 'offline' | 'limited'
  errorMessage?: string
}

export interface SyncConflict {
  id: string
  localVersion: any
  remoteVersion: any
  conflictType: 'timestamp' | 'content' | 'delete' | 'create'
  resolution: 'local' | 'remote' | 'merge' | 'manual' | null
  userChoice?: any
}

export interface SyncOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  data: any
  timestamp: Date
  retryCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface HealthDataFile {
  uniqueOwnerId: string
  records: any[]
  lastUpdated: Date
  version: string
  checksum: string
}

export class OneDriveSyncManager {
  private client: OneDriveClient
  private syncStatus: SyncStatus
  private offlineQueue: SyncOperation[] = []
  private deviceId: string
  private rootFolderId: string | null = null
  private userFolders: Map<string, string> = new Map() // uniqueOwnerId -> folderId

  constructor(client: OneDriveClient) {
    this.client = client
    this.deviceId = this.generateDeviceId()
    this.syncStatus = {
      lastSyncTime: null,
      syncStatus: 'idle',
      pendingChanges: 0,
      conflicts: [],
      deviceId: this.deviceId,
      networkStatus: 'online'
    }
    this.loadSyncStatus()
    this.loadOfflineQueue()
  }

  /**
   * 初始化OneDrive文件夹结构
   */
  async initialize(): Promise<void> {
    try {
      this.syncStatus.syncStatus = 'syncing'
      this.updateSyncStatus()

      // 创建根文件夹
      const rootFolder = await this.createOrGetRootFolder()
      this.rootFolderId = rootFolder.id

      // 创建必要的子文件夹
      await this.createFolderStructure()

      this.syncStatus.syncStatus = 'idle'
      this.syncStatus.lastSyncTime = new Date()
      this.updateSyncStatus()
    } catch (error) {
      this.syncStatus.syncStatus = 'error'
      this.syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.updateSyncStatus()
      throw error
    }
  }

  /**
   * 创建或获取根文件夹
   */
  private async createOrGetRootFolder(): Promise<OneDriveFolder> {
    try {
      // 尝试查找现有的根文件夹
      const items = await this.client.listFolder()
      const existingFolder = items.find(item => 
        'childCount' in item && item.name === 'HealthCalendar'
      ) as OneDriveFolder | undefined

      if (existingFolder) {
        return existingFolder
      }

      // 创建新的根文件夹
      return await this.client.createFolder('HealthCalendar')
    } catch (error) {
      console.error('Failed to create or get root folder:', error)
      throw error
    }
  }

  /**
   * 创建文件夹结构
   */
  private async createFolderStructure(): Promise<void> {
    if (!this.rootFolderId) return

    const folders = [
      'users',
      'shared',
      'sync',
      'backup'
    ]

    for (const folderName of folders) {
      try {
        const items = await this.client.listFolder(this.rootFolderId)
        const existingFolder = items.find(item => 
          'childCount' in item && item.name === folderName
        ) as OneDriveFolder | undefined

        if (!existingFolder) {
          await this.client.createFolder(folderName, this.rootFolderId)
        }
      } catch (error) {
        console.error(`Failed to create folder ${folderName}:`, error)
      }
    }
  }

  /**
   * 同步用户数据
   */
  async syncUserData(uniqueOwnerId: string, localData: any[]): Promise<void> {
    try {
      this.syncStatus.syncStatus = 'syncing'
      this.updateSyncStatus()

      // 获取或创建用户文件夹
      const userFolderId = await this.getOrCreateUserFolder(uniqueOwnerId)

      // 获取云端数据
      const remoteData = await this.getRemoteUserData(userFolderId)

      // 合并数据
      const mergedData = this.mergeUserData(localData, remoteData)

      // 解决冲突
      const resolvedData = await this.resolveConflicts(mergedData)

      // 保存到云端
      await this.saveUserDataToCloud(userFolderId, resolvedData)

      // 更新同步状态
      this.syncStatus.lastSyncTime = new Date()
      this.syncStatus.syncStatus = 'idle'
      this.updateSyncStatus()
    } catch (error) {
      this.syncStatus.syncStatus = 'error'
      this.syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.updateSyncStatus()
      throw error
    }
  }

  /**
   * 获取或创建用户文件夹
   */
  private async getOrCreateUserFolder(uniqueOwnerId: string): Promise<string> {
    if (this.userFolders.has(uniqueOwnerId)) {
      return this.userFolders.get(uniqueOwnerId)!
    }

    if (!this.rootFolderId) {
      throw new Error('Root folder not initialized')
    }

    try {
      // 查找现有的用户文件夹
      const usersFolder = await this.getUsersFolder()
      const items = await this.client.listFolder(usersFolder)
      const existingFolder = items.find(item => 
        'childCount' in item && item.name === `user_${uniqueOwnerId}`
      ) as OneDriveFolder | undefined

      let userFolderId: string
      if (existingFolder) {
        userFolderId = existingFolder.id
      } else {
        // 创建新的用户文件夹
        const newFolder = await this.client.createFolder(`user_${uniqueOwnerId}`, usersFolder)
        userFolderId = newFolder.id
      }

      this.userFolders.set(uniqueOwnerId, userFolderId)
      return userFolderId
    } catch (error) {
      console.error('Failed to get or create user folder:', error)
      throw error
    }
  }

  /**
   * 获取users文件夹
   */
  private async getUsersFolder(): Promise<string> {
    if (!this.rootFolderId) {
      throw new Error('Root folder not initialized')
    }

    const items = await this.client.listFolder(this.rootFolderId)
    const usersFolder = items.find(item => 
      'childCount' in item && item.name === 'users'
    ) as OneDriveFolder | undefined

    if (!usersFolder) {
      throw new Error('Users folder not found')
    }

    return usersFolder.id
  }

  /**
   * 获取云端用户数据
   */
  private async getRemoteUserData(userFolderId: string): Promise<any[]> {
    try {
      const items = await this.client.listFolder(userFolderId)
      const recordsFile = items.find(item => 
        !('childCount' in item) && item.name === 'records.json'
      ) as OneDriveFile | undefined

      if (!recordsFile) {
        return []
      }

      const content = await this.client.downloadFile(recordsFile.id)
      const data: HealthDataFile = JSON.parse(content)
      return data.records || []
    } catch (error) {
      console.error('Failed to get remote user data:', error)
      return []
    }
  }

  /**
   * 合并用户数据
   */
  private mergeUserData(localData: any[], remoteData: any[]): any[] {
    const mergedMap = new Map<string, any>()

    // 添加本地数据
    for (const record of localData) {
      if (record.recordId) {
        mergedMap.set(record.recordId, record)
      }
    }

    // 合并远程数据
    for (const record of remoteData) {
      if (record.recordId) {
        const localRecord = mergedMap.get(record.recordId)
        if (!localRecord) {
          // 远程记录不存在于本地，添加
          mergedMap.set(record.recordId, record)
        } else {
          // 记录存在，比较时间戳
          const localTime = new Date(localRecord.updatedAt || localRecord.createdAt).getTime()
          const remoteTime = new Date(record.updatedAt || record.createdAt).getTime()
          
          if (remoteTime > localTime) {
            // 远程记录更新，替换本地记录
            mergedMap.set(record.recordId, record)
          }
        }
      }
    }

    return Array.from(mergedMap.values())
  }

  /**
   * 解决数据冲突
   */
  private async resolveConflicts(mergedData: any[]): Promise<any[]> {
    // 这里可以实现更复杂的冲突解决逻辑
    // 目前简单地返回合并后的数据
    return mergedData
  }

  /**
   * 保存用户数据到云端
   */
  private async saveUserDataToCloud(userFolderId: string, data: any[]): Promise<void> {
    const healthDataFile: HealthDataFile = {
      uniqueOwnerId: data[0]?.uniqueOwnerId || '',
      records: data,
      lastUpdated: new Date(),
      version: '1.0',
      checksum: this.generateChecksum(data)
    }

    const content = JSON.stringify(healthDataFile, null, 2)
    await this.client.uploadFile('records.json', content, userFolderId)
  }

  /**
   * 添加离线操作到队列
   */
  async addOfflineOperation(operation: Omit<SyncOperation, 'id' | 'retryCount' | 'status'>): Promise<void> {
    const offlineOperation: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      retryCount: 0,
      status: 'pending'
    }

    this.offlineQueue.push(offlineOperation)
    this.saveOfflineQueue()
    this.syncStatus.pendingChanges = this.offlineQueue.length
    this.updateSyncStatus()
  }

  /**
   * 处理离线队列
   */
  async processOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return

    this.syncStatus.syncStatus = 'syncing'
    this.updateSyncStatus()

    const operations = [...this.offlineQueue]
    this.offlineQueue = []

    for (const operation of operations) {
      try {
        operation.status = 'processing'
        await this.executeOperation(operation)
        operation.status = 'completed'
      } catch (error) {
        console.error('Failed to execute operation:', error)
        operation.status = 'failed'
        operation.retryCount++

        if (operation.retryCount < 3) {
          // 重新添加到队列
          this.offlineQueue.push(operation)
        }
      }
    }

    this.saveOfflineQueue()
    this.syncStatus.pendingChanges = this.offlineQueue.length
    this.syncStatus.syncStatus = 'idle'
    this.syncStatus.lastSyncTime = new Date()
    this.updateSyncStatus()
  }

  /**
   * 执行同步操作
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.createRecord(operation.data)
        break
      case 'update':
        await this.updateRecord(operation.data)
        break
      case 'delete':
        await this.deleteRecord(operation.data)
        break
      default:
        throw new Error(`Unknown operation type: ${operation.type}`)
    }
  }

  /**
   * 创建记录
   */
  private async createRecord(data: any): Promise<void> {
    // 实现创建记录的逻辑
    console.log('Creating record:', data)
  }

  /**
   * 更新记录
   */
  private async updateRecord(data: any): Promise<void> {
    // 实现更新记录的逻辑
    console.log('Updating record:', data)
  }

  /**
   * 删除记录
   */
  private async deleteRecord(data: any): Promise<void> {
    // 实现删除记录的逻辑
    console.log('Deleting record:', data)
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * 检查网络状态
   */
  private checkNetworkStatus(): 'online' | 'offline' | 'limited' {
    if (!navigator.onLine) {
      return 'offline'
    }
    // 这里可以添加更复杂的网络检测逻辑
    return 'online'
  }

  /**
   * 生成设备ID
   */
  private generateDeviceId(): string {
    const storedId = localStorage.getItem('device_id')
    if (storedId) {
      return storedId
    }

    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('device_id', newId)
    return newId
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 生成数据校验和
   */
  private generateChecksum(data: any[]): string {
    const content = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(16)
  }

  /**
   * 保存同步状态
   */
  private updateSyncStatus(): void {
    this.syncStatus.networkStatus = this.checkNetworkStatus()
    localStorage.setItem('onedrive_sync_status', JSON.stringify(this.syncStatus))
  }

  /**
   * 加载同步状态
   */
  private loadSyncStatus(): void {
    const stored = localStorage.getItem('onedrive_sync_status')
    if (stored) {
      const parsed = JSON.parse(stored)
      this.syncStatus = {
        ...this.syncStatus,
        ...parsed,
        lastSyncTime: parsed.lastSyncTime ? new Date(parsed.lastSyncTime) : null
      }
    }
  }

  /**
   * 保存离线队列
   */
  private saveOfflineQueue(): void {
    localStorage.setItem('onedrive_offline_queue', JSON.stringify(this.offlineQueue))
  }

  /**
   * 加载离线队列
   */
  private loadOfflineQueue(): void {
    const stored = localStorage.getItem('onedrive_offline_queue')
    if (stored) {
      this.offlineQueue = JSON.parse(stored).map((op: any) => ({
        ...op,
        timestamp: new Date(op.timestamp)
      }))
    }
  }

  /**
   * 清除同步数据
   */
  clearSyncData(): void {
    this.syncStatus = {
      lastSyncTime: null,
      syncStatus: 'idle',
      pendingChanges: 0,
      conflicts: [],
      deviceId: this.deviceId,
      networkStatus: 'online'
    }
    this.offlineQueue = []
    this.userFolders.clear()
    this.rootFolderId = null
    
    localStorage.removeItem('onedrive_sync_status')
    localStorage.removeItem('onedrive_offline_queue')
  }
} 