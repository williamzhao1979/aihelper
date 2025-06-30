/**
 * OneDrive客户端
 * 处理与Microsoft Graph API的交互
 */

export interface OneDriveConfig {
  clientId: string
  redirectUri: string
  scopes: string[]
  tenantType?: 'common' | 'consumers' | 'organizations'
}

export interface OneDriveTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface OneDriveFile {
  id: string
  name: string
  size: number
  lastModifiedDateTime: string
  webUrl: string
  downloadUrl?: string
}

export interface OneDriveFolder {
  id: string
  name: string
  childCount: number
  lastModifiedDateTime: string
  webUrl: string
}

export interface OneDriveUploadResult {
  id: string
  name: string
  size: number
  webUrl: string
}

export interface OneDriveError {
  error: {
    code: string
    message: string
    innerError?: {
      code: string
      message: string
    }
  }
}

export class OneDriveClient {
  private config: OneDriveConfig
  private tokens: OneDriveTokens | null = null
  private baseUrl = 'https://graph.microsoft.com/v1.0'

  constructor(config: OneDriveConfig) {
    this.config = config
  }

  /**
   * 获取认证端点
   */
  private getAuthEndpoint(): string {
    const tenantType = this.config.tenantType || 'common'
    return `https://login.microsoftonline.com/${tenantType}/oauth2/v2.0`
  }

