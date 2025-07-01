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
  User
} from "lucide-react"
import { useRouter } from "@/i18n/routing"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

// 模拟用户数据
const mockUsers: UserProfile[] = [
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

export default function UserManagementPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>(mockUsers)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [newUser, setNewUser] = useState({
    nickname: "",
    relationship: "",
    role: "family" as const
  })

  const handleAddUser = () => {
    if (newUser.nickname.trim()) {
      const user: UserProfile = {
        uniqueOwnerId: `user_${Date.now()}`,
        ownerId: `device_${Date.now()}`,
        ownerName: newUser.nickname,
        nickname: newUser.nickname,
        role: newUser.role,
        relationship: newUser.relationship || undefined,
        isActive: true
      }
      setUsers([...users, user])
      setNewUser({ nickname: "", relationship: "", role: "family" })
      setIsAddUserDialogOpen(false)
    }
  }

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user)
  }

  const handleDeleteUser = (userId: string) => {
    if (confirm("确定要删除这个用户吗？")) {
      setUsers(users.filter(user => user.uniqueOwnerId !== userId))
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar} alt={user.nickname} />
                    <AvatarFallback className="text-lg">
                      {getAvatarFallback(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
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
                      <p className="text-sm text-gray-600">{user.relationship}</p>
                    )}
                    <p className="text-xs text-gray-500">ID: {user.uniqueOwnerId}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {user.role !== "primary" && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.uniqueOwnerId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/healthcalendar/users/${user.uniqueOwnerId}/permissions`)}
                  >
                    <Shield className="h-4 w-4" />
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