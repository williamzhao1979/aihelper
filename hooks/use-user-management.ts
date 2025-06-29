import { useState, useEffect, useCallback } from 'react'
import type { UserProfile } from '@/components/healthcalendar/shared/user-selector'

// 模拟用户数据存储
const STORAGE_KEY = 'healthcalendar_users'

// 默认用户数据
const defaultUsers: UserProfile[] = [
  {
    uniqueOwnerId: "user_001",
    ownerId: "device_001",
    ownerName: "本人",
    nickname: "本人",
    role: "primary",
    isActive: true
  },
  {
    uniqueOwnerId: "user_002",
    ownerId: "device_002",
    ownerName: "孩子妈妈",
    nickname: "妈妈",
    role: "family",
    relationship: "孩子妈妈",
    isActive: true
  },
  {
    uniqueOwnerId: "user_003",
    ownerId: "device_003",
    ownerName: "大女儿",
    nickname: "大女儿",
    role: "family",
    relationship: "大女儿",
    isActive: true
  },
  {
    uniqueOwnerId: "user_004",
    ownerId: "device_004",
    ownerName: "小女儿",
    nickname: "小女儿",
    role: "family",
    relationship: "小女儿",
    isActive: true
  },
  {
    uniqueOwnerId: "user_005",
    ownerId: "device_005",
    ownerName: "爸爸",
    nickname: "爸爸",
    role: "family",
    relationship: "爸爸",
    isActive: true
  },
  {
    uniqueOwnerId: "user_006",
    ownerId: "device_006",
    ownerName: "妈妈",
    nickname: "妈妈",
    role: "family",
    relationship: "妈妈",
    isActive: true
  }
]

export function useUserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 从localStorage加载用户数据
  const loadUsers = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedUsers = JSON.parse(stored)
        setUsers(parsedUsers)
      } else {
        // 首次使用，设置默认用户
        setUsers(defaultUsers)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers))
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('加载用户数据失败')
      setUsers(defaultUsers)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 保存用户数据到localStorage
  const saveUsers = useCallback((newUsers: UserProfile[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUsers))
      setUsers(newUsers)
    } catch (err) {
      console.error('Failed to save users:', err)
      setError('保存用户数据失败')
    }
  }, [])

  // 添加新用户
  const addUser = useCallback((user: Omit<UserProfile, 'uniqueOwnerId' | 'ownerId'>) => {
    const newUser: UserProfile = {
      ...user,
      uniqueOwnerId: `user_${Date.now()}`,
      ownerId: `device_${Date.now()}`,
      isActive: true
    }
    const newUsers = [...users, newUser]
    saveUsers(newUsers)
    return newUser
  }, [users, saveUsers])

  // 更新用户
  const updateUser = useCallback((uniqueOwnerId: string, updates: Partial<UserProfile>) => {
    const newUsers = users.map(user => 
      user.uniqueOwnerId === uniqueOwnerId 
        ? { ...user, ...updates }
        : user
    )
    saveUsers(newUsers)
  }, [users, saveUsers])

  // 删除用户
  const deleteUser = useCallback((uniqueOwnerId: string) => {
    const newUsers = users.filter(user => user.uniqueOwnerId !== uniqueOwnerId)
    saveUsers(newUsers)
  }, [users, saveUsers])

  // 获取主用户
  const getPrimaryUser = useCallback(() => {
    return users.find(user => user.role === 'primary') || users[0]
  }, [users])

  // 获取活跃用户
  const getActiveUsers = useCallback(() => {
    return users.filter(user => user.isActive)
  }, [users])

  // 根据ID获取用户
  const getUserById = useCallback((uniqueOwnerId: string) => {
    return users.find(user => user.uniqueOwnerId === uniqueOwnerId)
  }, [users])

  // 初始化
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return {
    users,
    isLoading,
    error,
    addUser,
    updateUser,
    deleteUser,
    getPrimaryUser,
    getActiveUsers,
    getUserById,
    saveUsers
  }
} 