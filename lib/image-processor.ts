import { BackgroundRemover } from './background-remover'

// 图像处理工具类
export class ImageProcessor {
  private static instance: ImageProcessor
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private backgroundRemover: BackgroundRemover

  private constructor() {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas context not supported')
    }
    this.ctx = context
    this.backgroundRemover = BackgroundRemover.getInstance()
  }

  public static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor()
    }
    return ImageProcessor.instance
  }

  // 加载图像
  public loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  // 应用美颜效果
  public applyBeautyFilter(
    imageData: ImageData, 
    settings: BeautySettings
  ): ImageData {
    const data = new Uint8ClampedArray(imageData.data)
    const width = imageData.width
    const height = imageData.height

    // 应用磨皮效果
    if (settings.skinSmoothing > 0) {
      this.applySkinSmoothing(data, width, height, settings.skinSmoothing / 100)
    }

    // 应用美白效果
    if (settings.skinWhitening > 0) {
      this.applySkinWhitening(data, width, height, settings.skinWhitening / 100)
    }

    // 应用亮度调整
    if (settings.brightness !== 0) {
      this.adjustBrightness(data, settings.brightness)
    }

    // 应用对比度调整
    if (settings.contrast !== 0) {
      this.adjustContrast(data, settings.contrast)
    }

    // 应用饱和度调整
    if (settings.saturation !== 0) {
      this.adjustSaturation(data, settings.saturation)
    }

    return new ImageData(data, width, height)
  }

  // 磨皮算法（高斯模糊 + 边缘保持）
  private applySkinSmoothing(data: Uint8ClampedArray, width: number, height: number, intensity: number): void {
    const radius = Math.max(1, Math.floor(intensity * 3))
    const blurred = this.gaussianBlur(data, width, height, radius)
    
    // 边缘检测和保持
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width
      const y = Math.floor((i / 4) / width)
      
      // 检测是否为肤色区域
      if (this.isSkinPixel(data[i], data[i + 1], data[i + 2])) {
        // 计算边缘强度
        const edgeStrength = this.calculateEdgeStrength(data, x, y, width, height)
        const blendFactor = intensity * (1 - edgeStrength)
        
        // 混合原图和模糊图
        data[i] = data[i] * (1 - blendFactor) + blurred[i] * blendFactor
        data[i + 1] = data[i + 1] * (1 - blendFactor) + blurred[i + 1] * blendFactor
        data[i + 2] = data[i + 2] * (1 - blendFactor) + blurred[i + 2] * blendFactor
      }
    }
  }

  // 高斯模糊
  private gaussianBlur(data: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
    const output = new Uint8ClampedArray(data.length)
    const kernel = this.createGaussianKernel(radius)
    const kernelSize = kernel.length
    const half = Math.floor(kernelSize / 2)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0
        let weightSum = 0

        for (let ky = -half; ky <= half; ky++) {
          for (let kx = -half; kx <= half; kx++) {
            const px = Math.max(0, Math.min(width - 1, x + kx))
            const py = Math.max(0, Math.min(height - 1, y + ky))
            const idx = (py * width + px) * 4
            const weight = kernel[ky + half][kx + half]

            r += data[idx] * weight
            g += data[idx + 1] * weight
            b += data[idx + 2] * weight
            a += data[idx + 3] * weight
            weightSum += weight
          }
        }

        const outputIdx = (y * width + x) * 4
        output[outputIdx] = r / weightSum
        output[outputIdx + 1] = g / weightSum
        output[outputIdx + 2] = b / weightSum
        output[outputIdx + 3] = a / weightSum
      }
    }

    return output
  }

  // 创建高斯核
  private createGaussianKernel(radius: number): number[][] {
    const size = radius * 2 + 1
    const kernel: number[][] = []
    const sigma = radius / 3
    const twoSigmaSquare = 2 * sigma * sigma
    let sum = 0

    for (let y = -radius; y <= radius; y++) {
      const row: number[] = []
      for (let x = -radius; x <= radius; x++) {
        const distance = x * x + y * y
        const value = Math.exp(-distance / twoSigmaSquare)
        row.push(value)
        sum += value
      }
      kernel.push(row)
    }

    // 归一化
    for (let i = 0; i < kernel.length; i++) {
      for (let j = 0; j < kernel[i].length; j++) {
        kernel[i][j] /= sum
      }
    }

    return kernel
  }

  // 计算边缘强度
  private calculateEdgeStrength(data: Uint8ClampedArray, x: number, y: number, width: number, height: number): number {
    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return 1

    const getGray = (x: number, y: number): number => {
      const idx = (y * width + x) * 4
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3
    }

    // Sobel算子
    const gx = getGray(x + 1, y - 1) + 2 * getGray(x + 1, y) + getGray(x + 1, y + 1) -
               getGray(x - 1, y - 1) - 2 * getGray(x - 1, y) - getGray(x - 1, y + 1)
    
    const gy = getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + getGray(x + 1, y + 1) -
               getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - getGray(x + 1, y - 1)

    const magnitude = Math.sqrt(gx * gx + gy * gy)
    return Math.min(1, magnitude / 255)
  }

  // 检测肤色像素
  private isSkinPixel(r: number, g: number, b: number): boolean {
    // YCbCr肤色检测
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128
    const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128

    return (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173) && y >= 80
  }

  // 美白效果
  private applySkinWhitening(data: Uint8ClampedArray, width: number, height: number, intensity: number): void {
    for (let i = 0; i < data.length; i += 4) {
      if (this.isSkinPixel(data[i], data[i + 1], data[i + 2])) {
        // 增加亮度，保持色调
        const factor = 1 + intensity * 0.3
        data[i] = Math.min(255, data[i] * factor)
        data[i + 1] = Math.min(255, data[i + 1] * factor)
        data[i + 2] = Math.min(255, data[i + 2] * factor)
      }
    }
  }

  // 亮度调整
  private adjustBrightness(data: Uint8ClampedArray, brightness: number): void {
    const factor = brightness * 2.55 // 转换为-255到255的范围
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + factor))
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + factor))
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + factor))
    }
  }

  // 对比度调整
  private adjustContrast(data: Uint8ClampedArray, contrast: number): void {
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128))
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128))
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128))
    }
  }

  // 饱和度调整
  private adjustSaturation(data: Uint8ClampedArray, saturation: number): void {
    const factor = (saturation + 100) / 100
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = Math.max(0, Math.min(255, gray + factor * (data[i] - gray)))
      data[i + 1] = Math.max(0, Math.min(255, gray + factor * (data[i + 1] - gray)))
      data[i + 2] = Math.max(0, Math.min(255, gray + factor * (data[i + 2] - gray)))
    }
  }

  // 智能背景去除和替换
  public async changeBackground(
    img: HTMLImageElement, 
    backgroundColor: string
  ): Promise<string> {
    try {
      // 使用智能背景去除
      return await this.backgroundRemover.removeBackground(img, backgroundColor)
    } catch (error) {
      console.error('智能背景去除失败，使用简单方法:', error)
      // 回退到简单的背景替换方法
      return this.simpleBackgroundChange(img, backgroundColor)
    }
  }

  // 简单的背景替换方法（作为备选）
  private simpleBackgroundChange(
    img: HTMLImageElement, 
    backgroundColor: string
  ): string {
    this.canvas.width = img.width
    this.canvas.height = img.height
    
    // 绘制原图
    this.ctx.drawImage(img, 0, 0)
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height)
    
    // 简单的背景检测和替换（基于边缘检测）
    const mask = this.createBackgroundMask(imageData)
    const [r, g, b] = this.hexToRgb(backgroundColor)
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const pixelIndex = i / 4
      if (mask[pixelIndex]) {
        imageData.data[i] = r
        imageData.data[i + 1] = g
        imageData.data[i + 2] = b
      }
    }
    
    this.ctx.putImageData(imageData, 0, 0)
    return this.canvas.toDataURL('image/jpeg', 0.9)
  }

  // 创建背景蒙版（简单的边缘和颜色分析）
  private createBackgroundMask(imageData: ImageData): boolean[] {
    const { data, width, height } = imageData
    const mask = new Array(width * height).fill(false)
    
    // 假设背景通常在图像边缘，且颜色相对uniform
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const isEdge = x < 10 || x >= width - 10 || y < 10 || y >= height - 10
        
        if (isEdge) {
          // 边缘像素很可能是背景
          mask[y * width + x] = true
        } else {
          // 内部像素基于肤色检测
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          mask[y * width + x] = !this.isSkinPixel(r, g, b)
        }
      }
    }
    
    return mask
  }

  // 十六进制颜色转RGB
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [255, 255, 255]
  }

  // 裁剪图像
  public cropImage(
    img: HTMLImageElement,
    cropArea: CropArea
  ): string {
    this.canvas.width = cropArea.width
    this.canvas.height = cropArea.height
    
    this.ctx.drawImage(
      img,
      cropArea.x, cropArea.y, cropArea.width, cropArea.height,
      0, 0, cropArea.width, cropArea.height
    )
    
    return this.canvas.toDataURL('image/jpeg', 0.9)
  }

  // 应用所有滤镜
  public async applyFilters(
    img: HTMLImageElement,
    settings: EditSettings
  ): Promise<string> {
    this.canvas.width = img.width
    this.canvas.height = img.height
    this.ctx.drawImage(img, 0, 0)
    
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height)
    const processedData = this.applyBeautyFilter(imageData, settings.beauty)
    
    this.ctx.putImageData(processedData, 0, 0)
    
    // 如果需要更换背景
    if (settings.backgroundColor !== '#ffffff') {
      return await this.changeBackground(img, settings.backgroundColor)
    }
    
    return this.canvas.toDataURL('image/jpeg', 0.9)
  }
}

// 类型定义
export interface BeautySettings {
  skinSmoothing: number
  skinWhitening: number
  brightness: number
  contrast: number
  saturation: number
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export interface EditSettings {
  beauty: BeautySettings
  backgroundColor: string
  cropArea?: CropArea
}