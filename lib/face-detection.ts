// 面部检测工具类
export class FaceDetectionHelper {
  private static instance: FaceDetectionHelper
  private faceDetector: any = null

  private constructor() {
    this.initializeFaceDetector()
  }

  public static getInstance(): FaceDetectionHelper {
    if (!FaceDetectionHelper.instance) {
      FaceDetectionHelper.instance = new FaceDetectionHelper()
    }
    return FaceDetectionHelper.instance
  }

  private async initializeFaceDetector() {
    try {
      // 检查浏览器是否支持 Face Detection API
      if ('FaceDetector' in window) {
        this.faceDetector = new (window as any).FaceDetector({
          maxDetectedFaces: 1,
          fastMode: false
        })
      }
    } catch (error) {
      console.log('Face Detection API not available, using fallback methods')
    }
  }

  public async detectFaces(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<FaceDetectionResult | null> {
    if (!this.faceDetector) {
      return this.fallbackFaceDetection(imageElement)
    }

    try {
      const faces = await this.faceDetector.detect(imageElement)
      if (faces.length > 0) {
        const face = faces[0]
        return {
          detected: true,
          boundingBox: face.boundingBox,
          landmarks: face.landmarks,
          confidence: 1,
          suggestions: this.generateSuggestions(face.boundingBox, imageElement)
        }
      }
    } catch (error) {
      console.error('Face detection error:', error)
    }

    return { detected: false, confidence: 0, suggestions: ['请确保面部清晰可见'] }
  }

  private fallbackFaceDetection(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): FaceDetectionResult {
    // 简单的启发式检测 - 检查图像中心区域的亮度变化
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      return { detected: false, confidence: 0, suggestions: ['无法分析图像'] }
    }

    const width = imageElement instanceof HTMLVideoElement ? imageElement.videoWidth : imageElement.width
    const height = imageElement instanceof HTMLVideoElement ? imageElement.videoHeight : imageElement.height
    
    canvas.width = width
    canvas.height = height

    ctx.drawImage(imageElement, 0, 0, width, height)
    
    // 分析中心区域的像素数据
    const centerX = width / 2
    const centerY = height / 2
    const regionSize = Math.min(width, height) / 4
    
    try {
      const imageData = ctx.getImageData(
        centerX - regionSize / 2,
        centerY - regionSize / 2,
        regionSize,
        regionSize
      )
      
      // 计算亮度变化和肤色检测
      const analysis = this.analyzePixelData(imageData)
      
      return {
        detected: analysis.faceDetected,
        confidence: analysis.confidence,
        boundingBox: analysis.faceDetected ? {
          x: centerX - regionSize / 2,
          y: centerY - regionSize / 2,
          width: regionSize,
          height: regionSize
        } : undefined,
        suggestions: this.generateFallbackSuggestions(analysis)
      }
    } catch (error) {
      return { detected: false, confidence: 0, suggestions: ['图像分析失败'] }
    }
  }

  private analyzePixelData(imageData: ImageData): PixelAnalysis {
    const data = imageData.data
    let totalBrightness = 0
    let skinColorPixels = 0
    let totalPixels = data.length / 4

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      // 计算亮度
      const brightness = (r + g + b) / 3
      totalBrightness += brightness
      
      // 简单的肤色检测
      if (this.isSkinColor(r, g, b)) {
        skinColorPixels++
      }
    }

    const averageBrightness = totalBrightness / totalPixels
    const skinColorRatio = skinColorPixels / totalPixels

    return {
      averageBrightness,
      skinColorRatio,
      faceDetected: skinColorRatio > 0.3 && averageBrightness > 50 && averageBrightness < 200,
      confidence: Math.min(skinColorRatio * 2, 1),
      tooDark: averageBrightness < 80,
      tooLight: averageBrightness > 180
    }
  }

  private isSkinColor(r: number, g: number, b: number): boolean {
    // 简单的肤色检测算法
    return (
      r > 95 && r < 255 &&
      g > 40 && g < 220 &&
      b > 20 && b < 200 &&
      r > g && r > b &&
      Math.abs(r - g) > 15 &&
      ((r - g) >= 15 || (r - b) >= 15)
    )
  }

  private generateSuggestions(boundingBox: any, imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): string[] {
    const suggestions: string[] = []
    const centerX = imageElement.width / 2
    const centerY = imageElement.height / 2
    const faceCenterX = boundingBox.x + boundingBox.width / 2
    const faceCenterY = boundingBox.y + boundingBox.height / 2

    // 检查面部位置
    if (Math.abs(faceCenterX - centerX) > imageElement.width * 0.1) {
      suggestions.push(faceCenterX < centerX ? '请向右移动一些' : '请向左移动一些')
    }

    if (Math.abs(faceCenterY - centerY) > imageElement.height * 0.1) {
      suggestions.push(faceCenterY < centerY ? '请向下移动一些' : '请向上移动一些')
    }

    // 检查面部大小
    const faceSize = boundingBox.width * boundingBox.height
    const imageSize = imageElement.width * imageElement.height
    const faceSizeRatio = faceSize / imageSize

    if (faceSizeRatio < 0.05) {
      suggestions.push('请靠近一些')
    } else if (faceSizeRatio > 0.25) {
      suggestions.push('请远离一些')
    }

    if (suggestions.length === 0) {
      suggestions.push('位置很好！')
    }

    return suggestions
  }

  private generateFallbackSuggestions(analysis: PixelAnalysis): string[] {
    const suggestions: string[] = []

    if (!analysis.faceDetected) {
      suggestions.push('请确保面部在画面中央')
    }

    if (analysis.tooDark) {
      suggestions.push('光线太暗，请增加光照')
    } else if (analysis.tooLight) {
      suggestions.push('光线太亮，请调整光照')
    }

    if (analysis.skinColorRatio < 0.2) {
      suggestions.push('请确保面部清晰可见')
    }

    if (suggestions.length === 0) {
      suggestions.push('准备就绪！')
    }

    return suggestions
  }

  public getOptimalCropRegion(imageWidth: number, imageHeight: number, targetAspectRatio: number): CropRegion {
    // 计算最佳裁剪区域以匹配证件照比例
    const imageAspectRatio = imageWidth / imageHeight

    let cropWidth: number
    let cropHeight: number
    let cropX: number
    let cropY: number

    if (imageAspectRatio > targetAspectRatio) {
      // 图像太宽，需要裁剪宽度
      cropHeight = imageHeight
      cropWidth = imageHeight * targetAspectRatio
      cropX = (imageWidth - cropWidth) / 2
      cropY = 0
    } else {
      // 图像太高，需要裁剪高度
      cropWidth = imageWidth
      cropHeight = imageWidth / targetAspectRatio
      cropX = 0
      cropY = (imageHeight - cropHeight) / 2
    }

    return {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    }
  }
}

// 类型定义
export interface FaceDetectionResult {
  detected: boolean
  confidence: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
  landmarks?: any[]
  suggestions: string[]
}

interface PixelAnalysis {
  averageBrightness: number
  skinColorRatio: number
  faceDetected: boolean
  confidence: number
  tooDark: boolean
  tooLight: boolean
}

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}