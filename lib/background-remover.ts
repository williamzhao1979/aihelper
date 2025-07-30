// 智能背景去除工具类
export class BackgroundRemover {
  private static instance: BackgroundRemover
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private constructor() {
    this.canvas = document.createElement('canvas')
    const context = this.canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas context not supported')
    }
    this.ctx = context
  }

  public static getInstance(): BackgroundRemover {
    if (!BackgroundRemover.instance) {
      BackgroundRemover.instance = new BackgroundRemover()
    }
    return BackgroundRemover.instance
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

  // 主要的背景去除函数
  public async removeBackground(
    img: HTMLImageElement,
    newBackgroundColor: string = '#ffffff'
  ): Promise<string> {
    this.canvas.width = img.width
    this.canvas.height = img.height
    this.ctx.drawImage(img, 0, 0)
    
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height)
    const mask = this.createPersonMask(imageData)
    const refinedMask = this.refineMask(mask, img.width, img.height)
    const featheredMask = this.featherEdges(refinedMask, img.width, img.height)
    
    this.applyMaskWithNewBackground(imageData, featheredMask, newBackgroundColor)
    
    this.ctx.putImageData(imageData, 0, 0)
    return this.canvas.toDataURL('image/jpeg', 0.9)
  }

  // 创建人物遮罩 - 基于肤色、边缘和形状分析
  private createPersonMask(imageData: ImageData): boolean[] {
    const { data, width, height } = imageData
    const mask = new Array(width * height).fill(false)
    
    // 第一步：肤色检测
    const skinMask = this.detectSkinRegions(data, width, height)
    
    // 第二步：找到最大的连通肤色区域（通常是脸部）
    const faceRegion = this.findLargestConnectedRegion(skinMask, width, height)
    
    // 第三步：基于脸部区域扩展到整个人体
    const personMask = this.expandToPersonRegion(data, faceRegion, width, height)
    
    // 第四步：边缘细化
    const edgeRefinedMask = this.refineWithEdgeDetection(data, personMask, width, height)
    
    return edgeRefinedMask
  }

  // 肤色检测 - 使用多个颜色空间
  private detectSkinRegions(data: Uint8ClampedArray, width: number, height: number): boolean[] {
    const skinMask = new Array(width * height).fill(false)
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const pixelIndex = i / 4
      
      skinMask[pixelIndex] = this.isSkinColor(r, g, b)
    }
    
    return skinMask
  }

  // 改进的肤色检测算法
  private isSkinColor(r: number, g: number, b: number): boolean {
    // YCbCr 肤色检测
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128
    const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128
    
    const ycbcrSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173) && y >= 80
    
    // HSV 肤色检测
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    
    let h = 0
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6
      else if (max === g) h = (b - r) / delta + 2
      else h = (r - g) / delta + 4
      h *= 60
      if (h < 0) h += 360
    }
    
    const s = max === 0 ? 0 : delta / max
    const v = max / 255
    
    const hsvSkin = (h >= 0 && h <= 50) && (s >= 0.23 && s <= 0.68) && (v >= 0.35 && v <= 0.95)
    
    // RGB 简单规则
    const rgbSkin = r > 95 && g > 40 && b > 20 && 
                   Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                   Math.abs(r - g) > 15 && r > g && r > b
    
    // 综合判断
    return ycbcrSkin || hsvSkin || rgbSkin
  }

  // 找到最大连通区域（脸部）
  private findLargestConnectedRegion(mask: boolean[], width: number, height: number): boolean[] {
    const visited = new Array(width * height).fill(false)
    const regions: number[][] = []
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        if (mask[index] && !visited[index]) {
          const region = this.floodFill(mask, visited, x, y, width, height)
          if (region.length > 100) { // 过滤小区域
            regions.push(region)
          }
        }
      }
    }
    
    // 找到最大区域
    if (regions.length === 0) return new Array(width * height).fill(false)
    
    const largestRegion = regions.reduce((prev, current) => 
      current.length > prev.length ? current : prev
    )
    
    const faceRegion = new Array(width * height).fill(false)
    largestRegion.forEach(index => faceRegion[index] = true)
    
    return faceRegion
  }

  // 洪水填充算法
  private floodFill(mask: boolean[], visited: boolean[], startX: number, startY: number, width: number, height: number): number[] {
    const stack = [[startX, startY]]
    const region: number[] = []
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!
      const index = y * width + x
      
      if (x < 0 || x >= width || y < 0 || y >= height || visited[index] || !mask[index]) {
        continue
      }
      
      visited[index] = true
      region.push(index)
      
      // 检查4连通邻域
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    
    return region
  }

  // 从脸部区域扩展到整个人体
  private expandToPersonRegion(data: Uint8ClampedArray, faceRegion: boolean[], width: number, height: number): boolean[] {
    const personMask = [...faceRegion]
    
    // 找到脸部的边界框
    const faceBounds = this.getBounds(faceRegion, width, height)
    if (!faceBounds) return personMask
    
    // 估算身体区域（基于脸部位置和比例）
    const faceHeight = faceBounds.bottom - faceBounds.top
    const faceWidth = faceBounds.right - faceBounds.left
    const faceCenterX = (faceBounds.left + faceBounds.right) / 2
    
    // 身体通常在脸部下方，宽度约为脸部的1.5-2倍
    const bodyTop = faceBounds.bottom
    const bodyBottom = Math.min(height, bodyTop + faceHeight * 6) // 估算身体长度
    const bodyLeft = Math.max(0, faceCenterX - faceWidth)
    const bodyRight = Math.min(width, faceCenterX + faceWidth)
    
    // 在估算的身体区域中使用颜色相似性和边缘检测
    for (let y = bodyTop; y < bodyBottom; y++) {
      for (let x = bodyLeft; x < bodyRight; x++) {
        const index = y * width + x
        
        if (this.isLikelyPersonPixel(data, x, y, width, height, faceBounds)) {
          personMask[index] = true
        }
      }
    }
    
    return personMask
  }

  // 获取区域边界框
  private getBounds(mask: boolean[], width: number, height: number): {left: number, right: number, top: number, bottom: number} | null {
    let left = width, right = 0, top = height, bottom = 0
    let hasPixels = false
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x]) {
          hasPixels = true
          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
      }
    }
    
    return hasPixels ? { left, right, top, bottom } : null
  }

  // 判断像素是否可能属于人物
  private isLikelyPersonPixel(data: Uint8ClampedArray, x: number, y: number, width: number, height: number, faceBounds: any): boolean {
    const index = (y * width + x) * 4
    const r = data[index]
    const g = data[index + 1]
    const b = data[index + 2]
    
    // 肤色检测
    if (this.isSkinColor(r, g, b)) return true
    
    // 衣服颜色检测（通常与背景色有较大差异）
    const isClothingColor = this.isLikelyClothingColor(r, g, b)
    
    // 头发颜色检测
    const isHairColor = this.isLikelyHairColor(r, g, b)
    
    return isClothingColor || isHairColor
  }

  // 检测可能的衣服颜色
  private isLikelyClothingColor(r: number, g: number, b: number): boolean {
    // 排除明显的背景色（白色、很亮的颜色）
    const brightness = (r + g + b) / 3
    if (brightness > 240) return false
    
    // 检测常见衣服颜色范围
    const saturation = this.getSaturation(r, g, b)
    
    // 深色衣服
    if (brightness < 100 && saturation > 0.1) return true
    
    // 中等亮度的彩色衣服
    if (brightness >= 100 && brightness <= 200 && saturation > 0.3) return true
    
    return false
  }

  // 检测可能的头发颜色
  private isLikelyHairColor(r: number, g: number, b: number): boolean {
    const brightness = (r + g + b) / 3
    
    // 黑发
    if (brightness < 60) return true
    
    // 棕发
    if (r > g && r > b && brightness < 120) return true
    
    // 金发
    if (r > 150 && g > 130 && b < 100) return true
    
    return false
  }

  // 计算饱和度
  private getSaturation(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    return max === 0 ? 0 : (max - min) / max
  }

  // 使用边缘检测细化遮罩
  private refineWithEdgeDetection(data: Uint8ClampedArray, mask: boolean[], width: number, height: number): boolean[] {
    const refinedMask = [...mask]
    const edges = this.detectEdges(data, width, height)
    
    // 在遮罩边缘使用边缘信息进行细化
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x
        
        if (this.isEdgePixel(mask, x, y, width, height)) {
          const edgeStrength = edges[index]
          
          // 如果边缘强度高，保持遮罩状态
          // 如果边缘强度低，可能需要调整
          if (edgeStrength < 0.3 && this.hasBackgroundNeighbors(mask, x, y, width, height)) {
            refinedMask[index] = false
          }
        }
      }
    }
    
    return refinedMask
  }

  // 边缘检测
  private detectEdges(data: Uint8ClampedArray, width: number, height: number): number[] {
    const edges = new Array(width * height).fill(0)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const gray = this.getGrayValue(data, x, y, width)
        
        // Sobel算子
        const gx = 
          this.getGrayValue(data, x - 1, y - 1, width) * -1 +
          this.getGrayValue(data, x - 1, y, width) * -2 +
          this.getGrayValue(data, x - 1, y + 1, width) * -1 +
          this.getGrayValue(data, x + 1, y - 1, width) * 1 +
          this.getGrayValue(data, x + 1, y, width) * 2 +
          this.getGrayValue(data, x + 1, y + 1, width) * 1
        
        const gy = 
          this.getGrayValue(data, x - 1, y - 1, width) * -1 +
          this.getGrayValue(data, x, y - 1, width) * -2 +
          this.getGrayValue(data, x + 1, y - 1, width) * -1 +
          this.getGrayValue(data, x - 1, y + 1, width) * 1 +
          this.getGrayValue(data, x, y + 1, width) * 2 +
          this.getGrayValue(data, x + 1, y + 1, width) * 1
        
        const magnitude = Math.sqrt(gx * gx + gy * gy)
        edges[y * width + x] = Math.min(1, magnitude / 255)
      }
    }
    
    return edges
  }

  // 获取灰度值
  private getGrayValue(data: Uint8ClampedArray, x: number, y: number, width: number): number {
    const index = (y * width + x) * 4
    return (data[index] + data[index + 1] + data[index + 2]) / 3
  }

  // 检查是否为边缘像素
  private isEdgePixel(mask: boolean[], x: number, y: number, width: number, height: number): boolean {
    const current = mask[y * width + x]
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (mask[ny * width + nx] !== current) {
            return true
          }
        }
      }
    }
    
    return false
  }

  // 检查是否有背景邻居
  private hasBackgroundNeighbors(mask: boolean[], x: number, y: number, width: number, height: number): boolean {
    let backgroundCount = 0
    let totalCount = 0
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        
        const nx = x + dx
        const ny = y + dy
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          totalCount++
          if (!mask[ny * width + nx]) {
            backgroundCount++
          }
        }
      }
    }
    
    return backgroundCount / totalCount > 0.5
  }

  // 精细化遮罩
  private refineMask(mask: boolean[], width: number, height: number): boolean[] {
    let refined = [...mask]
    
    // 形态学操作：先腐蚀再膨胀，去除噪点
    refined = this.erode(refined, width, height, 1)
    refined = this.dilate(refined, width, height, 2)
    
    return refined
  }

  // 腐蚀操作
  private erode(mask: boolean[], width: number, height: number, iterations: number): boolean[] {
    let result = [...mask]
    
    for (let iter = 0; iter < iterations; iter++) {
      const temp = [...result]
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x
          
          if (result[index]) {
            // 检查3x3邻域
            let allTrue = true
            for (let dy = -1; dy <= 1 && allTrue; dy++) {
              for (let dx = -1; dx <= 1 && allTrue; dx++) {
                if (!result[(y + dy) * width + (x + dx)]) {
                  allTrue = false
                }
              }
            }
            temp[index] = allTrue
          }
        }
      }
      
      result = temp
    }
    
    return result
  }

  // 膨胀操作
  private dilate(mask: boolean[], width: number, height: number, iterations: number): boolean[] {
    let result = [...mask]
    
    for (let iter = 0; iter < iterations; iter++) {
      const temp = [...result]
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const index = y * width + x
          
          if (!result[index]) {
            // 检查3x3邻域
            let hasTrue = false
            for (let dy = -1; dy <= 1 && !hasTrue; dy++) {
              for (let dx = -1; dx <= 1 && !hasTrue; dx++) {
                if (result[(y + dy) * width + (x + dx)]) {
                  hasTrue = true
                }
              }
            }
            temp[index] = hasTrue
          }
        }
      }
      
      result = temp
    }
    
    return result
  }

  // 边缘羽化
  private featherEdges(mask: boolean[], width: number, height: number, featherRadius: number = 3): number[] {
    const featheredMask = new Array(width * height).fill(0)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        
        if (mask[index]) {
          featheredMask[index] = 1
        } else {
          // 计算到最近前景像素的距离
          const distance = this.getDistanceToForeground(mask, x, y, width, height, featherRadius)
          if (distance <= featherRadius) {
            featheredMask[index] = (featherRadius - distance) / featherRadius
          }
        }
      }
    }
    
    return featheredMask
  }

  // 计算到前景的距离
  private getDistanceToForeground(mask: boolean[], x: number, y: number, width: number, height: number, maxDistance: number): number {
    for (let r = 1; r <= maxDistance; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > r) continue
          
          const nx = x + dx
          const ny = y + dy
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (mask[ny * width + nx]) {
              return Math.sqrt(dx * dx + dy * dy)
            }
          }
        }
      }
    }
    
    return maxDistance
  }

  // 应用遮罩和新背景
  private applyMaskWithNewBackground(imageData: ImageData, mask: number[], newBackgroundColor: string): void {
    const { data } = imageData
    const [r, g, b] = this.hexToRgb(newBackgroundColor)
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4
      const alpha = mask[pixelIndex]
      
      // Alpha混合
      data[i] = data[i] * alpha + r * (1 - alpha)
      data[i + 1] = data[i + 1] * alpha + g * (1 - alpha)
      data[i + 2] = data[i + 2] * alpha + b * (1 - alpha)
      // data[i + 3] 保持不变
    }
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
}