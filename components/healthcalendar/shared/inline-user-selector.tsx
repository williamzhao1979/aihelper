"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Check, User } from "lucide-react"
import { cn } from "@/lib/utils"

export interface UserProfile {
  uniqueOwnerId: string
  ownerId: string
  ownerName: string
  nickname: string
  avatar?: string
  role: 'primary' | 'family'
  relationship?: string
  isActive: boolean
}

interface InlineUserSelectorProps {
  selectedUser: UserProfile | null
  onUserChange: (user: UserProfile) => void
  availableUsers: UserProfile[]
  recordType: 'period' | 'poop' | 'other'
  className?: string
}

// 智能选择默认用户
const getDefaultUser = (recordType: string, availableUsers: UserProfile[]): UserProfile | null => {
  if (availableUsers.length === 0) return null
  
  // 1. 检查上次使用的用户
  const lastUsedId = getUserPreference(recordType)
  if (lastUsedId) {
    const lastUsed = availableUsers.find(u => u.uniqueOwnerId === lastUsedId)
    if (lastUsed) return lastUsed
  }
  
  // 2. 选择主用户
  const primaryUser = availableUsers.find(u => u.role === 'primary')
  if (primaryUser) return primaryUser
  
  // 3. 选择第一个用户
  return availableUsers[0]
}

// 存储用户选择偏好
const saveUserPreference = (recordType: string, userId: string) => {
  const key = `user_preference_${recordType}`
  localStorage.setItem(key, userId)
}

// 获取用户选择偏好
const getUserPreference = (recordType: string): string | null => {
  const key = `user_preference_${recordType}`
  return localStorage.getItem(key)
}

export default function InlineUserSelector({
  selectedUser,
  onUserChange,
  availableUsers,
  recordType,
  className = ""
}: InlineUserSelectorProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  // 初始化默认用户选择
  useEffect(() => {
    if (!isInitialized && availableUsers.length > 0 && !selectedUser) {
      const defaultUser = getDefaultUser(recordType, availableUsers)
      if (defaultUser) {
        onUserChange(defaultUser)
      }
      setIsInitialized(true)
    }
  }, [availableUsers, selectedUser, recordType, onUserChange, isInitialized])

  const handleUserSelect = (user: UserProfile) => {
    onUserChange(user)
    saveUserPreference(recordType, user.uniqueOwnerId)
  }

  const getAvatarFallback = (user: UserProfile) => {
    return user.nickname.charAt(0).toUpperCase()
  }

  const getRelationshipText = (user: UserProfile) => {
    if (user.role === 'primary') return '本人'
    return user.relationship || '家庭成员'
  }

  if (availableUsers.length === 0) {
    return null
  }

  return (
    <div className={cn("w-full", className)}>
      {/* 标题和提示 */}
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-700 mb-1">
          为谁记录？
        </h3>
        {selectedUser && (
          <p className="text-xs text-gray-500">
            当前为 <span className="font-medium text-gray-700">{selectedUser.nickname}</span> 记录
          </p>
        )}
      </div>

      {/* 用户选择器 */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {availableUsers.map((user) => {
          const isSelected = selectedUser?.uniqueOwnerId === user.uniqueOwnerId
          const isPrimary = user.role === 'primary'
          
          return (
            <Button
              key={user.uniqueOwnerId}
              variant="outline"
              size="sm"
              onClick={() => handleUserSelect(user)}
              className={cn(
                "flex flex-col items-center space-y-2 p-3 min-w-[80px] h-auto transition-all duration-200",
                isSelected
                  ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              )}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar} alt={user.nickname} />
                  <AvatarFallback className="text-sm">
                    {getAvatarFallback(user)}
                  </AvatarFallback>
                </Avatar>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-xs font-medium truncate max-w-[70px]">
                  {user.nickname}
                </div>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  {isPrimary && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      本人
                    </Badge>
                  )}
                  {!isPrimary && user.relationship && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      {user.relationship}
                    </Badge>
                  )}
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
} 