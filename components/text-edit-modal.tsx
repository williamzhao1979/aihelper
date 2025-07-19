"use client"

import React, { useState, useRef, useId } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, X, Languages, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"

interface UploadedImage {
  id: string
  name: string
  size: number
  preview: string
  file: File
}

interface TextEditModalProps {
  onProcessingStart?: () => void
  onResult?: (result: any) => void
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

export default function TextEditModal({ onProcessingStart, onResult, children }: TextEditModalProps) {
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

  // 组件卸载时清理摄像头资源
  React.useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

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
        const fileName = `camera-capture-${timestamp}.jpg`
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

    const requestId = `text-edit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    setProcessingRequests((prev) => new Set([...prev, requestId]))
    setError(null)

    // 关闭Modal
    setOpen(false)

    // 通知开始处理
    if (onProcessingStart) {
      onProcessingStart()
    }

    // 立即发送处理开始的消息
    if (onResult) {
      const processingMessage = {
        success: true,
        type: 'text-edit-processing',
        requestId,
        message: `🔄 开始处理 ${images.length} 张图片...`,
        processingType: mergeImages ? '合并处理' : '单独处理',
        imageCount: images.length,
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

      // 发送请求到 OCR API
      const response = await fetch("/api/ocr", {
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
        const result: any = {
          success: true,
          type: 'text-edit',
          requestId,
          merged: data.merged || false,
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
            lang: data.result?.lang || "zh",
            text: data.result?.text || "未能识别到文本内容",
            advice: data.result?.advice || ["建议检查图片质量", "确保文字清晰可见"],
            text_refined: data.result?.text_refined || data.result?.text || "未能生成优化文本",
            return: data.result?.return || "文本处理完成",
            end: data.result?.end || "处理结束",
            image_count: images.length
          }
        } else {
          // 单独处理结果
          result.results = (data.results || []).map((apiResult: any, index: number) => ({
            imageIndex: index,
            imageName: images[index]?.name || `image_${index}`,
            success: apiResult.success,
            result: apiResult.success ? {
              lang: apiResult.result?.lang || "zh",
              text: apiResult.result?.text || "未能识别到文本内容",
              advice: apiResult.result?.advice || ["建议检查图片质量", "确保文字清晰可见"],
              text_refined: apiResult.result?.text_refined || apiResult.result?.text || "未能生成优化文本",
              return: apiResult.result?.return || "文本处理完成",
              end: apiResult.result?.end || "处理结束"
            } : undefined,
            error: apiResult.error
          }))
        }
        
        // 返回最终结果
        console.log('Sending result to onResult:', result);
        onResult(result)
      }

    } catch (error) {
      console.error("Error processing images:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to process images"
      setError(errorMessage)
      
      if (onResult) {
        onResult({
          success: false,
          type: 'text-edit',
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
            <Languages className="w-5 h-5" />
            文章修改
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
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
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
                <p className="text-sm font-medium text-purple-700 mb-2">
                  {dragOver ? "松开上传" : "拖拽图片、点击上传或使用拍照功能"}
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
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
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-purple-600 text-white"
                          >
                            {index + 1}
                          </Badge>
                        </div>

                        {/* 大图片预览 */}
                        <div className="aspect-square w-full bg-gray-100 relative">
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
                <div className="flex justify-center items-center gap-4 mt-6">
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
                      合并图像
                    </label>
                  </div>
                  <Button
                    onClick={processWithAI}
                    disabled={processingRequests.size > 0}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                  >
                    {processingRequests.size > 0 ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        处理中...
                      </>
                    ) : (
                      "开始处理"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </DialogContent>
    </Dialog>
  )
}
