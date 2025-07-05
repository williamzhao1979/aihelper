"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useUserManagement } from "@/hooks/use-user-management"
import { useGlobalUserSelection, getGlobalSelectedUsers, setGlobalSelectedUsers } from "@/hooks/use-global-user-selection"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

export default function TestGlobalUserPage() {
  const { users: availableUsers, getPrimaryUser } = useUserManagement()
  const { selectedUsers, updateSelectedUsers } = useGlobalUserSelection()

  const handleUserChange = (user: UserProfile) => {
    console.log('[TestGlobalUserPage] User changed to:', user)
    updateSelectedUsers([user])
  }

  const handleShowAllUsers = () => {
    console.log('[TestGlobalUserPage] Showing all users')
    updateSelectedUsers(availableUsers)
  }

  const handleShowPrimaryUser = () => {
    const primaryUser = getPrimaryUser()
    if (primaryUser) {
      console.log('[TestGlobalUserPage] Showing primary user:', primaryUser)
      updateSelectedUsers([primaryUser])
    }
  }

  const handleGetGlobalState = () => {
    const globalUsers = getGlobalSelectedUsers()
    console.log('[TestGlobalUserPage] Global selected users:', globalUsers)
    alert(`Global selected users: ${globalUsers.map(u => u.nickname).join(', ')}`)
  }

  const handleSetGlobalState = () => {
    if (availableUsers.length > 1) {
      const secondUser = availableUsers[1]
      console.log('[TestGlobalUserPage] Setting global state to:', secondUser)
      setGlobalSelectedUsers([secondUser])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>全局用户选择测试</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">当前全局选中用户:</h3>
              <div className="p-3 bg-gray-50 rounded-lg">
                {selectedUsers.length > 0 ? (
                  selectedUsers.map(user => (
                    <div key={user.uniqueOwnerId} className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>{user.nickname} ({user.uniqueOwnerId})</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">未选择用户</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">用户选择器:</h3>
              <SingleUserSelector
                users={availableUsers}
                selectedUser={selectedUsers[0]}
                onChange={handleUserChange}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleShowAllUsers} variant="outline">
                显示所有用户
              </Button>
              <Button onClick={handleShowPrimaryUser} variant="outline">
                显示主用户
              </Button>
              <Button onClick={handleGetGlobalState} variant="outline">
                获取全局状态
              </Button>
              <Button onClick={handleSetGlobalState} variant="outline">
                设置全局状态
              </Button>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">可用用户列表:</h3>
              <div className="space-y-2">
                {availableUsers.map(user => (
                  <div key={user.uniqueOwnerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>{user.nickname} ({user.uniqueOwnerId})</span>
                    <Button
                      size="sm"
                      onClick={() => handleUserChange(user)}
                      variant={selectedUsers.some(u => u.uniqueOwnerId === user.uniqueOwnerId) ? "default" : "outline"}
                    >
                      {selectedUsers.some(u => u.uniqueOwnerId === user.uniqueOwnerId) ? "已选中" : "选择"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 