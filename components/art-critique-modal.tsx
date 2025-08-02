"use client"

import React, { useState, useRef, useId } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, X, Palette, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { ProcessingTimeTracker } from "@/lib/processing-time-tracker"

interface UploadedImage {
  id: string
  name: string
  size: number
  preview: string
  file: File
}

interface ArtCritiqueModalProps {
  onProcessingStart?: () => void
  onResult?: (result: any) => void
  onTimeEstimate?: (estimate: { estimatedTime: number; explanation: string }) => void
  children: React.ReactNode
}

// Add image compression utility
const compressImage = (file: File, maxWidth = 1024, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      // Draw and compress
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Fallback to original if compression fails
          }
        },
        "image/jpeg",
        quality,
      )
    }

    img.src = URL.createObjectURL(file)
  })
}

// Processing time estimation utility
const estimateProcessingTime = (images: UploadedImage[], mergeImages: boolean): { estimatedTime: number; explanation: string } => {
  if (images.length === 0) {
    return { estimatedTime: 0, explanation: "无图片需要处理" }
  }

  // Calculate total file size in MB
  const totalSizeMB = images.reduce((sum, img) => sum + img.file.size, 0) / (1024 * 1024)
  
  // Try to get historical average first
  const historicalAverage = ProcessingTimeTracker.getAverageProcessingTime(images.length, totalSizeMB, mergeImages)
  
  if (historicalAverage) {
    // Use historical data with small adjustment buffer
    const adjustedTime = Math.ceil(historicalAverage * 1.1) // 10% buffer
    return {
      estimatedTime: adjustedTime,
      explanation: `基于历史数据预测：${historicalAverage}秒 + 10%缓冲 = ${adjustedTime}秒`
    }
  }

  // Fallback to algorithm-based estimation for art critique
  const baseTimePerImage = 10 // Art critique takes longer than text editing
  const uploadTimePerMB = 2 // seconds per MB for upload
  const mergeProcessingTime = 8 // Additional time for merge processing (longer for art critique)
  const retryBuffer = 0.3 // 30% buffer for potential retries
  
  let estimatedTime = 0
  let explanation = ""
  
  if (mergeImages) {
    // Merged processing: all images processed together
    estimatedTime = baseTimePerImage * 2 + (totalSizeMB * uploadTimePerMB) + mergeProcessingTime
    explanation = `算法预测 - 合并处理模式：基础处理时间 ${baseTimePerImage * 2}秒 + 上传时间 ${Math.ceil(totalSizeMB * uploadTimePerMB)}秒 + 合并处理 ${mergeProcessingTime}秒`
  } else {
    // Individual processing: each image processed separately
    estimatedTime = (baseTimePerImage * images.length) + (totalSizeMB * uploadTimePerMB)
    explanation = `算法预测 - 单独处理模式：${images.length}张图片 × ${baseTimePerImage}秒 + 上传时间 ${Math.ceil(totalSizeMB * uploadTimePerMB)}秒`
  }
  
  // Add retry buffer and round up
  estimatedTime = Math.ceil(estimatedTime * (1 + retryBuffer))
  
  // Adjust based on image count complexity
  if (images.length > 5) {
    estimatedTime += Math.ceil((images.length - 5) * 2) // Additional 2 seconds per extra image
    explanation += ` + 多图片复杂度调整 ${Math.ceil((images.length - 5) * 2)}秒`
  }
  
  // Consider image size complexity
  const averageSizeMB = totalSizeMB / images.length
  if (averageSizeMB > 2) {
    const sizeAdjustment = Math.ceil((averageSizeMB - 2) * 3)
    estimatedTime += sizeAdjustment
    explanation += ` + 大图片处理调整 ${sizeAdjustment}秒`
  }
  
  explanation += ` = 预计 ${estimatedTime}秒`
  
  return { estimatedTime, explanation }
}