  /**
   * 初始化认证流程
   */
  async authenticate(): Promise<void> {
    const authUrl = this.buildAuthUrl()
    const authWindow = window.open(authUrl, 'onedrive-auth', 'width=600,height=700')
    
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'onedrive-auth-success') {
          const { accessToken, refreshToken, expiresIn } = event.data
          this.tokens = {
            accessToken,
            refreshToken,
            expiresAt: Date.now() + expiresIn * 1000
          }
          this.saveTokens()
          window.removeEventListener('message', handleMessage)
          resolve()
        } else if (event.data.type === 'onedrive-auth-error') {
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
      response_mode: 'query',
      state: this.generateState()
    })
    
    return `${this.getAuthEndpoint()}/authorize?${params.toString()}`
  }

  /**
   * 生成随机状态值
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15)
  }

  /**
   * 使用授权码获取访问令牌
   */
  async getTokensFromCode(code: string): Promise<OneDriveTokens> {
    const response = await fetch(`${this.getAuthEndpoint()}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        scope: this.config.scopes.join(' '),
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Token request failed:', errorData)
      throw new Error(`Failed to get tokens: ${response.statusText} - ${errorData.error_description || errorData.error || ''}`)
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshTokens(): Promise<void> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await fetch(`${this.getAuthEndpoint()}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        scope: this.config.scopes.join(' '),
        refresh_token: this.tokens.refreshToken,
        grant_type: 'refresh_token'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Token refresh failed:', errorData)
      throw new Error(`Failed to refresh tokens: ${response.statusText} - ${errorData.error_description || errorData.error || ''}`)
    }

    const data = await response.json()
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.tokens.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000
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
  async createFolder(name: string, parentId?: string): Promise<OneDriveFolder> {
    const accessToken = await this.getValidAccessToken()
    const url = parentId 
      ? `${this.baseUrl}/me/drive/items/${parentId}/children`
      : `${this.baseUrl}/me/drive/root/children`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      })
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to create folder: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      childCount: data.folder?.childCount || 0,
      lastModifiedDateTime: data.lastModifiedDateTime,
      webUrl: data.webUrl
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(name: string, content: string, parentId?: string): Promise<OneDriveUploadResult> {
    const accessToken = await this.getValidAccessToken()
    const url = parentId
      ? `${this.baseUrl}/me/drive/items/${parentId}:/${encodeURIComponent(name)}:/content`
      : `${this.baseUrl}/me/drive/root:/${encodeURIComponent(name)}:/content`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: content
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to upload file: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      size: data.size,
      webUrl: data.webUrl
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(fileId: string): Promise<string> {
    const accessToken = await this.getValidAccessToken()
    const response = await fetch(`${this.baseUrl}/me/drive/items/${fileId}/content`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to download file: ${error.error.message}`)
    }

    return await response.text()
  }

  /**
   * 获取文件信息
   */
  async getFile(fileId: string): Promise<OneDriveFile> {
    const accessToken = await this.getValidAccessToken()
    const response = await fetch(`${this.baseUrl}/me/drive/items/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to get file: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      size: data.size,
      lastModifiedDateTime: data.lastModifiedDateTime,
      webUrl: data.webUrl,
      downloadUrl: data['@microsoft.graph.downloadUrl']
    }
  }

  /**
   * 列出文件夹内容
   */
  async listFolder(folderId?: string): Promise<(OneDriveFile | OneDriveFolder)[]> {
    const accessToken = await this.getValidAccessToken()
    const url = folderId
      ? `${this.baseUrl}/me/drive/items/${folderId}/children`
      : `${this.baseUrl}/me/drive/root/children`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to list folder: ${error.error.message}`)
    }

    const data = await response.json()
    return data.value.map((item: any) => {
      if (item.folder) {
        return {
          id: item.id,
          name: item.name,
          childCount: item.folder.childCount,
          lastModifiedDateTime: item.lastModifiedDateTime,
          webUrl: item.webUrl
        } as OneDriveFolder
      } else {
        return {
          id: item.id,
          name: item.name,
          size: item.size,
          lastModifiedDateTime: item.lastModifiedDateTime,
          webUrl: item.webUrl,
          downloadUrl: item['@microsoft.graph.downloadUrl']
        } as OneDriveFile
      }
    })
  }

  /**
   * 删除文件或文件夹
   */
  async deleteItem(itemId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken()
    const response = await fetch(`${this.baseUrl}/me/drive/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to delete item: ${error.error.message}`)
    }
  }

  /**
   * 搜索文件
   */
  async searchFiles(query: string, folderId?: string): Promise<(OneDriveFile | OneDriveFolder)[]> {
    const accessToken = await this.getValidAccessToken()
    const url = folderId
      ? `${this.baseUrl}/me/drive/items/${folderId}/search(q='${encodeURIComponent(query)}')`
      : `${this.baseUrl}/me/drive/search(q='${encodeURIComponent(query)}')`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to search files: ${error.error.message}`)
    }

    const data = await response.json()
    return data.value.map((item: any) => {
      if (item.folder) {
        return {
          id: item.id,
          name: item.name,
          childCount: item.folder.childCount,
          lastModifiedDateTime: item.lastModifiedDateTime,
          webUrl: item.webUrl
        } as OneDriveFolder
      } else {
        return {
          id: item.id,
          name: item.name,
          size: item.size,
          lastModifiedDateTime: item.lastModifiedDateTime,
          webUrl: item.webUrl,
          downloadUrl: item['@microsoft.graph.downloadUrl']
        } as OneDriveFile
      }
    })
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<{ id: string; displayName: string; email: string }> {
    const accessToken = await this.getValidAccessToken()
    const response = await fetch(`${this.baseUrl}/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to get user info: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      displayName: data.displayName,
      email: data.mail || data.userPrincipalName
    }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<{ used: number; total: number }> {
    const accessToken = await this.getValidAccessToken()
    const response = await fetch(`${this.baseUrl}/me/drive`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      const error: OneDriveError = await response.json()
      throw new Error(`Failed to get storage usage: ${error.error.message}`)
    }

    const data = await response.json()
    return {
      used: data.quota.used,
      total: data.quota.total
    }
  }

  /**
   * 保存令牌到本地存储
   */
  private saveTokens(): void {
    if (this.tokens) {
      localStorage.setItem('onedrive_tokens', JSON.stringify(this.tokens))
    }
  }

  /**
   * 从本地存储加载令牌
   */
  loadTokens(): void {
    const tokensStr = localStorage.getItem('onedrive_tokens')
    if (tokensStr) {
      this.tokens = JSON.parse(tokensStr)
    }
  }

  /**
   * 清除令牌
   */
  clearTokens(): void {
    this.tokens = null
    localStorage.removeItem('onedrive_tokens')
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
} 