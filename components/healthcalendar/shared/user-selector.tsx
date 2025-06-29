"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { 
  Users, 
  User, 
  Settings, 
  Check,
  ChevronDown,
  X
} from "lucide-react"
import { useRouter } from "@/i18n/routing"

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

interface UserSelectorProps {
  selectedUsers: UserProfile[]
  onUserSelectionChange: (users: UserProfile[]) => void
  availableUsers: UserProfile[]
  className?: string
}

export default function UserSelector({
  selectedUsers,
  onUserSelectionChange,
  availableUsers,
  className = ""
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // 默认选中主用户（第一个用户）
  useEffect(() => {
    if (selectedUsers.length === 0 && availableUsers.length > 0) {
      const primaryUser = availableUsers.find(user => user.role === 'primary') || availableUsers[0]
      onUserSelectionChange([primaryUser])
    }
  }, [availableUsers, selectedUsers.length, onUserSelectionChange])

  const handleUserToggle = (user: UserProfile) => {
    const isSelected = selectedUsers.some(u => u.uniqueOwnerId === user.uniqueOwnerId)
    
    if (isSelected) {
      // 如果是主用户且是唯一选中的用户，不允许取消选择
      if (user.role === 'primary' && selectedUsers.length === 1) {
        return
      }
      onUserSelectionChange(selectedUsers.filter(u => u.uniqueOwnerId !== user.uniqueOwnerId))
    } else {
      onUserSelectionChange([...selectedUsers, user])
    }
    // 不关闭下拉菜单，保持打开状态
  }

  const handleSelectAll = () => {
    onUserSelectionChange(availableUsers)
    // 不关闭下拉菜单
  }

  const handleSelectPrimary = () => {
    const primaryUser = availableUsers.find(user => user.role === 'primary')
    if (primaryUser) {
      onUserSelectionChange([primaryUser])
    }
    // 不关闭下拉菜单
  }

  const handleClearAll = () => {
    const primaryUser = availableUsers.find(user => user.role === 'primary')
    if (primaryUser) {
      onUserSelectionChange([primaryUser])
    }
    // 不关闭下拉菜单
  }

  const handleManageUsers = () => {
    setIsOpen(false) // 关闭下拉菜单
    router.push("/healthcalendar/users")
  }

  const getDisplayText = () => {
    if (selectedUsers.length === 0) {
      return "选择用户"
    }
    
    if (selectedUsers.length === 1) {
      return selectedUsers[0].nickname
    }
    
    if (selectedUsers.length === availableUsers.length) {
      return "所有用户"
    }
    
    return `${selectedUsers.length}个用户`
  }

  const getAvatarFallback = (user: UserProfile) => {
    return user.nickname.charAt(0).toUpperCase()
  }

  return (
    <div className={`relative ${className}`}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="flex items-center space-x-2 min-w-[120px] justify-between"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span className="text-sm">{getDisplayText()}</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>选择用户</span>
            <Badge variant="secondary" className="text-xs">
              {selectedUsers.length}/{availableUsers.length}
            </Badge>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {/* 快速操作按钮 */}
          <div className="p-2 space-y-1">
            <DropdownMenuItem 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                handleSelectAll()
              }}
              onSelect={(e) => e.preventDefault()}
            >
              <Users className="h-4 w-4" />
              <span>全选</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                handleSelectPrimary()
              }}
              onSelect={(e) => e.preventDefault()}
            >
              <User className="h-4 w-4" />
              <span>仅本人</span>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={(e) => {
                e.preventDefault()
                handleClearAll()
              }}
              onSelect={(e) => e.preventDefault()}
            >
              <X className="h-4 w-4" />
              <span>清除其他</span>
            </DropdownMenuItem>
          </div>
          
          <DropdownMenuSeparator />
          
          {/* 用户列表 */}
          <div className="max-h-60 overflow-y-auto">
            {availableUsers.map((user) => {
              const isSelected = selectedUsers.some(u => u.uniqueOwnerId === user.uniqueOwnerId)
              const isPrimary = user.role === 'primary'
              
              return (
                <DropdownMenuItem
                  key={user.uniqueOwnerId}
                  onClick={(e) => {
                    e.preventDefault()
                    handleUserToggle(user)
                  }}
                  className="flex items-center space-x-3 p-3 cursor-pointer"
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.nickname} />
                      <AvatarFallback className="text-xs">
                        {getAvatarFallback(user)}
                      </AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium truncate">
                        {user.nickname}
                      </span>
                      {isPrimary && (
                        <Badge variant="outline" className="text-xs">
                          主用户
                        </Badge>
                      )}
                    </div>
                    {user.relationship && (
                      <p className="text-xs text-gray-500 truncate">
                        {user.relationship}
                      </p>
                    )}
                  </div>
                  
                  {isSelected && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </DropdownMenuItem>
              )
            })}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* 管理选项 */}
          <DropdownMenuItem 
            className="flex items-center space-x-2"
            onClick={handleManageUsers}
          >
            <Settings className="h-4 w-4" />
            <span>管理用户</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 