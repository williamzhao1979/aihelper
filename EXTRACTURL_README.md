# ExtractURL 功能说明

## 功能概述

ExtractURL 是一个纯前端的URL提取工具，允许用户从手机摄像头拍摄的文本中提取URL链接。该功能解决了手机相机无法直接提取文本中URL的问题。

## 主要功能

### 1. 摄像头访问
- 支持手机摄像头访问
- 自动使用后置摄像头（更适合拍摄文本）
- 实时预览摄像头画面
- 权限管理和错误处理

### 2. 图像捕获
- 点击"提取URL"按钮拍摄图片
- 支持重新拍摄功能
- 图片质量优化（JPEG格式，80%质量）

### 3. 文字识别（OCR）
- 从拍摄的图片中识别文字内容
- 目前使用模拟数据演示功能
- 可集成真实的OCR库（如Tesseract.js）

### 4. URL提取与高亮
- **完整URL匹配**: 识别标准格式的URL（http://、https://、mailto:、tel:等）
- **模糊匹配**: 自动补足不完整的URL（如google.com → https://google.com）
- **文本高亮**: 在识别的文本中高亮显示所有匹配到的URL
- **颜色区分**: 
  - 蓝色：完整URL
  - 绿色：自动补足的URL

### 5. 链接功能
- 所有高亮的URL都可以点击打开
- 一键复制URL到剪贴板
- 支持在新标签页中打开链接

### 6. 国际化支持
- 支持中文、英文、日文三种语言
- 自动根据用户语言设置显示对应翻译

## 技术实现

### 前端技术栈
- **React 19** - 用户界面框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Radix UI** - UI组件库
- **next-intl** - 国际化支持

### 核心功能实现

#### 1. 摄像头访问
```typescript
const requestCameraPermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } // 使用后置摄像头
    })
    return stream
  } catch (error) {
    // 处理权限错误
  }
}
```

#### 2. 图像捕获
```typescript
const captureImage = () => {
  const video = videoRef.current
  const canvas = canvasRef.current
  const context = canvas.getContext('2d')
  
  // 设置canvas尺寸
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  // 绘制视频帧到canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  // 获取图片数据
  const imageData = canvas.toDataURL('image/jpeg', 0.8)
}
```

#### 3. URL处理逻辑
```typescript
const processURLs = (text: string): URLMatch[] => {
  const matches: URLMatch[] = []
  
  // 完整URL匹配
  const fullUrlRegex = /(https?:\/\/[^\s]+)|(\/[^\s]+)|(mailto:[^\s]+)|(tel:[^\s]+)/g
  const fullUrlMatches = text.matchAll(fullUrlRegex)
  
  // 模糊匹配（自动补足https）
  const fuzzyUrlRegex = /([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g
  const fuzzyUrlMatches = text.matchAll(fuzzyUrlRegex)
  
  // 处理匹配结果...
}
```

#### 4. 文本高亮组件
```typescript
const HighlightedText = ({ text, urlMatches }: { text: string; urlMatches: URLMatch[] }) => {
  // 将文本分割为普通文本和URL片段
  // 为URL片段添加高亮样式和链接功能
}
```

## 使用说明

### 1. 访问功能
- 访问路径：`/extracturl`
- 或通过功能菜单中的"URL提取器"按钮进入

### 2. 使用步骤
1. **开始摄像头**: 点击"开始摄像头"按钮
2. **授权权限**: 允许浏览器访问摄像头
3. **拍摄文本**: 将摄像头对准包含URL的文本
4. **提取URL**: 点击"提取URL"按钮拍摄并处理
5. **查看结果**: 查看识别的文本和提取的URL
6. **复制使用**: 点击复制按钮或直接点击链接

### 3. 功能特点
- **智能识别**: 自动识别完整和不完整的URL
- **高亮显示**: 在文本中高亮显示所有URL
- **一键复制**: 快速复制URL到剪贴板
- **直接打开**: 点击链接可直接在浏览器中打开

## 浏览器兼容性

### 支持的浏览器
- Chrome 66+
- Firefox 60+
- Safari 11+
- Edge 79+

### 必需的Web API
- MediaDevices API (摄像头访问)
- Canvas API (图像处理)
- Clipboard API (剪贴板操作)
- File API (文件处理)

## 注意事项

### 1. 权限要求
- 需要摄像头访问权限
- 需要剪贴板写入权限（复制功能）

### 2. 使用建议
- 确保拍摄的文本清晰可见
- 避免强光反射和阴影
- 保持摄像头稳定

### 3. 技术限制
- 目前使用模拟OCR数据
- 实际使用需要集成OCR库
- 某些复杂格式的URL可能无法识别

## 未来改进

### 1. OCR集成
- 集成Tesseract.js进行真实文字识别
- 支持多语言文字识别
- 提高识别准确率

### 2. 功能增强
- 支持批量处理多张图片
- 添加URL验证功能
- 支持更多URL格式

### 3. 用户体验
- 添加实时预览功能
- 优化移动端操作体验
- 添加操作引导和教程

## 文件结构

```
app/[locale]/extracturl/
└── page.tsx                    # 主功能页面

messages/
├── zh.json                     # 中文翻译
├── en.json                     # 英文翻译
└── ja.json                     # 日文翻译

components/
└── feature-menu.tsx           # 功能菜单（已更新）

EXTRACTURL_README.md           # 功能说明文档
```

## 总结

ExtractURL功能为aihelper项目增加了一个实用的URL提取工具，特别适合移动端用户使用。该功能采用纯前端技术实现，具有良好的隐私保护和用户体验。通过智能的URL识别和高亮显示，用户可以快速从拍摄的文本中提取和使用URL链接。 