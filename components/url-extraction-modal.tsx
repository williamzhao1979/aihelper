"use client"

import React, { useState, useRef, useId } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Upload, X, Link, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"

interface UploadedImage {
  id: string
  name: string
  size: number
  preview: string
  file: File
}

interface URLExtractionModalProps {
  onProcessingStart?: () => void
  onResult?: (result: any) => void
  onTimeEstimate?: (estimate: { estimatedTime: number; explanation: string }) => void
  children: React.ReactNode
  sessionId?: string // 可选的会话ID，用于多实例支持
  instanceId?: string // 实例ID，用于区分不同的提取器实例
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

// Processing time estimation utility for URL extraction
const estimateProcessingTime = (images: UploadedImage[]): { estimatedTime: number; explanation: string } => {
  if (images.length === 0) {
    return { estimatedTime: 0, explanation: "无图片需要处理" }
  }

  // Calculate total file size in MB
  const totalSizeMB = images.reduce((sum, img) => sum + img.file.size, 0) / (1024 * 1024)
  
  // URL extraction is typically faster than text editing
  const baseTimePerImage = 5 // Average processing time for URL extraction
  const uploadTimePerMB = 2 // seconds per MB for upload
  const retryBuffer = 0.2 // 20% buffer for potential retries
  
  let estimatedTime = (baseTimePerImage * images.length) + (totalSizeMB * uploadTimePerMB)
  let explanation = `URL提取预测：${images.length}张图片 × ${baseTimePerImage}秒 + 上传时间 ${Math.ceil(totalSizeMB * uploadTimePerMB)}秒`
  
  // Add retry buffer and round up
  estimatedTime = Math.ceil(estimatedTime * (1 + retryBuffer))
  
  // Adjust based on image count complexity
  if (images.length > 3) {
    estimatedTime += Math.ceil((images.length - 3) * 1) // Additional 1 second per extra image
    explanation += ` + 多图片处理调整 ${Math.ceil((images.length - 3) * 1)}秒`
  }
  
  explanation += ` = 预计 ${estimatedTime}秒`
  
  return { estimatedTime, explanation }
}

export default function URLExtractionModal({ 
  onProcessingStart, 
  onResult, 
  onTimeEstimate, 
  children,
  sessionId: propSessionId,
  instanceId: propInstanceId
}: URLExtractionModalProps) {
  const t = useTranslations()

  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraMode, setCameraMode] = useState<'environment' | 'user'>('environment')
  const baseId = useId()
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('prompt')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [timeEstimate, setTimeEstimate] = useState<{ estimatedTime: number; explanation: string } | null>(null)
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null)
  
  // 生成唯一的会话ID和实例ID
  const sessionId = propSessionId || `url-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const instanceId = propInstanceId || `url-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

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
      const estimate = estimateProcessingTime(images)
      setTimeEstimate(estimate)
      
      // 通知父组件时间预估
      if (onTimeEstimate) {
        onTimeEstimate(estimate)
      }
    } else {
      setTimeEstimate(null)
    }
  }, [images, onTimeEstimate])

  // 摄像头权限和流初始化
  React.useEffect(() => {
    if (!showCamera) return;

    let currentStream: MediaStream | null = null;
    const getCamera = async () => {
      setError(null)
      
      try {
        const constraints = {
          video: {
            facingMode: cameraMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        }

        currentStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(currentStream)
        setPermissionStatus('granted')
        
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream
        }
        
      } catch (err: any) {
        console.error('摄像头访问错误:', err)
        setPermissionStatus('denied')
        
        if (err.name === 'NotAllowedError') {
          setError('摄像头访问被拒绝，请检查浏览器权限设置')
        } else if (err.name === 'NotFoundError') {
          setError('未找到摄像头设备')
        } else {
          setError('无法访问摄像头：' + err.message)
        }
      }
    }

    // 检查浏览器支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('unsupported')
      setError('您的浏览器不支持摄像头功能')
      return
    }

    getCamera()

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [showCamera, cameraMode])

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    setError(null)

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length === 0) {
      setError('请上传图片文件')
      return
    }

    await processFiles(files)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    
    setError(null)
    await processFiles(Array.from(files))
    
    // Reset file input
    e.target.value = ''
  }

  const processFiles = async (files: File[]) => {
    const newImages: UploadedImage[] = []

    for (const file of files) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`文件 ${file.name} 超过10MB大小限制`)
        continue
      }

      try {
        // Compress image if needed
        const processedFile = file.size > 2 * 1024 * 1024 
          ? await compressImage(file) 
          : file

        const imageData: UploadedImage = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: processedFile.size,
          file: processedFile,
          preview: URL.createObjectURL(processedFile)
        }

        newImages.push(imageData)
      } catch (err) {
        console.error('处理文件失败:', err)
        setError(`处理文件 ${file.name} 失败`)
      }
    }

    setImages(prev => [...prev, ...newImages])
  }

  const removeImage = (id: string) => {
    setImages(prev => {
      const updated = prev.filter(img => img.id !== id)
      // Clean up object URL
      const removed = prev.find(img => img.id === id)
      if (removed) {
        URL.revokeObjectURL(removed.preview)
      }
      return updated
    })
  }

  const handleSubmit = async () => {
    if (images.length === 0) {
      setError('请先上传图片')
      return
    }

    setError(null)
    setIsProcessing(true)

    // 生成请求ID
    const requestId = `${sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 保存图片预览数据，用于在结果中显示
    const imagePreview = images.map(img => ({
      id: img.id,
      name: img.name,
      preview: img.preview,
      size: img.size
    }))
    
    try {
      // 通知开始处理
      if (onProcessingStart) {
        onProcessingStart()
      }

      // 发送处理中状态
      if (onResult) {
        onResult({
          type: 'url-extraction-processing',
          requestId,
          sessionId,
          instanceId,
          imageCount: images.length,
          processingType: images.length > 1 ? '批量处理' : '单图处理',
          estimatedTime: timeEstimate?.estimatedTime,
          estimatedExplanation: timeEstimate?.explanation,
          imagePreview: imagePreview
        })
      }

      // 立即关闭弹窗并清空图片，让用户回到聊天页面
      setImages([])
      setOpen(false)

      // 开始实际处理
      const startTime = Date.now()
      const formData = new FormData()
      
      // 添加会话和实例信息
      formData.append('sessionId', sessionId)
      formData.append('instanceId', instanceId)
      
      images.forEach((image, index) => {
        formData.append(`image_${index}`, image.file)
      })

      const response = await fetch('/api/extract-url', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      const actualProcessingTime = Math.ceil((Date.now() - startTime) / 1000)

      // 计算预估准确度
      const timeAccuracy = timeEstimate ? 
        Math.abs(actualProcessingTime - timeEstimate.estimatedTime) : null

      if (response.ok && result.success) {
        // 处理成功
        if (onResult) {
          onResult({
            ...result,
            requestId,
            sessionId,
            instanceId,
            actualProcessingTime,
            estimatedTime: timeEstimate?.estimatedTime,
            timeAccuracy,
            imagePreview: imagePreview // 保留图片预览数据
          })
        }
        // 注意：弹窗已经在处理开始时关闭了
      } else {
        // 处理失败
        if (onResult) {
          onResult({
            success: false,
            error: result.error || 'URL提取失败',
            requestId,
            sessionId,
            instanceId,
            actualProcessingTime,
            estimatedTime: timeEstimate?.estimatedTime,
            timeAccuracy,
            imagePreview: imagePreview // 保留图片预览数据
          })
        }
      }

    } catch (err: any) {
      console.error('URL提取处理错误:', err)
      const actualProcessingTime = Math.ceil((Date.now() - Date.now()) / 1000)
      
      if (onResult) {
        onResult({
          success: false,
          error: '网络错误或服务器异常',
          requestId,
          sessionId,
          instanceId,
          actualProcessingTime,
          estimatedTime: timeEstimate?.estimatedTime,
          imagePreview: imagePreview // 保留图片预览数据
        })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  // 拍照功能
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(blob => {
      if (blob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const file = new File([blob], `camera-${timestamp}.jpg`, { type: 'image/jpeg' })
        processFiles([file])
      }
    }, 'image/jpeg', 0.8)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            URL提取 {instanceId ? `(实例: ${instanceId.slice(-8)})` : ''}
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
                <Button variant="outline" size="sm" onClick={() => {
                  // 清理图片预览URL
                  images.forEach(img => {
                    URL.revokeObjectURL(img.preview)
                  })
                  setImages([])
                }}>
                  <X className="w-4 h-4 mr-2" />
                  清除所有
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
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
                      fileInputRef.current?.click()
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
                      setShowCamera(!showCamera)
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

                {/* 摄像头区域 */}
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
                          onClick={() => setCameraMode(cameraMode === 'environment' ? 'user' : 'environment')}
                          className="absolute top-2 right-2 z-40 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                          title={`切换到${cameraMode === 'environment' ? '前置' : '后置'}摄像头`}
                        >
                          🔄
                        </button>
                      )}

                      {/* 权限状态提示 */}
                      {permissionStatus !== 'granted' && (
                        <div className="absolute inset-0 bg-gray-900 flex flex-col items-center justify-center text-center p-4">
                          {permissionStatus === 'prompt' && (
                            <div className="text-gray-400">
                              <div className="text-4xl mb-2">📷</div>
                              <div>正在请求摄像头权限...</div>
                            </div>
                          )}
                          {permissionStatus === 'denied' && (
                            <div className="text-red-400">
                              <div className="text-4xl mb-2">🚫</div>
                              <div className="text-sm">摄像头访问被拒绝</div>
                              <div className="text-xs mt-1">请在浏览器设置中允许摄像头访问</div>
                            </div>
                          )}
                          {permissionStatus === 'unsupported' && (
                            <div className="text-yellow-400">
                              <div className="text-4xl mb-2">❌</div>
                              <div className="text-sm">不支持摄像头功能</div>
                              <div className="text-xs mt-1">请使用现代浏览器</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 摄像头控制按钮 */}
                    {permissionStatus === 'granted' && (
                      <div className="flex justify-center gap-2 mt-3">
                        <Button
                          onClick={capturePhoto}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          📸 拍照
                        </Button>
                        <Button
                          onClick={() => setShowCamera(false)}
                          variant="outline"
                          size="sm"
                          className="text-gray-300 border-gray-600 hover:bg-gray-800"
                        >
                          关闭摄像头
                        </Button>
                      </div>
                    )}
                  </div>
                )}

              {/* 已上传图片显示 */}
              {images.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <Card key={image.id} className="relative group border-2 hover:border-purple-300 transition-colors duration-200">
                        <div className="absolute top-1 left-1 z-30">
                          <Badge
                            variant="default"
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-purple-600 text-white"
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
                            src={image.preview}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* 悬停时显示的操作按钮 */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeImage(image.id)
                                }}
                                className="bg-red-500/90 hover:bg-red-600 text-white border-0 h-8 w-8 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* 文件信息 */}
                        <div className="p-2">
                          <div className="text-xs font-medium text-gray-700 truncate mb-1">{image.name}</div>
                          <div className="text-xs text-gray-500">{formatFileSize(image.size)}</div>
                        </div>
                      </Card>
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
                    <Button
                      onClick={handleSubmit}
                      disabled={isProcessing}
                      size="lg"
                      className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                          处理中...
                        </>
                      ) : (
                        "开始处理"
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
