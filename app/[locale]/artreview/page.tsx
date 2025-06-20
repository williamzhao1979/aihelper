"use client"

import type React from "react"
import { useState, useRef, useId } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, X, Languages, CheckCircle, AlertCircle, ChevronUp, ChevronDown, Sparkles } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import FeatureMenu from "@/components/feature-menu"

interface UploadedImage {
  id: string
  name: string
  size: number
  preview: string
  file: File
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

interface MergedArtReviewResult {
  success: boolean
  result?: {
    style: string
    description: string
    evaluation: string
    suggestions: string[]
    return: string
    end: string
    image_count: number
  }
  error?: string
  timestamp?: number
  batchId?: string
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

export default function ArtReviewPage() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [results, setResults] = useState<ArtReviewResult[]>([])
  const [mergedResult, setMergedResult] = useState<MergedArtReviewResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [mergeImages, setMergeImages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const [noWait, setNoWait] = useState(true)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())
  const locale = useLocale()
  const [lastSubmittedImageIds, setLastSubmittedImageIds] = useState<string[]>([])
  const [lastSubmittedMergeOption, setLastSubmittedMergeOption] = useState<boolean>(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

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

  const addImages = async (files: File[]) => {
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex]

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
          setImages((prev) => [...prev, newImage])
        }
        reader.readAsDataURL(compressedFile)
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error)
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
          setImages((prev) => [...prev, newImage])
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  const clearAllImages = () => {
    setImages([])
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

  const hasImagesChanged = () => {
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
  }

  const processWithAI = async () => {
    if (images.length === 0) return

    // 检查是否为首次使用或内容是否有变化
    if (lastSubmittedImageIds.length > 0 && !hasImagesChanged()) {
      // 内容没有变化，显示确认对话框
      setShowDuplicateDialog(true)
      return
    }

    // 继续执行原有的处理逻辑
    await executeProcessing()
  }

  const executeProcessing = async () => {
    // 生成唯一的请求ID
    const requestId = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    if (noWait) {
      // 异步模式：添加到处理中的请求列表
      setProcessingRequests((prev) => new Set([...prev, requestId]))
    } else {
      // 同步模式：设置全局处理状态
      setIsProcessing(true)
    }

    setError(null)

    // 更新上次提交的状态
    setLastSubmittedImageIds(images.map((img) => img.id))
    setLastSubmittedMergeOption(mergeImages)

    // 继续原有的处理逻辑...
    try {
      // Check total file size before sending
      const totalSize = images.reduce((sum, img) => sum + img.file.size, 0)
      const maxSize = 10 * 1024 * 1024 // 10MB limit

      if (totalSize > maxSize) {
        throw new Error(
          `总文件大小 (${formatFileSize(totalSize)}) 超过限制 (${formatFileSize(maxSize)})。请压缩图片或减少图片数量。`,
        )
      }

      // Prepare FormData
      const formData = new FormData()
      formData.append("mergeImages", mergeImages.toString())

      // Add images to FormData
      images.forEach((image, index) => {
        formData.append(`image_${index}`, image.file)
      })

      console.log(`Processing ${images.length} images, merge: ${mergeImages}, total size: ${formatFileSize(totalSize)}`)

      // Call the API
      const response = await fetch("/api/art-review", {
        method: "POST",
        body: formData,
      })

      // Handle 413 specifically
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

      console.log("API Response:", data)

      if (!response.ok) {
        throw new Error(data.error || `请求失败 (状态码: ${response.status})`)
      }

      if (!data.success) {
        throw new Error(data.error || "Processing failed")
      }

      if (data.merged) {
        // Handle merged result - 添加到现有结果前面
        console.log("Setting merged result:", data)
        const newMergedResult = {
          ...data,
          timestamp: Date.now(),
          batchId: `batch-${Date.now()}`,
        }
        setMergedResult((prev) => (prev ? newMergedResult : newMergedResult))
        // 如果有新的合并结果，将之前的个别结果添加到results前面
        if (mergedResult && mergedResult.result) {
          setResults((prevResults) => [
            {
              imageIndex: -1,
              imageName: "Previous Merged Result",
              success: true,
              result: mergedResult.result,
              timestamp: mergedResult.timestamp || Date.now() - 1000,
              batchId: mergedResult.batchId || "previous-batch",
            },
            ...prevResults,
          ])
        }
      } else {
        // Handle individual results - 添加到现有结果前面
        console.log("Setting individual results:", data.results)
        const newResults = (data.results || []).map((result) => ({
          ...result,
          timestamp: Date.now(),
          batchId: `batch-${Date.now()}`,
        }))
        setResults((prevResults) => [...newResults, ...prevResults])
        // 如果之前有合并结果，将其转换为个别结果并添加到列表
        if (mergedResult?.result) {
          const previousMergedAsResult = {
            imageIndex: -1,
            imageName: "Previous Merged Result",
            success: true,
            result: mergedResult.result,
            timestamp: mergedResult.timestamp || Date.now() - 1000,
            batchId: mergedResult.batchId || "previous-batch",
          }
          setResults((prev) => [...prev, previousMergedAsResult])
          setMergedResult(null)
        }
      }
    } catch (error) {
      console.error("Error processing images:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to process images"
      setError(errorMessage)

      // Show more detailed error for debugging
      if (error instanceof Error && error.message.includes("schema")) {
        setError(`Schema validation error: ${error.message}. Please try again or contact support.`)
      }
    } finally {
      if (noWait) {
        // 异步模式：从处理中的请求列表移除
        setProcessingRequests((prev) => {
          const newSet = new Set(prev)
          newSet.delete(requestId)
          return newSet
        })
      } else {
        // 同步模式：清除全局处理状态
        setIsProcessing(false)
      }
    }
  }

  const handleConfirmDuplicate = () => {
    setShowDuplicateDialog(false)
    executeProcessing()
  }

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            AI绘画评价，支持多图片上传，<span className="text-red-500">艺术作品分析</span>
          </h1>
          <p className="text-gray-600 text-lg">上传您的绘画作品，调整顺序后提交，AI将自动分析并给出专业评价</p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">处理错误</p>
              </div>
              <p className="text-red-600 mt-2">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setError(null)} className="mt-2">
                关闭
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload Section */}
        <div className="space-y-6">
          {/* Upload Area */}
          <Card>
            <CardContent className="p-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleButtonClick}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "border-purple-500 bg-purple-50 scale-105"
                    : "border-gray-300 hover:border-purple-400 hover:bg-gray-50 hover:scale-102"
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
                <Upload
                  className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                    dragOver ? "text-purple-600" : "text-purple-500"
                  }`}
                />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {dragOver ? "松开鼠标上传文件" : "拖放绘画作品到此处或"}
                </p>
                <Button
                  variant="outline"
                  className="mb-4 bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleButtonClick()
                  }}
                >
                  选择绘画作品
                </Button>
                <p className="text-sm text-gray-500">支持格式：JPG, PNG (最大10MB)</p>
                <p className="text-xs text-orange-600 mt-1">提示：大文件将自动压缩以提高处理速度</p>
              </div>
            </CardContent>
          </Card>

          {/* Uploaded Images */}
          {images.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  已上传作品 ({images.length})<Badge variant="secondary">拖拽作品可调整顺序</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={clearAllImages}>
                  <X className="w-4 h-4 mr-2" />
                  清除所有
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="flex items-center gap-4 p-4 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex-shrink-0">
                        <Badge
                          variant="outline"
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                        >
                          {index + 1}
                        </Badge>
                      </div>

                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border">
                        <img
                          src={image.preview || "/placeholder.svg"}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" title={image.name}>
                          {image.name}
                        </p>
                        <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveImageUp(index)}
                          disabled={index === 0}
                          className="hover:bg-blue-50"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveImageDown(index)}
                          disabled={index === images.length - 1}
                          className="hover:bg-blue-50"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeImage(image.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

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
                      整体评价
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="no-wait"
                      checked={noWait}
                      onCheckedChange={(checked) => setNoWait(checked as boolean)}
                    />
                    <label
                      htmlFor="no-wait"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      无须等待
                    </label>
                  </div>
                  <Button
                    onClick={processWithAI}
                    disabled={!noWait && isProcessing}
                    size="lg"
                    className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                  >
                    {!noWait && isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        评价中...
                      </>
                    ) : (
                      "开始AI评价"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results Section */}
        {(results.length > 0 || mergedResult || isProcessing || processingRequests.size > 0) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Languages className="w-5 h-5" />
                AI评价
                {mergedResult?.result && (
                  <Badge variant="secondary" className="ml-2">
                    整体评价 ({mergedResult.result.image_count} 幅作品)
                  </Badge>
                )}
                {results.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    历史评价: {results.length}
                  </Badge>
                )}
                {processingRequests.size > 0 && (
                  <Badge variant="default" className="ml-2 bg-orange-500">
                    评价中: {processingRequests.size}
                  </Badge>
                )}
              </CardTitle>
              {(results.length > 0 || mergedResult) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResults([])
                    setMergedResult(null)
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  清除历史
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 处理中状态 - 始终在最上方显示 */}
              {(isProcessing || processingRequests.size > 0) && (
                <div className="text-center py-8 border rounded-lg bg-purple-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">
                    {processingRequests.size > 0
                      ? `正在异步评价 ${processingRequests.size} 个请求...`
                      : mergeImages
                        ? "正在整体评价所有作品..."
                        : "正在评价作品，请稍候..."}
                  </p>
                  {processingRequests.size > 0 && (
                    <p className="text-sm text-gray-500 mt-2">异步模式：可以继续添加新的评价请求</p>
                  )}
                </div>
              )}

              {/* 合并结果显示 */}
              {mergedResult?.result && (
                <div className="border rounded-lg p-6 bg-white shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex -space-x-2">
                      {images.slice(0, 3).map((image, index) => (
                        <div
                          key={image.id}
                          className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border-2 border-white"
                        >
                          <img
                            src={image.preview || "/placeholder.svg"}
                            alt={image.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {images.length > 3 && (
                        <div className="w-12 h-12 rounded-lg bg-gray-200 border-2 border-white flex items-center justify-center">
                          <span className="text-xs font-medium">+{images.length - 3}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">整体评价结果</h3>
                      <p className="text-sm text-gray-500">
                        共评价 {mergedResult.result.image_count} 幅作品
                        {mergedResult.timestamp && (
                          <span className="ml-2">• {new Date(mergedResult.timestamp).toLocaleString()}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant="default" className="px-3 py-1">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {mergedResult.result.return}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">作品风格:</label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {mergedResult.result.style}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">作品描述:</label>
                      <div className="p-4 bg-gray-50 rounded-lg h-full overflow-y-auto border">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{mergedResult.result.description}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">专业评价:</label>
                      <div className="p-4 bg-blue-50 rounded-lg h-full overflow-y-auto border border-blue-200">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{mergedResult.result.evaluation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">改进建议:</label>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <ul className="text-sm space-y-1">
                        {mergedResult.result.suggestions.map((suggestion, index) => (
                          <li key={index} className="leading-relaxed">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* 个别结果显示 */}
              {results.length > 0 &&
                results.map((result, index) => (
                  <div key={`${result.imageIndex}-${index}`} className="border rounded-lg p-6 bg-white shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border">
                        <img
                          src={images[result.imageIndex]?.preview || "/placeholder.svg"}
                          alt={result.imageName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-lg">作品 {result.imageIndex + 1}</h3>
                        <p className="text-sm text-gray-500">
                          {result.imageName}
                          {result.timestamp && (
                            <span className="ml-2">• {new Date(result.timestamp).toLocaleString()}</span>
                          )}
                        </p>
                      </div>
                      <Badge variant={result.success ? "default" : "destructive"} className="px-3 py-1">
                        {result.success ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {result.result?.return || "成功"}
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            失败
                          </>
                        )}
                      </Badge>
                    </div>

                    {result.success && result.result ? (
                      <>
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">作品风格:</label>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <Badge variant="outline" className="text-sm px-3 py-1">
                              {result.result.style}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">作品描述:</label>
                            <div className="p-4 bg-gray-50 rounded-lg h-64 overflow-y-auto border">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.result.description}</p>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">专业评价:</label>
                            <div className="p-4 bg-blue-50 rounded-lg h-64 overflow-y-auto border border-blue-200">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.result.evaluation}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">改进建议:</label>
                          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <ul className="text-sm space-y-1">
                              {result.result.suggestions.map((suggestion, suggestionIndex) => (
                                <li key={suggestionIndex} className="leading-relaxed">
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-red-600 text-sm">评价失败: {result.error || "未知错误"}</p>
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Tutorial Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5" />
              使用教程
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center mb-6">
              <p className="text-gray-600">以下是详细的使用步骤，帮助您更好地使用AI绘画评价功能</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
              {/* Tutorial Step 1 */}
              <div className="space-y-4">
                <div className="text-center">
                  <Badge variant="outline" className="mb-3 px-4 py-2 text-lg font-semibold">
                    步骤 1: 上传绘画作品
                  </Badge>
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img src="/textreview-step1.png" alt="教程步骤1 - 上传作品" className="w-full h-full object-cover" />
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">上传和排序作品</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• 拖拽绘画作品到上传区域或点击选择</li>
                    <li>• 支持JPG、PNG格式，最大10MB</li>
                    <li>• 使用上下箭头调整作品顺序</li>
                    <li>• 可以删除不需要的作品</li>
                  </ul>
                </div>
              </div>

              {/* Tutorial Step 2 */}
              <div className="space-y-4">
                <div className="text-center">
                  <Badge variant="outline" className="mb-3 px-4 py-2 text-lg font-semibold">
                    步骤 2: 评价选项
                  </Badge>
                </div>
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  <img src="/textreview-step2.png" alt="教程步骤2 - 评价选项" className="w-full h-full object-cover" />
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900 mb-2">选择评价方式</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>
                      • <strong>单独评价</strong>：每幅作品独立分析评价
                    </li>
                    <li>
                      • <strong>整体评价</strong>：将所有作品作为系列进行综合评价
                    </li>
                    <li>• 点击"开始AI评价"开始分析</li>
                    <li>• 等待AI艺术分析和评价完成</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                使用提示
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
                <div>
                  <h4 className="font-medium mb-2">作品质量建议：</h4>
                  <ul className="space-y-1">
                    <li>• 确保作品图像清晰</li>
                    <li>• 避免反光或阴影遮挡</li>
                    <li>• 光线充足，色彩还原度好</li>
                    <li>• 尽量包含完整作品</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">评价结果：</h4>
                  <ul className="space-y-1">
                    <li>• 自动识别艺术风格</li>
                    <li>• 提供详细作品分析</li>
                    <li>• 给出专业改进建议</li>
                    <li>• 评估技法和构图</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Menu */}
        <FeatureMenu
        />

        {/* 重复内容确认对话框 */}
        {showDuplicateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">确认处理</h3>
              <p className="text-gray-600 mb-6">相同内容，是否再次处理？</p>
              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={handleCancelDuplicate}>
                  否，取消
                </Button>
                <Button onClick={handleConfirmDuplicate} className="bg-purple-600 hover:bg-purple-700">
                  是，继续处理
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
