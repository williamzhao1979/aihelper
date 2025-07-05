"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  ArrowLeft, 
  Save, 
  User, 
  Shield,
  Trash2,
  Camera
} from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useToast } from "@/hooks/use-toast"
import { useUserManagement } from "@/hooks/use-user-management"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

// 扩展的用户数据类型，包含备注和时间字段
type ExtendedUserProfile = UserProfile & {
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface PageProps {
  params: Promise<{ userId: string }>
}

// 用户数据现在由useUserManagement hook管理

export default function UserEditPage({ params }: PageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { getUserById, updateUser, deleteUser, isLoading: userManagementLoading, users: allUsers } = useUserManagement()
  const [userId, setUserId] = useState<string>("")
  const [user, setUser] = useState<ExtendedUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(false) // 添加专门的用户加载状态
  const [retryCount, setRetryCount] = useState(0) // 添加重试次数计数
  const [formData, setFormData] = useState({
    nickname: "",
    relationship: "",
    role: "family" as "primary" | "family",
    isActive: true,
    avatar: "",
    notes: "",
    createdAt: "",
    updatedAt: ""
  })

  // 获取用户ID和用户数据 - 只在 userManagementLoading 为 false 时查找用户
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      if (userManagementLoading) return;
      try {
        const { userId: id } = await params;
        setUserId(id);
        console.log("加载用户ID:", id);
        const foundUser = getUserById(id);
        console.log("getUserById结果:", foundUser);
        if (foundUser) {
          setUser(foundUser);
          setFormData({
            nickname: foundUser.nickname,
            relationship: foundUser.relationship || "",
            role: foundUser.role,
            isActive: foundUser.isActive,
            avatar: foundUser.avatar || "",
            notes: foundUser.notes || "",
            createdAt: foundUser.createdAt || new Date().toISOString(),
            updatedAt: foundUser.updatedAt || new Date().toISOString()
          });
          setIsLoading(false);
        } else {
          toast({
            title: "用户不存在",
            description: "要编辑的用户不存在，请检查用户ID是否正确",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } catch (error) {
        console.error("加载用户失败:", error);
        toast({
          title: "加载失败",
          description: "加载用户信息时发生错误",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }
    loadUser();
    return () => { cancelled = true; };
  }, [params, getUserById, userManagementLoading, toast]);

  const handleSave = async () => {
    if (!user) return
    
    setIsSaving(true)
    try {
      // 验证表单数据
      if (!formData.nickname.trim()) {
        toast({
          title: "验证失败",
          description: "昵称不能为空",
          variant: "destructive",
        })
        return
      }

      // 准备更新的用户数据
      const updatedUserData = {
        nickname: formData.nickname.trim(),
        relationship: formData.relationship.trim(),
        role: formData.role,
        isActive: formData.isActive,
        avatar: formData.avatar,
        notes: formData.notes,
        createdAt: formData.createdAt,
        updatedAt: new Date().toISOString() // 自动更新修改时间
      }
      
      console.log("保存用户数据:", {
        userId: user.uniqueOwnerId,
        updates: updatedUserData
      })
      
      // 使用useUserManagement hook的updateUser方法
      await updateUser(user.uniqueOwnerId, updatedUserData)
      
      toast({
        title: "保存成功",
        description: "用户信息已更新并保存到本地存储",
      })
      
      // 延迟跳转回用户管理页面
      setTimeout(() => {
        router.push("/healthcalendar/users")
      }, 1000)
      
    } catch (error) {
      console.error("保存失败:", error)
      toast({
        title: "保存失败",
        description: "保存用户信息时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return
    
    if (!confirm("确定要删除这个用户吗？此操作不可撤销。")) {
      return
    }
    
    setIsSaving(true)
    try {
      console.log("删除用户:", user.uniqueOwnerId)
      
      // 使用useUserManagement hook的deleteUser方法
      await deleteUser(user.uniqueOwnerId)
      
      toast({
        title: "删除成功",
        description: "用户已删除并更新本地存储",
      })
      
      // 延迟跳转回用户管理页面
      setTimeout(() => {
        router.push("/healthcalendar/users")
      }, 1000)
      
    } catch (error) {
      console.error("删除失败:", error)
      toast({
        title: "删除失败",
        description: "删除用户时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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

  if (isLoading || userManagementLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {userManagementLoading ? "加载用户数据中..." : "加载用户信息中..."}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">用户不存在</h3>
          <p className="text-gray-600 mb-4">要编辑的用户不存在</p>
          <Button onClick={() => router.push("/healthcalendar/users")}>
            返回用户管理
          </Button>
        </div>
      </div>
    )
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
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">编辑用户</h1>
              <p className="text-sm text-gray-600">修改用户信息和设置</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 用户基本信息 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 头像 */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.avatar} alt={formData.nickname} />
                  <AvatarFallback className="text-2xl">
                    {getAvatarFallback(user)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{formData.nickname}</h3>
                <Badge className={getRoleColor(formData.role)}>
                  {getRoleLabel(formData.role)}
                </Badge>
                <p className="text-sm text-gray-500">ID: {user.uniqueOwnerId}</p>
              </div>
            </div>

            {/* 昵称 */}
            <div>
              <Label htmlFor="nickname">昵称 *</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="输入昵称"
                className="mt-1"
              />
            </div>

            {/* 关系 */}
            <div>
              <Label htmlFor="relationship">关系</Label>
              <Input
                id="relationship"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="如：孩子妈妈、大女儿等"
                className="mt-1"
              />
            </div>

            {/* 状态 */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isActive">账户状态</Label>
                <p className="text-sm text-gray-600">启用或禁用用户账户</p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* 备注 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>备注</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="添加关于此用户的备注信息..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-[100px] resize-none"
            />
          </CardContent>
        </Card>

        {/* 时间信息 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>时间信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 创建时间 */}
            <div>
              <Label htmlFor="createdAt">创建时间</Label>
              <Input
                id="createdAt"
                type="datetime-local"
                value={formData.createdAt ? new Date(formData.createdAt).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, createdAt: new Date(e.target.value).toISOString() })}
                className="mt-1"
              />
            </div>

            {/* 更新时间 */}
            <div>
              <Label htmlFor="updatedAt">更新时间</Label>
              <Input
                id="updatedAt"
                type="datetime-local"
                value={formData.updatedAt ? new Date(formData.updatedAt).toISOString().slice(0, 16) : ""}
                onChange={(e) => setFormData({ ...formData, updatedAt: new Date(e.target.value).toISOString() })}
                className="mt-1"
              />
            </div>

            {/* 显示格式化的时间 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">创建时间</div>
                <div className="text-sm text-gray-600">
                  {formData.createdAt ? new Date(formData.createdAt).toLocaleString('zh-CN') : "未设置"}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700">更新时间</div>
                <div className="text-sm text-gray-600">
                  {formData.updatedAt ? new Date(formData.updatedAt).toLocaleString('zh-CN') : "未设置"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSaving}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>删除用户</span>
          </Button>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? "保存中..." : "保存更改"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 