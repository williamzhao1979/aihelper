"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Mic, MicOff, RotateCcw, Trophy, Volume2, Settings, History } from "lucide-react"

// 绕口令数据
const tongueTwisters = [
  {
    id: 1,
    title: "四是四",
    content: "四是四，十是十，十四是十四，四十是四十",
    difficulty: "简单",
    color: "bg-green-500",
  },
  {
    id: 2,
    title: "红凤凰",
    content: "红凤凰，黄凤凰，粉红凤凰花凤凰",
    difficulty: "中等",
    color: "bg-yellow-500",
  },
  {
    id: 3,
    title: "吃葡萄",
    content: "吃葡萄不吐葡萄皮，不吃葡萄倒吐葡萄皮",
    difficulty: "困难",
    color: "bg-red-500",
  },
]

export default function TongueTwisterPage() {
  const [isRecording, setIsRecording] = useState(false)
  const [currentTwister, setCurrentTwister] = useState(tongueTwisters[0])
  const [count, setCount] = useState(0)
  const [currentText, setCurrentText] = useState("")
  const [progress, setProgress] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0)
  const [timer, setTimer] = useState(0)
  const [bestScore, setBestScore] = useState(8)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationRef = useRef<number>()

  // 模拟语音识别和计数
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
        // 模拟随机识别文本
        const words = currentTwister.content.split("，")
        const randomWord = words[Math.floor(Math.random() * words.length)]
        setCurrentText(randomWord)

        // 模拟计数增加
        if (Math.random() > 0.7) {
          setCount((prev) => prev + 1)
          setProgress((prev) => Math.min(prev + 10, 100))
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, currentTwister])

  // 音频可视化
  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream)

      analyserRef.current.fftSize = 256
      const bufferLength = analyserRef.current.frequencyBinCount
      dataArrayRef.current = new Uint8Array(bufferLength)

      microphoneRef.current.connect(analyserRef.current)

      const updateAudioLevel = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current)
          const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length
          setAudioLevel(average)
        }
        animationRef.current = requestAnimationFrame(updateAudioLevel)
      }
      updateAudioLevel()
    } catch (error) {
      console.error("Error accessing microphone:", error)
    }
  }

  const stopAudioVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    setAudioLevel(0)
  }

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false)
      stopAudioVisualization()
    } else {
      setIsRecording(true)
      startAudioVisualization()
    }
  }

  const resetPractice = () => {
    setIsRecording(false)
    setCount(0)
    setCurrentText("")
    setProgress(0)
    setTimer(0)
    stopAudioVisualization()
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">绕口令练习</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <History className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-blue-600">{count}</div>
              <div className="text-xs text-gray-500">完成次数</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-green-600">{formatTime(timer)}</div>
              <div className="text-xs text-gray-500">练习时间</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-orange-600">{bestScore}</div>
              <div className="text-xs text-gray-500">最佳记录</div>
            </CardContent>
          </Card>
        </div>

        {/* 绕口令选择 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">选择绕口令</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tongueTwisters.map((twister) => (
              <div
                key={twister.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  currentTwister.id === twister.id
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setCurrentTwister(twister)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{twister.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{twister.content}</div>
                  </div>
                  <Badge className={`${twister.color} text-white`} variant="secondary">
                    {twister.difficulty}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 语音可视化 */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              {/* 音频波形 */}
              <div className="flex items-center justify-center space-x-1 h-16">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-t from-purple-500 to-pink-500 rounded-full transition-all duration-100"
                    style={{
                      width: "4px",
                      height: `${Math.max(4, (audioLevel / 255) * 60 + Math.random() * 20)}px`,
                      opacity: isRecording ? 0.8 : 0.3,
                    }}
                  />
                ))}
              </div>

              {/* 当前识别文本 */}
              <div className="min-h-[60px] flex items-center justify-center">
                <div className="text-lg font-medium text-gray-700 bg-white rounded-lg px-4 py-2 shadow-sm">
                  {currentText || "准备开始练习..."}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 进度条 */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>练习进度</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 控制按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={toggleRecording}
            className={`flex-1 h-14 text-lg font-medium ${
              isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="mr-2 h-6 w-6" />
                停止录音
              </>
            ) : (
              <>
                <Mic className="mr-2 h-6 w-6" />
                开始练习
              </>
            )}
          </Button>

          <Button onClick={resetPractice} variant="outline" className="h-14 px-6">
            <RotateCcw className="h-6 w-6" />
          </Button>
        </div>

        {/* 练习提示 */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Volume2 className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <div className="font-medium mb-1">练习提示</div>
                <div>保持清晰发音，语速可以逐渐加快。系统会自动识别您的语音并计算完成次数。</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 历史记录预览 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Trophy className="mr-2 h-5 w-5 text-yellow-500" />
              今日练习
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">四是四</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">12次</Badge>
                  <span className="text-xs text-gray-500">2分钟前</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">红凤凰</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">8次</Badge>
                  <span className="text-xs text-gray-500">10分钟前</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