export default function ArtCritiqueModal({ onProcessingStart, onResult, onTimeEstimate, children }: ArtCritiqueModalProps) {
  const t = useTranslations()

  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [mergeImages, setMergeImages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment') // 后置摄像头为默认
  const baseId = useId()
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [lastSubmittedImageIds, setLastSubmittedImageIds] = useState<string[]>([])
  const [lastSubmittedMergeOption, setLastSubmittedMergeOption] = useState<boolean>(false)
  const [timeEstimate, setTimeEstimate] = useState<{ estimatedTime: number; explanation: string } | null>(null)
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null)

  // 组件卸载时清理摄像头资源
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // 实时更新处理时间预估
  React.useEffect(() => {
    if (images.length > 0) {
      const estimate = estimateProcessingTime(images, mergeImages)
      setTimeEstimate(estimate)
      
      // 通知父组件时间预估
      if (onTimeEstimate) {
        onTimeEstimate(estimate)
      }
    } else {
      setTimeEstimate(null)
    }
  }, [images, mergeImages, onTimeEstimate])

  // 摄像头权限和流初始化
  React.useEffect(() => {
    if (!showCamera) return;

    let currentStream: MediaStream | null = null;
    const getCamera = async () => {
      setError(null)
      try {
        // 优先使用后置摄像头（environment），如果失败则回退到前置摄像头
        currentStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: cameraMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        setStream(currentStream)
        setPermissionStatus('granted')
        
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream
        }
      } catch (e: any) {
        console.error('Camera access error:', e)
        if (e.name === 'NotAllowedError') {
          setPermissionStatus('denied')
          setError('摄像头权限被拒绝，请允许摄像头访问权限')
        } else if (e.name === 'NotFoundError') {
          setPermissionStatus('unsupported')
          setError('未找到摄像头设备')
        } else {
          setPermissionStatus('denied')
          setError('无法访问摄像头：' + e.message)
        }
      }
    }

    getCamera()

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [showCamera, cameraMode])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024,
    )

    if (files.length > 0) {
      addImages(files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      addImages(files)
    }
    // Reset the input value so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleCameraClick = async () => {
    // 检查设备是否支持摄像头
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('您的设备不支持摄像头功能')
      return
    }
    
    setShowCamera(true)
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return

    // 设置画布尺寸与视频尺寸相同
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // 绘制当前视频帧到画布
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 转换为Blob并创建文件
    canvas.toBlob((blob) => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const fileName = `art-capture-${timestamp}.jpg`
        const file = new File([blob], fileName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        })
        
        addImages([file])
        stopCamera()
      }
    }, 'image/jpeg', 0.8)
  }

  const switchCamera = async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    const newMode = cameraMode === 'environment' ? 'user' : 'environment'
    setCameraMode(newMode)
  }

  const addImages = async (files: File[]) => {
    // 验证文件
    const validFiles = files.filter(file => {
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" 不是有效的图片文件`)
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" 文件大小超过10MB限制`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // 清除之前的错误
    setError(null)

    for (let fileIndex = 0; fileIndex < validFiles.length; fileIndex++) {
      const file = validFiles[fileIndex]

      try {
        // Compress image if it's larger than 2MB
        const compressedFile = file.size > 2 * 1024 * 1024 ? await compressImage(file, 1024, 0.8) : file

        const reader = new FileReader()
        reader.onload = (e) => {
          const newImage: UploadedImage = {
            id: `${baseId}-${Date.now()}-${fileIndex}-${file.name}`,
            name: file.name,
            size: compressedFile.size,
            preview: e.target?.result as string,
            file: compressedFile,
          }
          setImages((prev) => {
            const newImages = [...prev, newImage]
            // 如果添加后总数大于1张图片，自动选中合并选项
            if (newImages.length > 1) {
              setMergeImages(true)
            }
            return newImages
          })
        }
        reader.onerror = () => {
          setError(`读取文件 "${file.name}" 时出错`)
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error)
        setError(`处理文件 "${file.name}" 时出错，已使用原文件`)
        // Still add the original file if compression fails
        const reader = new FileReader()
        reader.onload = (e) => {
          const newImage: UploadedImage = {
            id: `${baseId}-${Date.now()}-${fileIndex}-${file.name}`,
            name: file.name,
            size: file.size,
            preview: e.target?.result as string,
            file: file,
          }
          setImages((prev) => {
            const newImages = [...prev, newImage]
            // 如果添加后总数大于1张图片，自动选中合并选项
            if (newImages.length > 1) {
              setMergeImages(true)
            }
            return newImages
          })
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const newImages = prev.filter((img) => img.id !== id)
      // 如果删除后只剩1张或0张图片，取消合并选项
      if (newImages.length <= 1) {
        setMergeImages(false)
      }
      return newImages
    })
  }

  const clearAllImages = () => {
    setImages([])
    setMergeImages(false) // 清除所有图片时取消合并选项
    setError(null)
  }

  const moveImageUp = (index: number) => {
    if (index > 0) {
      const newImages = [...images]
      ;[newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]]
      setImages(newImages)
    }
  }

  const moveImageDown = (index: number) => {
    if (index < images.length - 1) {
      const newImages = [...images]
      ;[newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]
      setImages(newImages)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const hasImagesChanged = () => {
    const currentImageIds = images.map((img) => img.id)
    if (currentImageIds.length !== lastSubmittedImageIds.length) return true
    for (let i = 0; i < currentImageIds.length; i++) {
      if (currentImageIds[i] !== lastSubmittedImageIds[i]) return true
    }
    if (mergeImages !== lastSubmittedMergeOption) return true
    return false
  }

  const processWithAI = async () => {
    if (images.length === 0) return

    const requestId = `art-critique-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()
    
    setProcessingRequests((prev) => new Set([...prev, requestId]))
    setError(null)

    // 关闭Modal
    setOpen(false)

    // 通知开始处理
    if (onProcessingStart) {
      onProcessingStart()
    }

    // 立即发送处理开始的消息，包含时间预估
    if (onResult) {
      const currentEstimate = estimateProcessingTime(images, mergeImages)
      const processingMessage = {
        success: true,
        type: 'art-critique-processing',
        requestId,
        message: `🎨 开始分析 ${images.length} 幅绘画作品...`,
        processingType: mergeImages ? '合并分析' : '单独分析',
        imageCount: images.length,
        estimatedTime: currentEstimate.estimatedTime,
        estimatedExplanation: currentEstimate.explanation,
        imagePreview: images.map(img => ({
          id: img.id,
          name: img.name,
          preview: img.preview,
          size: img.size
        })),
        timestamp: Date.now()
      }
      onResult(processingMessage)
    }

    try {
      // 检查是否有内容变化
      setLastSubmittedImageIds(images.map((img) => img.id))
      setLastSubmittedMergeOption(mergeImages)

      // 检查总文件大小
      const totalSize = images.reduce((sum, img) => sum + img.file.size, 0)
      const totalSizeMB = totalSize / (1024 * 1024)
      const maxSize = 10 * 1024 * 1024 // 10MB

      if (totalSize > maxSize) {
        throw new Error(
          `总文件大小 (${formatFileSize(totalSize)}) 超过限制 (${formatFileSize(maxSize)})。请压缩图片或减少图片数量。`
        )
      }

      // 构建 FormData
      const formData = new FormData()
      formData.append("mergeImages", mergeImages.toString())

      images.forEach((image, index) => {
        formData.append(`image_${index}`, image.file)
      })

      // 发送请求到 Art Review API
      const response = await fetch("/api/art-review", {
        method: "POST",
        body: formData,
      })

      if (response.status === 413) {
        throw new Error("上传的图片总大小超过服务器限制。请压缩图片或减少图片数量后重试。")
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        if (response.status === 413) {
          throw new Error("上传的图片总大小超过服务器限制。请压缩图片或减少图片数量后重试。")
        }
        throw new Error(`服务器响应格式错误 (状态码: ${response.status})`)
      }

      if (!response.ok) {
        throw new Error(data.error || `请求失败 (状态码: ${response.status})`)
      }

      if (!data.success) {
        throw new Error(data.error || "Processing failed")
      }

      // 处理返回结果
      if (onResult) {
        const actualProcessingTime = Math.ceil((Date.now() - startTime) / 1000)
        const estimatedTime = timeEstimate?.estimatedTime || 0
        const accuracyPercent = estimatedTime > 0 ? Math.round(Math.abs(1 - actualProcessingTime / estimatedTime) * 100) : 0
        
        const result: any = {
          success: true,
          type: 'art-critique',
          requestId,
          merged: data.merged || false,
          actualProcessingTime,
          estimatedTime,
          timeAccuracy: accuracyPercent,
          timestamp: Date.now(),
          imagePreview: images.map(img => ({
            id: img.id,
            name: img.name,
            preview: img.preview,
            size: img.size
          }))
        }

        if (data.merged) {
          // 合并处理结果
          result.result = {
            style: data.result?.style || "未识别风格",
            description: data.result?.description || "未能生成描述",
            evaluation: data.result?.evaluation || "未能生成评价",
            suggestions: data.result?.suggestions || ["建议检查图片质量", "确保绘画内容清晰可见"],
            sell_evaluation: data.result?.sell_evaluation || "未能生成售价评估",
            point: typeof data.result?.point === 'number' ? data.result.point : 
                   (typeof data.result?.point === 'string' ? parseInt(data.result.point, 10) || 5 : 5),
            return: data.result?.return || "艺术点评完成",
            end: data.result?.end || "继续创作",
            image_count: images.length
          }
        } else {
          // 单独处理结果
          result.results = (data.results || []).map((apiResult: any, index: number) => ({
            imageIndex: index,
            imageName: images[index]?.name || `image_${index}`,
            success: apiResult.success,
            result: apiResult.success ? {
              style: apiResult.result?.style || "未识别风格",
              description: apiResult.result?.description || "未能生成描述",
              evaluation: apiResult.result?.evaluation || "未能生成评价",
              suggestions: apiResult.result?.suggestions || ["建议检查图片质量", "确保绘画内容清晰可见"],
              sell_evaluation: apiResult.result?.sell_evaluation || "未能生成售价评估",
              point: typeof apiResult.result?.point === 'number' ? apiResult.result.point : 
                     (typeof apiResult.result?.point === 'string' ? parseInt(apiResult.result.point, 10) || 5 : 5),
              return: apiResult.result?.return || "艺术点评完成",
              end: apiResult.result?.end || "继续创作"
            } : undefined,
            error: apiResult.error
          }))
        }
        
        // 返回最终结果
        console.log('Sending art critique result to onResult:', result);
        onResult(result)
        
        // 记录处理时间到历史数据
        ProcessingTimeTracker.recordProcessingTime({
          imageCount: images.length,
          totalSizeMB,
          mergeMode: data.merged || false,
          actualTime: actualProcessingTime,
          estimatedTime: estimatedTime,
          timestamp: Date.now()
        })
      }

    } catch (error) {
      console.error("Error processing art critique:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to process art critique"
      setError(errorMessage)
      
      if (onResult) {
        onResult({
          success: false,
          type: 'art-critique',
          requestId,
          error: errorMessage,
          timestamp: Date.now()
        })
      }
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            绘画点评
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                已上传图片 ({images.length})
              </CardTitle>
              {images.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllImages}>
                  <X className="w-4 h-4 mr-2" />
                  清除所有
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleButtonClick}
                className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-300 hover:border-orange-400 hover:bg-gray-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-sm font-medium text-orange-700 mb-2">
                  {dragOver ? "松开上传" : "拖拽绘画作品、点击上传或使用拍照功能"}
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-orange-600 text-white hover:bg-orange-700 border-orange-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleButtonClick()
                    }}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    选择图片
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700 border-green-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCameraClick()
                    }}
                    title="打开摄像头拍照"
                  >
                    📷 拍照
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">支持JPG、PNG，最大10MB</p>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="ml-auto p-1 h-auto text-red-500 hover:text-red-700"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* 摄像头界面 */}
              {showCamera && (
                <div className="mt-4 p-4 bg-black rounded-lg">
                  <div className="relative w-full max-w-sm mx-auto aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{ display: permissionStatus === 'granted' ? 'block' : 'none' }}
                    />
                    <canvas
                      ref={canvasRef}
                      className="hidden"
                    />
                    
                    {/* 摄像头切换按钮 */}
                    {permissionStatus === 'granted' && (
                      <button
                        onClick={switchCamera}
                        className="absolute top-2 right-2 z-40 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                        title={`切换到${cameraMode === 'environment' ? '前置' : '后置'}摄像头`}
                      >
                        🔄
                      </button>
                    )}

                    {/* 权限状态提示 */}
                    {permissionStatus !== 'granted' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                        <div className="text-white text-center p-4">
                          {permissionStatus === 'denied' && (
                            <div>
                              <p className="text-sm mb-2">摄像头权限被拒绝</p>
                              <p className="text-xs text-gray-300">请在浏览器设置中允许摄像头权限</p>
                            </div>
                          )}
                          {permissionStatus === 'unsupported' && (
                            <p className="text-sm">设备不支持摄像头功能</p>
                          )}
                          {permissionStatus === 'prompt' && (
                            <p className="text-sm">正在请求摄像头权限...</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 拍照按钮 */}
                    {permissionStatus === 'granted' && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={capturePhoto}
                          className="bg-white text-gray-700 border-0 hover:bg-gray-100 w-16 h-16 rounded-full"
                          title="拍照"
                        >
                          📸
                        </Button>
                      </div>
                    )}

                    {/* 摄像头模式指示器 */}
                    {permissionStatus === 'granted' && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-black/50 text-white border-white/20">
                          {cameraMode === 'environment' ? '后置摄像头' : '前置摄像头'}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* 关闭摄像头按钮 */}
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopCamera}
                      className="bg-red-500/90 text-white border-0 hover:bg-red-600"
                    >
                      <X className="w-4 h-4 mr-2" />
                      关闭摄像头
                    </Button>
                  </div>
                </div>
              )}

              {images.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {images.map((image, index) => (
                      <div
                        key={image.id}
                        className="relative group border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
                      >
                        {/* 序号徽章 */}
                        <div className="absolute top-1 left-1 z-10">
                          <Badge
                            variant="default"
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-orange-600 text-white"
                          >
                            {index + 1}
                          </Badge>
                        </div>

                        {/* 大图片预览 */}
                        <div 
                          className="aspect-square w-full bg-gray-100 relative cursor-pointer"
                          onClick={() => setPreviewImage(image)}
                          title="点击查看大图"
                        >
                          <img
                            src={image.preview || "/placeholder.svg"}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* 悬停时显示的操作按钮 */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => moveImageUp(index)}
                                disabled={index === 0}
                                className="bg-white/90 hover:bg-white text-gray-700 border-0 h-8 w-8 p-0"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => moveImageDown(index)}
                                disabled={index === images.length - 1}
                                className="bg-white/90 hover:bg-white text-gray-700 border-0 h-8 w-8 p-0"
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeImage(image.id)}
                                className="bg-red-500/90 hover:bg-red-600 text-white border-0 h-8 w-8 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* 文件名和大小 */}
                        <div className="p-2 bg-gray-50">
                          <p className="text-xs font-medium truncate" title={image.name}>
                            {image.name}
                          </p>
                          <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 处理选项和按钮 */}
              {images.length > 0 && (
                <div className="space-y-4">
                  {/* 时间预估显示 */}
                  {timeEstimate && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">⏱</span>
                        </div>
                        <span className="font-medium text-blue-800">预计处理时间</span>
                        {(() => {
                          const stats = ProcessingTimeTracker.getProcessingStats()
                          return stats.totalRecords > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              历史准确度: {Math.round(stats.averageAccuracy)}%
                            </Badge>
                          )
                        })()}
                      </div>
                      <div className="text-sm text-blue-700">
                        <div className="font-semibold mb-1">
                          约 {timeEstimate.estimatedTime} 秒
                          {timeEstimate.estimatedTime > 60 && (
                            <span className="text-blue-600 ml-1">
                              ({Math.floor(timeEstimate.estimatedTime / 60)}分{timeEstimate.estimatedTime % 60}秒)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-blue-600">{timeEstimate.explanation}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="merge-images"
                        checked={mergeImages}
                        onCheckedChange={(checked) => setMergeImages(checked as boolean)}
                      />
                      <label
                        htmlFor="merge-images"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        合并分析
                      </label>
                    </div>
                    <Button
                      onClick={processWithAI}
                      disabled={processingRequests.size > 0}
                      size="lg"
                      className="bg-orange-600 hover:bg-orange-700 px-8 py-3 text-lg"
                    >
                      {processingRequests.size > 0 ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          分析中...
                        </>
                      ) : (
                        "开始分析"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </DialogContent>

      {/* 图片预览Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{previewImage?.name}</span>
                <span className="text-sm text-gray-500">{previewImage && formatFileSize(previewImage.size)}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
            <div className="relative max-w-full max-h-full">
              <img
                src={previewImage?.preview}
                alt={previewImage?.name || "预览图片"}
                className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
          
          <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>文件名: {previewImage?.name}</span>
              <span>大小: {previewImage && formatFileSize(previewImage.size)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewImage(null)}
            >
              关闭预览
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
