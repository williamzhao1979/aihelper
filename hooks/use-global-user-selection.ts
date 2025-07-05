"use client"

import { useState, useEffect, useCallback } from 'react'
import type { UserProfile } from '@/components/healthcalendar/shared/user-selector'

// 全局用户选择状态
let globalSelectedUsers: UserProfile[] = []
let globalListeners: Set<(users: UserProfile[]) => void> = new Set()

// 通知所有监听器
const notifyListeners = (users: UserProfile[]) => {
  globalListeners.forEach(listener => {
    try {
      listener(users)
    } catch (error) {
      console.error('Error in global user selection listener:', error)
    }
  })
}

// 设置全局用户选择
export const setGlobalSelectedUsers = (users: UserProfile[]) => {
  console.log('[setGlobalSelectedUsers] Setting global users:', users)
  globalSelectedUsers = users
  notifyListeners(users)
  
  // 保存到 localStorage 以便页面刷新后恢复
  try {
    localStorage.setItem('globalSelectedUsers', JSON.stringify(users))
  } catch (error) {
    console.error('Error saving global selected users to localStorage:', error)
  }
}

// 获取全局用户选择
export const getGlobalSelectedUsers = (): UserProfile[] => {
  return globalSelectedUsers
}

// 全局用户选择 Hook
export const useGlobalUserSelection = () => {
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>(globalSelectedUsers)

  // 监听全局状态变化
  useEffect(() => {
    const handleGlobalChange = (users: UserProfile[]) => {
      console.log('[useGlobalUserSelection] Global state changed:', users)
      setSelectedUsers(users)
    }

    globalListeners.add(handleGlobalChange)

    // 清理函数
    return () => {
      globalListeners.delete(handleGlobalChange)
    }
  }, [])

  // 更新用户选择
  const updateSelectedUsers = useCallback((users: UserProfile[]) => {
    console.log('[useGlobalUserSelection] Updating selected users:', users)
    setGlobalSelectedUsers(users)
  }, [])

  // 初始化时从 localStorage 恢复
  useEffect(() => {
    if (globalSelectedUsers.length === 0) {
      try {
        const saved = localStorage.getItem('globalSelectedUsers')
        if (saved) {
          const parsed = JSON.parse(saved)
          console.log('[useGlobalUserSelection] Restoring from localStorage:', parsed)
          setGlobalSelectedUsers(parsed)
        }
      } catch (error) {
        console.error('Error restoring global selected users from localStorage:', error)
      }
    }
  }, [])

  return {
    selectedUsers,
    updateSelectedUsers,
    setSelectedUsers: updateSelectedUsers // 保持兼容性
  }
}

// 初始化全局状态
export const initializeGlobalUserSelection = (primaryUser: UserProfile | null) => {
  if (globalSelectedUsers.length === 0 && primaryUser) {
    console.log('[initializeGlobalUserSelection] Initializing with primary user:', primaryUser)
    setGlobalSelectedUsers([primaryUser])
  }
} 