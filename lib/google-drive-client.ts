/**
 * Google Drive客户端
 * 处理与Google Drive API的交互
 */

export interface GoogleDriveConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
}

export interface GoogleDriveTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface GoogleDriveFile {
  id: string
  name: string
  size: number
  lastModifiedTime: string
  webViewLink: string
  downloadUrl?: string
}

export interface GoogleDriveFolder {
  id: string
  name: string
  lastModifiedTime: string
  webViewLink: string
}

export interface GoogleDriveUploadResult {
  id: string
  name: string
  size: number
  webViewLink: string
}

export interface GoogleDriveError {
  error: {
    code: number
    message: string
    status: string
  }
}

export class GoogleDriveClient {
  private config: GoogleDriveConfig
  private tokens: GoogleDriveTokens | null = null
  private baseUrl = 'https://www.googleapis.com/drive/v3'

  constructor(config: GoogleDriveConfig) {
    this.config = config
  }

  /**
   * 初始化认证流程
   */
  async authenticate(): Promise<void> {
    const authUrl = this.buildAuthUrl()
    const authWindow = window.open(authUrl, 'google-drive-auth', 'width=600,height=700')
    
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'google-drive-auth-success') {
          const { accessToken, refreshToken, expiresIn } = event.data
          this.tokens = {
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000
          }
          this.saveTokens()
          window.removeEventListener('message', handleMessage)
          resolve()
        } else if (event.data.type === 'google-drive-auth-error') {
          window.removeEventListener('message', handleMessage)
          reject(new Error(event.data.error))
        }
      }
      
      window.addEventListener('message', handleMessage)
      
      // 超时处理
      setTimeout(() => {
        window.removeEventListener('message', handleMessage)
        reject(new Error('Authentication timeout'))
      }, 300000) // 5分钟超时
    })
  }

  /**
   * 构建认证URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: this.generateState()
    })
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  /**
   * 生成随机状态值
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  /**
   * 从授权码获取令牌
   */
  async getTokensFromCode(code: string): Promise<GoogleDriveTokens> {
    // 使用完整的URL，支持本地开发和生产环境
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/google-drive/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Token exchange failed:', errorData)
      throw new Error(`Failed to exchange code for tokens: ${response.statusText} - ${errorData.error || ''}`)
    }

    const data = await response.json()
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + data.expiresIn * 1000
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshTokens(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    // 使用完整的URL，支持本地开发和生产环境
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/google-drive/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: this.tokens.refreshToken,
        clientId: this.config.clientId
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Token refresh failed:', errorData)
      throw new Error(`Failed to refresh tokens: ${response.statusText} - ${errorData.error || ''}`)
    }

    const data = await response.json()
    this.tokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + data.expiresIn * 1000
    }
    this.saveTokens()
  }

  /**
   * 检查令牌是否有效
   */
  private isTokenValid(): boolean {
    return this.tokens !== null && Date.now() < this.tokens.expiresAt - 60000 // 提前1分钟刷新
  }

  /**
   * 获取有效的访问令牌
   */
  private async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('Not authenticated')
    }

    if (!this.isTokenValid()) {
      await this.refreshTokens()
    }

    return this.tokens.accessToken
  }

  /**
   * 创建文件夹
   */
  async createFolder(name: string, parentId?: string): Promise<GoogleDriveFolder> {
    const accessToken = await this.getValidAccessToken()
    const url = `${this.baseUrl}/files`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined
      })
    })

    if (!response.ok) {
      const error: GoogleDriveError = await response.json()
      throw new Error(`Failed to create folder: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      lastModifiedTime: data.modifiedTime,
      webViewLink: data.webViewLink
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(name: string, content: string, parentId?: string): Promise<GoogleDriveUploadResult> {
    const accessToken = await this.getValidAccessToken()
    
    // 使用multipart上传方式以确保文件内容正确写入
    return this.multipartUpload(name, content, parentId)
  }

  /**
   * Multipart上传（确保文件内容正确写入）
   */
  private async multipartUpload(name: string, content: string, parentId?: string): Promise<GoogleDriveUploadResult> {
    const accessToken = await this.getValidAccessToken()
    
    const metadata = {
      name,
      mimeType: 'application/json',
      parents: parentId ? [parentId] : undefined
    }

    console.log('Multipart upload - metadata:', metadata)
    console.log('Multipart upload - content length:', content.length)

    // 使用正确的boundary（不要用WebKitFormBoundary）
    const boundary = `boundary_${Math.random().toString(36).substring(2)}`
    
    // 正确拼接multipart请求体
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      content + '\r\n' +
      `--${boundary}--`

    console.log('Multipart body preview:', body.substring(0, 500))
    console.log('Multipart body length:', body.length)

    // 使用正确的URL：upload/drive/v3/files?uploadType=multipart
    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    })

    console.log('Multipart upload - response status:', response.status)

    if (!response.ok) {
      let errorMessage = 'Failed to upload file'
      try {
        const errorData = await response.json()
        errorMessage = errorData.error?.message || errorMessage
        console.error('Multipart upload - error data:', errorData)
      } catch (e) {
        errorMessage = response.statusText || errorMessage
        console.error('Multipart upload - failed to parse error:', e)
      }
      throw new Error(`Failed to upload file: ${errorMessage}`)
    }

    const data = await response.json()
    console.log('Multipart upload - success data:', data)
    
    return {
      id: data.id,
      name: data.name,
      size: parseInt(data.size) || 0,
      webViewLink: data.webViewLink
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(fileId: string): Promise<string> {
    const accessToken = await this.getValidAccessToken()
    const url = `${this.baseUrl}/files/${fileId}?alt=media`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: GoogleDriveError = await response.json()
      throw new Error(`Failed to download file: ${error.error.message}`)
    }

    return await response.text()
  }

  /**
   * 获取文件信息
   */
  async getFile(fileId: string): Promise<GoogleDriveFile> {
    const accessToken = await this.getValidAccessToken()
    const url = `${this.baseUrl}/files/${fileId}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: GoogleDriveError = await response.json()
      throw new Error(`Failed to get file: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      size: parseInt(data.size) || 0,
      lastModifiedTime: data.modifiedTime,
      webViewLink: data.webViewLink,
      downloadUrl: data.webContentLink
    }
  }

  /**
   * 列出文件夹内容
   */
  async listFolder(folderId?: string): Promise<(GoogleDriveFile | GoogleDriveFolder)[]> {
    const accessToken = await this.getValidAccessToken()
    const url = new URL(`${this.baseUrl}/files`)
    
    url.searchParams.set('q', folderId 
      ? `'${folderId}' in parents and trashed=false`
      : `'root' in parents and trashed=false`
    )
    url.searchParams.set('fields', 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: GoogleDriveError = await response.json()
      throw new Error(`Failed to list folder: ${error.error.message}`)
    }

    const data = await response.json()
    return data.files.map((file: any) => {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        return {
          id: file.id,
          name: file.name,
          lastModifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink
        } as GoogleDriveFolder
      } else {
        return {
          id: file.id,
          name: file.name,
          size: parseInt(file.size) || 0,
          lastModifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          downloadUrl: file.webContentLink
        } as GoogleDriveFile
      }
    })
  }

  /**
   * 删除文件或文件夹
   */
  async deleteItem(itemId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken()
    const url = `${this.baseUrl}/files/${itemId}`

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: GoogleDriveError = await response.json()
      throw new Error(`Failed to delete item: ${error.error.message}`)
    }
  }

  /**
   * 搜索文件
   */
  async searchFiles(query: string, folderId?: string): Promise<(GoogleDriveFile | GoogleDriveFolder)[]> {
    const accessToken = await this.getValidAccessToken()
    const url = new URL(`${this.baseUrl}/files`)
    
    let searchQuery = `name contains '${query}' and trashed=false`
    if (folderId) {
      searchQuery += ` and '${folderId}' in parents`
    }
    
    url.searchParams.set('q', searchQuery)
    url.searchParams.set('fields', 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: GoogleDriveError = await response.json()
      throw new Error(`Failed to search files: ${error.error.message}`)
    }

    const data = await response.json()
    return data.files.map((file: any) => {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        return {
          id: file.id,
          name: file.name,
          lastModifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink
        } as GoogleDriveFolder
      } else {
        return {
          id: file.id,
          name: file.name,
          size: parseInt(file.size) || 0,
          lastModifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          downloadUrl: file.webContentLink
        } as GoogleDriveFile
      }
    })
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<{ id: string; displayName: string; email: string }> {
    const accessToken = await this.getValidAccessToken()
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get user info')
    }

    const data = await response.json()
    return {
      id: data.id,
      displayName: data.name,
      email: data.email
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<{ used: number; total: number }> {
    const accessToken = await this.getValidAccessToken()
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to get storage usage')
    }

    const data = await response.json()
    return {
      used: parseInt(data.storageQuota.usage) || 0,
      total: parseInt(data.storageQuota.limit) || 0
    }
  }

  /**
   * 保存令牌到本地存储
   */
  private saveTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('google-drive-tokens', JSON.stringify(this.tokens))
    }
  }

  /**
   * 从本地存储加载令牌
   */
  loadTokens(): void {
    if (typeof window !== 'undefined') {
      const tokens = localStorage.getItem('google-drive-tokens')
      if (tokens) {
        this.tokens = JSON.parse(tokens)
      }
    }
  }

  /**
   * 设置令牌
   */
  setTokens(tokens: GoogleDriveTokens): void {
    this.tokens = tokens
  }

  /**
   * 清除令牌
   */
  clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('google-drive-tokens')
    }
    this.tokens = null
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.tokens !== null && this.isTokenValid()
  }

  /**
   * 登出
   */
  logout(): void {
    this.clearTokens()
  }

  /**
   * 更新文件内容
   */
  async updateFile(fileId: string, content: string): Promise<GoogleDriveUploadResult> {
    const accessToken = await this.getValidAccessToken()
    
    // 使用multipart上传方式更新文件内容
    const boundary = `boundary_${Math.random().toString(36).substring(2)}`
    
    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({}) + '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: application/json\r\n\r\n' +
      content + '\r\n' +
      `--${boundary}--`

    console.log('Update file - fileId:', fileId)
    console.log('Update file - content length:', content.length)

    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    })

    console.log('Update file - response status:', response.status)

    if (!response.ok) {
      let errorMessage = 'Failed to update file'
      try {
        const errorData = await response.json()
        errorMessage = errorData.error?.message || errorMessage
        console.error('Update file - error data:', errorData)
      } catch (e) {
        errorMessage = response.statusText || errorMessage
        console.error('Update file - failed to parse error:', e)
      }
      throw new Error(`Failed to update file: ${errorMessage}`)
    }

    const data = await response.json()
    console.log('Update file - success data:', data)
    
    return {
      id: data.id,
      name: data.name,
      size: parseInt(data.size) || 0,
      webViewLink: data.webViewLink
    }
  }

  /**
   * 创建或更新文件
   * 如果文件已存在则更新，否则创建新文件
   */
  async createOrUpdateFile(name: string, content: string, parentId?: string): Promise<GoogleDriveUploadResult> {
    try {
      // 先查找是否已存在同名文件
      const items = await this.listFolder(parentId)
      const existingFile = items.find(item => item.name === name && 'size' in item) as GoogleDriveFile | undefined
      
      if (existingFile) {
        console.log(`File ${name} already exists, updating...`)
        return await this.updateFile(existingFile.id, content)
      } else {
        console.log(`File ${name} does not exist, creating new...`)
        return await this.uploadFile(name, content, parentId)
      }
    } catch (error) {
      console.error(`Failed to create or update file ${name}:`, error)
      throw error
    }
  }
} 