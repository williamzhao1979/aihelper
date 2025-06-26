"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, RefreshCw, Heart, ImageIcon, Type, Sparkles } from "lucide-react"

// ASCII艺术数据库
const asciiArts = [
  {
    id: "cow1",
    name: "经典奶牛",
    content: `    _______
< Hello! >
 -------
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`,
    category: "animal",
  },
  {
    id: "dragon",
    name: "巨龙",
    content: `      \\
       \\      /\\
        \\    /  \\
         \\  /    \\
          \\/      \\
          |        |
          |        |
          |________|
         /          \\`,
    category: "fantasy",
  },
  {
    id: "cat",
    name: "小猫",
    content: `  /\\_/\\
 ( o.o )
  > ^ <
 /     \\
(_______)`,
    category: "animal",
  },
  {
    id: "rabbit",
    name: "兔子",
    content: `   /|   /|
  (  :v:  )
   |(_)|
   -----`,
    category: "animal",
  },
  {
    id: "dog",
    name: "小狗",
    content: `     __
    /  \\
   /    \\
  | (oo) |
   \\____/
    |  |
    |  |`,
    category: "animal",
  },
  {
    id: "elephant",
    name: "大象",
    content: `     __     __
    /  \\~~~~/  \\
   /            \\
  |  (  )  (  )  |
   \\              /
    \\____________/`,
    category: "animal",
  },
]

// 励志名言库
const quotes = [
  { text: "成功不是终点，失败不是末日：真正重要的是继续前进的勇气。", author: "温斯顿·丘吉尔", lang: "zh" },
  { text: "人生不是等待暴风雨过去，而是学会在雨中跳舞。", author: "维维安·格林", lang: "zh" },
  { text: "你今天的努力，是幸运的伏笔。", author: "佚名", lang: "zh" },
  { text: "不要等待机会，而要创造机会。", author: "乔治·萧伯纳", lang: "zh" },
  { text: "成功的秘诀在于坚持自己的目标。", author: "本杰明·迪斯雷利", lang: "zh" },
  {
    text: "Success is not final, failure is not fatal: It is the courage to continue that counts.",
    author: "Winston Churchill",
    lang: "en",
  },
  {
    text: "Life isn't about waiting for the storm to pass, it's about learning to dance in the rain.",
    author: "Vivian Greene",
    lang: "en",
  },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", lang: "en" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", lang: "en" },
  {
    text: "成功は終わりではなく、失敗は致命的ではない：大切なのは続ける勇気である。",
    author: "ウィンストン・チャーチル",
    lang: "ja",
  },
  {
    text: "人生は嵐が過ぎるのを待つことではなく、雨の中で踊ることを学ぶことです。",
    author: "ヴィヴィアン・グリーン",
    lang: "ja",
  },
]

interface Favorite {
  id: string
  ascii: string
  quote: string
  author: string
  timestamp: string
}

