import { sign, verify } from 'jsonwebtoken'
import { randomBytes } from 'crypto'

export interface EnvUser {
  id: string
  username: string
  email: string
  displayName: string
  role: 'admin' | 'user'
  permissions: string[]
}

export interface LoginResult {
  success: boolean
  user?: EnvUser
  token?: string
  error?: string
}

export class EnvAuthService {
  private readonly users: Map<string, EnvUser> = new Map()
  private readonly sessionSecret: string
  private readonly sessionDuration: number
  private readonly maxLoginAttempts: number
  private readonly lockoutDuration: number
  private readonly loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map()

  constructor() {
    this.sessionSecret = process.env.AUTH_SESSION_SECRET || 'fallback-secret'
    this.sessionDuration = parseInt(process.env.AUTH_SESSION_DURATION || '86400')
    this.maxLoginAttempts = parseInt(process.env.AUTH_MAX_LOGIN_ATTEMPTS || '5')
    this.lockoutDuration = parseInt(process.env.AUTH_LOCKOUT_DURATION || '900')
    
    this.loadUsersFromEnv()
  }

  /**
   * 从环境变量加载用户
   */
  private loadUsersFromEnv(): void {
    console.log('[EnvAuthService] 开始加载用户配置...')
    console.log('[EnvAuthService] AUTH_ENABLED:', process.env.AUTH_ENABLED)
    console.log('[EnvAuthService] ADMIN_USERNAME:', process.env.ADMIN_USERNAME)
    console.log('[EnvAuthService] ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '已设置' : '未设置')
    
    // 加载管理员账户
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      this.users.set(process.env.ADMIN_USERNAME, {
        id: 'admin',
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL || `${process.env.ADMIN_USERNAME}@example.com`,
        displayName: process.env.ADMIN_DISPLAY_NAME || '管理员',
        role: 'admin',
        permissions: ['read', 'write', 'delete', 'admin']
      })
      console.log('[EnvAuthService] 已加载管理员账户:', process.env.ADMIN_USERNAME)
    } else {
      console.log('[EnvAuthService] 管理员账户配置不完整')
    }

    // 加载测试账户
    if (process.env.TEST_USERNAME && process.env.TEST_PASSWORD) {
      this.users.set(process.env.TEST_USERNAME, {
        id: 'test',
        username: process.env.TEST_USERNAME,
        email: process.env.TEST_EMAIL || `${process.env.TEST_USERNAME}@example.com`,
        displayName: process.env.TEST_DISPLAY_NAME || '测试用户',
        role: 'user',
        permissions: ['read', 'write']
      })
      console.log('[EnvAuthService] 已加载测试账户:', process.env.TEST_USERNAME)
    } else {
      console.log('[EnvAuthService] 测试账户配置不完整')
    }

    // 加载其他用户账户
    let userIndex = 1
    while (true) {
      const username = process.env[`USER_${userIndex}_USERNAME`]
      const password = process.env[`USER_${userIndex}_PASSWORD`]
      
      if (!username || !password) break

      this.users.set(username, {
        id: `user_${userIndex}`,
        username,
        email: process.env[`USER_${userIndex}_EMAIL`] || `${username}@example.com`,
        displayName: process.env[`USER_${userIndex}_DISPLAY_NAME`] || `用户${userIndex}`,
        role: 'user',
        permissions: ['read', 'write']
      })

      userIndex++
    }

    console.log(`[EnvAuthService] 已加载 ${this.users.size} 个用户账户`)
  }

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // 检查账户锁定
      const lockoutInfo = this.loginAttempts.get(username)
      if (lockoutInfo && lockoutInfo.count >= this.maxLoginAttempts) {
        const timeSinceLastAttempt = Date.now() - lockoutInfo.lastAttempt
        if (timeSinceLastAttempt < this.lockoutDuration * 1000) {
          const remainingTime = Math.ceil((this.lockoutDuration * 1000 - timeSinceLastAttempt) / 1000)
          return {
            success: false,
            error: `账户被锁定，请 ${remainingTime} 秒后重试`
          }
        } else {
          // 锁定时间已过，重置尝试次数
          this.loginAttempts.delete(username)
        }
      }

      // 查找用户
      const user = this.users.get(username)
      if (!user) {
        this.recordFailedLogin(username)
        return { success: false, error: '用户名或密码错误' }
      }

      // 验证密码
      const expectedPassword = this.getPasswordForUser(username)
      if (password !== expectedPassword) {
        this.recordFailedLogin(username)
        return { success: false, error: '用户名或密码错误' }
      }

      // 登录成功，重置尝试次数
      this.loginAttempts.delete(username)

      // 生成 JWT 令牌
      const token = this.generateToken(user)

      return {
        success: true,
        user,
        token
      }
    } catch (error) {
      console.error('登录错误:', error)
      return { success: false, error: '登录失败，请重试' }
    }
  }

  /**
   * 验证令牌
   */
  async validateToken(token: string): Promise<EnvUser | null> {
    try {
      const decoded = verify(token, this.sessionSecret) as any
      const user = this.users.get(decoded.username)
      
      if (!user || user.id !== decoded.userId) {
        return null
      }

      return user
    } catch (error) {
      console.error('令牌验证错误:', error)
      return null
    }
  }

  /**
   * 获取所有用户列表
   */
  getAllUsers(): EnvUser[] {
    return Array.from(this.users.values())
  }

  /**
   * 根据用户名获取用户
   */
  getUserByUsername(username: string): EnvUser | undefined {
    return this.users.get(username)
  }

  /**
   * 检查用户权限
   */
  hasPermission(user: EnvUser, permission: string): boolean {
    return user.permissions.includes(permission) || user.role === 'admin'
  }

  // 私有方法

  private getPasswordForUser(username: string): string {
    // 根据用户名获取对应的密码环境变量
    if (username === process.env.ADMIN_USERNAME) {
      return process.env.ADMIN_PASSWORD || ''
    }
    if (username === process.env.TEST_USERNAME) {
      return process.env.TEST_PASSWORD || ''
    }

    // 查找其他用户
    let userIndex = 1
    while (true) {
      const envUsername = process.env[`USER_${userIndex}_USERNAME`]
      if (!envUsername) break
      
      if (username === envUsername) {
        return process.env[`USER_${userIndex}_PASSWORD`] || ''
      }
      
      userIndex++
    }

    return ''
  }

  private recordFailedLogin(username: string): void {
    const current = this.loginAttempts.get(username) || { count: 0, lastAttempt: 0 }
    this.loginAttempts.set(username, {
      count: current.count + 1,
      lastAttempt: Date.now()
    })
  }

  private generateToken(user: EnvUser): string {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.sessionDuration
    }

    return sign(payload, this.sessionSecret)
  }
} 