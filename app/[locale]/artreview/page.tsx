"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Upload, X, ChevronUp, ChevronDown, FileImage, Palette, Eye, Lightbulb, Clock } from "lucide-react"

interface UploadedImage {
  id: string
  file: File
  preview: string
  name: string
  size: number
}

interface ArtReviewResult {
  imageIndex: number
  imageName: string
  success: boolean
  result?: {
    style: string
    description: string
    evaluation: string
    suggestions: string[]
    return: string
    end: string
  }
  error?: string
  timestamp?: number
  batchId?: string
}

export default function ArtReviewPage() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<ArtReviewResult[]>([])
  const [mergeImages, setMergeImages] = useState(false)
  const [noWait, setNoWait] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 重复检测相关状态
  const [lastSubmittedImageIds, setLastSubmittedImageIds] = useState<string[]>([])
  const [lastSubmittedMergeOption, setLastSubmittedMergeOption] = useState<boolean>(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  // 检测图片是否有变化
  const hasImagesChanged = useCallback(() => {
    // 如果是首次使用，直接返回true
    if (lastSubmittedImageIds.length === 0) return true

    // 获取当前图片ID列表
    const currentImageIds = images.map((img) => img.id)

    // 检查数量是否变化
    if (currentImageIds.length !== lastSubmittedImageIds.length) return true

    // 检查顺序是否变化
    for (let i = 0; i < currentImageIds.length; i++) {
      if (currentImageIds[i] !== lastSubmittedImageIds[i]) return true
    }

    // 检查处理选项是否变化
    if (mergeImages !== lastSubmittedMergeOption) return true

    return false // 没有变化
  }, [images, mergeImages, lastSubmittedImageIds, lastSubmittedMergeOption])

  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          quality,
        )
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (files: FileList) => {
    const validFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/") && file.size <= 10 * 1024 * 1024,
    )

    for (const file of validFiles) {
      const compressedFile = await compressImage(file)
      const preview = URL.createObjectURL(compressedFile)
      const newImage: UploadedImage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        file: compressedFile,
        preview,
        name: file.name,
        size: compressedFile.size,
      }
      setImages((prev) => [...prev, newImage])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const updated = prev.filter((img) => img.id !== id)
      const imageToRemove = prev.find((img) => img.id === id)
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview)
      }
      return updated
    })
  }

  const moveImage = (id: string, direction: "up" | "down") => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id)
      if (index === -1) return prev

      const newIndex = direction === "up" ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev

      const newImages = [...prev]
      ;[newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]]
      return newImages
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 实际执行AI评价的函数
  const executeArtReview = async () => {
    if (images.length === 0) return

    setIsProcessing(true)
    setProgress(0)
    setResults([])

    // 更新历史记录
    setLastSubmittedImageIds(images.map((img) => img.id))
    setLastSubmittedMergeOption(mergeImages)

    try {
      const formData = new FormData()

      if (mergeImages) {
        images.forEach((image, index) => {
          formData.append(`images`, image.file)
        })
        formData.append("merge", "true")
        formData.append("noWait", noWait.toString())

        const response = await fetch("/api/art-review", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setResults([
          {
            imageIndex: 0,
            imageName: `整体评价 (${images.length} 幅作品)`,
            success: result.success,
            result: result.success ? result.result : undefined,
            error: result.success ? undefined : result.error,
            timestamp: Date.now(),
            batchId: result.batchId,
          },
        ])
        setProgress(100)
      } else {
        const totalImages = images.length
        const newResults: ArtReviewResult[] = []

        for (let i = 0; i < images.length; i++) {
          const image = images[i]
          const formData = new FormData()
          formData.append("images", image.file)
          formData.append("merge", "false")
          formData.append("noWait", noWait.toString())

          try {
            const response = await fetch("/api/art-review", {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            newResults.push({
              imageIndex: i,
              imageName: image.name,
              success: result.success,
              result: result.success ? result.result : undefined,
              error: result.success ? undefined : result.error,
              timestamp: Date.now(),
            })
          } catch (error) {
            newResults.push({
              imageIndex: i,
              imageName: image.name,
              success: false,
              error: error instanceof Error ? error.message : "处理失败",
              timestamp: Date.now(),
            })
          }

          setProgress(((i + 1) / totalImages) * 100)
          setResults([...newResults])
        }
      }
    } catch (error) {
      console.error("Art review error:", error)
      setResults([
        {
          imageIndex: 0,
          imageName: "处理失败",
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
          timestamp: Date.now(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  // 处理AI评价按钮点击
  const handleArtReview = () => {
    if (images.length === 0) return

    // 检查是否有变化
    if (!hasImagesChanged()) {
      // 没有变化，显示确认对话框
      setShowDuplicateDialog(true)
    } else {
      // 有变化，直接处理
      executeArtReview()
    }
  }

  // 确认重复处理
  const handleConfirmDuplicate = () => {
    setShowDuplicateDialog(false)
    executeArtReview()
  }

  // 取消重复处理
  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI绘画评价，支持多图片上传，艺术作品分析
          </h1>
          <p className="text-gray-600 text-lg">上传您的绘画作品，调整顺序后提交，AI将自动分析并给出专业评价</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  上传绘画作品
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-purple-400"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Palette className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">拖放绘画作品到此处或</p>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="mb-4">
                    选择绘画作品
                  </Button>
                  <p className="text-sm text-gray-500 mb-2">支持格式：JPG, PNG (最大10MB)</p>
                  <p className="text-xs text-gray-400">提示：大文件将自动压缩以提高处理速度</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Uploaded Images */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileImage className="w-5 h-5" />
                    已上传作品 ({images.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {images.map((image, index) => (
                    <div key={image.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                        {index + 1}
                      </div>
                      <img
                        src={image.preview || "/placeholder.svg"}
                        alt={image.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{image.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveImage(image.id, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => moveImage(image.id, "down")}
                          disabled={index === images.length - 1}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => removeImage(image.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Processing Options */}
            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>评价选项</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="merge"
                      checked={mergeImages}
                      onCheckedChange={(checked) => setMergeImages(checked as boolean)}
                    />
                    <label htmlFor="merge" className="text-sm font-medium">
                      整体评价 (将所有作品作为系列进行综合评价)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nowait"
                      checked={noWait}
                      onCheckedChange={(checked) => setNoWait(checked as boolean)}
                    />
                    <label htmlFor="nowait" className="text-sm font-medium">
                      无须等待 (异步处理，适合大量作品)
                    </label>
                  </div>
                  <Button onClick={handleArtReview} disabled={isProcessing || images.length === 0} className="w-full">
                    {isProcessing ? "评价中..." : "开始AI评价"}
                  </Button>
                  {isProcessing && (
                    <div className="space-y-2">
                      <Progress value={progress} className="w-full" />
                      <p className="text-sm text-center text-gray-500">处理进度: {Math.round(progress)}%</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* AI Results */}
            {results.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    AI评价
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{result.imageName}</h4>
                        <div className="flex gap-2">
                          {result.batchId && (
                            <Badge variant="secondary">
                              {mergeImages ? `整体评价 (${images.length} 幅作品)` : `历史评价: ${index + 1}`}
                            </Badge>
                          )}
                          {isProcessing && (
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              评价中: {index + 1}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {result.success && result.result ? (
                        <div className="space-y-3">
                          <div>
                            <h5 className="font-medium text-sm text-purple-600 mb-1">作品风格</h5>
                            <p className="text-sm bg-purple-50 p-2 rounded">{result.result.style}</p>
                          </div>
                          <div>
                            <h5 className="font-medium text-sm text-blue-600 mb-1">作品描述</h5>
                            <p className="text-sm bg-blue-50 p-2 rounded whitespace-pre-wrap">
                              {result.result.description}
                            </p>
                          </div>
                          <div>
                            <h5 className="font-medium text-sm text-green-600 mb-1">专业评价</h5>
                            <p className="text-sm bg-green-50 p-2 rounded whitespace-pre-wrap">
                              {result.result.evaluation}
                            </p>
                          </div>
                          {result.result.suggestions && result.result.suggestions.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm text-orange-600 mb-1 flex items-center gap-1">
                                <Lightbulb className="w-4 h-4" />
                                改进建议
                              </h5>
                              <div className="bg-orange-50 p-2 rounded">
                                {result.result.suggestions.map((suggestion, idx) => (
                                  <p key={idx} className="text-sm mb-1 last:mb-0">
                                    • {suggestion}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-red-600 text-sm">错误: {result.error || "处理失败"}</div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Tutorial */}
            <Card>
              <CardHeader>
                <CardTitle>使用教程</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">上传绘画作品</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 拖拽绘画作品到上传区域或点击选择</li>
                      <li>• 支持JPG、PNG格式，最大10MB</li>
                      <li>• 使用上下箭头调整作品顺序</li>
                      <li>• 可以删除不需要的作品</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">评价选项</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>
                        • <strong>单独评价</strong>: 每幅作品独立分析评价
                      </li>
                      <li>
                        • <strong>整体评价</strong>: 将所有作品作为系列进行综合评价
                      </li>
                      <li>• 点击"开始AI评价"开始分析</li>
                      <li>• 等待AI艺术分析和评价完成</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle>使用提示</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">作品质量建议</h5>
                    <ul className="space-y-1">
                      <li>• 确保作品图像清晰</li>
                      <li>• 避免反光或阴影遮挡</li>
                      <li>• 光线充足，色彩还原度好</li>
                      <li>• 尽量包含完整作品</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">评价结果</h5>
                    <ul className="space-y-1">
                      <li>• 自动识别艺术风格</li>
                      <li>• 提供详细作品分析</li>
                      <li>• 给出专业改进建议</li>
                      <li>• 评估技法和构图</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认处理</DialogTitle>
            <DialogDescription>相同内容，是否再次处理？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDuplicate}>
              否，取消
            </Button>
            <Button onClick={handleConfirmDuplicate}>是，继续处理</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
