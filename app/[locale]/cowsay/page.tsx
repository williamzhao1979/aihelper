"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, RefreshCw, Heart, ImageIcon, Type, Sparkles } from "lucide-react"
import FeatureMenu from "@/components/feature-menu"

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
  const [conversionProgress, setConversionProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 收藏区展开收缩状态
  const [showFavorites, setShowFavorites] = useState(false)

  // ASCII结果全屏显示状态
  const [showAsciiFull, setShowAsciiFull] = useState(false)

  // ASCII全屏字体大小状态
  const [asciiFontSize, setAsciiFontSize] = useState(14); // px

  // ASCII结果区字体大小状态（与全屏共用）
  const [resultFontSize, setResultFontSize] = useState(14); // px

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

  // 真实的图片转ASCII转换
  const convertImageToAscii = (imageData: string) => {
    setIsConverting(true)
    setAsciiResult("")

    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        setIsConverting(false)
        setAsciiResult("转换失败：无法创建Canvas上下文")
        return
      }

      // 设置输出尺寸
      const maxWidth = 80
      const aspectRatio = img.height / img.width
      const outputWidth = Math.min(maxWidth, img.width)
      const outputHeight = Math.floor(outputWidth * aspectRatio * 0.5) // 0.5是字符高宽比调整

      // 设置canvas尺寸
      canvas.width = outputWidth
      canvas.height = outputHeight

      // 绘制图片到canvas
      ctx.drawImage(img, 0, 0, outputWidth, outputHeight)

      // 获取像素数据
      const imageDataObj = ctx.getImageData(0, 0, outputWidth, outputHeight)
      const pixels = imageDataObj.data

      // ASCII字符集（从亮到暗）
      const asciiChars = " .:-=+*#%@"

      let result = ""
      let currentRow = 0

      // 流式处理函数
      const processRows = () => {
        const rowsPerBatch = 2 // 每批处理2行
        const endRow = Math.min(currentRow + rowsPerBatch, outputHeight)

        for (let y = currentRow; y < endRow; y++) {
          let rowString = ""
          for (let x = 0; x < outputWidth; x++) {
            const pixelIndex = (y * outputWidth + x) * 4
            const r = pixels[pixelIndex]
            const g = pixels[pixelIndex + 1]
            const b = pixels[pixelIndex + 2]

            // 计算亮度 (使用标准亮度公式)
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255

            // 映射到ASCII字符
            const charIndex = Math.floor((1 - brightness) * (asciiChars.length - 1))
            rowString += asciiChars[charIndex]
          }
          result += rowString + "\n"
        }

        // 更新显示结果
        setAsciiResult(result)

        // 在 processRows 函数中添加进度计算
        const progress = Math.floor((currentRow / outputHeight) * 100)
        setConversionProgress(progress)

        currentRow = endRow

        // 继续处理下一批或完成
        if (currentRow < outputHeight) {
          setTimeout(processRows, 50) // 50ms延迟，创造流式效果
        } else {
          setIsConverting(false)
        }
      }

      // 开始流式处理
      processRows()
    }

    img.onerror = () => {
      setIsConverting(false)
      setAsciiResult("转换失败：无法加载图片")
    }

    img.src = imageData
  }

  // 语言切换
  const switchLanguage = (lang: string) => {
    setCurrentLang(lang)
    const langQuotes = quotes.filter((q) => q.lang === lang)
    const randomQuote = langQuotes[Math.floor(Math.random() * langQuotes.length)]
    setCurrentQuote(randomQuote)
  }

  // 默认ASCII转换结果
  const defaultAsciiResult = `  
................................................................................
................................................................................
................................................................................
................................................................................
................................................................................
................................................................................
.......................................=========-:..............................
....................................-**#*******#####++ .........................
.........................*##########*###########***#*##*=.......................
......................:+#########***################*****=......................
.....................*##########*******#################**=.....................
...................################*#***#****#*#****######*.....................
...............:+######%%%%%%%%%################*******###*=-:..................
...........-+*##%##%%#%%%%%%%%%%%%%%%%%%#%%%###############+#*+:................
...........=*##%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%########%%%%#*##****:..............
............-*###%%##%%%%%*+++++++++++*###%%%#%%**=:::::=#%###****..............
............ =*######%%%*+++=======--------:::::::.......=#%##**#*..............
............. +*####%%%#++======-------::::::::...........#%##***...............
............ .=*###%%%%*+======-------:::::::::...........-%%#***...............
............. .+*###%%%*+======------:::::::::::...........%%#**:...............
........      .=*###%%#+=======---*######*...:.:...........%%#*=................
.. .           :*###%%#=====+*%%%%##%%%%%*::::=%#########=:+%##-   .............
               .=*#%%%#====**+===========--:::-**+-:::::-+:.%#+:     ...........
                -*#%%#=========*-...-+====--:::---....++::::%#=         ........
          ..=+++**#%%#=======-:..%#%#-:====-..::-###%  .:::.%*-:.         ......
         .-=++++++##%*========:..#%%#+.====-:::-=#%%#   :-:..*::::.          ...
        .==+++++++*#%-========---.-:.::====-:::::-=-::.....::*:--::          ...
        .=+++++++++#%-=====---==---::-=====-::::::--::::...:..:---::            
        .=+++++++++#+-=====---:::::---=====--:::::::::::....::::-::.            
        .=+++++++=++--=====----::::---=====--:::::::::::....::::-::.            
         :=++++*+=++--======----::---=+====-::...::::::.....:.:--::             
          -=++++++++--=======------===++===--::::::::::::..:::::::              
           .==++++++-==================+++++==--::...::--::::::::               
             .===+++-=======---=+==========--::......::::::::::.                
                 .-+--======----=+#+=++====-------::+....:::::.                 
                     ========----===+***++=====+#+=:.....:::::                  
                     .=========-----=====---:::..:.......:::::                  
                      .===========----------::::.......::::::                   
                       .============------::::::......::::::                    
                         .=++++=======----::::::....:::::-.                     
                       .=*#=++++++======----:::::::::::-:                       
                    -#+:-+%++++++++++=====-----:::::-:.                         
                   =##-::--=+++++++++++++======---:.                            
                  +###*--------=++++++++++==---:::.                             
                .+#####*-----------=+++===--::::=+.                             
               +########*=--:::::::::::.:::::::-=.  -=.                         
             *############=--:::::::......  :-*:*-   ##**:                      
         :+#################--::::....... .=#=**###:  %#****+.                  
     --#####################*=:::.........+#*+**+***: .##*******=:              
 .+*#########################*=::........####=**+*##*- -##**********+:          
#################********#*####=-:..... +*####*#**++**- =##*************:       
#################**********######.-:.. .:-+*####++++.:-::*#***************:     
###########****######%%##****#####=.......:=+*###*+.    .-##***************-    
#######*************####*******##**=       :++##*=**.    .=%#***************-   
######*************###**************+.     .==#+*++-=:    :*#****************.  
###*##***********###******************.    .-*#+#*+**#=   .=##*************#*-  
####*##**********##%*******************.    .*#+*#*+**#=   :+%************##**. 
#####**####*******####******************+    =****+-+=-+.  .=##**********###*#- 
#######*######*****###%#*****************+   .#+++++*:*++.  :+#**********##**#* 
###############*****###%#****************=.  --*++**.**=:  .=##********####**#.
################******###%#****************+.  #*+++*-*++-.  :*#********#######*
##################*#**######*****************. :+++=*=*=+++  :+#********##%*####
##################**#**#######**************** .###++*****-* .=##******#*#######
################################***************.=#=+:*:+=++: .-*#*********######
############%#%################%#**************+:*+*+++=++=*-.-+#********#######
#############%%%#################%#*************#####=*-*+*+*.-+#*******########
#############%%%%###################**************###*#+-=++*=-+#*****##########
############%%%%%#####################******##*****#*#+*=*-*-+=*#****###########
############%%%%%%####################%#########**##**##++=++*+*#****=*=+#:-=###
############%%%%%%%####################%##########*##.##***.*+#*#***#####%######
############%%%%%%%######################%#########*###++##+**###***####%#######
`

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
                <pre className="whitespace-pre">{currentAscii.content}</pre>
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
              <div className="flex flex-col md:flex-row gap-4">
                {/* 上传区 */}
                <div className="flex-1 min-w-0">
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
                </div>
                {/* 原始图片预览 */}
                <div className="flex-1 min-w-0 flex flex-col items-center">
                  <h4 className="flex items-center gap-2 font-semibold mb-3 mt-2 md:mt-0">
                    <ImageIcon className="w-4 h-4" />
                    原始图片预览
                  </h4>
                  <div className="bg-gray-100 rounded-lg h-48 w-full flex items-center justify-center overflow-hidden">
                    {uploadedImage ? (
                      <img
                        src={uploadedImage || "/daddy2.png"}
                        alt="上传的图片"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <img
                        src="/daddy2.png"
                        alt="示例图片"
                        className="max-w-full max-h-full object-contain opacity-50"
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* ASCII结果区和进度条 */}
              <div className="mt-6">
                <h4 className="flex items-center gap-2 font-semibold mb-3">
                  <Type className="w-4 h-4" />
                  ASCII转换结果
                </h4>
                {isConverting && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>转换进度</span>
                      <span>{conversionProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${conversionProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs leading-tight mt-2 overflow-x-auto relative">
                  {isConverting ? (
                    <div className="flex items-center justify-center min-h-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-2 left-2 flex gap-2 z-10">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-300 border border-green-300 px-2"
                          onClick={() => setAsciiFontSize(f => Math.max(8, f - 2))}
                          title="缩小"
                        >
                          A-
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-300 border border-green-300 px-2"
                          onClick={() => setAsciiFontSize(f => Math.min(32, f + 2))}
                          title="放大"
                        >
                          A+
                        </Button>
                      </div>
                      <pre
                        className="whitespace-pre min-w-max" id="ascii-result-pre"
                        style={{ fontSize: asciiFontSize }}
                      >
                        {asciiResult || defaultAsciiResult}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 text-green-300 hover:text-green-500 border border-green-300"
                        onClick={() => {
                          const text = asciiResult || defaultAsciiResult;
                          navigator.clipboard.writeText(text.replace(/\\n/g, '\n'));
                        }}
                        title="拷贝到剪贴板"
                      >
                        复制
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-16 text-blue-300 hover:text-blue-500 border border-blue-300"
                        onClick={() => setShowAsciiFull(true)}
                        title="全屏显示ASCII"
                      >
                        全屏
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => {
                      const ascii = asciiResult || defaultAsciiResult;
                      const favorite = {
                        id: "fav_" + Date.now(),
                        ascii,
                        quote: "图片转ASCII收藏",
                        author: "图片上传",
                        timestamp: new Date().toISOString(),
                      };
                      const saved = localStorage.getItem("asciiFavorites");
                      const favs = saved ? JSON.parse(saved) : [];
                      favs.push(favorite);
                      localStorage.setItem("asciiFavorites", JSON.stringify(favs));
                      setFavorites([...favs]);
                    }}
                    variant="outline"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                    disabled={isConverting}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    保存到收藏
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 收藏展示 */}
        <Card className="bg-white/95 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700 cursor-pointer select-none" onClick={() => setShowFavorites(v => !v)}>
              <Heart className="w-5 h-5" />
              我的收藏 ({favorites.length})
              <span className="ml-2 text-base">{showFavorites ? '▼' : '▲'}</span>
              {favorites.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4 border-red-300 text-red-600 hover:bg-red-50"
                  onClick={e => {
                    e.stopPropagation();
                    setFavorites([]);
                    localStorage.removeItem("asciiFavorites");
                  }}
                >
                  清除所有
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          {showFavorites && favorites.length > 0 && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.slice(-6).map((fav, index) => (
                  <div key={fav.id} className="bg-gray-50 rounded-lg p-4 relative">
                    <h4 className="font-semibold mb-2">收藏 #{favorites.length - index}</h4>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                      title="删除此收藏"
                      onClick={() => {
                        const newFavs = favorites.filter(f => f.id !== fav.id);
                        setFavorites(newFavs);
                        localStorage.setItem("asciiFavorites", JSON.stringify(newFavs));
                      }}
                    >
                      ×
                    </Button>
                    <div className="bg-gray-900 text-green-400 p-2 rounded font-mono text-xs mb-2 max-h-32 overflow-hidden">
                      <pre className="whitespace-pre-wrap">{fav.ascii}</pre>
                    </div>
                    <p className="text-sm text-gray-600 italic">"{fav.quote}"</p>
                    <p className="text-xs text-purple-600 font-semibold">- {fav.author}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-white/70">
          <p className="text-sm">🎨 Cowsay ASCII艺术生成器 - 让文字变得更有趣！</p>
        </div>
        <FeatureMenu />

        {/* ASCII全屏显示弹窗 */}
        {showAsciiFull && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
            <div className="absolute top-0 left-0 w-full h-full" onClick={() => setShowAsciiFull(false)}></div>
            <div className="relative z-10 w-full max-w-5xl mx-4 flex flex-col items-center justify-center">
              <div
                className="bg-gray-900 text-green-400 rounded-lg p-2 md:p-6 font-mono leading-tight overflow-auto shadow-2xl relative flex flex-col items-center"
                style={{
                  maxHeight: '90vh',
                  minHeight: '40vh',
                  width: '100%',
                  minWidth: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 text-white hover:text-red-400 border border-white"
                  onClick={() => setShowAsciiFull(false)}
                  title="关闭全屏"
                >
                  关闭
                </Button>
                <div className="absolute top-2 left-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white border border-white px-2"
                    onClick={() => setAsciiFontSize(f => Math.max(8, f - 2))}
                    title="缩小"
                  >
                    A-
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white border border-white px-2"
                    onClick={() => setAsciiFontSize(f => Math.min(32, f + 2))}
                    title="放大"
                  >
                    A+
                  </Button>
                </div>
                <pre
                  className="whitespace-pre min-w-0 w-full text-center"
                  style={{
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    overflow: 'auto',
                    maxHeight: '80vh',
                    fontSize: asciiFontSize,
                  }}
                >
                  {asciiResult || defaultAsciiResult}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
