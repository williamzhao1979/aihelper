"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Upload, X, FileText, Image, File, Users, Package } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { getLocalDateTimeString, getLocalDateString } from "@/lib/utils"
import { useUserManagement } from "@/hooks/use-user-management"
import { useMyRecords } from '@/hooks/use-my-records'
import type { FileAttachment } from '@/hooks/use-my-records'
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

export default function ItemRecordPage() {
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

  console.log("[ItemRecordPage] selectedUser?.uniqueOwnerId:", selectedUser?.uniqueOwnerId)
  console.log("[ItemRecordPage] selectedUser:", selectedUser)
  console.log("[ItemRecordPage] currentUser?.uniqueOwnerId:", currentUser?.uniqueOwnerId)

  const handleUserSelectionChange = (user: UserProfile) => {
    console.log('[ItemRecordPage] User selection changed to:', user)
    // 用户选择变化会通过全局状态自动同步
  }

  // myRecordsApi 必须在 selectedUser 声明后
  const myRecordsApi = useMyRecords(
    selectedUser?.ownerId || '',
    selectedUser?.uniqueOwnerId || ''
  )

  // 使用与view页面完全一致的映射逻辑
  const mappedMyRecords = useMemo(() => {
    console.log('[mappedMyRecords] useMemo triggered')
    console.log('[mappedMyRecords] myRecords length:', myRecordsApi.records.length)
    console.log('[mappedMyRecords] selectedUser:', selectedUser)
    console.log('[mappedMyRecords] mapping records, myRecords:', myRecordsApi.records)
    return myRecordsApi.records.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: selectedUser?.uniqueOwnerId || "",
      ownerId: selectedUser?.uniqueOwnerId || "",
      ownerName: selectedUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "item",
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
  }, [myRecordsApi.records, selectedUser])

  // 强制获取最新数据 - 每次进入myrecord页面时都强制刷新云端数据（与view页面保持一致）
  useEffect(() => {
    if (!selectedUser?.uniqueOwnerId) return
    console.log('[useEffect] ItemRecord页面强制云端刷新触发. selectedUser:', selectedUser)
    
    const doForceRefresh = async () => {
      try {
        console.log('[useEffect] ItemRecord页面开始强制云端刷新，用户:', selectedUser?.uniqueOwnerId)
        // 使用forceRefresh确保清除所有缓存并获取最新数据
        await myRecordsApi.forceRefresh()
        console.log('[useEffect] ItemRecord页面强制云端刷新完成')
      } catch (err) {
        console.error('[useEffect] ItemRecord页面强制云端刷新失败，尝试syncFromCloud:', err)
        try {
          await myRecordsApi.syncFromCloud()
          console.log('[useEffect] ItemRecord页面syncFromCloud完成')
        } catch (syncErr) {
          console.error('[useEffect] ItemRecord页面syncFromCloud也失败:', syncErr)
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
    console.log("最终使用的editId:", editId) // 调试日志
    console.log("selectedUser?.uniqueOwnerId:", selectedUser?.uniqueOwnerId)
    
    if (editId) {
      setIsEditMode(true)
      setEditRecordId(editId)
      console.log("设置为编辑模式，记录ID:", editId) // 调试日志
      
      // 初始化时清空文件列表
      setUploadedFiles([])
      
      // 清除localStorage中的编辑记录ID
      localStorage.removeItem('editRecordId')
      
      // 使用与view页面相同的数据加载逻辑
      const loadRecordFromMappedData = async () => {
        console.log("开始从mappedMyRecords中查找记录:", editId)
        console.log("当前mappedMyRecords数量:", mappedMyRecords.length)
        
        // 从mappedMyRecords中查找记录（与view页面使用相同的数据源）
        const record = mappedMyRecords.find(r => r.id === editId || r.recordId === editId)
        
        if (record && record.type === "item") {
          console.log("从mappedMyRecords找到记录:", record)
          await loadRecordForEdit(editId)
        } else {
          console.log("在mappedMyRecords中未找到记录，等待数据加载...")
          // 如果当前没有找到记录，可能是数据还在加载中，等待一下再试
          setTimeout(() => {
            const retryRecord = mappedMyRecords.find(r => r.id === editId || r.recordId === editId)
            if (retryRecord && retryRecord.type === "item") {
              console.log("重试找到记录:", retryRecord)
              loadRecordForEdit(editId)
            } else {
              console.log("重试后仍未找到记录")
              toast({
                title: "记录不存在",
                description: `要编辑的记录 (${editId}) 不存在或类型不匹配。`,
                variant: "destructive",
              })
            }
          }, 1000)
        }
      }
      
      // 延迟执行，确保组件完全初始化
      setTimeout(() => {
        loadRecordFromMappedData()
      }, 100)
    } else {
      console.log("新建模式") // 调试日志
    }
  }, [searchParams, mappedMyRecords]) // 使用mappedMyRecords作为依赖项

  // 加载记录用于编辑 - 使用与view页面相同的数据源
  const loadRecordForEdit = async (recordId: string) => {
    console.log("开始加载记录:", recordId) // 调试日志
    console.log("当前用户:", selectedUser)
    console.log("mappedMyRecords数量:", mappedMyRecords.length)
    setIsLoadingRecord(true) // 使用专门的记录加载状态
    
    try {
      // 从mappedMyRecords中查找记录（与view页面使用相同的数据源）
      console.log("从mappedMyRecords中查找:", recordId)
      console.log("当前mappedMyRecords:", mappedMyRecords)
      
      let record = mappedMyRecords.find(r => r.id === recordId || r.recordId === recordId)
      
      if (record) {
        console.log("从mappedMyRecords找到记录:", record)
      } else {
        console.log("在mappedMyRecords中未找到记录")
        // 如果mappedMyRecords中没有找到记录，显示错误
        toast({
          title: "记录不存在",
          description: `要编辑的记录 (${recordId}) 不存在。`,
          variant: "destructive",
        })
        return
      }
      
      if (record && record.type === "item") {
        console.log("记录类型正确，开始设置表单值") // 调试日志
        
        // 使用实际记录的值，只有在值为undefined或null时才使用默认值
        // 优先使用datetime字段，如果没有则使用createdAt
        let newDateTime: string
        if (record.datetime) {
          // 优先使用datetime字段
          const recordDate = new Date(record.datetime)
          newDateTime = getLocalDateTimeString(recordDate)
        } else if (record.createdAt) {
          // 如果没有datetime字段，则使用createdAt
          let recordDate: Date
          if (typeof record.createdAt === 'string') {
            // 云端记录：createdAt是ISO字符串
            recordDate = new Date(record.createdAt)
          } else {
            // 数据库记录：createdAt是Date对象
            recordDate = record.createdAt
          }
          newDateTime = getLocalDateTimeString(recordDate)
        } else {
          newDateTime = getLocalDateTimeString()
        }
        
        const newContent = record.content || ""
        const newTags = record.tags || []
      
        console.log("准备设置的值:", {
          recordDatetime: record.datetime,
          recordCreatedAt: record.createdAt,
          recordCreatedAtType: typeof record.createdAt,
          newDateTime: newDateTime,
          content: newContent,
          tags: newTags
        }) // 调试日志
      
        setRecordDateTime(newDateTime)
        setContent(newContent)
        setTags(newTags)
        
        // 设置用户选择 - 只在当前用户不匹配时才设置
        if (record.uniqueOwnerId) {
          const recordUser = availableUsers.find(user => user.uniqueOwnerId === record.uniqueOwnerId)
          if (recordUser && (!selectedUser || selectedUser.uniqueOwnerId !== recordUser.uniqueOwnerId)) {
            console.log("设置用户选择:", recordUser)
            updateSelectedUsers([recordUser]) // 同步全局用户选择
          }
        }
      
        console.log("表单值设置完成") // 调试日志
        
        // 加载附件信息（如果有的话）
        if (record.attachments && record.attachments.length > 0) {
          console.log("发现附件:", record.attachments) // 调试日志
          
          // 将现有附件转换为 UploadedFile 格式
          const existingFiles: UploadedFile[] = record.attachments.map(attachment => ({
            id: attachment.id,
            name: attachment.name,
            size: attachment.size,
            type: attachment.type,
            file: null, // 已存在的文件不需要 File 对象
            preview: attachment.type.startsWith('image/') ? attachment.url : undefined,
            url: attachment.url, // 保存原始URL
          }))
          
          console.log("转换后的文件列表:", existingFiles)
          setUploadedFiles(existingFiles)
        } else {
          // 如果没有附件，清空文件列表
          setUploadedFiles([])
        }
      } else {
        console.log("记录不存在或类型不匹配:", record) // 调试日志
        console.log("mappedMyRecords ID列表:", mappedMyRecords.map(r => r.id))
        console.log("查找的记录ID:", recordId)
        
        // 清空文件列表
        setUploadedFiles([])
        
        // 不要立即跳转，而是显示错误信息
        toast({
          title: "记录不存在",
          description: `要编辑的记录 (${recordId}) 不存在或类型不匹配。请检查记录ID是否正确。`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("加载记录失败:", error)
      toast({
        title: "加载失败",
        description: "加载记录时发生错误",
        variant: "destructive",
      })
      
      // 延迟跳转，让用户看到错误信息
      setTimeout(() => {
        router.push("/healthcalendar")
      }, 3000)
    } finally {
      setIsLoadingRecord(false) // 使用专门的记录加载状态
      console.log("加载完成") // 调试日志
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    for (const file of files) {
      const fileId = Math.random().toString(36).substr(2, 9)
      let processedFile = file
      
      // 如果是图片且启用了压缩，则进行压缩
      if (file.type.startsWith('image/') && enableImageCompression) {
        try {
          console.log(`[压缩] 原始文件大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
          processedFile = await compressImage(file, 0.8)
          console.log(`[压缩] 压缩后文件大小: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`)
        } catch (error) {
          console.error('图片压缩失败，使用原文件:', error)
          processedFile = file
        }
      }
      
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: processedFile.size,
        type: file.type,
        file: processedFile
      }
      
      // 如果是图片，创建预览
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, preview: e.target?.result as string } : f
          ))
        }
        reader.readAsDataURL(processedFile)
      }
      
      setUploadedFiles(prev => [...prev, uploadedFile])
    }
    
    // 清空input值，允许重复选择同一文件
    event.target.value = ''
  }

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast({
        title: "验证失败",
        description: "请选择一个用户",
        variant: "destructive",
      })
      return
    }
    
    if (!content.trim()) {
      toast({
        title: "验证失败",
        description: "请填写记录内容",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    try {
      console.log('[ItemRecord] handleSubmit start, isEditMode:', isEditMode, 'uploadedFiles:', uploadedFiles)
      // 构造 MyRecord (注意：这里需要使用 'myrecord' 类型，因为API接口要求这个类型)
      const newRecord = {
        id: isEditMode ? editRecordId : Math.random().toString(36).substr(2, 9),
        date: getLocalDateString(new Date(recordDateTime)),
        datetime: new Date(recordDateTime).toISOString(), // 设置datetime字段，格式与updatedAt相同
        type: 'myrecord' as const, // 使用标准的myrecord类型，在显示时区分
        content: content.trim(),
        tags: tags,
        attachments: [] as FileAttachment[],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      console.log('[ItemRecord] newRecord:', newRecord)
      console.log('[ItemRecord] myRecordsApi:', myRecordsApi)
      
      let attachments: FileAttachment[] = []
      if (uploadedFiles.length > 0 && myRecordsApi) {
        for (const file of uploadedFiles) {
          console.log('[ItemRecord] 准备上传文件:', file)
          if ((file as any).url) {
            // 如果文件已经有URL，说明是已存在的附件
            attachments.push({
              id: file.id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: (file as any).url,
            })
            console.log('[ItemRecord] 已存在的附件，直接保留:', file)
          } else if (file.file) {
            try {
              const url = await myRecordsApi.uploadImage(file.file)
              console.log('[ItemRecord] 上传成功，url:', url)
              attachments.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: file.name,
                type: file.type,
                size: file.size,
                url,
              })
            } catch (e) {
              console.error('[ItemRecord] Supabase 上传失败:', e)
              toast({
                title: '文件上传失败',
                description: (e as Error).message,
                variant: 'destructive',
              })
              setIsSubmitting(false)
              return
            }
          }
        }
      }
      
      newRecord.attachments = attachments
      console.log('[ItemRecord] 最终 attachments:', attachments)
      
      if (myRecordsApi) {
        if (isEditMode) {
          console.log('[ItemRecord] 调用 updateRecord', newRecord)
          await myRecordsApi.updateRecord(newRecord)
        } else {
          console.log('[ItemRecord] 调用 addRecord', newRecord)
          // 对于新建记录，已经在上面处理了所有文件上传，直接调用 addRecord
          await myRecordsApi.addRecord(newRecord)
        }
      }
      
      toast({
        title: "保存成功",
        description: `已为 ${selectedUser.nickname} 保存物品记录（含云端同步）`,
      })
      
      setTimeout(() => {
        router.push("/healthcalendar")
      }, 1000)
    } catch (error) {
      console.error("保存失败:", error)
      toast({
        title: "保存失败",
        description: myRecordsApi?.error || '保存物品记录时发生错误，请重试',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />
    if (type.includes('text') || type.includes('document')) return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  // 图片压缩函数
  const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = document.createElement('img')
      
      img.onload = () => {
        // 设置最大尺寸
        const maxWidth = 1920
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载物品记录中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
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
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "编辑物品记录" : "物品记录"}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode ? "修改物品记录信息" : "记录购买或使用的物品"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 用户选择器 - 内联在页面头部 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">当前用户:</span>
              </div>
              <SingleUserSelector
                users={availableUsers}
                selectedUser={selectedUsers[0] || availableUsers[0]}
                onChange={handleUserSelectionChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* 日期时间 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle>日期时间</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-3">
              <Input
                id="record-datetime"
                type="datetime-local"
                value={recordDateTime}
                onChange={(e) => setRecordDateTime(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* 记录内容 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>物品内容</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="详细描述您购买或使用的物品信息..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </CardContent>
        </Card>

        {/* 标签 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>标签</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  placeholder="添加标签（如：购买、使用、维护等）"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} variant="outline">
                  添加
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 附件上传 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>附件上传</CardTitle>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="image-compression"
                  checked={enableImageCompression}
                  onCheckedChange={(checked) => setEnableImageCompression(checked as boolean)}
                />
                <Label htmlFor="image-compression" className="text-sm text-gray-600 cursor-pointer">
                  图片压缩
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
                  accept="image/*,.pdf,.doc,.docx,.txt"
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
            className="flex-1 bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? "保存中..." : (isEditMode ? "更新物品记录" : "保存物品记录")}
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