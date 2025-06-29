/**
 * Google Drive数据同步管理器
 * 处理HealthCalendar数据与Google Drive的同步
 */

import { GoogleDriveClient, GoogleDriveFile, GoogleDriveFolder } from './google-drive-client'
import healthDB, { HealthRecord } from '@/lib/health-database'

export interface SyncStatus {
  isSyncing: boolean
  lastSyncTime: Date | null
  syncProgress: number
  error: string | null
}

export interface SyncResult {
  success: boolean
  syncedRecords: number
  syncedUsers: number
  errors: string[]
  folderId?: string
}

export interface UserProfile {
  uniqueOwnerId: string
  ownerId: string
  ownerName: string
  nickname: string
  role: 'primary' | 'family'
  relationship?: string
  isActive: boolean
}

export class GoogleDriveSyncManager {
  private client: GoogleDriveClient
  private healthDb: typeof healthDB

  constructor(client: GoogleDriveClient) {
    this.client = client
    this.healthDb = healthDB
  }

  /**
   * 检查认证状态
   */
  private async checkAuthentication(): Promise<void> {
    if (!this.client.isAuthenticated()) {
      throw new Error('Google Drive未认证')
    }
  }

  /**
   * 初始化同步 - 创建文件夹结构
   */
  async initializeSync(): Promise<string> {
    try {
      await this.checkAuthentication()
      
      // 先查找是否已存在HealthCalendar文件夹
      console.log('查找现有的HealthCalendar文件夹...')
      const existingMainFolder = await this.findFolder('HealthCalendar')
      
      let mainFolder
      if (existingMainFolder) {
        console.log('找到现有的HealthCalendar文件夹:', existingMainFolder.id)
        mainFolder = existingMainFolder
      } else {
        console.log('未找到HealthCalendar文件夹，创建新的...')
        mainFolder = await this.client.createFolder('HealthCalendar')
        console.log('创建了新的HealthCalendar文件夹:', mainFolder.id)
      }
      
      // 创建或查找子文件夹结构
      const usersFolder = await this.findOrCreateFolder('users', mainFolder.id)
      const sharedFolder = await this.findOrCreateFolder('shared', mainFolder.id)
      const backupsFolder = await this.findOrCreateFolder('backups', mainFolder.id)
      
      console.log('Google Drive文件夹结构准备完成:', {
        main: mainFolder.id,
        users: usersFolder.id,
        shared: sharedFolder.id,
        backups: backupsFolder.id
      })
      
      return mainFolder.id
    } catch (error) {
      console.error('初始化同步失败:', error)
      throw error
    }
  }

  /**
   * 同步用户数据
   */
  async syncUserData(userId: string, userData: any): Promise<void> {
    try {
      await this.checkAuthentication()
      
      const usersFolder = await this.findOrCreateFolder('users')
      const userFolder = await this.findOrCreateFolder(userId, usersFolder.id)
      
      // 同步用户配置文件
      console.log(`开始同步用户 ${userId} 的配置文件`)
      await this.client.uploadFile(
        'profile.json',
        JSON.stringify(userData.profile, null, 2),
        userFolder.id
      )
      console.log(`用户 ${userId} 配置文件同步完成`)
      
      // 同步健康记录
      if (userData.records && userData.records.length > 0) {
        console.log(`开始同步用户 ${userId} 的 ${userData.records.length} 条记录`)
        await this.client.uploadFile(
          'records.json',
          JSON.stringify(userData.records, null, 2),
          userFolder.id
        )
        console.log(`用户 ${userId} 记录同步完成`)
      }
      
      // 同步设置
      if (userData.settings) {
        console.log(`开始同步用户 ${userId} 的设置`)
        await this.client.uploadFile(
          'settings.json',
          JSON.stringify(userData.settings, null, 2),
          userFolder.id
        )
        console.log(`用户 ${userId} 设置同步完成`)
      }
      
      console.log(`用户 ${userId} 数据同步完成`)
    } catch (error) {
      console.error(`同步用户 ${userId} 数据失败:`, error)
      throw error
    }
  }

  /**
   * 同步所有数据
   */
  async syncAllData(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedRecords: 0,
      syncedUsers: 0,
      errors: []
    }

