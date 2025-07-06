"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  ArrowLeft, 
  Shield, 
  Eye, 
  EyeOff, 
  Users,
  User,
  Lock,
  Unlock
} from "lucide-react"
import { useRouter } from "@/i18n/routing"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

// 模拟用户数据
const mockUser: UserProfile = {
  uniqueOwnerId: "user_003",
  ownerId: "device_003",
  ownerName: "大女儿",
  nickname: "大女儿",
  role: "family",
  relationship: "大女儿",
  isActive: true
}

interface PermissionSettings {
  canViewRecords: boolean
  canEditRecords: boolean
  canDeleteRecords: boolean
  canViewStatistics: boolean
  canShareData: boolean
  canManageUsers: boolean
  canViewFamilyData: boolean
  canEditFamilyData: boolean
  notifications: {
    healthAlerts: boolean
    periodReminders: boolean
    familyUpdates: boolean
  }
}

export default function UserPermissionsPage({ 
  params 
}: { 
  params: { userId: string } 
}) {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile>(mockUser)
  const [permissions, setPermissions] = useState<PermissionSettings>({
    canViewRecords: true,
    canEditRecords: true,
    canDeleteRecords: false,
    canViewStatistics: true,
    canShareData: false,
    canManageUsers: false,
    canViewFamilyData: true,
    canEditFamilyData: false,
    notifications: {
      healthAlerts: true,
      periodReminders: true,
      familyUpdates: true
    }
  })

  const handlePermissionChange = (key: keyof PermissionSettings, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleNotificationChange = (key: keyof PermissionSettings['notifications'], value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const getAvatarFallback = (user: UserProfile) => {
    return user.nickname.charAt(0).toUpperCase()
  }

  const getPermissionLevel = () => {
    const editCount = [permissions.canEditRecords, permissions.canEditFamilyData].filter(Boolean).length
    const viewCount = [permissions.canViewRecords, permissions.canViewStatistics, permissions.canViewFamilyData].filter(Boolean).length
    
    if (editCount >= 2) return "完全访问"
    if (editCount >= 1) return "部分编辑"
    if (viewCount >= 2) return "只读访问"
    return "受限访问"
  }

  const getPermissionColor = (level: string) => {
    switch (level) {
      case "完全访问":
        return "bg-green-100 text-green-800"
      case "部分编辑":
        return "bg-blue-100 text-blue-800"
      case "只读访问":
        return "bg-yellow-100 text-yellow-800"
      case "受限访问":
        return "bg-red-100 text-red-800"
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
              <p className="text-sm text-gray-600">设置用户访问权限和数据共享</p>
            </div>
          </div>
          <Badge className={getPermissionColor(getPermissionLevel())}>
            {getPermissionLevel()}
          </Badge>
        </div>
      </div>

      {/* User Info */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} alt={user.nickname} />
              <AvatarFallback className="text-xl">
                {getAvatarFallback(user)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.nickname}</h2>
              <p className="text-sm text-gray-600">{user.relationship}</p>
              <p className="text-xs text-gray-500">ID: {user.uniqueOwnerId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Access Permissions */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-blue-600" />
            <span>数据访问权限</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">查看个人记录</Label>
                <p className="text-xs text-gray-600">允许查看自己的健康记录</p>
              </div>
              <Switch
                checked={permissions.canViewRecords}
                onCheckedChange={(checked) => handlePermissionChange('canViewRecords', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">编辑个人记录</Label>
                <p className="text-xs text-gray-600">允许编辑自己的健康记录</p>
              </div>
              <Switch
                checked={permissions.canEditRecords}
                onCheckedChange={(checked) => handlePermissionChange('canEditRecords', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">删除个人记录</Label>
                <p className="text-xs text-gray-600">允许删除自己的健康记录</p>
              </div>
              <Switch
                checked={permissions.canDeleteRecords}
                onCheckedChange={(checked) => handlePermissionChange('canDeleteRecords', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">查看统计数据</Label>
                <p className="text-xs text-gray-600">允许查看健康统计和分析</p>
              </div>
              <Switch
                checked={permissions.canViewStatistics}
                onCheckedChange={(checked) => handlePermissionChange('canViewStatistics', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Data Permissions */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-green-600" />
            <span>家庭数据权限</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">查看家庭数据</Label>
                <p className="text-xs text-gray-600">允许查看其他家庭成员的数据</p>
              </div>
              <Switch
                checked={permissions.canViewFamilyData}
                onCheckedChange={(checked) => handlePermissionChange('canViewFamilyData', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">编辑家庭数据</Label>
                <p className="text-xs text-gray-600">允许编辑其他家庭成员的数据</p>
              </div>
              <Switch
                checked={permissions.canEditFamilyData}
                onCheckedChange={(checked) => handlePermissionChange('canEditFamilyData', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">数据共享</Label>
                <p className="text-xs text-gray-600">允许与其他用户共享数据</p>
              </div>
              <Switch
                checked={permissions.canShareData}
                onCheckedChange={(checked) => handlePermissionChange('canShareData', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">用户管理</Label>
                <p className="text-xs text-gray-600">允许管理其他用户和权限</p>
              </div>
              <Switch
                checked={permissions.canManageUsers}
                onCheckedChange={(checked) => handlePermissionChange('canManageUsers', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-purple-600" />
            <span>通知设置</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">健康提醒</Label>
                <p className="text-xs text-gray-600">接收健康相关的提醒通知</p>
              </div>
              <Switch
                checked={permissions.notifications.healthAlerts}
                onCheckedChange={(checked) => handleNotificationChange('healthAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">生理提醒</Label>
                <p className="text-xs text-gray-600">接收生理周期提醒</p>
              </div>
              <Switch
                checked={permissions.notifications.periodReminders}
                onCheckedChange={(checked) => handleNotificationChange('periodReminders', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">家庭更新</Label>
                <p className="text-xs text-gray-600">接收家庭成员的健康更新</p>
              </div>
              <Switch
                checked={permissions.notifications.familyUpdates}
                onCheckedChange={(checked) => handleNotificationChange('familyUpdates', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button 
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            // 保存权限设置
            console.log('Saving permissions:', permissions)
            router.back()
          }}
        >
          保存设置
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => router.back()}
        >
          取消
        </Button>
      </div>
    </div>
  )
} 