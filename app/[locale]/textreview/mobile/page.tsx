"use client"

import type React from "react"
import { useState, useRef, useId } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Upload, X, Languages, CheckCircle, AlertCircle, ChevronUp, ChevronDown } from "lucide-react"
import { useLocale } from "next-intl"
import FeatureMenu from "@/components/feature-menu"
import { DonationProvider } from "@/components/donation-provider"
import { DonationButton } from "@/components/donation-button"
import { DonationModal } from "@/components/donation-modal"
import LanguageSwitcher from "@/components/language-switcher"
import DeviceSwitcher from "@/components/device-switcher"
import { useTranslations } from "next-intl"

interface UploadedImage {
  id: string
  name: string
  size: number
  preview: string
  file: File
}

interface OCRResult {
  imageIndex: number
  imageName: string
  success: boolean
  result?: {
    lang: string
    text: string
    advice: string[]
    text_refined: string
    return: string
    end: string
  }
  error?: string
  timestamp?: number
  batchId?: string
}

interface MergedOCRResult {
  success: boolean
  result?: {
    lang: string
    text: string
    advice: string[]
    text_refined: string
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

export default function TextReviewMobilePage() {
  const t = useTranslations()

  const [images, setImages] = useState<UploadedImage[]>([])
  const [results, setResults] = useState<OCRResult[]>([])
  const [mergedResult, setMergedResult] = useState<MergedOCRResult | null>(null)
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
  const [showTutorial, setShowTutorial] = useState(false)

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
    const currentImageIds = images.map((img) => img.id)
    if (currentImageIds.length !== lastSubmittedImageIds.length) return true
    for (let i = 0; i < currentImageIds.length; i++) {
      if (currentImageIds[i] !== lastSubmittedImageIds[i]) return true
    }
    if (mergeImages !== lastSubmittedMergeOption) return true
    return false
  }

  const processWithOpenAI = async () => {
    if (images.length === 0) return

    if (lastSubmittedImageIds.length > 0 && !hasImagesChanged()) {
      setShowDuplicateDialog(true)
      return
    }

    await executeProcessing()
  }

  const executeProcessing = async () => {
    const requestId = `request-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    if (noWait) {
      setProcessingRequests((prev) => new Set([...prev, requestId]))
    } else {
      setIsProcessing(true)
    }

    setError(null)
    setLastSubmittedImageIds(images.map((img) => img.id))
    setLastSubmittedMergeOption(mergeImages)

    try {
      const totalSize = images.reduce((sum, img) => sum + img.file.size, 0)
      const maxSize = 10 * 1024 * 1024

      if (totalSize > maxSize) {
        throw new Error(
          `总文件大小 (${formatFileSize(totalSize)}) 超过限制 (${formatFileSize(maxSize)})。请压缩图片或减少图片数量。`,
        )
      }

      const formData = new FormData()
      formData.append("mergeImages", mergeImages.toString())

      images.forEach((image, index) => {
        formData.append(`image_${index}`, image.file)
      })

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

      if (data.merged) {
        const newMergedResult = {
          ...data,
          timestamp: Date.now(),
          batchId: `batch-${Date.now()}`,
        }
        setMergedResult(newMergedResult)
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
        const newResults = (data.results || []).map((result) => ({
          ...result,
          timestamp: Date.now(),
          batchId: `batch-${Date.now()}`,
        }))
        setResults((prevResults) => [...newResults, ...prevResults])
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
    } finally {
      if (noWait) {
        setProcessingRequests((prev) => {
          const newSet = new Set(prev)
          newSet.delete(requestId)
          return newSet
        })
      } else {
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
    <DonationProvider>
      <div className="min-h-screen bg-gray-50">
        {/* 右上角固定容器 */}
        <div className="flex justify-end top-4 right-4 z-50 flex items-center gap-4">
          {/* Language Selection */}
          <LanguageSwitcher />
          {/* 设备切换器 */}
          <DeviceSwitcher currentDevice="mobile" />
        </div>

        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Tutorial Section */}
            <Collapsible open={showTutorial} onOpenChange={setShowTutorial}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Languages className="w-5 h-5" />
                        {t("textreview.tutorial")}
                      </div>
                      <div className="flex items-center gap-2">
                        {showTutorial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    <div className="text-center mb-6">
                      <p className="text-gray-600">以下是详细的使用步骤，帮助您更好地使用OCR文本提取功能</p>
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      <div className="space-y-4">
                        <div className="text-center">
                          <Badge variant="outline" className="mb-3 px-4 py-2 text-lg font-semibold">
                            步骤 1: 上传图片
                          </Badge>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src="/textreview-step1.png"
                            alt="教程步骤1 - 上传图片"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h3 className="font-semibold text-blue-900 mb-2">上传和排序图片</h3>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• 拖拽图片到上传区域或点击选择图片</li>
                            <li>• 支持JPG、PNG格式，最大10MB</li>
                            <li>• 使用上下箭头调整图片顺序</li>
                            <li>• 可以删除不需要的图片</li>
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="text-center">
                          <Badge variant="outline" className="mb-3 px-4 py-2 text-lg font-semibold">
                            步骤 2: 处理选项
                          </Badge>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src="/textreview-step2.png"
                            alt="教程步骤2 - 处理选项"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <h3 className="font-semibold text-green-900 mb-2">选择处理方式</h3>
                          <ul className="text-sm text-green-800 space-y-1">
                            <li>
                              • <strong>单独处理</strong>：每张图片独立识别文字
                            </li>
                            <li>
                              • <strong>合并处理</strong>：将所有图片文字合并为一篇文章
                            </li>
                            <li>• 点击"开始AI处理"开始处理</li>
                            <li>• 等待AI分析和文字提取完成</li>
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
                          <h4 className="font-medium mb-2">图片质量建议：</h4>
                          <ul className="space-y-1">
                            <li>• 确保文字清晰可见</li>
                            <li>• 避免模糊或倾斜的图片</li>
                            <li>• 光线充足，对比度良好</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">处理结果：</h4>
                          <ul className="space-y-1">
                            <li>• 自动检测文字语言</li>
                            <li>• 提供原始和修正文本</li>
                            <li>• 给出改进建议</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Upload Section */}
            <div className="space-y-6">
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
                    <p className="text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 rounded-lg shadow-md mb-4">
                      {t("textreview.description")}
                    </p>
                    <Upload
                      className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                        dragOver ? "text-purple-600" : "text-purple-500"
                      }`}
                    />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      {dragOver ? "松开鼠标上传文件" : "拖放图片到此处或"}
                    </p>
                    <Button
                      variant="outline"
                      className="mb-4 bg-purple-600 text-white hover:bg-purple-700 border-purple-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleButtonClick()
                      }}
                    >
                      {t("common.selectPicture")}
                    </Button>
                    <p className="text-sm text-gray-500">{t("common.imgLimit")}</p>
                    <p className="text-xs text-orange-600 mt-1">{t("common.imgZip")}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Uploaded Images */}
              {images.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      已上传图片 ({images.length})<Badge variant="secondary">拖拽图片可调整顺序</Badge>
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
                          合并图像
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
                        onClick={processWithOpenAI}
                        disabled={!noWait && isProcessing}
                        size="lg"
                        className="bg-purple-600 hover:bg-purple-700 px-8 py-3 text-lg"
                      >
                        {!noWait && isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                            处理中...
                          </>
                        ) : (
                          "开始AI处理"
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
                    AI处理结果
                    {mergedResult?.result && (
                      <Badge variant="secondary" className="ml-2">
                        合并处理 ({mergedResult.result.image_count} 张图片)
                      </Badge>
                    )}
                    {results.length > 0 && (
                      <Badge variant="outline" className="ml-2">
                        历史结果: {results.length}
                      </Badge>
                    )}
                    {processingRequests.size > 0 && (
                      <Badge variant="default" className="ml-2 bg-orange-500">
                        处理中: {processingRequests.size}
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
                  {/* 处理中状态 */}
                  {(isProcessing || processingRequests.size > 0) && (
                    <div className="text-center py-8 border rounded-lg bg-purple-50">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">
                        {processingRequests.size > 0
                          ? `正在异步处理 ${processingRequests.size} 个请求...`
                          : mergeImages
                            ? "正在合并处理所有图片..."
                            : "正在处理图片，请稍候..."}
                      </p>
                      {processingRequests.size > 0 && (
                        <p className="text-sm text-gray-500 mt-2">异步模式：可以继续添加新的处理请求</p>
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
                          <h3 className="font-medium text-lg">合并处理结果</h3>
                          <p className="text-sm text-gray-500">
                            共处理 {mergedResult.result.image_count} 张图片
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">检测语言:</label>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <Badge variant="outline" className="text-sm px-3 py-1">
                            {mergedResult.result.lang}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">提取的文本:</label>
                          <div className="p-4 bg-gray-50 rounded-lg h-full overflow-y-auto border">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{mergedResult.result.text}</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">修正后的文本:</label>
                          <div className="p-4 bg-blue-50 rounded-lg h-full overflow-y-auto border border-blue-200">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {mergedResult.result.text_refined}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">修改建议:</label>
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <ul className="text-sm space-y-1">
                            {mergedResult.result.advice.map((advice, index) => (
                              <li key={index} className="leading-relaxed">
                                {advice}
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
                            <h3 className="font-medium text-lg">图片 {result.imageIndex + 1}</h3>
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
                              <label className="block text-sm font-medium text-gray-700 mb-2">检测语言:</label>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <Badge variant="outline" className="text-sm px-3 py-1">
                                  {result.result.lang}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">提取的文本:</label>
                                <div className="p-4 bg-gray-50 rounded-lg h-64 overflow-y-auto border">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.result.text}</p>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">修正后的文本:</label>
                                <div className="p-4 bg-blue-50 rounded-lg h-64 overflow-y-auto border border-blue-200">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {result.result.text_refined}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">修改建议:</label>
                              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <ul className="text-sm space-y-1">
                                  {result.result.advice.map((advice, adviceIndex) => (
                                    <li key={adviceIndex} className="leading-relaxed">
                                      {advice}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-red-600 text-sm">处理失败: {result.error || "未知错误"}</p>
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

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

            {/* Feature Menu */}
            <FeatureMenu />

            {/* 悬浮打赏按钮 */}
            <DonationButton position="bottom-right" size="sm" />

            {/* 打赏弹窗 */}
            <DonationModal />
          </div>
        </div>
      </div>
    </DonationProvider>
  )
}
