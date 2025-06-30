/**
 * Google Drive客户端同步管理器
 * 在客户端处理同步操作，确保认证状态正确
 */

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

export class GoogleDriveClientSync {
  /**
   * 获取认证令牌
   */
  private static getAuthTokens(): { accessToken: string; refreshToken: string; expiresAt: string } | null {
    if (typeof window === 'undefined') return null
    
    try {
      const tokens = localStorage.getItem('google-drive-tokens')
      if (tokens) {
        const parsedTokens = JSON.parse(tokens)
        return {
          accessToken: parsedTokens.accessToken,
          refreshToken: parsedTokens.refreshToken,
          expiresAt: parsedTokens.expiresAt.toString()
        }
      }
    } catch (error) {
      console.error('获取认证令牌失败:', error)
    }
    
    return null
  }

  /**
   * 获取基础URL
   */
  private static getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  }

  /**
   * 初始化同步
   */
  static async initializeSync(): Promise<{ success: boolean; folderId?: string; error?: string }> {
    try {
      const authTokens = this.getAuthTokens()
      if (!authTokens) {
        return {
          success: false,
          error: 'Google Drive未认证，请先连接Google Drive账户'
        }
      }

      console.log('Initializing sync...')
      const response = await fetch(`${this.getBaseUrl()}/api/google-drive/sync-with-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'initialize',
          ...authTokens
        })
      })
      
      console.log('Initialize response status:', response.status)
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Google Drive未认证，请先连接Google Drive账户'
        }
      }
      
      if (!response.ok) {
        let errorMessage = '初始化失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          console.error('Failed to parse error response:', e)
          errorMessage = response.statusText || errorMessage
        }
        return {
          success: false,
          error: errorMessage
        }
      }
      
      // 检查响应是否为空
      const responseText = await response.text()
      console.log('Initialize response text:', responseText)
      
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from server')
        return {
          success: false,
          error: '服务器返回空响应'
        }
      }
      
      try {
        const result = JSON.parse(responseText)
        console.log('Parsed initialize result:', result)
        return {
          success: true,
          folderId: result.folderId
        }
      } catch (e) {
        console.error('JSON解析失败:', e, 'Response text:', responseText)
        return {
          success: false,
          error: `响应格式错误: ${e instanceof Error ? e.message : '未知错误'}`
        }
      }
    } catch (error) {
      console.error('初始化同步失败:', error)
      return {
        success: false,
        error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 同步数据
   */
  static async syncData(): Promise<SyncResult> {
    try {
      const authTokens = this.getAuthTokens()
      if (!authTokens) {
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['Google Drive未认证，请先连接Google Drive账户']
        }
      }

      console.log('Starting data sync...')
      const response = await fetch(`${this.getBaseUrl()}/api/google-drive/sync-with-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'sync',
          ...authTokens
        })
      })
      
      console.log('Sync response status:', response.status)
      
      if (response.status === 401) {
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['Google Drive未认证，请先连接Google Drive账户']
        }
      }
      
      if (!response.ok) {
        let errorMessage = '同步失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          console.error('Failed to parse error response:', e)
          errorMessage = response.statusText || errorMessage
        }
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: [errorMessage]
        }
      }
      
      // 检查响应是否为空
      const responseText = await response.text()
      console.log('Sync response text:', responseText)
      
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from server')
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['服务器返回空响应']
        }
      }
      
      try {
        const result = JSON.parse(responseText)
        console.log('Parsed sync result:', result)
        return result
      } catch (e) {
        console.error('JSON解析失败:', e, 'Response text:', responseText)
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: [`响应格式错误: ${e instanceof Error ? e.message : '未知错误'}`]
        }
      }
    } catch (error) {
      console.error('同步数据失败:', error)
      return {
        success: false,
        syncedRecords: 0,
        syncedUsers: 0,
        errors: [`网络错误: ${error instanceof Error ? error.message : '未知错误'}`]
      }
    }
  }

  /**
   * 获取同步状态
   */
  static async getSyncStatus(): Promise<SyncStatus> {
    try {
      const authTokens = this.getAuthTokens()
      if (!authTokens) {
        return {
          isSyncing: false,
          lastSyncTime: null,
          syncProgress: 0,
          error: 'Google Drive未认证，请先连接Google Drive账户'
        }
      }

      console.log('Fetching sync status...')
      const response = await fetch(`${this.getBaseUrl()}/api/google-drive/sync-with-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'status',
          ...authTokens
        })
      })
      
      console.log('Sync status response status:', response.status)
      console.log('Sync status response headers:', Object.fromEntries(response.headers.entries()))
      
      if (response.status === 401) {
        return {
          isSyncing: false,
          lastSyncTime: null,
          syncProgress: 0,
          error: 'Google Drive未认证，请先连接Google Drive账户'
        }
      }
      
      if (!response.ok) {
        let errorMessage = '获取状态失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          console.error('Failed to parse error response:', e)
          errorMessage = response.statusText || errorMessage
        }
        return {
          isSyncing: false,
          lastSyncTime: null,
          syncProgress: 0,
          error: errorMessage
        }
      }
      
      // 检查响应是否为空
      const responseText = await response.text()
      console.log('Sync status response text length:', responseText.length)
      console.log('Sync status response text:', responseText)
      
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from server')
        return {
          isSyncing: false,
          lastSyncTime: null,
          syncProgress: 0,
          error: '服务器返回空响应'
        }
      }
      
      try {
        const data = JSON.parse(responseText)
        console.log('Parsed sync status:', data)
        
        // 确保返回的数据格式正确
        return {
          isSyncing: data.isSyncing || false,
          lastSyncTime: data.lastSyncTime ? new Date(data.lastSyncTime) : null,
          syncProgress: data.syncProgress || 0,
          error: data.error || null
        }
      } catch (e) {
        console.error('JSON解析失败:', e, 'Response text:', responseText)
        return {
          isSyncing: false,
          lastSyncTime: null,
          syncProgress: 0,
          error: `响应格式错误: ${e instanceof Error ? e.message : '未知错误'}`
        }
      }
    } catch (error) {
      console.error('获取同步状态失败:', error)
      return {
        isSyncing: false,
        lastSyncTime: null,
        syncProgress: 0,
        error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 从Google Drive恢复数据
   */
  static async restoreData(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const authTokens = this.getAuthTokens()
      if (!authTokens) {
        return {
          success: false,
          error: 'Google Drive未认证，请先连接Google Drive账户'
        }
      }

      const response = await fetch(`${this.getBaseUrl()}/api/google-drive/sync-with-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'restore',
          ...authTokens
        })
      })
      
      if (response.status === 401) {
        return {
          success: false,
          error: 'Google Drive未认证，请先连接Google Drive账户'
        }
      }
      
      if (!response.ok) {
        let errorMessage = '恢复失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        return {
          success: false,
          error: errorMessage
        }
      }
      
      try {
        const result = await response.json()
        return {
          success: true,
          data: result.data
        }
      } catch (e) {
        console.error('JSON解析失败:', e)
        return {
          success: false,
          error: '响应格式错误'
        }
      }
    } catch (error) {
      console.error('恢复数据失败:', error)
      return {
        success: false,
        error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 测试同步
   */
  static async testSync(): Promise<SyncResult> {
    try {
      const authTokens = this.getAuthTokens()
      if (!authTokens) {
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['Google Drive未认证，请先连接Google Drive账户']
        }
      }

      const response = await fetch(`${this.getBaseUrl()}/api/google-drive/sync-with-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'test-sync',
          ...authTokens
        })
      })
      
      if (response.status === 401) {
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['Google Drive未认证，请先连接Google Drive账户']
        }
      }
      
      if (!response.ok) {
        let errorMessage = '测试同步失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: [errorMessage]
        }
      }
      
      try {
        return await response.json()
      } catch (e) {
        console.error('JSON解析失败:', e)
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['响应格式错误']
        }
      }
    } catch (error) {
      console.error('测试同步失败:', error)
      return {
        success: false,
        syncedRecords: 0,
        syncedUsers: 0,
        errors: [`网络错误: ${error instanceof Error ? error.message : '未知错误'}`]
      }
    }
  }

  /**
   * 同步本地数据到Google Drive
   */
  static async syncLocalData(): Promise<SyncResult> {
    try {
      const authTokens = this.getAuthTokens()
      if (!authTokens) {
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['Google Drive未认证，请先连接Google Drive账户']
        }
      }

      // 获取本地数据
      const localData = await this.getLocalData()
      console.log('Local data to sync:', localData)

      console.log('Starting local data sync...')
      const response = await fetch(`${this.getBaseUrl()}/api/google-drive/sync-with-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          action: 'sync-local-data',
          localData,
          ...authTokens
        })
      })
      
      console.log('Sync local data response status:', response.status)
      
      if (response.status === 401) {
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['Google Drive未认证，请先连接Google Drive账户']
        }
      }
      
      if (!response.ok) {
        let errorMessage = '同步失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          console.error('Failed to parse error response:', e)
          errorMessage = response.statusText || errorMessage
        }
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: [errorMessage]
        }
      }
      
      // 检查响应是否为空
      const responseText = await response.text()
      console.log('Sync local data response text:', responseText)
      
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from server')
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['服务器返回空响应']
        }
      }
      
      try {
        const result = JSON.parse(responseText)
        return result
      } catch (e) {
        console.error('JSON解析失败:', e)
        return {
          success: false,
          syncedRecords: 0,
          syncedUsers: 0,
          errors: ['响应格式错误']
        }
      }
    } catch (error) {
      console.error('同步本地数据失败:', error)
      return {
        success: false,
        syncedRecords: 0,
        syncedUsers: 0,
        errors: [`网络错误: ${error instanceof Error ? error.message : '未知错误'}`]
      }
    }
  }

  /**
   * 获取本地数据
   */
  private static async getLocalData(): Promise<{
    users: any[]
    records: any[]
  }> {
    try {
      // 获取用户数据
      const users = this.getLocalUsers()
      
      // 获取健康记录数据
      const records = await this.getLocalRecords()
      
      return {
        users,
        records
      }
    } catch (error) {
      console.error('获取本地数据失败:', error)
      return {
        users: [],
        records: []
      }
    }
  }

  /**
   * 获取本地用户数据
   */
  private static getLocalUsers(): any[] {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('healthcalendar_users')
        if (stored) {
          return JSON.parse(stored)
        }
      }
      return []
    } catch (error) {
      console.error('获取本地用户数据失败:', error)
      return []
    }
  }

  /**
   * 获取本地健康记录数据
   */
  private static async getLocalRecords(): Promise<any[]> {
    try {
      // 动态导入健康数据库
      const { default: healthDB } = await import('@/lib/health-database')
      
      // 确保数据库已初始化
      await healthDB.init()
      
      // 获取所有记录
      return await healthDB.getAllRecords()
    } catch (error) {
      console.error('获取本地记录数据失败:', error)
      return []
    }
  }
} 