"use client"

import { useUserManagement } from "@/hooks/use-user-management"
import React, { createContext, useContext, useEffect, useState } from "react"

interface User {
  id: string
  username: string
  email: string
  displayName: string
  role: "admin" | "user"
  permissions: string[]
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/env-validate")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    console.log('[AuthContext] 开始登录请求')
    
    try {
      const response = await fetch("/api/auth/env-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      })

      // 检查响应是否为JSON格式
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.error('[AuthContext] 响应不是JSON格式:', contentType)
        const text = await response.text()
        console.error('[AuthContext] 响应内容:', text)
        throw new Error("服务器响应格式错误，请稍后重试")
      }

      const data = await response.json()
      
      console.log('[AuthContext] 登录响应:', { status: response.status, data })

      if (!response.ok) {
        console.error('[AuthContext] 登录失败:', data.error)
        // 提供更友好的错误消息
        const errorMessage = data.error || 
          (response.status === 401 ? "用户名或密码错误" : 
           response.status === 403 ? "账户被禁用，请联系管理员" :
           response.status >= 500 ? "服务器错误，请稍后重试" : 
           "登录失败，请重试")
        throw new Error(errorMessage)
      }

      console.log('[AuthContext] 登录成功，更新用户状态')
      // Update user state
      setUser(data.user)
      
      console.log('[AuthContext] 用户状态已更新:', data.user)

      // Clear user list cache and trigger refresh
      console.log('[AuthContext] 清除用户列表缓存并触发刷新')
      localStorage.removeItem('healthcalendar_users')
      localStorage.setItem('user_list_refresh_needed', Date.now().toString())
      
      // Trigger custom event for same-tab refresh
      window.dispatchEvent(new Event('userListRefreshNeeded'))
      
    } catch (error) {
      console.error('[AuthContext] 登录请求异常:', error)
      
      // 重新抛出错误，但确保错误消息是友好的
      if (error instanceof Error) {
        // 如果已经是我们定义的错误，直接抛出
        if (error.message.includes('服务器响应格式错误') || 
            error.message.includes('用户名或密码错误') ||
            error.message.includes('账户被禁用') ||
            error.message.includes('服务器错误')) {
          throw error
        }
        
        // 对于网络错误等其他错误，提供友好的错误消息
        if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
          throw new Error("网络连接失败，请检查网络连接")
        }
      }
      
      // 默认错误消息
      throw new Error("登录失败，请检查网络连接后重试")
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/env-logout", { method: "POST" })
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 