    try {
      await this.checkAuthentication()
      
      // 初始化文件夹结构
      const mainFolderId = await this.initializeSync()
      result.folderId = mainFolderId
      
      // 获取所有用户数据
      const allUsers = await this.getAllUsers()
      const allRecords = await this.getAllRecords()
      
      // 按用户分组数据
      const userDataMap = new Map()
      
      // 处理记录数据
      allRecords.forEach(record => {
        const userId = record.ownerId || record.uniqueOwnerId
        if (!userDataMap.has(userId)) {
          userDataMap.set(userId, {
            profile: allUsers.find(u => u.uniqueOwnerId === userId),
            records: [],
            settings: {}
          })
        }
        userDataMap.get(userId).records.push(record)
        result.syncedRecords++
      })
      
      // 获取或创建users文件夹（在主文件夹下）
      const usersFolder = await this.findOrCreateFolder('users', mainFolderId)
      console.log('Users folder created/found:', usersFolder.id)
      
      // 同步每个用户的数据
      for (const [userId, userData] of userDataMap) {
        try {
          // 在users文件夹下创建用户文件夹
          const userFolder = await this.findOrCreateFolder(userId, usersFolder.id)
          console.log(`User folder created/found for ${userId}:`, userFolder.id)
          
          // 同步用户配置文件
          if (userData.profile) {
            console.log(`开始同步用户 ${userId} 的配置文件`)
            await this.client.uploadFile(
              'profile.json',
              JSON.stringify(userData.profile, null, 2),
              userFolder.id
            )
            console.log(`用户 ${userId} 配置文件同步完成`)
          }
          
          // 同步健康记录
          if (userData.records && userData.records.length > 0) {
            console.log(`开始同步用户 ${userId} 的 ${userData.records.length} 条记录`)
            await this.client.uploadFile(
              'records.json',
              JSON.stringify(userData.records, null, 2),
              userFolder.id
            )
            console.log(`用户 ${userId} 记录同步完成`)
          }
          
          // 同步设置
          if (userData.settings) {
            console.log(`开始同步用户 ${userId} 的设置`)
            await this.client.uploadFile(
              'settings.json',
              JSON.stringify(userData.settings, null, 2),
              userFolder.id
            )
            console.log(`用户 ${userId} 设置同步完成`)
          }
          
          console.log(`用户 ${userId} 数据同步完成`)
          result.syncedUsers++
        } catch (error) {
          result.errors.push(`用户 ${userId} 同步失败: ${error}`)
        }
      }
      
      // 创建或更新同步状态文件
      const statusContent = JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        totalUsers: result.syncedUsers,
        totalRecords: result.syncedRecords,
        errors: result.errors
      }, null, 2)
      
      console.log('Creating or updating sync status file with content:', statusContent)
      console.log('Status content length:', statusContent.length)
      
      const statusFileResult = await this.client.createOrUpdateFile(
        'sync-status.json',
        statusContent,
        mainFolderId
      )
      
      console.log('Sync status file created/updated successfully:', statusFileResult.id)
      
      result.success = true
      console.log('所有数据同步完成:', result)
      
    } catch (error) {
      result.errors.push(`同步失败: ${error}`)
      console.error('数据同步失败:', error)
    }
    
    return result
  }

  /**
   * 从Google Drive恢复数据
   */
  async restoreFromGoogleDrive(): Promise<any> {
    try {
      await this.checkAuthentication()
      
      const mainFolder = await this.findFolder('HealthCalendar')
      if (!mainFolder) {
        throw new Error('未找到HealthCalendar文件夹')
      }
      
      const usersFolder = await this.findFolder('users', mainFolder.id)
      if (!usersFolder) {
        throw new Error('未找到users文件夹')
      }
      
      // 获取所有用户文件夹
      const userFolders = await this.client.listFolder(usersFolder.id)
      const restoredData: {
        users: UserProfile[]
        records: HealthRecord[]
      } = {
        users: [],
        records: []
      }
      
      // 恢复每个用户的数据
      for (const userFolder of userFolders) {
        if (userFolder.name !== 'users') {
          try {
            const userData = await this.restoreUserData(userFolder.id, userFolder.name)
            if (userData.profile) restoredData.users.push(userData.profile)
            if (userData.records) restoredData.records.push(...userData.records)
          } catch (error) {
            console.error(`恢复用户 ${userFolder.name} 数据失败:`, error)
          }
        }
      }
      
      return restoredData
    } catch (error) {
      console.error('从Google Drive恢复数据失败:', error)
      throw error
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      await this.checkAuthentication()
      
      const mainFolder = await this.findFolder('HealthCalendar')
      if (!mainFolder) {
        return {
          isSyncing: false,
          lastSyncTime: null,
          syncProgress: 0,
          error: '未找到同步文件夹'
        }
      }
      
      // 尝试读取同步状态文件
      const statusFile = await this.findFile('sync-status.json', mainFolder.id)
      if (statusFile) {
        try {
          console.log('Found sync status file:', statusFile.id)
          const statusContent = await this.client.downloadFile(statusFile.id)
          console.log('Sync status file content:', statusContent)
          
          if (!statusContent || statusContent.trim() === '') {
            console.warn('Sync status file is empty')
            return {
              isSyncing: false,
              lastSyncTime: null,
              syncProgress: 0,
              error: '同步状态文件为空'
            }
          }
          
          const status = JSON.parse(statusContent)
          console.log('Parsed sync status:', status)
          
          return {
            isSyncing: false,
            lastSyncTime: status.lastSyncTime ? new Date(status.lastSyncTime) : null,
            syncProgress: 100,
            error: null
          }
        } catch (parseError) {
          console.error('Failed to parse sync status file:', parseError)
          return {
            isSyncing: false,
            lastSyncTime: null,
            syncProgress: 0,
            error: `同步状态文件解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`
          }
        }
      }
      
      // 如果没有找到同步状态文件，检查是否有其他文件存在
      const allFiles = await this.client.listFolder(mainFolder.id)
      
      if (allFiles.length > 0) {
        return {
          isSyncing: false,
          lastSyncTime: null,
          syncProgress: 50, // 有文件但没有状态文件
          error: null
        }
      }
      
      return {
        isSyncing: false,
        lastSyncTime: null,
        syncProgress: 0,
        error: null
      }
    } catch (error) {
      console.error('getSyncStatus error:', error)
      return {
        isSyncing: false,
        lastSyncTime: null,
        syncProgress: 0,
        error: `获取同步状态失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 查找或创建文件夹
   */
  private async findOrCreateFolder(name: string, parentId?: string): Promise<any> {
    try {
      const items = await this.client.listFolder(parentId)
      const existingFolder = items.find(item => item.name === name)
      
      if (existingFolder) {
        return existingFolder
      } else {
        return await this.client.createFolder(name, parentId)
      }
    } catch (error) {
      console.error(`查找或创建文件夹 ${name} 失败:`, error)
      throw error
    }
  }

  /**
   * 查找文件夹
   */
  private async findFolder(name: string, parentId?: string): Promise<any> {
    try {
      const items = await this.client.listFolder(parentId)
      return items.find(item => item.name === name)
    } catch (error) {
      console.error(`查找文件夹 ${name} 失败:`, error)
      return null
    }
  }

  /**
   * 查找文件
   */
  private async findFile(name: string, parentId?: string): Promise<any> {
    try {
      const items = await this.client.listFolder(parentId)
      return items.find(item => item.name === name)
    } catch (error) {
      console.error(`查找文件 ${name} 失败:`, error)
      return null
    }
  }

  /**
   * 恢复用户数据
   */
  private async restoreUserData(userFolderId: string, userId: string): Promise<any> {
    const userData: any = {}
    
    try {
      // 恢复配置文件
      const profileFile = await this.findFile('profile.json', userFolderId)
      if (profileFile) {
        const profileContent = await this.client.downloadFile(profileFile.id)
        userData.profile = JSON.parse(profileContent)
      }
      
      // 恢复记录
      const recordsFile = await this.findFile('records.json', userFolderId)
      if (recordsFile) {
        const recordsContent = await this.client.downloadFile(recordsFile.id)
        userData.records = JSON.parse(recordsContent)
      }
      
      // 恢复设置
      const settingsFile = await this.findFile('settings.json', userFolderId)
      if (settingsFile) {
        const settingsContent = await this.client.downloadFile(settingsFile.id)
        userData.settings = JSON.parse(settingsContent)
      }
      
      return userData
    } catch (error) {
      console.error(`恢复用户 ${userId} 数据失败:`, error)
      throw error
    }
  }

  /**
   * 获取所有用户数据
   */
  private async getAllUsers(): Promise<UserProfile[]> {
    try {
      // 从localStorage获取用户数据
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('healthcalendar_users')
        if (stored) {
          return JSON.parse(stored)
        }
      }
      
      // 如果没有存储的用户数据，从记录中推断用户信息
      const allRecords = await this.healthDb.getAllRecords()
      const userMap = new Map<string, UserProfile>()
      
      allRecords.forEach(record => {
        const userId = record.uniqueOwnerId || record.ownerId
        if (userId && !userMap.has(userId)) {
          userMap.set(userId, {
            uniqueOwnerId: userId,
            ownerId: record.ownerId,
            ownerName: record.ownerName,
            nickname: record.ownerName,
            role: 'family',
            isActive: true
          })
        }
      })
      
      return Array.from(userMap.values())
    } catch (error) {
      console.error('获取用户数据失败:', error)
      return []
    }
  }

  /**
   * 获取所有记录数据
   */
  private async getAllRecords(): Promise<HealthRecord[]> {
    try {
      return await this.healthDb.getAllRecords()
    } catch (error) {
      console.error('获取记录数据失败:', error)
      return []
    }
  }

  /**
   * 测试同步 - 只上传测试数据
   */
  async testSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedRecords: 0,
      syncedUsers: 0,
      errors: []
    }

    try {
      await this.checkAuthentication()
      
      // 初始化文件夹结构
      const mainFolderId = await this.initializeSync()
      result.folderId = mainFolderId
      
      // 创建测试数据
      const testUserData = {
        profile: {
          uniqueOwnerId: 'test-user-001',
          ownerId: 'test-user-001',
          ownerName: '测试用户',
          groupId: 'test-group-001',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        records: [
          {
            recordId: 'test-record-001',
            uniqueOwnerId: 'test-user-001',
            ownerId: 'test-user-001',
            ownerName: '测试用户',
            groupId: 'test-group-001',
            date: new Date().toISOString().split('T')[0],
            type: 'period',
            flow: 'medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        settings: {
          theme: 'light',
          language: 'zh',
          notifications: true
        }
      }
      
      // 获取或创建users文件夹（在主文件夹下）
      const usersFolder = await this.findOrCreateFolder('users', mainFolderId)
      console.log('Users folder created/found for test:', usersFolder.id)
      
      // 同步测试用户数据
      try {
        // 在users文件夹下创建测试用户文件夹
        const userFolder = await this.findOrCreateFolder('test-user-001', usersFolder.id)
        console.log('Test user folder created/found:', userFolder.id)
        
        // 同步用户配置文件
        console.log('开始同步测试用户配置文件')
        await this.client.uploadFile(
          'profile.json',
          JSON.stringify(testUserData.profile, null, 2),
          userFolder.id
        )
        console.log('测试用户配置文件同步完成')
        
        // 同步健康记录
        if (testUserData.records && testUserData.records.length > 0) {
          console.log(`开始同步测试用户的 ${testUserData.records.length} 条记录`)
          await this.client.uploadFile(
            'records.json',
            JSON.stringify(testUserData.records, null, 2),
            userFolder.id
          )
          console.log('测试用户记录同步完成')
        }
        
        // 同步设置
        if (testUserData.settings) {
          console.log('开始同步测试用户设置')
          await this.client.uploadFile(
            'settings.json',
            JSON.stringify(testUserData.settings, null, 2),
            userFolder.id
          )
          console.log('测试用户设置同步完成')
        }
        
        console.log('测试用户数据同步完成')
        result.syncedUsers = 1
        result.syncedRecords = testUserData.records.length
      } catch (error) {
        result.errors.push(`测试用户同步失败: ${error}`)
      }
      
      // 创建或更新同步状态文件
      const statusContent = JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        totalUsers: result.syncedUsers,
        totalRecords: result.syncedRecords,
        errors: result.errors,
        isTestSync: true
      }, null, 2)
      
      console.log('Creating or updating test sync status file with content:', statusContent)
      
      const statusFileResult = await this.client.createOrUpdateFile(
        'sync-status.json',
        statusContent,
        mainFolderId
      )
      
      console.log('Test sync status file created/updated successfully:', statusFileResult.id)
      
      result.success = result.errors.length === 0
      console.log('测试同步完成:', result)
      
    } catch (error) {
      result.errors.push(`测试同步失败: ${error}`)
      console.error('测试同步失败:', error)
    }
    
    return result
  }

  /**
   * 同步本地数据到Google Drive
   */
  async syncLocalData(localData: { users: UserProfile[], records: HealthRecord[] }): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      syncedRecords: 0,
      syncedUsers: 0,
      errors: []
    }

    try {
      await this.checkAuthentication()
      
      // 初始化文件夹结构
      const mainFolderId = await this.initializeSync()
      result.folderId = mainFolderId
      
      // 按用户分组数据
      const userDataMap = new Map<string, {
        profile: UserProfile
        records: HealthRecord[]
        settings: any
      }>()
      
      // 处理用户数据
      localData.users.forEach(user => {
        userDataMap.set(user.uniqueOwnerId, {
          profile: user,
          records: [],
          settings: {}
        })
      })
      
      // 处理记录数据
      localData.records.forEach(record => {
        const userId = record.uniqueOwnerId || record.ownerId
        if (userDataMap.has(userId)) {
          userDataMap.get(userId)!.records.push(record)
        } else {
          // 如果用户不存在，创建一个默认用户
          userDataMap.set(userId, {
            profile: {
              uniqueOwnerId: userId,
              ownerId: record.ownerId,
              ownerName: record.ownerName,
              nickname: record.ownerName,
              role: 'family',
              isActive: true
            },
            records: [record],
            settings: {}
          })
        }
        result.syncedRecords++
      })
      
      // 获取或创建users文件夹（在主文件夹下）
      const usersFolder = await this.findOrCreateFolder('users', mainFolderId)
      console.log('Users folder created/found:', usersFolder.id)
      
      // 同步每个用户的数据
      for (const [userId, userData] of userDataMap) {
        try {
          // 在users文件夹下创建用户文件夹
          const userFolder = await this.findOrCreateFolder(userId, usersFolder.id)
          console.log(`User folder created/found for ${userId}:`, userFolder.id)
          
          // 同步用户配置文件
          console.log(`开始同步用户 ${userId} 的配置文件`)
          await this.client.uploadFile(
            'profile.json',
            JSON.stringify(userData.profile, null, 2),
            userFolder.id
          )
          console.log(`用户 ${userId} 配置文件同步完成`)
          
          // 同步健康记录
          if (userData.records && userData.records.length > 0) {
            console.log(`开始同步用户 ${userId} 的 ${userData.records.length} 条记录`)
            await this.client.uploadFile(
              'records.json',
              JSON.stringify(userData.records, null, 2),
              userFolder.id
            )
            console.log(`用户 ${userId} 记录同步完成`)
          }
          
          // 同步设置
          if (userData.settings) {
            console.log(`开始同步用户 ${userId} 的设置`)
            await this.client.uploadFile(
              'settings.json',
              JSON.stringify(userData.settings, null, 2),
              userFolder.id
            )
            console.log(`用户 ${userId} 设置同步完成`)
          }
          
          console.log(`用户 ${userId} 数据同步完成`)
          result.syncedUsers++
        } catch (error) {
          result.errors.push(`用户 ${userId} 同步失败: ${error}`)
        }
      }
      
      // 创建或更新同步状态文件
      const statusContent = JSON.stringify({
        lastSyncTime: new Date().toISOString(),
        totalUsers: result.syncedUsers,
        totalRecords: result.syncedRecords,
        errors: result.errors,
        syncType: 'local-data'
      }, null, 2)
      
      console.log('Creating or updating sync status file with content:', statusContent)
      console.log('Status content length:', statusContent.length)
      
      const statusFileResult = await this.client.createOrUpdateFile(
        'sync-status.json',
        statusContent,
        mainFolderId
      )
      
      console.log('Sync status file created/updated successfully:', statusFileResult.id)
      
      result.success = true
      console.log('本地数据同步完成:', result)
      
    } catch (error) {
      result.errors.push(`同步失败: ${error}`)
      console.error('本地数据同步失败:', error)
    }
    
    return result
  }

  /**
   * 清理重复的HealthCalendar文件夹
   * 只保留最新的一个，删除其他的
   */
  async cleanupDuplicateFolders(): Promise<{ deleted: number; kept: string }> {
    try {
      await this.checkAuthentication()
      
      console.log('开始清理重复的HealthCalendar文件夹...')
      
      // 获取根目录下的所有文件夹
      const rootFolders = await this.client.listFolder()
      const healthCalendarFolders = rootFolders.filter(
        item => item.name === 'HealthCalendar' && 'id' in item
      ) as any[]
      
      console.log(`找到 ${healthCalendarFolders.length} 个HealthCalendar文件夹`)
      
      if (healthCalendarFolders.length <= 1) {
        console.log('没有重复的文件夹需要清理')
        return {
          deleted: 0,
          kept: healthCalendarFolders[0]?.id || ''
        }
      }
      
      // 按创建时间排序，保留最新的
      healthCalendarFolders.sort((a, b) => {
        const timeA = new Date(a.lastModifiedTime || 0).getTime()
        const timeB = new Date(b.lastModifiedTime || 0).getTime()
        return timeB - timeA // 最新的在前
      })
      
      const folderToKeep = healthCalendarFolders[0]
      const foldersToDelete = healthCalendarFolders.slice(1)
      
      console.log(`保留最新的文件夹: ${folderToKeep.id} (${folderToKeep.lastModifiedTime})`)
      console.log(`将删除 ${foldersToDelete.length} 个重复文件夹`)
      
      // 删除重复的文件夹
      let deletedCount = 0
      for (const folder of foldersToDelete) {
        try {
          console.log(`删除文件夹: ${folder.id}`)
          await this.client.deleteItem(folder.id)
          deletedCount++
        } catch (error) {
          console.error(`删除文件夹 ${folder.id} 失败:`, error)
        }
      }
      
      console.log(`清理完成: 删除了 ${deletedCount} 个重复文件夹`)
      
      return {
        deleted: deletedCount,
        kept: folderToKeep.id
      }
    } catch (error) {
      console.error('清理重复文件夹失败:', error)
      throw error
    }
  }

  /**
   * 清理重复的sync-status.json文件
   * 只保留最新的一个，删除其他的
   */
  async cleanupDuplicateStatusFiles(): Promise<{ deleted: number; kept: string }> {
    try {
      await this.checkAuthentication()
      
      console.log('开始清理重复的sync-status.json文件...')
      
      // 获取所有HealthCalendar文件夹
      const rootFolders = await this.client.listFolder()
      const healthCalendarFolders = rootFolders.filter(
        item => item.name === 'HealthCalendar' && 'id' in item
      ) as any[]
      
      console.log(`找到 ${healthCalendarFolders.length} 个HealthCalendar文件夹`)
      
      if (healthCalendarFolders.length === 0) {
        console.log('没有找到HealthCalendar文件夹')
        return {
          deleted: 0,
          kept: ''
        }
      }
      
      // 收集所有sync-status.json文件
      const allStatusFiles: Array<{ fileId: string; folderId: string; lastModifiedTime: string }> = []
      
      for (const folder of healthCalendarFolders) {
        try {
          const folderFiles = await this.client.listFolder(folder.id)
          const statusFile = folderFiles.find(file => file.name === 'sync-status.json')
          
          if (statusFile) {
            allStatusFiles.push({
              fileId: statusFile.id,
              folderId: folder.id,
              lastModifiedTime: statusFile.lastModifiedTime || '0'
            })
          }
        } catch (error) {
          console.error(`检查文件夹 ${folder.id} 中的状态文件失败:`, error)
        }
      }
      
      console.log(`找到 ${allStatusFiles.length} 个sync-status.json文件`)
      
      if (allStatusFiles.length <= 1) {
        console.log('没有重复的状态文件需要清理')
        return {
          deleted: 0,
          kept: allStatusFiles[0]?.fileId || ''
        }
      }
      
      // 按修改时间排序，保留最新的
      allStatusFiles.sort((a, b) => {
        const timeA = new Date(a.lastModifiedTime || 0).getTime()
        const timeB = new Date(b.lastModifiedTime || 0).getTime()
        return timeB - timeA // 最新的在前
      })
      
      const fileToKeep = allStatusFiles[0]
      const filesToDelete = allStatusFiles.slice(1)
      
      console.log(`保留最新的状态文件: ${fileToKeep.fileId} (${fileToKeep.lastModifiedTime})`)
      console.log(`将删除 ${filesToDelete.length} 个重复状态文件`)
      
      // 删除重复的状态文件
      let deletedCount = 0
      for (const file of filesToDelete) {
        try {
          console.log(`删除状态文件: ${file.fileId}`)
          await this.client.deleteItem(file.fileId)
          deletedCount++
        } catch (error) {
          console.error(`删除状态文件 ${file.fileId} 失败:`, error)
        }
      }
      
      console.log(`清理完成: 删除了 ${deletedCount} 个重复状态文件`)
      
      return {
        deleted: deletedCount,
        kept: fileToKeep.fileId
      }
    } catch (error) {
      console.error('清理重复状态文件失败:', error)
      throw error
    }
  }
} 