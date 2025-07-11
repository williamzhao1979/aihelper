"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Upload, X, FileText, Image, File, Users, Stethoscope } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getLocalDateTimeString, getLocalDateString } from "@/lib/utils"
import { useUserManagement } from "@/hooks/use-user-management"
import { useHealthRecords } from '@/hooks/use-health-records'
import type { FileAttachment } from '@/hooks/use-health-records'
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file: File | null // 允许为 null，用于已存在的文件
  preview?: string
  url?: string // 添加 url 字段，用于已存在的文件
}

export default function HealthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { updateSelectedUsers } = useGlobalUserSelection()

  // 其他 useState
  const [isEditMode, setIsEditMode] = useState(false)
  const [editRecordId, setEditRecordId] = useState<string>("")
  const [recordDateTime, setRecordDateTime] = useState<string>(() => {
    // 检查URL参数中的日期和时间
    const dateParam = searchParams.get('date')
    const timeParam = searchParams.get('time')
    
    if (dateParam && timeParam) {
      // 如果有日期和时间参数，组合使用
      return `${dateParam}T${timeParam}`
    } else if (dateParam) {
      // 如果只有日期参数，使用当前时间
      const currentTime = new Date().toTimeString().slice(0, 5)
      return `${dateParam}T${currentTime}`
    } else {
      // 默认使用当前日期时间
      return getLocalDateTimeString()
    }
  })
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRecord, setIsLoadingRecord] = useState(false) // 添加记录加载状态
  const [enableImageCompression, setEnableImageCompression] = useState(true) // 图片压缩选项，默认开启
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null) // 图片放大模态框
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser } = useUserManagement()

  // 使用全局用户选择状态
  const { selectedUsers } = useGlobalUserSelection()
  // 获取当前用户（主用户或唯一选中用户），并 memoize
  const currentUser = useMemo(() => {
    if (selectedUsers.length === 1) return selectedUsers[0]
  }, [selectedUsers])

  const selectedUser = currentUser

  console.log("[HealthPage] selectedUser?.uniqueOwnerId:", selectedUser?.uniqueOwnerId)
  console.log("[HealthPage] selectedUser:", selectedUser)
  console.log("[HealthPage] currentUser?.uniqueOwnerId:", currentUser?.uniqueOwnerId)

  const handleUserSelectionChange = (user: UserProfile) => {
    console.log('[HealthPage] User selection changed to:', user)
    // 用户选择变化会通过全局状态自动同步
  }

  // healthRecordsApi 必须在 selectedUser 声明后
  const healthRecordsApi = useHealthRecords(
    selectedUser?.ownerId || '',
    selectedUser?.uniqueOwnerId || ''
  )

  // 使用与view页面完全一致的映射逻辑
  const mappedHealthRecords = useMemo(() => {
    console.log('[mappedHealthRecords] useMemo triggered')
    console.log('[mappedHealthRecords] healthRecords length:', healthRecordsApi.records.length)
    console.log('[mappedHealthRecords] selectedUser:', selectedUser)
    console.log('[mappedHealthRecords] mapping records, healthRecords:', healthRecordsApi.records)
    return healthRecordsApi.records.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: selectedUser?.uniqueOwnerId || "",
      ownerId: selectedUser?.uniqueOwnerId || "",
      ownerName: selectedUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "health",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [healthRecordsApi.records, selectedUser])

  // 强制获取最新数据 - 每次进入health页面时都强制刷新云端数据（与view页面保持一致）
  useEffect(() => {
    if (!selectedUser?.uniqueOwnerId) return
    console.log('[useEffect] Health页面强制云端刷新触发. selectedUser:', selectedUser)
    
    const doForceRefresh = async () => {
      try {
        console.log('[useEffect] Health页面开始强制云端刷新，用户:', selectedUser?.uniqueOwnerId)
        // 使用forceRefresh确保清除所有缓存并获取最新数据
        await healthRecordsApi.forceRefresh()
        console.log('[useEffect] Health页面强制云端刷新完成')
      } catch (err) {
        console.error('[useEffect] Health页面强制云端刷新失败，尝试syncFromCloud:', err)
        try {
          await healthRecordsApi.syncFromCloud()
          console.log('[useEffect] Health页面syncFromCloud完成')
        } catch (syncErr) {
          console.error('[useEffect] Health页面syncFromCloud也失败:', syncErr)
        }
      }
    }
    doForceRefresh()
  }, [selectedUser?.uniqueOwnerId])

  // 检查是否为编辑模式 - 支持URL参数和localStorage
  useEffect(() => {
    const editId = searchParams.get('edit') || localStorage.getItem('editRecordId')
    console.log("URL参数edit:", searchParams.get('edit')) // 调试日志
    console.log("localStorage editRecordId:", localStorage.getItem('editRecordId')) // 调试日志
    console.log("最终editId:", editId) // 调试日志
    
    if (editId) {
      console.log("进入编辑模式，editId:", editId)
      setIsEditMode(true)
      setEditRecordId(editId)
      // 清除localStorage中的editRecordId，避免重复读取
      localStorage.removeItem('editRecordId')
      
      // 加载对应的记录数据
      const loadEditRecord = async () => {
        try {
          setIsLoadingRecord(true)
          // 等待records数据加载完成
          if (mappedHealthRecords.length === 0) {
            // 如果records还没加载，等待一下
            setTimeout(loadEditRecord, 100)
            return
          }
          
          const recordToEdit = mappedHealthRecords.find(r => r.id === editId)
          console.log("找到要编辑的记录:", recordToEdit)
          
          if (recordToEdit) {
            setRecordDateTime(recordToEdit.datetime || recordToEdit.date)
            setContent(recordToEdit.content)
            setTags(recordToEdit.tags)
            
            // 处理附件
            if (recordToEdit.attachments && recordToEdit.attachments.length > 0) {
              const files: UploadedFile[] = recordToEdit.attachments.map(attachment => ({
                id: attachment.id,
                name: attachment.name,
                size: attachment.size,
                type: attachment.type,
                file: null, // 已存在的文件，file为null
                url: attachment.url, // 使用已存在的url
                preview: attachment.type.startsWith('image/') ? attachment.url : undefined
              }))
              setUploadedFiles(files)
            }
          } else {
            console.log("未找到要编辑的记录，editId:", editId)
          }
        } catch (error) {
          console.error("加载编辑记录失败:", error)
          toast({
            title: "加载失败",
            description: "无法加载要编辑的记录",
            variant: "destructive",
          })
        } finally {
          setIsLoadingRecord(false)
        }
      }
      
      loadEditRecord()
    }
  }, [searchParams, mappedHealthRecords, toast])

  const compressImage = async (file: File, quality: number = 0.8, maxWidth: number = 1920): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = document.createElement('img')
      
      img.onload = () => {
        // 设置最大尺寸
        const maxHeight = 1920
        let { width, height } = img
        
        // 计算压缩后的尺寸
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 转换为Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // 创建压缩后的文件
              const compressedFile = Object.assign(blob, {
                name: file.name,
                lastModified: Date.now(),
              }) as File
              resolve(compressedFile)
            } else {
              resolve(file) // 如果压缩失败，返回原文件
            }
          },
          file.type,
          quality
        )
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles: UploadedFile[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      let processedFile = file
      
      // 如果是图片且开启了压缩，进行压缩
      if (file.type.startsWith('image/') && enableImageCompression) {
        try {
          processedFile = await compressImage(file)
          console.log(`图片压缩完成: ${file.name}, 原大小: ${file.size}, 压缩后: ${processedFile.size}`)
        } catch (error) {
          console.error('图片压缩失败:', error)
          processedFile = file // 压缩失败则使用原文件
        }
      }
      
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}_${i}`,
        name: processedFile.name,
        size: processedFile.size,
        type: processedFile.type,
        file: processedFile,
      }

      if (processedFile.type.startsWith('image/')) {
        uploadedFile.preview = URL.createObjectURL(processedFile)
      }

      newFiles.push(uploadedFile)
    }

    setUploadedFiles(prev => [...prev, ...newFiles])
    e.target.value = '' // 清空input，允许重复选择相同文件
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags(prev => [...prev, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-500" />
    } else if (type.includes('pdf') || type.includes('document')) {
      return <FileText className="h-6 w-6 text-red-500" />
    } else {
      return <File className="h-6 w-6 text-gray-500" />
    }
  }

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast({
        title: "错误",
        description: "请先选择用户",
        variant: "destructive",
      })
      return
    }

    if (!content.trim()) {
      toast({
        title: "错误",
        description: "请输入健康记录内容",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 上传文件并获取URL
      const attachments: FileAttachment[] = []
      
      for (const uploadedFile of uploadedFiles) {
        try {
          let fileUrl = uploadedFile.url // 对于已存在的文件，使用现有url
          
          // 只有当file不为null时才需要上传
          if (uploadedFile.file) {
            fileUrl = await healthRecordsApi.uploadImage(uploadedFile.file)
          }
          
          if (fileUrl) {
            attachments.push({
              id: uploadedFile.id,
              name: uploadedFile.name,
              type: uploadedFile.type,
              size: uploadedFile.size,
              url: fileUrl,
            })
          }
        } catch (error) {
          console.error(`文件上传失败: ${uploadedFile.name}`, error)
          toast({
            title: "文件上传失败",
            description: `文件 ${uploadedFile.name} 上传失败，将跳过此文件`,
            variant: "destructive",
          })
        }
      }

      const recordData = {
        id: isEditMode ? editRecordId : `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: getLocalDateString(new Date(recordDateTime)),
        datetime: recordDateTime,
        type: 'health' as const,
        content: content.trim(),
        attachments,
        tags,
        createdAt: isEditMode ? mappedHealthRecords.find(r => r.id === editRecordId)?.createdAt.toISOString() || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (isEditMode) {
        await healthRecordsApi.updateRecord(recordData)
        toast({
          title: "成功",
          description: "健康记录已更新",
        })
      } else {
        await healthRecordsApi.addRecord(recordData)
        toast({
          title: "成功",
          description: "健康记录已保存",
        })
      }

      // 清空表单
      setContent("")
      setTags([])
      setUploadedFiles([])
      setNewTag("")
      
      // 跳转回去
      router.back()
    } catch (error) {
      console.error("保存健康记录失败:", error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存健康记录时发生错误",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageClick = (imageUrl: string) => {
    setImageModalUrl(imageUrl)
  }

  if (isLoadingRecord) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-500">加载记录中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold">
              {isEditMode ? "编辑健康记录" : "新建健康记录"}
            </h1>
          </div>
        </div>

        {/* 用户选择器 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>选择用户</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SingleUserSelector
              users={availableUsers}
              selectedUser={selectedUser}
            />
          </CardContent>
        </Card>

        {/* 记录表单 */}
        <Card>
          <CardHeader>
            <CardTitle>健康记录信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 日期时间 */}
            <div className="space-y-2">
              <Label htmlFor="datetime">记录时间</Label>
              <Input
                id="datetime"
                type="datetime-local"
                value={recordDateTime}
                onChange={(e) => setRecordDateTime(e.target.value)}
              />
            </div>

            {/* 记录内容 */}
            <div className="space-y-2">
              <Label htmlFor="content">健康记录内容</Label>
              <Textarea
                id="content"
                placeholder="请输入健康记录内容..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <Label>标签</Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="添加标签"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button onClick={handleAddTag} variant="outline">
                  添加
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 文件上传 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>附件</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compression"
                    checked={enableImageCompression}
                    onCheckedChange={(checked) => setEnableImageCompression(checked as boolean)}
                  />
                  <Label htmlFor="compression" className="text-sm">
                    压缩图片
                  </Label>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* 已上传图片预览网格 */}
                {uploadedFiles.filter(file => file.type.startsWith('image/')).length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">已上传图片预览：</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {uploadedFiles
                        .filter(file => file.type.startsWith('image/'))
                        .map(file => (
                          <div key={file.id} className="relative group">
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer">
                              <img
                                src={file.preview || file.url}
                                alt={file.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                onClick={() => setImageModalUrl(file.preview || file.url || '')}
                              />
                            </div>
                            {/* 删除按钮 */}
                            <Button
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveFile(file.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            {/* 压缩标识 */}
                            {enableImageCompression && file.file && (
                              <div className="absolute bottom-1 left-1">
                                <Badge variant="secondary" className="text-xs px-1 py-0">
                                  压缩
                                </Badge>
                              </div>
                            )}
                            {/* 文件名 */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                              {file.name}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-sm text-gray-600">
                      点击上传图片或文档
                    </span>
                    {enableImageCompression && (
                      <div className="text-xs text-blue-600 mt-1">
                        图片将自动压缩至适合上传的大小
                      </div>
                    )}
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {/* 已上传文件列表 */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">已上传文件：</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {uploadedFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3 flex-1">
                            {file.preview ? (
                              // 图片预览
                              <div className="flex-shrink-0">
                                <img 
                                  src={file.preview} 
                                  alt={file.name}
                                  className="w-12 h-12 object-cover rounded border"
                                />
                              </div>
                            ) : (
                              // 非图片文件图标
                              <div className="flex-shrink-0">
                                {getFileIcon(file.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{file.name}</div>
                              <div className="text-xs text-gray-500 flex items-center space-x-2">
                                <span>{formatFileSize(file.size)}</span>
                                {file.type.startsWith('image/') && enableImageCompression && (
                                  <Badge variant="secondary" className="text-xs">
                                    已压缩
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(file.id)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedUser || !content.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? "保存中..." : (isEditMode ? "更新健康记录" : "保存健康记录")}
          </Button>
        </div>
      </div>
      
      {/* 图片放大模态框 */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-4xl w-full h-full flex items-center justify-center p-4">
            <img
              src={imageModalUrl}
              alt="放大图片"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 hover:bg-opacity-75"
              onClick={() => setImageModalUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
