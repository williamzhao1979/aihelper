"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ArrowLeft, Upload, X, FileText, Image, File, ChevronDown, ChevronUp, Users, Utensils } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useHealthDatabase } from "@/hooks/use-health-database"
import healthDB from "@/lib/health-database"
import { getLocalDateTimeString, getLocalDateString } from "@/lib/utils"
import { useUserManagement } from "@/hooks/use-user-management"
import InlineUserSelector, { type UserProfile } from "@/components/healthcalendar/shared/inline-user-selector"
import { useMealRecords } from '@/hooks/use-meal-records'
import type { FileAttachment } from '@/hooks/use-meal-records'
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import { mealTypes, foodTypes, mealPortions, mealConditions } from "@/lib/meal-options"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file: File | null // 允许为 null，用于已存在的文件
  preview?: string
  url?: string // 添加 url 字段，用于已存在的文件
}

export default function MealRecordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { saveRecord, updateRecord, getRecordById, isInitialized, isLoading: dbLoading } = useHealthDatabase()
  const { updateSelectedUsers } = useGlobalUserSelection();

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
  const [mealType, setMealType] = useState<string>("breakfast")
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>(["staple"])
  const [mealPortion, setMealPortion] = useState<string>("normal")
  const [mealCondition, setMealCondition] = useState<string>("normal")
  const [notes, setNotes] = useState("")
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFoodTypesExpanded, setIsFoodTypesExpanded] = useState(false)
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

  console.log("[MealPage] selectedUser?.uniqueOwnerId:", selectedUser?.uniqueOwnerId)
  console.log("[MealPage] selectedUser:", selectedUser)
  console.log("[MealPage] currentUser?.uniqueOwnerId:", currentUser?.uniqueOwnerId)

  const handleUserSelectionChange = (user: UserProfile) => {
    console.log('[MealPage] User selection changed to:', user)
    // 用户选择变化会通过全局状态自动同步
  }

  // mealRecordsApi 必须在 selectedUser 声明后
  const mealRecordsApi = useMealRecords(
    selectedUser?.ownerId || '',
    selectedUser?.uniqueOwnerId || ''
  )

  // 使用与view页面完全一致的映射逻辑
  const mappedMealRecords = useMemo(() => {
    console.log('[mappedMealRecords] useMemo triggered')
    console.log('[mappedMealRecords] mealRecords length:', mealRecordsApi.records.length)
    console.log('[mappedMealRecords] selectedUser:', selectedUser)
    console.log('[mappedMealRecords] mapping records, mealRecords:', mealRecordsApi.records)
    return mealRecordsApi.records.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: selectedUser?.uniqueOwnerId || "",
      ownerId: selectedUser?.uniqueOwnerId || "",
      ownerName: selectedUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "meal",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      mealType: r.mealType,
      foodTypes: r.foodTypes,
      mealPortion: r.mealPortion,
      mealCondition: r.mealCondition,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [mealRecordsApi.records, selectedUser])

  // 强制获取最新数据 - 每次进入meal页面时都强制刷新云端数据（与view页面保持一致）
  useEffect(() => {
    if (!selectedUser?.uniqueOwnerId) return
    console.log('[useEffect] Meal页面强制云端刷新触发. selectedUser:', selectedUser)
    
    const doForceRefresh = async () => {
      try {
        console.log('[useEffect] Meal页面开始强制云端刷新，用户:', selectedUser?.uniqueOwnerId)
        // 使用forceRefresh确保清除所有缓存并获取最新数据
        await mealRecordsApi.forceRefresh()
        console.log('[useEffect] Meal页面强制云端刷新完成, 现有记录数:', mealRecordsApi.records.length)
      } catch (err) {
        console.error('[useEffect] Meal页面强制云端刷新失败，尝试syncFromCloud:', err)
        try {
          await mealRecordsApi.syncFromCloud()
          console.log('[useEffect] Meal页面syncFromCloud完成, 现有记录数:', mealRecordsApi.records.length)
        } catch (syncErr) {
          console.error('[useEffect] Meal页面syncFromCloud也失败:', syncErr)
        }
      }
    }
    
    // 加入一个小延迟确保组件已完全初始化
    const timer = setTimeout(() => {
      doForceRefresh()
    }, 300)
    
    return () => {
      clearTimeout(timer)
    }
  }, [selectedUser?.uniqueOwnerId, mealRecordsApi])

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
        console.log("开始从mappedMealRecords中查找记录:", editId)
        console.log("当前mappedMealRecords数量:", mappedMealRecords.length)
        
        // 从mappedMealRecords中查找记录（与view页面使用相同的数据源）
        const record = mappedMealRecords.find(r => r.id === editId || r.recordId === editId)
        
        if (record && record.type === "meal") {
          console.log("从mappedMealRecords找到记录:", record)
          await loadRecordForEdit(editId)
        } else {
          console.log("在mappedMealRecords中未找到记录，等待数据加载...")
          // 如果当前没有找到记录，可能是数据还在加载中，等待一下再试
          setTimeout(() => {
            const retryRecord = mappedMealRecords.find(r => r.id === editId || r.recordId === editId)
            if (retryRecord && retryRecord.type === "meal") {
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
  }, [searchParams, mappedMealRecords]) // 使用mappedMealRecords作为依赖项

  // 加载记录用于编辑 - 使用与view页面相同的数据源
  const loadRecordForEdit = async (recordId: string) => {
    console.log("开始加载记录:", recordId) // 调试日志
    console.log("当前用户:", selectedUser)
    console.log("mappedMealRecords数量:", mappedMealRecords.length)
    setIsLoadingRecord(true) // 使用专门的记录加载状态
    
    try {
      // 从mappedMealRecords中查找记录（与view页面使用相同的数据源）
      console.log("从mappedMealRecords中查找:", recordId)
      console.log("当前mappedMealRecords:", mappedMealRecords)
      
      let record = mappedMealRecords.find(r => r.id === recordId || r.recordId === recordId)
      
      if (record) {
        console.log("从mappedMealRecords找到记录:", record)
      } else {
        console.log("在mappedMealRecords中未找到记录")
        // 如果mappedMealRecords中没有找到，尝试从IndexedDB查找作为备用
        if (isInitialized) {
          console.log("数据库已初始化，尝试从IndexedDB查找")
          const dbRecord = await getRecordById(recordId)
          console.log("从IndexedDB加载的记录:", dbRecord)
          if (dbRecord) {
            // 将数据库记录转换为mappedMealRecords格式
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
              attachments: dbRecord.attachments?.map(a => ({
                id: a.id,
                name: a.name,
                type: a.type,
                size: a.size,
                url: (a as any).url || '', // 使用 any 类型断言，因为数据库记录可能有 url 字段
              })) || [],
              mealType: (dbRecord as any).mealType || "breakfast",
              foodTypes: (dbRecord as any).foodTypes || ["staple"],
              mealPortion: (dbRecord as any).mealPortion || "normal",
              mealCondition: (dbRecord as any).mealCondition || "normal",
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
      
      if (record && record.type === "meal") {
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
        
        const newMealType = record.mealType || "breakfast"
        const newFoodTypes = record.foodTypes || ["staple"]
        const newMealPortion = record.mealPortion || "normal"
        const newMealCondition = record.mealCondition || "normal"
        const newNotes = record.content || ""
      
        console.log("准备设置的值:", {
          recordDatetime: record.datetime,
          recordCreatedAt: record.createdAt,
          recordCreatedAtType: typeof record.createdAt,
          newDateTime: newDateTime,
          mealType: newMealType,
          foodTypes: newFoodTypes,
          mealPortion: newMealPortion,
          mealCondition: newMealCondition,
          notes: newNotes
        }) // 调试日志
      
        setRecordDateTime(newDateTime)
        setMealType(newMealType)
        setSelectedFoodTypes(newFoodTypes)
        setMealPortion(newMealPortion)
        setMealCondition(newMealCondition)
        setNotes(newNotes)
        
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
        console.log("mappedMealRecords ID列表:", mappedMealRecords.map(r => r.id))
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

  // 处理食物类型选择
  const handleFoodTypeToggle = (foodType: string) => {
    setSelectedFoodTypes(prev => {
      if (prev.includes(foodType)) {
        return prev.filter(type => type !== foodType)
      } else {
        return [...prev, foodType]
      }
    })
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
    
    if (selectedFoodTypes.length === 0) {
      toast({
        title: "验证失败",
        description: "请至少选择一种食物类型",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    try {
      console.log('[Meal] handleSubmit start, isEditMode:', isEditMode, 'uploadedFiles:', uploadedFiles)
      // 构造 MealRecord
      const newRecord = {
        id: isEditMode ? editRecordId : Math.random().toString(36).substr(2, 9),
        date: getLocalDateString(new Date(recordDateTime)),
        datetime: new Date(recordDateTime).toISOString(), // 设置datetime字段，格式与updatedAt相同
        type: 'meal' as const,
        content: notes.trim(),
        attachments: [] as FileAttachment[],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        mealType,
        foodTypes: selectedFoodTypes,
        mealPortion,
        mealCondition,
      }
      console.log('[Meal] newRecord:', newRecord)
      console.log('[Meal] mealRecordsApi:', mealRecordsApi)
      let attachments: FileAttachment[] = []
      if (uploadedFiles.length > 0 && mealRecordsApi) {
        for (const file of uploadedFiles) {
          console.log('[Meal] 准备上传文件:', file)
          if ((file as any).url) {
            // 如果文件已经有URL，说明是已存在的附件
            attachments.push({
              id: file.id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: (file as any).url,
            })
            console.log('[Meal] 已存在的附件，直接保留:', file)
          } else if (file.file) {
            try {
              const url = await mealRecordsApi.uploadImage(file.file)
              console.log('[Meal] 上传成功，url:', url)
              attachments.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                name: file.name,
                type: file.type,
                size: file.size,
                url,
              })
            } catch (e) {
              console.error('[Meal] Supabase 上传失败:', e)
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
      console.log('[Meal] 最终 attachments:', attachments)
      if (mealRecordsApi) {
        try {
          if (isEditMode) {
            console.log('[Meal] 调用 updateRecord', newRecord);
            await mealRecordsApi.updateRecord(newRecord);
            console.log('[Meal] updateRecord 调用成功');
            
            // 编辑模式额外调用直接同步方法确保云端更新
            console.log('[Meal] 编辑模式额外调用 directSyncToCloud');
            try {
              // 获取当前所有记录
              const currentRecords = [...mealRecordsApi.records]; 
              // 替换或添加当前编辑的记录
              const recordIndex = currentRecords.findIndex(r => r.id === newRecord.id);
              if (recordIndex >= 0) {
                currentRecords[recordIndex] = newRecord;
              } else {
                currentRecords.push(newRecord);
              }
              // 直接同步所有记录到云端
              await mealRecordsApi.directSyncToCloud(currentRecords);
              console.log('[Meal] 编辑模式 directSyncToCloud 调用成功，同步记录数:', currentRecords.length);
            } catch (syncError) {
              console.error('[Meal] 编辑模式 directSyncToCloud 调用失败:', syncError);
            }
          } else {
            console.log('[Meal] 调用 addRecord', newRecord);
            
            // 对于新建记录，我们使用三种方法确保云端同步成功
            
            // 方法1: 使用 addRecord (会更新状态并调用云端同步)
            await mealRecordsApi.addRecord(newRecord);
            console.log('[Meal] addRecord 调用成功，现有记录数:', mealRecordsApi.records.length);
            
            // 验证记录已被添加到内存
            const addedRecord = mealRecordsApi.records.find(r => r.id === newRecord.id);
            if (addedRecord) {
              console.log('[Meal] 验证成功: 记录已添加到内存中');
            } else {
              console.warn('[Meal] 记录未被成功添加到内存中');
            }
            
            // 方法2: 再次调用 directSyncToCloud 确保记录被同步
            console.log('[Meal] 额外调用 directSyncToCloud 确保云端同步');
            try {
              // 获取当前所有记录，添加新记录
              const recordsToSync = [...mealRecordsApi.records];
              
              // 确保新记录在同步数组中
              if (!recordsToSync.some(r => r.id === newRecord.id)) {
                console.log('[Meal] 添加缺失的记录到同步数组');
                recordsToSync.push(newRecord);
              }
              
              // 确保数组不为空
              const finalRecords = recordsToSync.length > 0 ? recordsToSync : [newRecord];
              
              // 直接同步到云端
              await mealRecordsApi.directSyncToCloud(finalRecords);
              console.log('[Meal] directSyncToCloud 调用成功，同步记录数:', finalRecords.length);
            } catch (syncError) {
              console.error('[Meal] directSyncToCloud 调用失败:', syncError);
              
              // 方法3: 最后尝试调用常规 syncToCloud
              try {
                console.log('[Meal] 最后尝试调用 syncToCloud');
                await mealRecordsApi.syncToCloud();
                console.log('[Meal] 常规 syncToCloud 调用成功');
              } catch (finalError) {
                console.error('[Meal] 所有同步方法均失败:', finalError);
              }
            }
          }
        } catch (apiError) {
          console.error('[Meal] 调用 mealRecordsApi 方法失败:', apiError);
          throw apiError;
        }
      }
      toast({
        title: "保存成功",
        description: `已为 ${selectedUser.nickname} 保存用餐记录（含云端同步）`,
      })
      setTimeout(() => {
        router.push("/healthcalendar")
      }, 1000)
    } catch (error) {
      console.error("保存失败:", error)
      toast({
        title: "保存失败",
        description: mealRecordsApi?.error || '保存记录时发生错误，请重试',
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Utensils className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEditMode ? "编辑用餐记录" : "用餐记录"}
              </h1>
              <p className="text-sm text-gray-600">
                {isEditMode ? "修改用餐记录信息" : "记录今天的用餐情况"}
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

        {/* 餐次类型 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>餐次类型</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger>
                <SelectValue placeholder="选择餐次类型" />
              </SelectTrigger>
              <SelectContent>
                {mealTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-gray-500">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 食物类型 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>食物类型（可多选）</CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible open={isFoodTypesExpanded} onOpenChange={setIsFoodTypesExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>选择食物类型 ({selectedFoodTypes.length}项)</span>
                  {isFoodTypesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 gap-3">
                  {foodTypes.map(type => (
                    <div
                      key={type.value}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedFoodTypes.includes(type.value)
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleFoodTypeToggle(type.value)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedFoodTypes.includes(type.value)}
                          onChange={() => handleFoodTypeToggle(type.value)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* 当前选择显示 */}
            {selectedFoodTypes.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="font-medium text-orange-800 mb-2">
                  已选择的食物类型：
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFoodTypes.map(typeValue => (
                    <Badge key={typeValue} variant="secondary" className="bg-orange-100 text-orange-700">
                      {foodTypes.find(t => t.value === typeValue)?.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 进食量 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>进食量</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={mealPortion} onValueChange={setMealPortion}>
              <SelectTrigger>
                <SelectValue placeholder="选择进食量" />
              </SelectTrigger>
              <SelectContent>
                {mealPortions.map(portion => (
                  <SelectItem key={portion.value} value={portion.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{portion.label}</span>
                      <span className="text-xs text-gray-500">{portion.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 进食情况 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>进食情况</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={mealCondition} onValueChange={setMealCondition}>
              <SelectTrigger>
                <SelectValue placeholder="选择进食情况" />
              </SelectTrigger>
              <SelectContent>
                {mealConditions.map(condition => (
                  <SelectItem key={condition.value} value={condition.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{condition.label}</span>
                      <span className="text-xs text-gray-500">{condition.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* 备注 */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>备注</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="记录具体食物、口感、感受或注意事项..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
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
                    <div className="text-xs text-green-600 mt-1">
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
            disabled={isSubmitting || !selectedUser || selectedFoodTypes.length === 0}
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting ? "保存中..." : (isEditMode ? "更新记录" : "保存记录")}
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
