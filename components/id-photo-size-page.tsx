"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { 
  ArrowLeft, 
  Download,
  Ruler,
  Settings,
  Camera,
  FileImage
} from "lucide-react"

// 照片尺寸规格定义
interface PhotoSize {
  id: string
  name: string
  width: number  // mm
  height: number // mm
  description: string
  category: string
  isPopular?: boolean
}

export default function IdPhotoSizePage() {
  const t = useTranslations('idPhoto.size')
  const { toast } = useToast()
  const router = useRouter()
  const locale = useLocale()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 状态管理
  const [selectedSize, setSelectedSize] = useState<PhotoSize | null>(null)
  const [customWidth, setCustomWidth] = useState("")
  const [customHeight, setCustomHeight] = useState("")
  const [processedPhoto, setProcessedPhoto] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<string | null>(null)

  // 预定义照片尺寸
  const photoSizes: PhotoSize[] = [
    {
      id: "japan-passport",
      name: "日本护照照片",
      width: 35,
      height: 45,
      description: "日本护照标准尺寸",
      category: "护照",
      isPopular: true
    },
    {
      id: "china-id",
      name: "中国身份证照片",
      width: 33,
      height: 48,
      description: "中国身份证标准尺寸",
      category: "身份证",
      isPopular: true
    },
    {
      id: "us-passport",
      name: "美国护照照片",
      width: 51,
      height: 51,
      description: "美国护照标准尺寸（2×2英寸）",
      category: "护照",
      isPopular: true
    },
    {
      id: "visa-photo",
      name: "签证照片",
      width: 35,
      height: 45,
      description: "通用签证申请照片",
      category: "签证"
    },
    {
      id: "driver-license",
      name: "驾驶证照片",
      width: 32,
      height: 40,
      description: "驾驶证标准尺寸",
      category: "证件"
    },
    {
      id: "student-id",
      name: "学生证照片",
      width: 25,
      height: 35,
      description: "学生证标准尺寸",
      category: "证件"
    }
  ]

  // 将外部URL转换为data URL
  const convertToDataURL = (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('无法创建canvas'))
            return
          }
          
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          
          const dataURL = canvas.toDataURL('image/jpeg', 0.9)
          resolve(dataURL)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error('图像加载失败'))
      img.src = imageSrc
    })
  }

  // 从sessionStorage获取处理过的照片
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const capturedPhoto = sessionStorage.getItem('capturedPhoto')
      const editedPhoto = sessionStorage.getItem('editedPhoto')
      
      // 优先使用编辑过的照片，如果没有则使用拍摄的照片
      let photo = editedPhoto || capturedPhoto
      
      if (photo) {
        // 如果是data URL，直接使用
        if (photo.startsWith('data:')) {
          setProcessedPhoto(photo)
        } else {
          // 如果是外部URL，转换为data URL
          convertToDataURL(photo).then((dataURL) => {
            setProcessedPhoto(dataURL)
          }).catch((error) => {
            console.error('照片转换失败:', error)
            // 转换失败，直接使用原图（可能会有CORS问题）
            setProcessedPhoto(photo)
          })
        }
      } else {
        // 如果没有照片，跳转到拍摄页面
        toast({
          title: "未找到照片",
          description: "请先拍摄照片",
          variant: "destructive"
        })
        router.push(`/${locale}/idphoto/camera`)
      }
    }
  }, [router, locale, toast])

  // 加载图像为Canvas以避免CORS问题
  const loadImageAsCanvas = (imageSrc: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const tempCanvas = document.createElement('canvas')
          const tempCtx = tempCanvas.getContext('2d')
          if (!tempCtx) {
            reject(new Error('无法创建临时canvas'))
            return
          }
          
          tempCanvas.width = img.width
          tempCanvas.height = img.height
          tempCtx.drawImage(img, 0, 0)
          
          resolve(tempCanvas)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => {
        reject(new Error('图像加载失败'))
      }
      
      img.src = imageSrc
    })
  }

  // 生成L版布局预览
  const generateLLayout = async (size: PhotoSize, photo: string) => {
    if (!canvasRef.current) return null

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // L版尺寸 (89×127 mm) 转换为像素 (300 DPI)
    const L_WIDTH_MM = 89
    const L_HEIGHT_MM = 127
    const DPI = 300
    const L_WIDTH_PX = Math.round((L_WIDTH_MM / 25.4) * DPI)
    const L_HEIGHT_PX = Math.round((L_HEIGHT_MM / 25.4) * DPI)

    canvas.width = L_WIDTH_PX
    canvas.height = L_HEIGHT_PX

    // 照片尺寸转换为像素
    const photoWidthPx = Math.round((size.width / 25.4) * DPI)
    const photoHeightPx = Math.round((size.height / 25.4) * DPI)

    // 计算可以排列的照片数量和位置
    const margin = Math.round((5 / 25.4) * DPI) // 5mm边距
    const spacing = Math.round((3 / 25.4) * DPI) // 3mm间距

    const availableWidth = L_WIDTH_PX - 2 * margin
    const availableHeight = L_HEIGHT_PX - 2 * margin

    const cols = Math.floor((availableWidth + spacing) / (photoWidthPx + spacing))
    const rows = Math.floor((availableHeight + spacing) / (photoHeightPx + spacing))

    // 白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, L_WIDTH_PX, L_HEIGHT_PX)

    // 加载照片并处理CORS问题
    return new Promise<string>((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        try {
          // 绘制照片网格
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const x = margin + col * (photoWidthPx + spacing)
              const y = margin + row * (photoHeightPx + spacing)
              
              ctx.drawImage(img, x, y, photoWidthPx, photoHeightPx)
              
              // 绘制裁切线
              ctx.strokeStyle = '#cccccc'
              ctx.lineWidth = 1
              ctx.strokeRect(x, y, photoWidthPx, photoHeightPx)
            }
          }

          // 绘制L版边框
          ctx.strokeStyle = '#000000'
          ctx.lineWidth = 2
          ctx.strokeRect(0, 0, L_WIDTH_PX, L_HEIGHT_PX)

          resolve(canvas.toDataURL('image/jpeg', 0.9))
        } catch (error) {
          console.error('Canvas export error:', error)
          reject(error)
        }
      }
      
      img.onerror = (error) => {
        console.error('Image load error:', error)
        reject(new Error('图像加载失败'))
      }
      
      // 对于我们的应用，照片应该都是data URL格式（来自camera和edit页面）
      // 如果不是data URL，我们需要特殊处理
      if (!photo.startsWith('data:')) {
        // 对于外部URL，尝试通过代理或转换为data URL
        console.warn('非data URL图像，可能存在CORS问题:', photo)
      }
      
      img.src = photo
    })
  }

  // 处理尺寸选择
  const handleSizeSelect = async (size: PhotoSize) => {
    setSelectedSize(size)
    if (processedPhoto) {
      setIsGenerating(true)
      try {
        const preview = await generateLLayout(size, processedPhoto)
        setPreviewData(preview)
        
        toast({
          title: "预览生成成功",
          description: `已生成 ${size.name} 的L版布局预览`
        })
      } catch (error) {
        console.error('预览生成失败:', error)
        toast({
          title: "预览生成失败",
          description: "请重试",
          variant: "destructive"
        })
      } finally {
        setIsGenerating(false)
      }
    }
  }

  // 处理自定义尺寸
  const handleCustomSize = async () => {
    const width = parseFloat(customWidth)
    const height = parseFloat(customHeight)

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      toast({
        title: "尺寸无效",
        description: "请输入有效的宽度和高度",
        variant: "destructive"
      })
      return
    }

    const customSize: PhotoSize = {
      id: "custom",
      name: `自定义尺寸 ${width}×${height}mm`,
      width,
      height,
      description: "用户自定义尺寸",
      category: "自定义"
    }

    await handleSizeSelect(customSize)
  }

  // 下载L版布局
  const handleDownload = () => {
    if (!previewData || !selectedSize) return

    const link = document.createElement('a')
    link.href = previewData
    link.download = `${selectedSize.name}_L版_${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "下载成功",
      description: "L版照片布局已保存到本地"
    })
  }

  // 重新拍摄
  const handleRetake = () => {
    sessionStorage.removeItem('capturedPhoto')
    sessionStorage.removeItem('editedPhoto')
    router.push(`/${locale}/idphoto/camera`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 pt-16 pb-6">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 bg-white rounded-2xl shadow-sm hover:bg-gray-50"
          onClick={() => router.push(`/${locale}/idphoto/edit`)}
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        
        <h1 className="text-xl font-bold text-gray-800">选择照片尺寸</h1>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 bg-white rounded-2xl shadow-sm hover:bg-gray-50"
          onClick={handleDownload}
          disabled={!previewData}
          title="下载L版布局"
        >
          <Download className="h-4 w-4 text-gray-600" />
        </Button>
      </div>

      <div className="px-6 space-y-6">
        {/* 当前照片预览 */}
        {processedPhoto && (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">当前照片</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetake}
                  className="text-gray-600"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  重新拍摄
                </Button>
              </div>
              <div className="flex justify-center">
                <div className="w-32 h-40 bg-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={processedPhoto} 
                    alt="当前照片" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 热门尺寸 */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <Ruler className="w-5 h-5 mr-2 text-blue-600" />
              热门尺寸
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photoSizes.filter(size => size.isPopular).map((size) => (
                <Button
                  key={size.id}
                  variant="outline"
                  className={`h-auto p-4 text-left hover:bg-blue-50 border-2 ${
                    selectedSize?.id === size.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => handleSizeSelect(size)}
                  disabled={isGenerating}
                >
                  <div className="w-full">
                    <div className="font-semibold text-gray-800">{size.name}</div>
                    <div className="text-sm text-gray-600">{size.width}×{size.height} mm</div>
                    <div className="text-xs text-gray-500 mt-1">{size.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 所有尺寸 */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-800 mb-4">所有证件照尺寸</h3>
            <div className="space-y-2">
              {photoSizes.map((size) => (
                <Button
                  key={size.id}
                  variant="ghost"
                  className={`w-full justify-between h-auto p-3 hover:bg-gray-50 ${
                    selectedSize?.id === size.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                  onClick={() => handleSizeSelect(size)}
                  disabled={isGenerating}
                >
                  <div className="text-left">
                    <div className="font-medium text-gray-800">{size.name}</div>
                    <div className="text-sm text-gray-500">{size.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-gray-600">{size.width}×{size.height}</div>
                    <div className="text-xs text-gray-400">mm</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 自定义尺寸 */}
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-purple-600" />
              自定义尺寸
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="custom-width" className="text-sm font-medium text-gray-700">
                  宽度 (mm)
                </Label>
                <Input
                  id="custom-width"
                  type="number"
                  placeholder="35"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="custom-height" className="text-sm font-medium text-gray-700">
                  高度 (mm)
                </Label>
                <Input
                  id="custom-height"
                  type="number"
                  placeholder="45"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <Button
              onClick={handleCustomSize}
              disabled={isGenerating || !customWidth || !customHeight}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  生成预览中...
                </>
              ) : (
                <>
                  <Ruler className="w-4 h-4 mr-2" />
                  应用自定义尺寸
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* L版预览 */}
        {previewData && selectedSize && (
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">L版布局预览</h3>
                <div className="text-sm text-gray-600">
                  {selectedSize.name} · 89×127mm
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                  <img 
                    src={previewData} 
                    alt="L版布局预览" 
                    className="max-w-full h-auto"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              </div>
              <div className="text-center text-sm text-gray-500">
                标准L版尺寸 (89×127 mm)，包含多张 {selectedSize.name} 照片
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 隐藏的canvas用于生成预览 */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* 底部间距 */}
      <div className="h-8"></div>
    </div>
  )
}