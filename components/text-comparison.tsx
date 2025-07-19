import React, { useState } from 'react'
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"

interface TextComparisonProps {
  originalText: string
  optimizedText: string
  title?: string
}

// 简单的文本对比算法 - 基于词汇级别的差异检测
const getTextDifferences = (original: string, optimized: string) => {
  const originalWords = original.split(/(\s+|[，。！？；：""''（）【】「」『』、])/).filter(word => word.trim())
  const optimizedWords = optimized.split(/(\s+|[，。！？；：""''（）【】「」『』、])/).filter(word => word.trim())
  
  const result = {
    original: [] as Array<{ text: string; type: 'same' | 'removed' | 'changed' }>,
    optimized: [] as Array<{ text: string; type: 'same' | 'added' | 'changed' }>
  }

  let i = 0, j = 0
  
  while (i < originalWords.length || j < optimizedWords.length) {
    if (i >= originalWords.length) {
      // 优化文本还有剩余 - 新增内容
      result.optimized.push({ text: optimizedWords[j], type: 'added' })
      j++
    } else if (j >= optimizedWords.length) {
      // 原文还有剩余 - 删除内容
      result.original.push({ text: originalWords[i], type: 'removed' })
      i++
    } else if (originalWords[i] === optimizedWords[j]) {
      // 相同内容
      result.original.push({ text: originalWords[i], type: 'same' })
      result.optimized.push({ text: optimizedWords[j], type: 'same' })
      i++
      j++
    } else {
      // 寻找下一个匹配点
      let foundMatch = false
      
      // 在后续的optimized中查找当前original词
      for (let k = j + 1; k < Math.min(j + 5, optimizedWords.length); k++) {
        if (originalWords[i] === optimizedWords[k]) {
          // 找到匹配，中间的是新增内容
          for (let l = j; l < k; l++) {
            result.optimized.push({ text: optimizedWords[l], type: 'added' })
          }
          result.original.push({ text: originalWords[i], type: 'same' })
          result.optimized.push({ text: optimizedWords[k], type: 'same' })
          i++
          j = k + 1
          foundMatch = true
          break
        }
      }
      
      if (!foundMatch) {
        // 在后续的original中查找当前optimized词
        for (let k = i + 1; k < Math.min(i + 5, originalWords.length); k++) {
          if (optimizedWords[j] === originalWords[k]) {
            // 找到匹配，中间的是删除内容
            for (let l = i; l < k; l++) {
              result.original.push({ text: originalWords[l], type: 'removed' })
            }
            result.original.push({ text: originalWords[k], type: 'same' })
            result.optimized.push({ text: optimizedWords[j], type: 'same' })
            i = k + 1
            j++
            foundMatch = true
            break
          }
        }
      }
      
      if (!foundMatch) {
        // 没找到匹配，标记为改变
        result.original.push({ text: originalWords[i], type: 'changed' })
        result.optimized.push({ text: optimizedWords[j], type: 'changed' })
        i++
        j++
      }
    }
  }
  
  return result
}

const TextComparison: React.FC<TextComparisonProps> = ({ originalText, optimizedText, title }) => {
  const [showDifferences, setShowDifferences] = useState(false)
  
  const differences = React.useMemo(() => {
    return getTextDifferences(originalText, optimizedText)
  }, [originalText, optimizedText])
  
  const renderHighlightedText = (
    segments: Array<{ text: string; type: 'same' | 'removed' | 'added' | 'changed' }>,
    isOriginal: boolean
  ) => {
    return segments.map((segment, index) => {
      let className = ''
      let title = ''
      
      if (segment.type === 'same') {
        className = 'text-gray-700'
      } else if (segment.type === 'removed') {
        className = 'bg-red-100 text-red-800 line-through'
        title = '删除的内容'
      } else if (segment.type === 'added') {
        className = 'bg-green-100 text-green-800'
        title = '新增的内容'
      } else if (segment.type === 'changed') {
        className = isOriginal ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
        title = isOriginal ? '原始内容' : '修改后内容'
      }
      
      return (
        <span key={index} className={className} title={title}>
          {segment.text}
        </span>
      )
    })
  }
  
  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      )}
      
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="show-differences"
          checked={showDifferences}
          onCheckedChange={(checked) => setShowDifferences(checked as boolean)}
        />
        <label
          htmlFor="show-differences"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          高亮显示优化对比
        </label>
      </div>
      
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
              📄 原文
              {showDifferences && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 bg-red-100 border border-red-200 rounded"></span>
                  <span className="text-red-700">删除</span>
                  <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-200 rounded ml-1"></span>
                  <span className="text-yellow-700">修改</span>
                </div>
              )}
            </h4>
            <div className="text-sm leading-relaxed">
              {showDifferences ? (
                <div className="whitespace-pre-wrap">
                  {renderHighlightedText(differences.original, true)}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-700">
                  {originalText}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
              📝 优化
              {showDifferences && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-block w-3 h-3 bg-green-100 border border-green-200 rounded"></span>
                  <span className="text-green-700">新增</span>
                  <span className="inline-block w-3 h-3 bg-blue-100 border border-blue-200 rounded ml-1"></span>
                  <span className="text-blue-700">修改</span>
                </div>
              )}
            </h4>
            <div className="text-sm leading-relaxed">
              {showDifferences ? (
                <div className="whitespace-pre-wrap">
                  {renderHighlightedText(differences.optimized, false)}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-gray-700">
                  {optimizedText}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TextComparison
