"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Upload,
  Video,
  Music,
  Download,
  FileVideo,
  FileAudio,
  Clock,
  HardDrive,
  Calendar,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Pause,
  Settings,
} from "lucide-react"
import { DonationProvider } from "@/components/donation-provider"
import { DonationButton } from "@/components/donation-button"
import { DonationModal } from "@/components/donation-modal"

// 动态导入lamejs，只在客户端加载
let Mp3Encoder: any = null
if (typeof window !== 'undefined') {
  import('lamejs-121-bug').then(module => {
    Mp3Encoder = module.Mp3Encoder
  })
}

interface VideoInfo {
  name: string
  size: number
  duration: number
  type: string
  lastModified: number
  width?: number
  height?: number
}

interface AudioInfo {
  name: string
  size: number
  duration: number
  type: string
  url: string
  format: string
}

type AudioFormat = "wav" | "mp3"

export default function ExtractAudioPage() {
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [audioInfo, setAudioInfo] = useState<AudioInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3")
  const [mp3Quality, setMp3Quality] = useState<number>(128)
  const [isMp3Ready, setIsMp3Ready] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // 检查MP3编码器是否可用
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Loading MP3 encoder...')
      import('lamejs-121-bug').then(module => {
        console.log('MP3 encoder loaded successfully:', module)
        Mp3Encoder = module.Mp3Encoder
        setIsMp3Ready(true)
        console.log('MP3 encoder is ready')
      }).catch(err => {
        console.error('Failed to load MP3 encoder:', err)
        setError('MP3编码器加载失败，将使用WAV格式')
        setAudioFormat('wav')
      })
    }
  }, [])

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 格式化时间
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // 格式化日期
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 获取视频信息
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

  // 处理拖拽
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

    const files = Array.from(e.dataTransfer.files)
    const videoFile = files.find(file => file.type.startsWith('video/')) as File | undefined
    
    if (videoFile) {
      handleVideoSelect(videoFile)
    } else {
      setError('请选择有效的视频文件')
    }
  }

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleVideoSelect(file)
    }
  }

  const handleVideoSelect = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('请选择有效的视频文件')
      return
    }

    if (file.size > 500 * 1024 * 1024) { // 500MB限制
      setError('视频文件大小不能超过500MB')
      return
    }

    setError(null)
    setSelectedVideo(file)
    setAudioInfo(null)
    setProgress(0)
    setIsPlaying(false)

    try {
      const info = await getVideoInfo(file)
      setVideoInfo(info)
    } catch (err) {
      setError('无法读取视频信息')
    }
  }

  // 移除视频
  const removeVideo = () => {
    setSelectedVideo(null)
    setVideoInfo(null)
    setAudioInfo(null)
    setProgress(0)
    setError(null)
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 将AudioBuffer转换为Int16Array
  const audioBufferToInt16Array = (audioBuffer: AudioBuffer): Int16Array => {
    const length = audioBuffer.length
    const numberOfChannels = audioBuffer.numberOfChannels
    const int16Array = new Int16Array(length * numberOfChannels)
    
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
        int16Array[i * numberOfChannels + channel] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      }
    }
    
    return int16Array
  }

  // 创建MP3格式的音频Blob
  const createMp3Blob = async (audioBuffer: AudioBuffer, kbps: number): Promise<Blob> => {
    if (!Mp3Encoder) {
      throw new Error('MP3编码器未加载')
    }

    return new Promise((resolve, reject) => {
      try {
        const int16Array = audioBufferToInt16Array(audioBuffer)
        console.log('Audio buffer converted to Int16Array:', {
          length: int16Array.length,
          channels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
          kbps: kbps
        })

        const mp3Encoder = new Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, kbps)
        
        const mp3Data: Uint8Array[] = []
        const bufferSize = 1152 // MP3编码的缓冲区大小
        
        for (let i = 0; i < int16Array.length; i += bufferSize * audioBuffer.numberOfChannels) {
          const buffer = int16Array.subarray(i, i + bufferSize * audioBuffer.numberOfChannels)
          const mp3buf = mp3Encoder.encodeBuffer(buffer)
          if (mp3buf.length > 0) {
            mp3Data.push(mp3buf)
          }
        }
        
        const mp3buf = mp3Encoder.flush()
        if (mp3buf.length > 0) {
          mp3Data.push(mp3buf)
        }
        
        console.log('MP3 encoding completed:', {
          dataChunks: mp3Data.length,
          totalSize: mp3Data.reduce((sum, buf) => sum + buf.length, 0)
        })
        
        if (mp3Data.length === 0) {
          reject(new Error('MP3编码未生成任何数据'))
          return
        }
        
        const blob = new Blob(mp3Data, { type: 'audio/mp3' })
        resolve(blob)
      } catch (error) {
        console.error('MP3 encoding error:', error)
        reject(error)
      }
    })
  }

  // 创建WAV格式的音频Blob
  const createWavBlob = (audioBuffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const length = audioBuffer.length
      const numberOfChannels = audioBuffer.numberOfChannels
      const sampleRate = audioBuffer.sampleRate
      const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
      const view = new DataView(arrayBuffer)

      // WAV文件头
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i))
        }
      }

      writeString(0, 'RIFF')
      view.setUint32(4, 36 + length * numberOfChannels * 2, true)
      writeString(8, 'WAVE')
      writeString(12, 'fmt ')
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numberOfChannels, true)
      view.setUint32(24, sampleRate, true)
      view.setUint32(28, sampleRate * numberOfChannels * 2, true)
      view.setUint16(32, numberOfChannels * 2, true)
      view.setUint16(34, 16, true)
      writeString(36, 'data')
      view.setUint32(40, length * numberOfChannels * 2, true)

      // 写入音频数据
      let offset = 44
      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]))
          view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
          offset += 2
        }
      }

      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }))
    })
  }

  // 提取音频
  const extractAudio = async () => {
    if (!selectedVideo || !videoInfo) return

    // 检查MP3格式是否可用
    if (audioFormat === "mp3" && !isMp3Ready) {
      setError('MP3编码器正在加载，请稍后再试或选择WAV格式')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      // 模拟处理进度
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 10
        })
      }, 200)

      console.log('Starting audio extraction:', {
        format: audioFormat,
        quality: mp3Quality,
        isMp3Ready: isMp3Ready
      })

      // 使用Web Audio API提取音频
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // 读取视频文件
      const arrayBuffer = await selectedVideo.arrayBuffer()
      console.log('Video file loaded:', arrayBuffer.byteLength, 'bytes')
      
      // 解码音频数据
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      console.log('Audio decoded:', {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
        length: audioBuffer.length
      })
      
      // 根据选择的格式创建音频数据
      let audioBlob: Blob
      let audioType: string
      let formatName: string
      let fileName: string

      if (audioFormat === "mp3") {
        console.log('Creating MP3 format...')
        audioBlob = await createMp3Blob(audioBuffer, mp3Quality)
        audioType = 'audio/mp3'
        formatName = 'MP3'
        fileName = selectedVideo.name.replace(/\.[^/.]+$/, '.mp3')
        console.log('MP3 created successfully:', audioBlob.size, 'bytes')
      } else {
        console.log('Creating WAV format...')
        audioBlob = await createWavBlob(audioBuffer)
        audioType = 'audio/wav'
        formatName = 'WAV'
        fileName = selectedVideo.name.replace(/\.[^/.]+$/, '.wav')
        console.log('WAV created successfully:', audioBlob.size, 'bytes')
      }
      
      clearInterval(progressInterval)
      setProgress(100)

      // 创建音频信息
      const audioUrl = URL.createObjectURL(audioBlob)
      const audioInfo: AudioInfo = {
        name: fileName,
        size: audioBlob.size,
        duration: audioBuffer.duration,
        type: audioType,
        url: audioUrl,
        format: formatName
      }

      setAudioInfo(audioInfo)
      console.log('Audio extraction completed successfully')

    } catch (err) {
      console.error('Audio extraction failed:', err)
      let errorMessage = '音频提取失败，请重试'
      
      if (err instanceof Error) {
        if (err.message.includes('MP3编码器未加载')) {
          errorMessage = 'MP3编码器未加载，请刷新页面重试或选择WAV格式'
        } else if (err.message.includes('MP3编码未生成任何数据')) {
          errorMessage = 'MP3编码失败，请尝试选择WAV格式或降低质量'
        } else if (err.message.includes('decodeAudioData')) {
          errorMessage = '视频文件音频解码失败，请检查文件格式'
        } else {
          errorMessage = `音频提取失败: ${err.message}`
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // 下载音频
  const downloadAudio = () => {
    if (!audioInfo) return

    const link = document.createElement('a')
    link.href = audioInfo.url
    link.download = audioInfo.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 播放/暂停音频
  const toggleAudioPlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  // 音频播放结束
  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  return (
    <DonationProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              视频音频提取器
            </h1>
            <p className="text-gray-600 text-sm">
              从视频文件中提取音频，支持WAV和MP3格式下载
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setError(null)} 
                  className="mt-2"
                >
                  关闭
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Video Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                选择视频文件
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedVideo ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    拖拽视频文件到这里，或点击选择
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    支持MP4、AVI、MOV等格式，最大500MB
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    选择视频文件
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Video Preview */}
                  <video
                    ref={videoRef}
                    src={URL.createObjectURL(selectedVideo)}
                    className="w-full rounded-lg"
                    controls
                    preload="metadata"
                  />
                  
                  {/* Video Info */}
                  {videoInfo && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">视频信息</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <FileVideo className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">文件名:</span>
                          <span className="truncate">{videoInfo.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">大小:</span>
                          <span>{formatFileSize(videoInfo.size)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">时长:</span>
                          <span>{formatDuration(videoInfo.duration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600">修改时间:</span>
                          <span>{formatDate(videoInfo.lastModified)}</span>
                        </div>
                        {videoInfo.width && videoInfo.height && (
                          <div className="flex items-center gap-1 col-span-2">
                            <span className="text-gray-600">分辨率:</span>
                            <span>{videoInfo.width} × {videoInfo.height}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Audio Settings */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      音频设置
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">音频格式</label>
                        <Select value={audioFormat} onValueChange={(value: AudioFormat) => setAudioFormat(value)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp3" disabled={!isMp3Ready}>
                              MP3 {!isMp3Ready && '(加载中...)'}
                            </SelectItem>
                            <SelectItem value="wav">WAV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {audioFormat === "mp3" && (
                        <div className="space-y-1">
                          <label className="text-xs text-gray-600">MP3质量</label>
                          <Select value={mp3Quality.toString()} onValueChange={(value) => setMp3Quality(Number(value))}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="64">64 kbps</SelectItem>
                              <SelectItem value="128">128 kbps</SelectItem>
                              <SelectItem value="192">192 kbps</SelectItem>
                              <SelectItem value="320">320 kbps</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={extractAudio} 
                      disabled={isProcessing || (audioFormat === "mp3" && !isMp3Ready)}
                      className="flex-1"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          提取中...
                        </>
                      ) : (
                        <>
                          <Music className="w-4 h-4 mr-2" />
                          提取音频
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={removeVideo}
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress */}
          {isProcessing && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>提取进度</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audio Result */}
          {audioInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="w-5 h-5" />
                  提取结果
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio Info */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">音频信息</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <FileAudio className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">文件名:</span>
                      <span className="truncate">{audioInfo.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">大小:</span>
                      <span>{formatFileSize(audioInfo.size)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">时长:</span>
                      <span>{formatDuration(audioInfo.duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {audioInfo.format}格式
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Audio Controls */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">音频预览</h4>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAudioPlayback}
                      className="flex items-center gap-1"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3" />
                          暂停
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          播放
                        </>
                      )}
                    </Button>
                    <audio
                      ref={audioRef}
                      src={audioInfo.url}
                      onEnded={handleAudioEnded}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Download Button */}
                <Button 
                  onClick={downloadAudio}
                  className="w-full"
                  size="lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  下载音频文件
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Donation Button */}
          <div className="fixed bottom-4 right-4">
            <DonationButton position="bottom-right" />
          </div>
        </div>
      </div>
    </DonationProvider>
  )
} 