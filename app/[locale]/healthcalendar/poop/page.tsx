"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ArrowLeft, Upload, X, FileText, Image, File, ChevronDown, ChevronUp } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useHealthDatabase } from "@/hooks/use-health-database"
import healthDB from "@/lib/health-database"
import { getLocalDateTimeString, getLocalDateString } from "@/lib/utils"
import { useUserManagement } from "@/hooks/use-user-management"
import InlineUserSelector, { type UserProfile } from "@/components/healthcalendar/shared/inline-user-selector"
import { usePoopRecords } from '@/hooks/use-poop-records'
import type { FileAttachment } from '@/hooks/use-poop-records'
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file: File
  preview?: string
}

export default function PoopRecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { saveRecord, updateRecord, getRecordById, isInitialized, isLoading: dbLoading } = useHealthDatabase()
  const { getPrimaryUser, users: availableUsers } = useUserManagement()
  const { updateSelectedUsers } = useGlobalUserSelection();

  // 先声明 selectedUser
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  // 其他 useState
  const [isEditMode, setIsEditMode] = useState(false)
  const [editRecordId, setEditRecordId] = useState<string>("")
  const [recordDateTime, setRecordDateTime] = useState<string>(getLocalDateTimeString())
  const [poopType, setPoopType] = useState<string>("type4")
  const [poopColor, setPoopColor] = useState<string>("brown")
  const [poopSmell, setPoopSmell] = useState<string>("normal")
  const [notes, setNotes] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTypeExpanded, setIsTypeExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRecord, setIsLoadingRecord] = useState(false) // 添加记录加载状态

  // poopRecordsApi 必须在 selectedUser 声明后
  const poopRecordsApi = usePoopRecords(
    selectedUser?.ownerId || '',
    selectedUser?.uniqueOwnerId || ''
  )

  // 使用与view页面完全一致的映射逻辑
  const mappedPoopRecords = useMemo(() => {
    console.log('[mappedPoopRecords] useMemo triggered')
    console.log('[mappedPoopRecords] poopRecords length:', poopRecordsApi.records.length)
    console.log('[mappedPoopRecords] selectedUser:', selectedUser)
    console.log('[mappedPoopRecords] mapping records, poopRecords:', poopRecordsApi.records)
    return poopRecordsApi.records.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: selectedUser?.uniqueOwnerId || "",
      ownerId: selectedUser?.uniqueOwnerId || "",
      ownerName: selectedUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "poop",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
      })) || [],
      poopType: r.poopType,
      poopColor: r.poopColor,
      poopSmell: r.poopSmell,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [poopRecordsApi.records, selectedUser])

  // 强制获取最新数据 - 每次进入poop页面时都强制刷新云端数据（与view页面保持一致）
  useEffect(() => {
    if (!selectedUser?.uniqueOwnerId) return
    console.log('[useEffect] Poop页面强制云端刷新触发. selectedUser:', selectedUser)
    
    const doForceRefresh = async () => {
      try {
        console.log('[useEffect] Poop页面开始强制云端刷新，用户:', selectedUser?.uniqueOwnerId)
        // 使用forceRefresh确保清除所有缓存并获取最新数据
        await poopRecordsApi.forceRefresh()
        console.log('[useEffect] Poop页面强制云端刷新完成')
      } catch (err) {
        console.error('[useEffect] Poop页面强制云端刷新失败，尝试syncFromCloud:', err)
        try {
          await poopRecordsApi.syncFromCloud()
          console.log('[useEffect] Poop页面syncFromCloud完成')
        } catch (syncErr) {
          console.error('[useEffect] Poop页面syncFromCloud也失败:', syncErr)
        }
      }
    }
    doForceRefresh()
  }, [selectedUser?.uniqueOwnerId])

  // 检查是否为编辑模式 - 使用与view页面相同的数据加载方法
  useEffect(() => {
    const editId = searchParams.get('edit')
    console.log("URL参数edit:", editId) // 调试日志
    
    if (editId) {
      setIsEditMode(true)
      setEditRecordId(editId)
      console.log("设置为编辑模式，记录ID:", editId) // 调试日志
      
      // 使用与view页面相同的数据加载逻辑
      const loadRecordFromMappedData = async () => {
        console.log("开始从mappedPoopRecords中查找记录:", editId)
        console.log("当前mappedPoopRecords数量:", mappedPoopRecords.length)
        
        // 从mappedPoopRecords中查找记录（与view页面使用相同的数据源）
        const record = mappedPoopRecords.find(r => r.id === editId || r.recordId === editId)
        
        if (record && record.type === "poop") {
          console.log("从mappedPoopRecords找到记录:", record)
          await loadRecordForEdit(editId)
        } else {
          console.log("在mappedPoopRecords中未找到记录，等待数据加载...")
          // 如果当前没有找到记录，可能是数据还在加载中，等待一下再试
          setTimeout(() => {
            const retryRecord = mappedPoopRecords.find(r => r.id === editId || r.recordId === editId)
            if (retryRecord && retryRecord.type === "poop") {
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
  }, [searchParams, mappedPoopRecords]) // 使用mappedPoopRecords作为依赖项

  // 加载记录用于编辑 - 使用与view页面相同的数据源
  const loadRecordForEdit = async (recordId: string) => {
    console.log("开始加载记录:", recordId) // 调试日志
    console.log("当前用户:", selectedUser)
    console.log("mappedPoopRecords数量:", mappedPoopRecords.length)
    setIsLoadingRecord(true) // 使用专门的记录加载状态
    
    try {
      // 从mappedPoopRecords中查找记录（与view页面使用相同的数据源）
      console.log("从mappedPoopRecords中查找:", recordId)
      console.log("当前mappedPoopRecords:", mappedPoopRecords)
      
      let record = mappedPoopRecords.find(r => r.id === recordId || r.recordId === recordId)
      
      if (record) {
        console.log("从mappedPoopRecords找到记录:", record)
      } else {
        console.log("在mappedPoopRecords中未找到记录")
        // 如果mappedPoopRecords中没有找到，尝试从IndexedDB查找作为备用
        if (isInitialized) {
          console.log("数据库已初始化，尝试从IndexedDB查找")
          const dbRecord = await getRecordById(recordId)
          console.log("从IndexedDB加载的记录:", dbRecord)
          if (dbRecord) {
                         // 将数据库记录转换为mappedPoopRecords格式
             const mappedRecord = {
               id: dbRecord.id,
               recordId: dbRecord.recordId || dbRecord.id,
               uniqueOwnerId: dbRecord.uniqueOwnerId || selectedUser?.uniqueOwnerId || "",
               ownerId: dbRecord.ownerId || selectedUser?.uniqueOwnerId || "",
               ownerName: dbRecord.ownerName || selectedUser?.nickname || "",
               date: dbRecord.date,
               datetime: dbRecord.datetime,
               type: dbRecord.type,
               content: dbRecord.content || "",
               tags: dbRecord.tags || [],
               attachments: dbRecord.attachments || [],
               poopType: dbRecord.poopType || "type4",
               poopColor: dbRecord.poopColor || "brown",
               poopSmell: dbRecord.poopSmell || "normal",
               createdAt: dbRecord.createdAt,
               updatedAt: dbRecord.updatedAt,
             }
            // 使用数据库记录
            record = mappedRecord
          }
        } else {
          console.log("数据库未初始化，无法从IndexedDB查找")
        }
      }
      
              if (record && record.type === "poop") {
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
          
          const newPoopType = record.poopType || "type4"
          const newPoopColor = record.poopColor || "brown"
          const newPoopSmell = record.poopSmell || "normal"
          const newNotes = record.content || ""
        
                  console.log("准备设置的值:", {
            recordDatetime: record.datetime,
            recordCreatedAt: record.createdAt,
            recordCreatedAtType: typeof record.createdAt,
            newDateTime: newDateTime,
            poopType: newPoopType,
            poopColor: newPoopColor,
            poopSmell: newPoopSmell,
            notes: newNotes
          }) // 调试日志
        
        setRecordDateTime(newDateTime)
        setPoopType(newPoopType)
        setPoopColor(newPoopColor)
        setPoopSmell(newPoopSmell)
        setNotes(newNotes)
        
                  // 设置用户选择 - 只在当前用户不匹配时才设置
          if (record.uniqueOwnerId) {
            const recordUser = availableUsers.find(user => user.uniqueOwnerId === record.uniqueOwnerId)
            if (recordUser && (!selectedUser || selectedUser.uniqueOwnerId !== recordUser.uniqueOwnerId)) {
              console.log("设置用户选择:", recordUser)
              setSelectedUser(recordUser)
              updateSelectedUsers([recordUser]) // 同步全局用户选择
            }
          }
        
        console.log("表单值设置完成") // 调试日志
        
        // 加载附件信息（如果有的话）
        if (record.attachments && record.attachments.length > 0) {
          console.log("发现附件:", record.attachments) // 调试日志
          // 这里可以加载已存在的附件信息
          // 暂时不处理，因为附件文件需要从存储中重新获取
        }
      } else {
        console.log("记录不存在或类型不匹配:", record) // 调试日志
        console.log("mappedPoopRecords ID列表:", mappedPoopRecords.map(r => r.id))
        console.log("查找的记录ID:", recordId)
        
        // 不要立即跳转，而是显示错误信息
        toast({
          title: "记录不存在",
          description: `要编辑的记录 (${recordId}) 不存在或类型不匹配。请检查记录ID是否正确。`,
          variant: "destructive",
        })
        
        // 延迟跳转，让用户看到错误信息
        // setTimeout(() => {
        //   router.push("/healthcalendar")
        // }, 3000)
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

  // 布里斯托大便分类法
  const bristolStoolTypes = [
    { value: "type1", label: "类型1", description: "分离的硬块，像坚果一样（难以排出）" },
    { value: "type2", label: "类型2", description: "香肠状但结块" },
    { value: "type3", label: "类型3", description: "香肠状但表面有裂缝" },
    { value: "type4", label: "类型4", description: "香肠状或蛇状，光滑柔软" },
    { value: "type5", label: "类型5", description: "软块，边缘清晰（容易排出）" },
    { value: "type6", label: "类型6", description: "糊状，边缘不清晰" },
    { value: "type7", label: "类型7", description: "完全液体，无固体块" },
    { value: "other", label: "其他", description: "其他类型" }
  ]

  // 便便颜色选项
  const poopColors = [
    { value: "brown", label: "棕色", description: "正常颜色，胆汁代谢正常" },
    { value: "light_yellow", label: "浅黄或灰白", description: "胆汁分泌或胆道阻塞异常" },
    { value: "black", label: "黑色", description: "可能有上消化道出血或铁剂摄入" },
    { value: "red", label: "红色", description: "可能有下消化道出血或吃了红色食物" },
    { value: "green", label: "绿色", description: "可能是食物残留或肠道蠕动过快" },
    { value: "yellow_foamy", label: "黄色泡沫状", description: "脂肪吸收不良，脂肪泻" },
    { value: "other", label: "其他", description: "其他颜色" }
  ]

  // 便便气味与成分选项
  const poopSmells = [
    { value: "normal", label: "正常气味", description: "正常的大便气味" },
    { value: "foul", label: "恶臭", description: "消化不良、感染性腹泻、腐败蛋白产气" },
    { value: "oily_floating", label: "油脂光泽、漂浮", description: "脂肪吸收不良、胰腺功能障碍" },
    { value: "mucus", label: "粘液", description: "肠道炎症、感染或刺激性食物" },
    { value: "blood", label: "带血", description: "痔疮、肠炎、肠癌" },
    { value: "parasites", label: "含寄生虫/虫卵", description: "肠道寄生虫感染" },
    { value: "other", label: "其他", description: "其他特征" }
  ]

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    files.forEach(file => {
      const fileId = Math.random().toString(36).substr(2, 9)
      const uploadedFile: UploadedFile = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file
      }
      
      // 如果是图片，创建预览
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, preview: e.target?.result as string } : f
          ))
        }
        reader.readAsDataURL(file)
      }
      
      setUploadedFiles(prev => [...prev, uploadedFile])
    })
    
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
    
    setIsSubmitting(true)
    try {
      console.log('[Poop] handleSubmit start, isEditMode:', isEditMode, 'uploadedFiles:', uploadedFiles)
      // 构造 PoopRecord
      const newRecord = {
        id: isEditMode ? editRecordId : Math.random().toString(36).substr(2, 9),
        date: getLocalDateString(new Date(recordDateTime)),
        datetime: new Date(recordDateTime).toISOString(), // 设置datetime字段，格式与updatedAt相同
        type: 'poop' as const,
        content: notes.trim(),
        attachments: [] as FileAttachment[],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        poopType,
        poopColor,
        poopSmell,
      }
      console.log('[Poop] newRecord:', newRecord)
      console.log('[Poop] poopRecordsApi:', poopRecordsApi)
      let attachments: FileAttachment[] = []
      if (uploadedFiles.length > 0 && poopRecordsApi) {
        for (const file of uploadedFiles) {
          console.log('[Poop] 准备上传文件:', file)
          if ((file as any).url) {
            // 如果文件已经有URL，说明是已存在的附件
            attachments.push({
              id: file.id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: (file as any).url,
            })
            console.log('[Poop] 已存在的附件，直接保留:', file)
          } else {
            try {
              const url = await poopRecordsApi.uploadImage(file.file)
              console.log('[Poop] 上传成功，url:', url)
              attachments.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: file.name,
                type: file.type,
                size: file.size,
                url,
              })
            } catch (e) {
              console.error('[Poop] Supabase 上传失败:', e)
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
      console.log('[Poop] 最终 attachments:', attachments)
      if (poopRecordsApi) {
        if (isEditMode) {
          console.log('[Poop] 调用 updateRecord', newRecord)
          await poopRecordsApi.updateRecord(newRecord)
        } else {
          console.log('[Poop] 调用 addRecord', newRecord, uploadedFiles[0]?.file)
          await poopRecordsApi.addRecord(newRecord, uploadedFiles[0]?.file)
        }
      }
      toast({
        title: "保存成功",
        description: `已为 ${selectedUser.nickname} 保存大便记录（含云端同步）`,
      })
      setTimeout(() => {
        router.push("/healthcalendar")
      }, 1000)
    } catch (error) {
      console.error("保存失败:", error)
      toast({
        title: "保存失败",
        description: poopRecordsApi?.error || '保存记录时发生错误，请重试',
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载记录中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
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
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "编辑大便记录" : "大便记录"}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode ? "修改大便记录信息" : "记录今天的大便状况"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* 用户选择器 - 内联在页面头部 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <InlineUserSelector
              selectedUser={selectedUser}
              onUserChange={(user) => {
                // 在加载记录时不允许切换用户
                if (!isLoadingRecord) {
                  setSelectedUser(user)
                }
              }}
              availableUsers={availableUsers}
              recordType="poop"
            />
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

        {/* 大便类型 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>大便类型（布里斯托分类法）</CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible open={isTypeExpanded} onOpenChange={setIsTypeExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>选择大便类型</span>
                  {isTypeExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 gap-3">
                  {bristolStoolTypes.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setPoopType(type.value)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        poopType === type.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium">{type.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* 当前选择显示 */}
            {poopType && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="font-medium text-green-800">
                  当前选择：{bristolStoolTypes.find(t => t.value === poopType)?.label}
                </div>
                <div className="text-sm text-green-600 mt-1">
                  {bristolStoolTypes.find(t => t.value === poopType)?.description}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 大便颜色 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>大便颜色</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={poopColor} onValueChange={setPoopColor}>
              <SelectTrigger>
                <SelectValue placeholder="选择大便颜色" />
              </SelectTrigger>
              <SelectContent>
                {poopColors.map(color => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{color.label}</span>
                      <span className="text-xs text-gray-500">{color.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 大便气味与成分 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>大便气味与成分</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={poopSmell} onValueChange={setPoopSmell}>
              <SelectTrigger>
                <SelectValue placeholder="选择大便气味与成分" />
              </SelectTrigger>
              <SelectContent>
                {poopSmells.map(smell => (
                  <SelectItem key={smell.value} value={smell.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{smell.label}</span>
                      <span className="text-xs text-gray-500">{smell.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 附件上传 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>附件上传</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-sm text-gray-600">
                    点击上传图片或文档
                  </span>
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
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file.type)}
                        <div>
                          <div className="font-medium text-sm">{file.name}</div>
                          <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(file.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
              placeholder="记录其他感受或注意事项..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
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
            disabled={isSubmitting || !selectedUser}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "保存中..." : (isEditMode ? "更新记录" : "保存记录")}
          </Button>
        </div>
      </div>
    </div>
  )
}