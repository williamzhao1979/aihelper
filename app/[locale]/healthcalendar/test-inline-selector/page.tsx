"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useUserManagement } from "@/hooks/use-user-management"
import InlineUserSelector, { type UserProfile } from "@/components/healthcalendar/shared/inline-user-selector"

export default function TestInlineSelectorPage() {
  const router = useRouter()
  const { users: availableUsers } = useUserManagement()
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">🧪</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">内联用户选择器测试</h1>
              <p className="text-sm text-gray-600">测试新的用户选择器组件</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 测试内联用户选择器 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>测试内联用户选择器</CardTitle>
          </CardHeader>
          <CardContent>
            <InlineUserSelector
              selectedUser={selectedUser}
              onUserChange={setSelectedUser}
              availableUsers={availableUsers}
              recordType="other"
            />
          </CardContent>
        </Card>

        {/* 当前选择状态 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>当前选择状态</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-2">
                <p><strong>选中的用户：</strong>{selectedUser.nickname}</p>
                <p><strong>用户ID：</strong>{selectedUser.uniqueOwnerId}</p>
                <p><strong>角色：</strong>{selectedUser.role}</p>
                <p><strong>关系：</strong>{selectedUser.relationship || '无'}</p>
              </div>
            ) : (
              <p className="text-gray-500">未选择用户</p>
            )}
          </CardContent>
        </Card>

        {/* 可用用户列表 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>可用用户列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableUsers.map(user => (
                <div key={user.uniqueOwnerId} className="p-3 border rounded-lg">
                  <p><strong>昵称：</strong>{user.nickname}</p>
                  <p><strong>ID：</strong>{user.uniqueOwnerId}</p>
                  <p><strong>角色：</strong>{user.role}</p>
                  <p><strong>关系：</strong>{user.relationship || '无'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 测试按钮 */}
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            返回
          </Button>
          <Button
            onClick={() => setSelectedUser(null)}
            className="flex-1"
          >
            清除选择
          </Button>
        </div>
      </div>
    </div>
  )
} 