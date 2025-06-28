# ExtractAudio 功能说明

## 功能概述

ExtractAudio 是一个纯前端的视频音频提取工具，允许用户从视频文件中提取音频并下载为MP3或WAV格式。

## 主要功能

### 1. 视频上传
- 支持拖拽上传视频文件
- 支持点击选择视频文件
- 支持常见视频格式：MP4、AVI、MOV等
- 文件大小限制：500MB

### 2. 视频信息显示
- 文件名
- 文件大小
- 视频时长
- 修改时间
- 视频分辨率

### 3. 音频提取
- 使用Web Audio API进行音频提取
- 实时显示处理进度
- 支持多声道音频处理
- 输出WAV格式音频

### 4. 音频预览和下载
- 音频信息显示（文件名、大小、时长、格式）
- 音频播放控制（播放/暂停）
- 一键下载音频文件

## 技术实现

### 前端技术栈
- **React 19** - 用户界面框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式框架
- **Radix UI** - UI组件库
- **Web Audio API** - 音频处理

### 核心功能实现

#### 1. 视频信息获取
```typescript
const getVideoInfo = (file: File): Promise<VideoInfo> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    
    video.onloadedmetadata = () => {
      const info: VideoInfo = {
        name: file.name,
        size: file.size,
        duration: video.duration,
        type: file.type,
        lastModified: file.lastModified,
        width: video.videoWidth,
        height: video.videoHeight
      }
      URL.revokeObjectURL(url)
      resolve(info)
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取视频文件'))
    }
    
    video.src = url
  })
}
```

#### 2. 音频提取
```typescript
const extractAudio = async () => {
  // 创建音频上下文
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  // 读取视频文件
  const arrayBuffer = await selectedVideo.arrayBuffer()
  
  // 解码音频数据
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  // 创建WAV格式的音频数据
  const wavBlob = await createWavBlob(audioBuffer)
  
  // 创建下载链接
  const audioUrl = URL.createObjectURL(wavBlob)
}
```

#### 3. WAV格式转换
```typescript
const createWavBlob = (audioBuffer: AudioBuffer): Promise<Blob> => {
  return new Promise((resolve) => {
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)

    // WAV文件头写入
    // 音频数据写入
    
    resolve(new Blob([arrayBuffer], { type: 'audio/wav' }))
  })
}
```

## 使用说明

### 1. 访问功能
- 访问路径：`/extractaudio`
- 或通过功能菜单中的"音频提取"按钮进入

### 2. 上传视频
- 拖拽视频文件到上传区域
- 或点击"选择视频文件"按钮选择文件

### 3. 查看视频信息
- 上传成功后会自动显示视频预览和信息

### 4. 提取音频
- 点击"提取音频"按钮开始处理
- 等待处理完成（会显示进度条）

### 5. 下载音频
- 处理完成后可以预览音频
- 点击"下载音频文件"按钮保存到本地

## 浏览器兼容性

### 支持的浏览器
- Chrome 66+
- Firefox 60+
- Safari 11+
- Edge 79+

### 必需的Web API
- File API
- Web Audio API
- Blob API
- URL.createObjectURL()

## 注意事项

### 1. 文件大小限制
- 视频文件不能超过500MB
- 大文件处理时间较长

### 2. 音频格式
- 目前输出WAV格式（无损）
- 文件大小可能较大

### 3. 浏览器限制
- 某些浏览器可能限制大文件处理
- 建议使用现代浏览器

### 4. 性能考虑
- 大文件处理可能较慢
- 建议在性能较好的设备上使用

## 未来改进

### 1. 音频格式支持
- 添加MP3格式输出
- 支持更多音频格式

### 2. 音频质量设置
- 可调节音频质量
- 支持不同采样率

### 3. 批量处理
- 支持多个视频同时处理
- 批量下载功能

### 4. 音频编辑
- 音频裁剪功能
- 音量调节功能

## 技术优势

### 1. 纯前端实现
- 无需后端服务器
- 数据不离开用户设备
- 保护用户隐私

### 2. 实时处理
- 本地处理，速度快
- 实时进度显示
- 即时预览功能

### 3. 用户友好
- 直观的拖拽上传
- 清晰的信息显示
- 简单的操作流程

### 4. 响应式设计
- 适配移动设备
- 良好的用户体验
- 现代化界面设计 