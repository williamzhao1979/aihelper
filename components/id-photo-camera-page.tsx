"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { 
  Camera, 
  Upload, 
  RotateCcw, 
  Settings, 
  ArrowLeft,
  Grid3X3,
  Image as ImageIcon
} from "lucide-react"

interface BackgroundColor {
  id: string
  name: string
  color: string
  class: string
}

export default function IdPhotoCameraPage() {
  const t = useTranslations('idPhoto.camera')
  const { toast } = useToast()
  const router = useRouter()
  const locale = useLocale()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [selectedBackground, setSelectedBackground] = useState("white")
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [isLoading, setIsLoading] = useState(false)

  const backgroundColors: BackgroundColor[] = [
    { id: "white", name: t('background.white'), color: "#ffffff", class: "bg-white border-purple-500" },
    { id: "blue", name: t('background.blue'), color: "#3b82f6", class: "bg-blue-500 border-white border-opacity-20" },
    { id: "red", name: t('background.red'), color: "#ef4444", class: "bg-red-500 border-white border-opacity-20" },
  ]

  // 切换摄像头
  const switchCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    const newMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newMode)
  }, [stream, facingMode])

  // 停止相机
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setIsRecording(false)
    }
  }, [stream])

  // 摄像头权限和流初始化 - 参考art-critique-modal的逻辑
  useEffect(() => {
    if (capturedImage) return // 如果已拍摄照片，不启动相机

    let currentStream: MediaStream | null = null
    const getCamera = async () => {
      setIsLoading(true)
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 1024 }
          }
        })
        
        setStream(currentStream)
        setIsRecording(true)
        
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream
        }
      } catch (error: any) {
        console.error("Error accessing camera:", error)
        let errorMessage = t('cameraErrorDesc')
        
        if (error.name === 'NotAllowedError') {
          errorMessage = t('cameraErrorDesc')
        } else if (error.name === 'NotFoundError') {
          errorMessage = '未找到摄像头设备'
        } else {
          errorMessage = '无法访问摄像头：' + error.message
        }
        
        toast({
          title: t('cameraError'),
          description: errorMessage,
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    getCamera()

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode, capturedImage, t, toast]) // 只依赖facingMode和capturedImage

  // 拍摄照片
  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (context) {
        // 设置画布尺寸为证件照比例 (33:48mm)
        const aspectRatio = 33 / 48
        const videoAspectRatio = video.videoWidth / video.videoHeight
        
        let sourceWidth = video.videoWidth
        let sourceHeight = video.videoHeight
        let sourceX = 0
        let sourceY = 0
        
        // 计算裁剪区域以匹配证件照比例
        if (videoAspectRatio > aspectRatio) {
          sourceWidth = video.videoHeight * aspectRatio
          sourceX = (video.videoWidth - sourceWidth) / 2
        } else {
          sourceHeight = video.videoWidth / aspectRatio
          sourceY = (video.videoHeight - sourceHeight) / 2
        }
        
        canvas.width = 390  // 33mm at 300dpi
        canvas.height = 567 // 48mm at 300dpi
        
        // 绘制裁剪后的图像
        context.drawImage(
          video,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, canvas.width, canvas.height
        )
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)
        setCapturedImage(imageDataUrl)
        
        // 拍摄完成后停止相机
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
          setStream(null)
          setIsRecording(false)
        }
        
        toast({
          title: t('captureSuccess'),
          description: t('captureSuccessDesc')
        })
      }
    }
  }, [stream, t, toast])

  // 处理文件上传
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          setCapturedImage(result)
          // 停止相机
          if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
            setIsRecording(false)
          }
          toast({
            title: t('uploadSuccess'),
            description: t('uploadSuccessDesc')
          })
        }
        reader.readAsDataURL(file)
      } else {
        toast({
          title: t('formatError'),
          description: t('formatErrorDesc'),
          variant: "destructive"
        })
      }
    }
  }, [stream, t, toast])

  // 重新拍摄
  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    // 重新拍摄时，useEffect会自动启动相机
  }, [])

  // 跳转到编辑页面
  const goToEdit = useCallback(() => {
    if (capturedImage) {
      console.log('准备跳转到编辑页面:', { 
        hasImage: !!capturedImage, 
        imageLength: capturedImage.length,
        selectedBackground 
      })
      
      // 将图片数据存储到 sessionStorage
      sessionStorage.setItem('capturedPhoto', capturedImage)
      sessionStorage.setItem('selectedBackground', selectedBackground)
      
      // 验证存储是否成功
      const stored = sessionStorage.getItem('capturedPhoto')
      console.log('存储验证:', { stored: !!stored, length: stored?.length })
      
      toast({
        title: t('editNext'),
        description: t('editNextDesc')
      })
      
      // 跳转到编辑页面
      router.push(`/${locale}/idphoto/edit`)
    } else {
      console.log('没有拍摄照片，无法跳转')
    }
  }, [capturedImage, selectedBackground, router, locale, t, toast])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 顶部控制栏 */}
      <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center px-6 pt-16 pb-6">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 bg-white bg-opacity-10 backdrop-blur-md rounded-2xl text-white hover:bg-white hover:bg-opacity-20"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="text-center">
          <h1 className="text-white font-bold">{t('idCard')}</h1>
          <p className="text-white text-opacity-60 text-sm">33×48mm</p>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 bg-white bg-opacity-10 backdrop-blur-md rounded-2xl text-white hover:bg-white hover:bg-opacity-20"
          onClick={() => setShowGrid(!showGrid)}
        >
          {showGrid ? <Grid3X3 className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
        </Button>
      </div>

      {/* 相机预览/照片显示区域 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-80 relative">
          {!capturedImage ? (
            <>
              {/* 相机预览 */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-3xl"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
              
              {/* 裁剪框 */}
              <div className="absolute inset-8 border-2 border-white border-dashed rounded-2xl"></div>
              
              {/* 网格线 */}
              {showGrid && (
                <div className="absolute inset-8">
                  <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-0">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="border border-white border-opacity-30"></div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 加载状态 */}
              {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-3xl">
                  <div className="text-white text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>{t('startCamera')}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 已拍摄照片预览 */
            <div className="w-full h-full bg-gray-200 rounded-3xl overflow-hidden">
              <img 
                src={capturedImage} 
                alt="拍摄的照片" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* 底部控制区 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-12">
        {/* 提示信息 */}
        <div className="text-center mb-8">
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl px-4 py-3 mb-4 inline-block">
            <p className="text-white text-sm">
              {!capturedImage 
                ? t('tips.shooting')
                : t('tips.captured')
              }
            </p>
          </div>
        </div>

        {!capturedImage ? (
          /* 拍摄模式控制 */
          <div className="flex justify-between items-center mb-6">
            {/* 相册按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 bg-white bg-opacity-10 backdrop-blur-md rounded-3xl hover:bg-white hover:bg-opacity-20"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg overflow-hidden flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
            </Button>

            {/* 拍摄按钮 */}
            <Button
              size="icon"
              className="w-20 h-20 bg-white rounded-full shadow-lg hover:bg-gray-100"
              onClick={capturePhoto}
              disabled={!isRecording}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Camera className="text-white text-xl" />
              </div>
            </Button>

            {/* 切换摄像头 */}
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 bg-white bg-opacity-10 backdrop-blur-md rounded-3xl hover:bg-white hover:bg-opacity-20"
              onClick={switchCamera}
            >
              <RotateCcw className="text-white text-xl" />
            </Button>
          </div>
        ) : (
          /* 照片预览模式控制 */
          <div className="flex justify-center gap-4 mb-6">
            <Button
              variant="outline"
              className="bg-white bg-opacity-10 backdrop-blur-md border-white border-opacity-20 text-white hover:bg-white hover:bg-opacity-20"
              onClick={retakePhoto}
            >
              {t('buttons.retake')}
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              onClick={goToEdit}
            >
              {t('buttons.nextEdit')}
            </Button>
          </div>
        )}

        {/* 背景选择 */}
        <div className="flex justify-center gap-3">
          {backgroundColors.map((bg) => (
            <Button
              key={bg.id}
              variant="ghost"
              size="icon"
              className={`w-8 h-8 rounded-full border-2 ${bg.class} ${
                selectedBackground === bg.id ? "border-2" : "border"
              }`}
              onClick={() => setSelectedBackground(bg.id)}
              title={bg.name}
            />
          ))}
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {/* 隐藏的画布用于图像处理 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}