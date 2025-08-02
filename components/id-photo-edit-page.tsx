"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { ImageProcessor, type BeautySettings, type EditSettings } from "@/lib/image-processor"
import { 
  ArrowLeft, 
  Save,
  Wand2,
  Palette,
  Crop,
  SunMedium,
  RotateCcw,
  Sparkles,
  Download,
  Scissors
} from "lucide-react"

interface EditTool {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  bgColor: string
}


export default function IdPhotoEditPage() {
  const t = useTranslations('idPhoto.edit')
  const { toast } = useToast()
  const router = useRouter()
  const locale = useLocale()
  
  // 图像处理
  const [imageProcessor] = useState(() => ImageProcessor.getInstance())
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 照片数据管理
  const [currentPhoto, setCurrentPhoto] = useState<string>("https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=192&h=240&fit=crop&crop=face")
  const [processedPhoto, setProcessedPhoto] = useState<string | null>(null)
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [beautySettings, setBeautySettings] = useState<BeautySettings>({
    skinSmoothing: 60,
    skinWhitening: 40,
    brightness: 30,
    contrast: 0,
    saturation: 0
  })
  const [backgroundColor, setBackgroundColor] = useState("#ffffff")
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  
  // 从sessionStorage获取拍摄的照片
  useEffect(() => {
    // 确保在客户端执行
    if (typeof window !== 'undefined') {
      const capturedPhoto = sessionStorage.getItem('capturedPhoto')
      const selectedBg = sessionStorage.getItem('selectedBackground')
      
      console.log('从sessionStorage读取数据:', { capturedPhoto: capturedPhoto ? '有照片数据' : '无照片数据', selectedBg })
      
      if (capturedPhoto) {
        console.log('设置拍摄的照片为当前照片')
        setCurrentPhoto(capturedPhoto)
        // 清除sessionStorage中的数据（可选）
        // sessionStorage.removeItem('capturedPhoto')
      }
      
      if (selectedBg) {
        // 根据背景ID设置对应的颜色
        const bgColorMap: Record<string, string> = {
          'white': '#ffffff',
          'blue': '#3b82f6',
          'red': '#ef4444'
        }
        const newBgColor = bgColorMap[selectedBg] || '#ffffff'
        console.log('设置背景颜色:', selectedBg, '→', newBgColor)
        setBackgroundColor(newBgColor)
        // sessionStorage.removeItem('selectedBackground')
      }
    }
  }, [])

  // 加载原始图像
  useEffect(() => {
    const loadImage = async () => {
      try {
        const img = await imageProcessor.loadImage(currentPhoto)
        setOriginalImage(img)
        setProcessedPhoto(currentPhoto)
      } catch (error) {
        console.error('图像加载失败:', error)
        toast({
          title: "错误",
          description: "图像加载失败，请重试",
          variant: "destructive"
        })
      }
    }
    loadImage()
  }, [currentPhoto, imageProcessor, toast])

  // 编辑工具分类
  const editTools: EditTool[] = [
    {
      id: "beauty",
      name: t('tools.beauty.title'),
      icon: <Wand2 className="w-5 h-5" />,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      id: "background",
      name: t('tools.background.title'),
      icon: <Palette className="w-5 h-5" />,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      id: "crop",
      name: t('tools.crop.title'),
      icon: <Crop className="w-5 h-5" />,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      id: "adjust",
      name: t('tools.adjust.title'),
      icon: <SunMedium className="w-5 h-5" />,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ]

  // 背景颜色选项
  const backgroundColors = [
    { id: "white", name: t('tools.background.colors.white'), color: "#ffffff", preview: "bg-white" },
    { id: "blue", name: t('tools.background.colors.blue'), color: "#3b82f6", preview: "bg-blue-500" },
    { id: "red", name: t('tools.background.colors.red'), color: "#ef4444", preview: "bg-red-500" },
    { id: "gray", name: t('tools.background.colors.gray'), color: "#6b7280", preview: "bg-gray-500" }
  ]

  // 加载原始图像
  useEffect(() => {
    const loadImage = async () => {
      try {
        const img = await imageProcessor.loadImage(currentPhoto)
        setOriginalImage(img)
        setProcessedPhoto(currentPhoto)
      } catch (error) {
        console.error('图像加载失败:', error)
        toast({
          title: "错误",
          description: "图像加载失败，请重试",
          variant: "destructive"
        })
      }
    }
    loadImage()
  }, [currentPhoto, imageProcessor, toast])

  // 处理美颜设置变化
  const handleBeautyChange = async (setting: keyof BeautySettings, value: number[]) => {
    const newSettings = {
      ...beautySettings,
      [setting]: value[0]
    }
    setBeautySettings(newSettings)
    await applyFilters(newSettings, backgroundColor)
  }

  // 处理背景颜色变化
  const handleBackgroundChange = async (color: string) => {
    setBackgroundColor(color)
    await applyFilters(beautySettings, color)
  }

  // 应用滤镜
  const applyFilters = async (beauty: BeautySettings, bgColor: string) => {
    if (!originalImage || isProcessing) return

    setIsProcessing(true)
    try {
      const editSettings: EditSettings = {
        beauty,
        backgroundColor: bgColor
      }
      
      const result = await imageProcessor.applyFilters(originalImage, editSettings)
      setProcessedPhoto(result)
    } catch (error) {
      console.error('图像处理失败:', error)
      toast({
        title: "处理失败",
        description: "图像处理出现错误，请重试",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 重新拍摄
  const handleRetake = () => {
    toast({
      title: t('messages.retakeTitle'),
      description: t('messages.retakeDesc')
    })
    // 清除sessionStorage中的照片数据并返回拍摄页面
    sessionStorage.removeItem('capturedPhoto')
    sessionStorage.removeItem('selectedBackground')
    router.push(`/${locale}/idphoto/camera`)
  }

  // 保存并继续
  const handleNext = () => {
    // 保存编辑后的照片到sessionStorage
    if (processedPhoto) {
      sessionStorage.setItem('editedPhoto', processedPhoto)
    }
    
    toast({
      title: t('messages.saveTitle'),
      description: t('messages.saveDesc')
    })
    
    // 跳转到尺寸选择页面
    router.push(`/${locale}/idphoto/size`)
  }

  // 智能背景去除
  const handleSmartBackgroundRemoval = async () => {
    if (!originalImage || isProcessing || isRemovingBackground) return

    setIsRemovingBackground(true)
    try {
      toast({
        title: "开始智能抠图",
        description: "正在分析图像并去除背景，请稍候..."
      })

      const result = await imageProcessor.changeBackground(originalImage, backgroundColor)
      setProcessedPhoto(result)
      
      toast({
        title: "智能抠图完成",
        description: "背景已成功去除并替换为纯色背景"
      })
    } catch (error) {
      console.error('智能背景去除失败:', error)
      toast({
        title: "抠图失败",
        description: "智能抠图失败，请重试或调整图片",
        variant: "destructive"
      })
    } finally {
      setIsRemovingBackground(false)
    }
  }

  // 下载处理后的图片
  const handleDownload = () => {
    if (!processedPhoto) return

    const link = document.createElement('a')
    link.href = processedPhoto
    link.download = `id-photo-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "下载成功",
      description: "证件照已下载到本地"
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 pt-16 pb-6">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 bg-white rounded-2xl shadow-sm hover:bg-gray-50"
          onClick={() => router.push(`/${locale}/idphoto/camera`)}
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        
        <h1 className="text-xl font-bold text-gray-800">{t('title')}</h1>
        
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 bg-white rounded-2xl shadow-sm hover:bg-gray-50"
            onClick={handleSmartBackgroundRemoval}
            disabled={!originalImage || isProcessing || isRemovingBackground}
            title="智能抠图"
          >
            {isRemovingBackground ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            ) : (
              <Scissors className="h-4 w-4 text-purple-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 bg-white rounded-2xl shadow-sm hover:bg-gray-50"
            onClick={handleDownload}
            disabled={!processedPhoto}
            title="下载图片"
          >
            <Download className="h-4 w-4 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            className="text-purple-600 font-bold hover:bg-purple-50"
            onClick={handleNext}
          >
            {t('save')}
          </Button>
        </div>
      </div>

      {/* 照片预览区 */}
      <div className="px-6 mb-8">
        <Card className="bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-center mb-4">
              <div className="w-48 h-60 bg-gray-200 rounded-2xl overflow-hidden relative">
                <img 
                  src={processedPhoto || currentPhoto}
                  alt="编辑照片" 
                  className="w-full h-full object-cover"
                />
                {/* 处理中遮罩 */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </div>
            {/* 隐藏的 canvas 用于图像处理 */}
            <canvas ref={canvasRef} className="hidden" />
            <div className="text-center">
              <h3 className="font-bold text-gray-800 mb-1">{t('photoInfo.idCard')}</h3>
              <p className="text-gray-500 text-sm">{t('photoInfo.size')} · {t('photoInfo.background')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 编辑工具 */}
      <div className="px-6 mb-6">
        <h3 className="font-bold text-gray-800 mb-4">{t('editTools')}</h3>
        <div className="grid grid-cols-4 gap-4">
          {editTools.map((tool) => (
            <Button
              key={tool.id}
              variant="ghost"
              className={`
                bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center h-auto flex-col
                ${activeCategory === tool.id ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'}
              `}
              onClick={() => setActiveCategory(activeCategory === tool.id ? null : tool.id)}
            >
              <div className={`w-8 h-8 ${tool.bgColor} rounded-xl mx-auto mb-2 flex items-center justify-center`}>
                <div className={tool.color}>
                  {tool.icon}
                </div>
              </div>
              <span className="text-xs text-gray-600 font-medium">{tool.name}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* 编辑面板 */}
      {activeCategory && (
        <div className="px-6 mb-8">
          {/* 美颜设置 */}
          {activeCategory === 'beauty' && (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  {t('tools.beauty.settings')}
                </h3>
                
                <div className="space-y-6">
                  {/* 磨皮 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">{t('tools.beauty.skinSmoothing')}</span>
                      <span className="text-purple-600 text-sm">{beautySettings.skinSmoothing}%</span>
                    </div>
                    <Slider
                      value={[beautySettings.skinSmoothing]}
                      onValueChange={(value) => handleBeautyChange('skinSmoothing', value)}
                      max={100}
                      step={1}
                      className="w-full"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  {/* 美白 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">{t('tools.beauty.skinWhitening')}</span>
                      <span className="text-purple-600 text-sm">{beautySettings.skinWhitening}%</span>
                    </div>
                    <Slider
                      value={[beautySettings.skinWhitening]}
                      onValueChange={(value) => handleBeautyChange('skinWhitening', value)}
                      max={100}
                      step={1}
                      className="w-full"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  {/* 亮度 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">{t('tools.beauty.brightness')}</span>
                      <span className="text-purple-600 text-sm">{beautySettings.brightness}%</span>
                    </div>
                    <Slider
                      value={[beautySettings.brightness]}
                      onValueChange={(value) => handleBeautyChange('brightness', value)}
                      max={100}
                      step={1}
                      className="w-full"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 背景设置 */}
          {activeCategory === 'background' && (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <Palette className="w-5 h-5 mr-2 text-blue-600" />
                  {t('tools.background.settings')}
                </h3>
                
                {/* 智能抠图按钮 */}
                <div className="mb-6">
                  <Button
                    onClick={handleSmartBackgroundRemoval}
                    disabled={!originalImage || isProcessing || isRemovingBackground}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
                  >
                    {isRemovingBackground ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        智能抠图中...
                      </>
                    ) : (
                      <>
                        <Scissors className="w-4 h-4 mr-2" />
                        智能去除背景
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    AI智能识别人物轮廓，自动去除背景
                  </p>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  {backgroundColors.map((bg) => (
                    <Button
                      key={bg.id}
                      variant="outline"
                      className={`h-16 flex-col gap-2 hover:bg-gray-50 ${
                        backgroundColor === bg.color ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => handleBackgroundChange(bg.color)}
                      disabled={isProcessing}
                    >
                      <div className={`w-8 h-8 ${bg.preview} rounded-full border-2 border-gray-200`} />
                      <span className="text-xs text-gray-600">{bg.name}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 裁剪设置 */}
          {activeCategory === 'crop' && (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <Crop className="w-5 h-5 mr-2 text-green-600" />
                  {t('tools.crop.settings')}
                </h3>
                
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crop className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-500 mb-4">{t('tools.crop.instruction')}</p>
                  <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                    {t('tools.crop.reset')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 调色设置 */}
          {activeCategory === 'adjust' && (
            <Card className="bg-white shadow-sm">
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                  <SunMedium className="w-5 h-5 mr-2 text-orange-600" />
                  {t('tools.adjust.settings')}
                </h3>
                
                <div className="space-y-6">
                  {/* 对比度 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">{t('tools.adjust.contrast')}</span>
                      <span className="text-orange-600 text-sm">{beautySettings.contrast > 0 ? '+' : ''}{beautySettings.contrast}</span>
                    </div>
                    <Slider
                      value={[beautySettings.contrast]}
                      onValueChange={(value) => handleBeautyChange('contrast', value)}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                      disabled={isProcessing}
                    />
                  </div>
                  
                  {/* 饱和度 */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-700 font-medium">{t('tools.adjust.saturation')}</span>
                      <span className="text-orange-600 text-sm">{beautySettings.saturation > 0 ? '+' : ''}{beautySettings.saturation}</span>
                    </div>
                    <Slider
                      value={[beautySettings.saturation]}
                      onValueChange={(value) => handleBeautyChange('saturation', value)}
                      min={-50}
                      max={50}
                      step={1}
                      className="w-full"
                      disabled={isProcessing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 底部操作按钮 */}
      <div className="px-6 pb-8">
        <div className="flex gap-3">
          <Button 
            variant="outline"
            className="flex-1 bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-200"
            onClick={handleRetake}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('retake')}
          </Button>
          <Button 
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl font-bold hover:from-purple-600 hover:to-pink-600"
            onClick={handleNext}
          >
            <Save className="w-4 h-4 mr-2" />
            {t('nextStep')}
          </Button>
        </div>
      </div>
    </div>
  )
}