"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import type { UserProfile } from "./user-selector"

// Simple color palette for user dots
const USER_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#a21caf", // purple
  "#f59e42", // orange
  "#ec4899", // pink
  "#f43f5e", // red
  "#eab308", // yellow
]

interface SingleUserSelectorProps {
  users: UserProfile[]
  selectedUser?: UserProfile
  onChange?: (user: UserProfile) => void
}

export function SingleUserSelector({ users, selectedUser, onChange }: SingleUserSelectorProps) {
  const { selectedUsers, updateSelectedUsers } = useGlobalUserSelection()

  // 使用全局状态中的选中用户，如果没有则使用传入的 selectedUser
  const currentSelectedUser = selectedUsers[0] || selectedUser || users[0]

  const handleUserChange = (userId: string) => {
    console.log('[SingleUserSelector] handleUserChange called with userId:', userId)
    const newUser = users.find(user => user.uniqueOwnerId === userId)
    if (newUser) {
      console.log('[SingleUserSelector] Found user:', newUser)
      // 更新全局状态
      updateSelectedUsers([newUser])
      // 调用传入的 onChange 回调
      if (onChange) {
        onChange(newUser)
      }
    } else {
      console.error('[SingleUserSelector] User not found for ID:', userId)
    }
  }

  return (
    <Select value={currentSelectedUser?.uniqueOwnerId} onValueChange={handleUserChange}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="选择用户" />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.uniqueOwnerId} value={user.uniqueOwnerId}>
            {user.nickname}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