export default function CowsayPage() {
  const [currentAscii, setCurrentAscii] = useState(asciiArts[0])
  const [currentQuote, setCurrentQuote] = useState(quotes[0])
  const [currentLang, setCurrentLang] = useState("zh")
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [asciiResult, setAsciiResult] = useState<string>("")
  const [isConverting, setIsConverting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 加载收藏
  useEffect(() => {
    const savedFavorites = localStorage.getItem("asciiFavorites")
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  // 生成随机ASCII艺术
  const generateRandomAscii = () => {
    const randomAscii = asciiArts[Math.floor(Math.random() * asciiArts.length)]
    const langQuotes = quotes.filter((q) => q.lang === currentLang)
    const randomQuote = langQuotes[Math.floor(Math.random() * langQuotes.length)]

    setCurrentAscii(randomAscii)
    setCurrentQuote(randomQuote)
  }

  // 保存到收藏
  const saveToFavorites = () => {
    const favorite: Favorite = {
      id: "fav_" + Date.now(),
      ascii: currentAscii.content,
      quote: currentQuote.text,
      author: currentQuote.author,
      timestamp: new Date().toISOString(),
    }

    const newFavorites = [...favorites, favorite]
    setFavorites(newFavorites)
    localStorage.setItem("asciiFavorites", JSON.stringify(newFavorites))
  }

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setUploadedImage(result)
        convertImageToAscii(result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 模拟图片转ASCII
  const convertImageToAscii = (imageData: string) => {
    setIsConverting(true)
    setAsciiResult("转换中...")

    // 模拟转换过程
    setTimeout(() => {
      const mockAscii = `          ,   ,  
           \\\\ \\\\ 
            ) \\\\ \\    _p_
           /   \\)  /     \\ 
          (     || /       \\ 
           \\    ||/         \\ 
            \\_   |/          | 
              \\__/          / 
               |          _/ 
               |         / 
                \\       / 
                 |     / 
                 |    |`

      setAsciiResult(mockAscii)
      setIsConverting(false)
    }, 2000)
  }

  // 语言切换
  const switchLanguage = (lang: string) => {
    setCurrentLang(lang)
    const langQuotes = quotes.filter((q) => q.lang === lang)
    const randomQuote = langQuotes[Math.floor(Math.random() * langQuotes.length)]
    setCurrentQuote(randomQuote)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl animate-pulse">🐄</div>
              <h1 className="text-3xl font-bold text-white">Cowsay 生成器</h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={generateRandomAscii} className="bg-purple-600 hover:bg-purple-700 text-white">
                <RefreshCw className="w-4 h-4 mr-2" />
                随机生成
              </Button>

              <div className="flex bg-white/20 rounded-lg p-1">
                {["中文", "English", "日本語"].map((lang, index) => (
                  <button
                    key={lang}
                    onClick={() => switchLanguage(["zh", "en", "ja"][index])}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      currentLang === ["zh", "en", "ja"][index]
                        ? "bg-white/30 text-white font-bold"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ASCII艺术显示区 */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Sparkles className="w-5 h-5" />
                随机ASCII艺术
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm leading-tight overflow-x-auto">
                <pre className="whitespace-pre-wrap">{currentAscii.content}</pre>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-purple-500">
                <p className="text-gray-700 italic text-lg mb-2">"{currentQuote.text}"</p>
                <p className="text-purple-600 font-semibold text-right">- {currentQuote.author}</p>
              </div>

              <div className="flex justify-center mt-4">
                <Button
                  onClick={saveToFavorites}
                  variant="outline"
                  className="border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Heart className="w-4 h-4 mr-2" />
                  保存到收藏
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 图片上传区 */}
          <Card className="bg-white/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <ImageIcon className="w-5 h-5" />
                图片转ASCII艺术
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="border-3 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-blue-600 mb-2">上传图片转换为ASCII艺术</h3>
                <p className="text-gray-600">点击或拖放图片文件到此处</p>
                <p className="text-sm text-gray-500 mt-1">(支持 JPG, PNG, 最大10MB)</p>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* 图片预览和ASCII结果 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <h4 className="flex items-center gap-2 font-semibold mb-3">
                    <ImageIcon className="w-4 h-4" />
                    原始图片预览
                  </h4>
                  <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center overflow-hidden">
                    {uploadedImage ? (
                      <img
                        src={uploadedImage || "/placeholder.svg"}
                        alt="上传的图片"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <img
                        src="https://images.unsplash.com/photo-1535435734705-4f0f32e27c83?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80"
                        alt="示例图片"
                        className="max-w-full max-h-full object-contain opacity-50"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="flex items-center gap-2 font-semibold mb-3">
                    <Type className="w-4 h-4" />
                    ASCII转换结果
                  </h4>
                  <div className="bg-gray-900 text-green-400 rounded-lg h-48 p-3 font-mono text-xs leading-tight overflow-auto">
                    {isConverting ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap">
                        {asciiResult ||
                          `  ..';:cccccccccccc:;,..                  
.cKNNNNNNNNNNNNNNNNNNNN0l.               
:0WNNNNNNNNNNNNNNNNNNNNNNXo.             
'kNNNNNNNNNNNNNNNNNNNNNNNNNk.            
.;KNNNNNNNNNNNNNNNNNNNNNNNNN0,           
..xNNNNNNNNNNNNNNNNNNNNNNNNNNXc          
..lNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.        
..;0NNNNNNNNNNNNNNNNNNNNNNNNNNNNk.       
...xWNNNNNNNNNNNNNNNNNNNNNNNNNNNNx.      
...oWNNNNNNNNNNNNNNNNNNNNNNNNNNNk.     
...:KNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN0,    
....dNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNx.   
....lNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNd.  
....,0NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNk. 
.....xWNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNx.`}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 收藏展示 */}
        {favorites.length > 0 && (
          <Card className="bg-white/95 backdrop-blur-sm mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Heart className="w-5 h-5" />
                我的收藏 ({favorites.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.slice(-6).map((fav, index) => (
                  <div key={fav.id} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">收藏 #{favorites.length - index}</h4>
                    <div className="bg-gray-900 text-green-400 p-2 rounded font-mono text-xs mb-2 max-h-32 overflow-hidden">
                      <pre className="whitespace-pre-wrap">{fav.ascii}</pre>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{fav.quote}"</p>
                    <p className="text-xs text-purple-600 font-semibold">- {fav.author}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-white/70">
          <p className="text-sm">🎨 Cowsay ASCII艺术生成器 - 让文字变得更有趣！</p>
        </div>
      </div>
    </div>
  )
}
