"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  ArrowLeft, 
  UserPlus, 
  Edit, 
  Trash2, 
  Settings, 
  Shield,
  Users,
  User,
  Cloud,
  RefreshCw
} from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useUserManagement } from "@/hooks/use-user-management"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

// 用户数据现在由useUserManagement hook管理

export default function UserManagementPage() {
  const router = useRouter()
  const { users, addUser, deleteUser, isLoading, forceRefresh } = useUserManagement()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    nickname: "",
    relationship: "",
    role: "family" as const
  })

  // 页面首次加载时强制从云端拉取最新用户数据
  useEffect(() => {
    setIsSyncing(true)
    forceRefresh().finally(() => setIsSyncing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddUser = async () => {
    if (newUser.nickname.trim()) {
      await addUser({
        ownerName: newUser.nickname,
        nickname: newUser.nickname,
        role: newUser.role,
        relationship: newUser.relationship || undefined,
        isActive: true
      })
      setNewUser({ nickname: "", relationship: "", role: "family" })
      setIsAddUserDialogOpen(false)
    }
  }

  const handleEditUser = (user: UserProfile) => {
    // 跳转到用户编辑页面
    router.push(`/healthcalendar/users/${user.uniqueOwnerId}/edit` as any)
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm("确定要删除这个用户吗？")) {
      await deleteUser(userId)
    }
  }

  const handleForceRefresh = async () => {
    setIsSyncing(true)
    try {
      await forceRefresh()
    } catch (error) {
      console.error('强制刷新失败:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const getAvatarFallback = (user: UserProfile) => {
    return user.nickname.charAt(0).toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "primary":
        return "主用户"
      case "family":
        return "家庭成员"
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "primary":
        return "bg-blue-100 text-blue-800"
      case "family":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载用户数据中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            <p className="text-sm text-gray-600">管理家庭成员和权限设置</p>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2">
          {/* 只保留强制刷新按钮 */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleForceRefresh}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
          {/* 添加用户按钮 */}
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700">
                <UserPlus className="h-4 w-4" />
                <span>添加用户</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加家庭成员</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    value={newUser.nickname}
                    onChange={(e) => setNewUser({ ...newUser, nickname: e.target.value })}
                    placeholder="输入昵称"
                  />
                </div>
                <div>
                  <Label htmlFor="relationship">关系</Label>
                  <Input
                    id="relationship"
                    value={newUser.relationship}
                    onChange={(e) => setNewUser({ ...newUser, relationship: e.target.value })}
                    placeholder="如：孩子妈妈、大女儿等"
                  />
                </div>
                <div>
                  <Label htmlFor="role">角色</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">家庭成员</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleAddUser}
                    className="flex-1"
                    disabled={!newUser.nickname.trim()}
                  >
                    添加
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddUserDialogOpen(false)}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.uniqueOwnerId} className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={user.avatar} alt={user.nickname} />
                    <AvatarFallback className="text-lg">
                      {getAvatarFallback(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {user.nickname}
                      </h3>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      {user.isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          活跃
                        </Badge>
                      )}
                    </div>
                    {user.relationship && (
                      <p className="text-sm text-gray-600 truncate">{user.relationship}</p>
                    )}
                    {(user as any).notes && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{(user as any).notes}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500">ID: {user.uniqueOwnerId}</p>
                      {(user as any).updatedAt && (
                        <p className="text-xs text-gray-400">
                          更新: {new Date((user as any).updatedAt).toLocaleDateString('zh-CN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-1 sm:space-x-2 flex-shrink-0">
                  {user.role !== "primary" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                        className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">编辑</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.uniqueOwnerId)}
                        className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">删除</span>
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/healthcalendar/users/${user.uniqueOwnerId}/permissions` as any)}
                    className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3"
                  >
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">权限</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Family Settings */}
      <div className="mt-8">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <span>家庭设置</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">数据共享</Label>
                <p className="text-xs text-gray-600 mt-1">
                  控制家庭成员间的数据共享设置
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  配置共享
                </Button>
              </div>
              <div>
                <Label className="text-sm font-medium">通知设置</Label>
                <p className="text-xs text-gray-600 mt-1">
                  管理健康提醒和通知
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  配置通知
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 