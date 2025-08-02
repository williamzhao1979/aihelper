'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, MoreHorizontal } from 'lucide-react';
import MultiTextEdit from './multi-text-edit';
import URLExtractionModal from './url-extraction-modal';
import MultiURLExtractor from './multi-url-extractor';
import ArtCritiqueModal from './art-critique-modal';
import MultiArtCritique from './multi-art-critique';
import TextComparison from './text-comparison';
import MoreToolsPanel from './more-tools-panel';
import type { ToolItem } from './more-tools-panel';
import Link from 'next/link';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  type?: 'normal' | 'text-edit-result' | 'url-extraction-result' | 'art-critique-result';
  data?: any;
}

// 文件大小格式化函数
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// 图片预览组件
const ImagePreviewGrid = ({ images, onImageClick }: { images: any[], onImageClick?: (image: any) => void }) => {
  if (!images || images.length === 0) return null;
  
  return (
    <div className="my-3">
      <div className="text-xs text-gray-600 mb-2 font-medium">📷 处理图片 ({images.length}张)</div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md">
        {images.map((img: any, index: number) => (
          <div key={img.id || index} className="relative group">
            <div 
              className="aspect-square bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:ring-2 hover:ring-purple-300 transition-all"
              onClick={() => onImageClick?.(img)}
              title="点击查看大图"
            >
              <img
                src={img.preview}
                alt={img.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              {index + 1}
            </div>
            <div className="mt-1 text-xs text-gray-500 truncate" title={img.name}>
              {img.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// URL提取结果显示组件
const URLExtractionResultDisplay = ({ result, onImageClick }: { result: any, onImageClick?: (image: any) => void }) => {
  if (result.type === 'url-extraction-processing') {
    // 处理中状态
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="font-semibold text-blue-700">URL提取处理中</span>
          {result.instanceId && (
            <Badge variant="outline" className="text-xs">
              实例: {result.instanceId.slice(-8)}
            </Badge>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
          <div><strong>图片数量：</strong>{result.imageCount} 张</div>
          <div><strong>处理方式：</strong>{result.processingType}</div>
          <div><strong>状态：</strong>正在处理中，请稍候...</div>
          {result.sessionId && (
            <div className="text-xs text-blue-600">
              <strong>会话ID：</strong>{result.sessionId.slice(-12)}
            </div>
          )}
          
          {result.estimatedTime && (
            <>
              <div><strong>预计时间：</strong>约 {result.estimatedTime} 秒
                {result.estimatedTime > 60 && (
                  <span className="text-blue-600 ml-1">
                    ({Math.floor(result.estimatedTime / 60)}分{result.estimatedTime % 60}秒)
                  </span>
                )}
              </div>
              {result.estimatedExplanation && (
                <div className="text-xs text-blue-600"><strong>预估依据：</strong>{result.estimatedExplanation}</div>
              )}
            </>
          )}
        </div>
        
        {result.imagePreview && <ImagePreviewGrid images={result.imagePreview} onImageClick={onImageClick} />}
      </div>
    )
  }

  if (!result.success) {
    // 失败状态
    return (
      <div className="text-red-600">
        ❌ URL提取处理失败：{result.error || '未知错误'}
        {result.instanceId && (
          <div className="text-xs mt-1">
            实例: {result.instanceId.slice(-8)}
          </div>
        )}
      </div>
    )
  }

  // 成功状态
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-green-600">✅</span>
        <span className="font-semibold text-green-700">URL提取完成</span>
        <span className="text-sm text-gray-600">
          ({result.results?.length || 0} 张图片)
        </span>
        {result.instanceId && (
          <Badge variant="outline" className="text-xs">
            实例: {result.instanceId.slice(-8)}
          </Badge>
        )}
      </div>

      {/* 处理时间信息 */}
      {result.actualProcessingTime && result.estimatedTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>实际处理时间：</strong>{result.actualProcessingTime}秒
            </div>
            <div>
              <strong>预估准确度：</strong>{100 - (result.timeAccuracy || 0)}%
            </div>
          </div>
          {result.sessionId && (
            <div className="text-xs text-gray-500 mt-2">
              会话ID: {result.sessionId.slice(-12)}
            </div>
          )}
        </div>
      )}

      {/* 图片预览 - 在结果完成后也显示 */}
      {result.imagePreview && <ImagePreviewGrid images={result.imagePreview} onImageClick={onImageClick} />}

      {/* URL提取结果 */}
      {result.results && result.results.length > 0 && (
        <div className="space-y-6">
          {result.results.map((item: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-4 text-gray-800">
                📷 图片 {index + 1}：{item.imageName}
              </h4>
              
{item.success && (item.urls?.length > 0 || item.emails?.length > 0) ? (
                <div className="space-y-4">
                  {/* URL 部分 */}
                  {item.urls && item.urls.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h5 className="font-semibold mb-2 text-green-800">🔗 提取到的URL ({item.urls.length}个)</h5>
                      <div className="space-y-2">
                        {item.urls.map((url: string, urlIndex: number) => (
                          <div key={urlIndex} className="bg-white rounded p-2 border break-all">
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                            >
                              {url}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 邮箱地址部分 */}
                  {item.emails && item.emails.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <h5 className="font-semibold mb-2 text-orange-800">📧 提取到的邮箱地址 ({item.emails.length}个)</h5>
                      <div className="space-y-2">
                        {item.emails.map((email: string, emailIndex: number) => (
                          <div key={emailIndex} className="bg-white rounded p-2 border break-all">
                            <a 
                              href={`mailto:${email}`}
                              className="text-orange-600 hover:text-orange-800 hover:underline text-sm"
                            >
                              {email}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {item.text && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="font-semibold mb-2 text-gray-800">📝 识别的文本内容</h5>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded p-2 border">
                        {item.text}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 先显示识别的文本内容（如果有的话） */}
                  {item.text && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="font-semibold mb-2 text-gray-800">📝 识别的文本内容</h5>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded p-2 border">
                        {item.text}
                      </div>
                    </div>
                  )}
                  
                  {/* 然后显示未发现URL或邮箱的提示 */}
                  <div className="text-amber-600">
                    ⚠️ {item.error || '未在此图片中发现URL或邮箱地址'}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* 汇总所有URL和邮箱地址 */}
          {(() => {
            const allUrls = result.results.reduce((acc: string[], item: any) => {
              if (item.success && item.urls) {
                return acc.concat(item.urls);
              }
              return acc;
            }, []);
            
            const allEmails = result.results.reduce((acc: string[], item: any) => {
              if (item.success && item.emails) {
                return acc.concat(item.emails);
              }
              return acc;
            }, []);
            
            const uniqueUrls: string[] = Array.from(new Set(allUrls));
            const uniqueEmails: string[] = Array.from(new Set(allEmails));
            
            return (uniqueUrls.length > 0 || uniqueEmails.length > 0) ? (
              <div className="space-y-4">
                {/* URL汇总 */}
                {uniqueUrls.length > 0 && (
                  <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="font-semibold mb-4 text-blue-800 flex items-center gap-2">
                      🌐 所有URL汇总 ({uniqueUrls.length}个唯一URL)
                    </h4>
                    <div className="space-y-2">
                      {uniqueUrls.map((url: string, index: number) => (
                        <div key={index} className="bg-white rounded p-3 border flex items-center justify-between">
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline text-sm break-all flex-1"
                          >
                            {url}
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 flex-shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(url);
                              // 这里可以添加复制成功的提示
                            }}
                          >
                            复制
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* 一键复制所有URL */}
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const urlText = uniqueUrls.join('\n');
                          navigator.clipboard.writeText(urlText);
                          // 这里可以添加复制成功的提示
                        }}
                      >
                        📋 复制所有URL
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* 邮箱地址汇总 */}
                {uniqueEmails.length > 0 && (
                  <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
                    <h4 className="font-semibold mb-4 text-orange-800 flex items-center gap-2">
                      📧 所有邮箱地址汇总 ({uniqueEmails.length}个唯一邮箱)
                    </h4>
                    <div className="space-y-2">
                      {uniqueEmails.map((email: string, index: number) => (
                        <div key={index} className="bg-white rounded p-3 border flex items-center justify-between">
                          <a 
                            href={`mailto:${email}`}
                            className="text-orange-600 hover:text-orange-800 hover:underline text-sm break-all flex-1"
                          >
                            {email}
                          </a>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 flex-shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(email);
                              // 这里可以添加复制成功的提示
                            }}
                          >
                            复制
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    {/* 一键复制所有邮箱地址 */}
                    <div className="mt-4 pt-3 border-t border-orange-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const emailText = uniqueEmails.join('\n');
                          navigator.clipboard.writeText(emailText);
                          // 这里可以添加复制成功的提示
                        }}
                      >
                        📋 复制所有邮箱地址
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* 综合汇总 - 一键复制所有URL和邮箱 */}
                {(uniqueUrls.length > 0 && uniqueEmails.length > 0) && (
                  <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                    <h4 className="font-semibold mb-4 text-purple-800 flex items-center gap-2">
                      🎯 综合汇总 ({uniqueUrls.length}个URL + {uniqueEmails.length}个邮箱)
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const combinedText = [
                          '=== URL地址 ===',
                          ...uniqueUrls,
                          '',
                          '=== 邮箱地址 ===',
                          ...uniqueEmails
                        ].join('\n');
                        navigator.clipboard.writeText(combinedText);
                        // 这里可以添加复制成功的提示
                      }}
                    >
                      📋 复制所有URL和邮箱地址
                    </Button>
                  </div>
                )}
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  )
};

// 文本编辑结果显示组件
const TextEditResultDisplay = ({ result, onImageClick }: { result: any, onImageClick?: (image: any) => void }) => {
  if (result.type === 'text-edit-processing') {
    // 处理中状态
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
          <span className="font-semibold text-purple-700">文章修改处理中</span>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm space-y-2">
          <div><strong>图片数量：</strong>{result.imageCount} 张</div>
          <div><strong>处理方式：</strong>{result.processingType}</div>
          <div><strong>状态：</strong>正在处理中，请稍候...</div>
          
          {result.estimatedTime && (
            <>
              <div><strong>预计时间：</strong>约 {result.estimatedTime} 秒
                {result.estimatedTime > 60 && (
                  <span className="text-purple-600 ml-1">
                    ({Math.floor(result.estimatedTime / 60)}分{result.estimatedTime % 60}秒)
                  </span>
                )}
              </div>
              {result.estimatedExplanation && (
                <div className="text-xs text-purple-600"><strong>预估依据：</strong>{result.estimatedExplanation}</div>
              )}
            </>
          )}
        </div>
        
        {result.imagePreview && <ImagePreviewGrid images={result.imagePreview} onImageClick={onImageClick} />}
      </div>
    )
  }

  if (!result.success) {
    // 失败状态
    return (
      <div className="text-red-600">
        ❌ 文章修改处理失败：{result.error || '未知错误'}
      </div>
    )
  }

  // 成功状态
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-green-600">✅</span>
        <span className="font-semibold text-green-700">文章修改完成</span>
        <span className="text-sm text-gray-600">
          ({result.merged ? result.result?.image_count || 1 : result.results?.length || 0} 张图片)
        </span>
      </div>

      {/* 处理时间信息 */}
      {result.actualProcessingTime && result.estimatedTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>实际处理时间：</strong>{result.actualProcessingTime}秒
            </div>
            <div>
              <strong>预估准确度：</strong>{100 - (result.timeAccuracy || 0)}%
            </div>
          </div>
        </div>
      )}

      {/* 合并处理结果 */}
      {result.merged && result.result && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-2">
              🌐 <strong>检测语言：</strong> {result.result.lang === 'zh' ? '中文' : result.result.lang}
            </div>
          </div>
          
          <TextComparison
            originalText={result.result.text || "未能识别到文本内容"}
            optimizedText={result.result.text_refined || result.result.text || "未能生成优化文本"}
          />
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="font-semibold mb-2 text-amber-800">✨ 建议</h4>
            <ul className="text-sm text-amber-700 space-y-1">
              {(result.result.advice || ["建议检查图片质量", "确保文字清晰可见"]).map((advice: string, index: number) => (
                <li key={index}>{index + 1}. {advice}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 单独处理结果 */}
      {result.results && result.results.length > 0 && (
        <div className="space-y-6">
          {result.results.map((item: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-4 text-gray-800">
                📷 图片 {index + 1}：{item.imageName}
              </h4>
              
              {item.success && item.result ? (
                <div className="space-y-4">
                  <TextComparison
                    originalText={item.result.text || "未能识别到文本内容"}
                    optimizedText={item.result.text_refined || item.result.text || "未能生成优化文本"}
                  />
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <h5 className="font-semibold mb-2 text-amber-800">✨ 建议</h5>
                    <div className="text-sm text-amber-700">
                      {(item.result.advice || ["建议检查图片质量"]).join('，')}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-red-600">
                  ❌ {item.error || '处理失败'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
};

// 绘画点评结果显示组件
const ArtCritiqueResultDisplay = ({ result, onImageClick }: { result: any, onImageClick?: (image: any) => void }) => {
  if (result.type === 'art-critique-processing') {
    // 处理中状态
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
          <span className="font-semibold text-orange-700">绘画点评分析中</span>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm space-y-2">
          <div><strong>图片数量：</strong>{result.imageCount} 张</div>
          <div><strong>处理方式：</strong>{result.processingType}</div>
          <div><strong>状态：</strong>正在分析中，请稍候...</div>
          
          {result.estimatedTime && (
            <>
              <div><strong>预计时间：</strong>约 {result.estimatedTime} 秒
                {result.estimatedTime > 60 && (
                  <span className="text-orange-600 ml-1">
                    ({Math.floor(result.estimatedTime / 60)}分{result.estimatedTime % 60}秒)
                  </span>
                )}
              </div>
              {result.estimatedExplanation && (
                <div className="text-xs text-orange-600"><strong>预估依据：</strong>{result.estimatedExplanation}</div>
              )}
            </>
          )}
        </div>
        
        {result.imagePreview && <ImagePreviewGrid images={result.imagePreview} onImageClick={onImageClick} />}
      </div>
    )
  }

  if (!result.success) {
    // 失败状态
    return (
      <div className="text-red-600">
        ❌ 绘画点评分析失败：{result.error || '未知错误'}
      </div>
    )
  }

  // 成功状态
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-green-600">✅</span>
        <span className="font-semibold text-green-700">绘画点评分析完成</span>
        <span className="text-sm text-gray-600">
          ({result.merged ? result.result?.image_count || 1 : result.results?.length || 0} 张图片)
        </span>
      </div>

      {/* 处理时间信息 */}
      {result.actualProcessingTime && result.estimatedTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>实际处理时间：</strong>{result.actualProcessingTime}秒
            </div>
            <div>
              <strong>预估准确度：</strong>{100 - (result.timeAccuracy || 0)}%
            </div>
          </div>
        </div>
      )}

      {/* 图片预览 */}
      {result.imagePreview && <ImagePreviewGrid images={result.imagePreview} onImageClick={onImageClick} />}

      {/* 合并处理结果 */}
      {result.merged && result.result && (
        <div className="space-y-4">
          {/* 调试信息 - 可在生产环境中移除 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-2 text-xs">
              <strong>调试信息:</strong> 
              <div>sell_evaluation: "{result.result.sell_evaluation}" (类型: {typeof result.result.sell_evaluation})</div>
              <div>point: {result.result.point} (类型: {typeof result.result.point})</div>
            </div>
          )}
          
          {/* 艺术风格 */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-purple-800 flex items-center gap-2">
              🎨 艺术风格
            </h4>
            <div className="text-sm text-purple-700">
              {result.result.style || "未识别风格"}
            </div>
          </div>

          {/* 作品描述 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-blue-800 flex items-center gap-2">
              📝 作品描述
            </h4>
            <div className="text-sm text-blue-700 whitespace-pre-wrap">
              {result.result.description || "未能生成作品描述"}
            </div>
          </div>

          {/* 专业评价 */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-green-800 flex items-center gap-2">
              ⭐ 专业评价
            </h4>
            <div className="text-sm text-green-700 whitespace-pre-wrap">
              {result.result.evaluation || "未能生成专业评价"}
            </div>
          </div>

          {/* 改进建议 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-amber-800 flex items-center gap-2">
              💡 改进建议
            </h4>
            <div className="space-y-2">
              {(result.result.suggestions || ["建议检查绘画技法", "可以改进构图和色彩运用"]).map((suggestion: string, index: number) => (
                <div key={index} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-600 font-bold">{index + 1}.</span>
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 总结评价 */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-indigo-800 flex items-center gap-2">
              📊 总结评价
            </h4>
            <div className="text-sm text-indigo-700 whitespace-pre-wrap">
              {result.result.return || "艺术点评完成"}
            </div>
          </div>

          {/* 售价评估 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-amber-800 flex items-center gap-2">
              💰 售价评估
            </h4>
            <div className="text-sm text-amber-700 whitespace-pre-wrap">
              {result.result.sell_evaluation || "未能生成售价评估"}
            </div>
          </div>

          {/* 评分显示 - 鼓励孩子的设计 */}
          {(result.result.point !== undefined && result.result.point !== null) && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4">
              <h4 className="font-semibold mb-3 text-yellow-800 flex items-center gap-2">
                🌟 作品评分
              </h4>
              <div className="flex flex-col items-center space-y-3">
                {/* 星星评分显示 */}
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, starIndex) => (
                    <div
                      key={starIndex}
                      className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${
                        starIndex < result.result.point
                          ? 'bg-yellow-400 text-yellow-800 scale-110 shadow-md'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      ⭐
                    </div>
                  ))}
                </div>
                
                {/* 数字评分 */}
                <div className="text-2xl font-bold text-yellow-700">
                  {result.result.point}/10
                </div>
                
                {/* 鼓励性文字 */}
                <div className="text-center">
                  {result.result.point >= 9 && (
                    <div className="text-lg font-semibold text-yellow-800">🎉 太棒了！你是小艺术家！</div>
                  )}
                  {result.result.point >= 7 && result.result.point < 9 && (
                    <div className="text-lg font-semibold text-yellow-800">👏 画得很好！继续加油！</div>
                  )}
                  {result.result.point >= 5 && result.result.point < 7 && (
                    <div className="text-lg font-semibold text-yellow-800">💪 不错哦！再练习会更棒！</div>
                  )}
                  {result.result.point < 5 && (
                    <div className="text-lg font-semibold text-yellow-800">🌱 每一次创作都是进步！</div>
                  )}
                </div>
                
                {/* 装饰性元素 */}
                <div className="flex gap-2 text-2xl animate-pulse">
                  🎨 ✨ 🌈
                </div>
              </div>
            </div>
          )}

          {/* 鼓励结语 */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-rose-800 flex items-center gap-2">
              🌟 鼓励结语
            </h4>
            <div className="text-sm text-rose-700 whitespace-pre-wrap">
              {result.result.end || "继续创作，加油！"}
            </div>
          </div>
        </div>
      )}

      {/* 单独处理结果 */}
      {result.results && result.results.length > 0 && (
        <div className="space-y-6">
          {result.results.map((item: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-4 text-gray-800">
                🎨 作品 {index + 1}：{item.imageName}
              </h4>
              
              {item.success && item.result ? (
                <div className="space-y-4">
                  {/* 艺术风格 */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <h5 className="font-semibold mb-1 text-purple-800">🎨 艺术风格</h5>
                    <div className="text-sm text-purple-700">
                      {item.result.style || "未识别风格"}
                    </div>
                  </div>

                  {/* 作品描述 */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="font-semibold mb-1 text-blue-800">📝 作品描述</h5>
                    <div className="text-sm text-blue-700 whitespace-pre-wrap">
                      {item.result.description || "未能生成作品描述"}
                    </div>
                  </div>

                  {/* 专业评价 */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h5 className="font-semibold mb-1 text-green-800">⭐ 专业评价</h5>
                    <div className="text-sm text-green-700 whitespace-pre-wrap">
                      {item.result.evaluation || "未能生成专业评价"}
                    </div>
                  </div>

                  {/* 改进建议 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <h5 className="font-semibold mb-1 text-amber-800">💡 改进建议</h5>
                    <div className="space-y-1">
                      {(item.result.suggestions || ["建议检查绘画技法"]).map((suggestion: string, sugIndex: number) => (
                        <div key={sugIndex} className="text-sm text-amber-700">
                          {sugIndex + 1}. {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 售价评估 */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <h5 className="font-semibold mb-1 text-amber-800">💰 售价评估</h5>
                    <div className="text-sm text-amber-700">
                      {item.result.sell_evaluation || "未能生成售价评估"}
                    </div>
                  </div>

                  {/* 评分显示 - 鼓励孩子的设计 */}
                  {(item.result.point !== undefined && item.result.point !== null) && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-4">
                      <h5 className="font-semibold mb-3 text-yellow-800 flex items-center gap-2">
                        🌟 作品评分
                      </h5>
                      <div className="flex flex-col items-center space-y-3">
                        {/* 星星评分显示 */}
                        <div className="flex items-center gap-1">
                          {[...Array(10)].map((_, starIndex) => (
                            <div
                              key={starIndex}
                              className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ${
                                starIndex < item.result.point
                                  ? 'bg-yellow-400 text-yellow-800 scale-110 shadow-md'
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                            >
                              ⭐
                            </div>
                          ))}
                        </div>
                        
                        {/* 数字评分 */}
                        <div className="text-2xl font-bold text-yellow-700">
                          {item.result.point}/10
                        </div>
                        
                        {/* 鼓励性文字 */}
                        <div className="text-center">
                          {item.result.point >= 9 && (
                            <div className="text-lg font-semibold text-yellow-800">🎉 太棒了！你是小艺术家！</div>
                          )}
                          {item.result.point >= 7 && item.result.point < 9 && (
                            <div className="text-lg font-semibold text-yellow-800">👏 画得很好！继续加油！</div>
                          )}
                          {item.result.point >= 5 && item.result.point < 7 && (
                            <div className="text-lg font-semibold text-yellow-800">💪 不错哦！再练习会更棒！</div>
                          )}
                          {item.result.point < 5 && (
                            <div className="text-lg font-semibold text-yellow-800">🌱 每一次创作都是进步！</div>
                          )}
                        </div>
                        
                        {/* 装饰性元素 */}
                        <div className="flex gap-2 text-2xl animate-pulse">
                          🎨 ✨ 🌈
                        </div>
                      </div>
                    </div>
                  )}

                      
                </div>
              ) : (
                <div className="text-red-600">
                  ❌ {item.error || '分析失败'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
};

export default function MyAIChat() {
  const t = useTranslations('myaichat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t('welcomeMessage'),
      sender: 'ai',
      timestamp: t('justNow')
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 60) + 'px';
    }
  }, [inputValue]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const getCurrentTime = (): string => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAIResponse = (userMessage: string): string => {
    const responses = [
      "I understand what you're saying. Can you tell me more about it?",
      "That's an interesting point. Here's what I think about that...",
      "Thanks for sharing that information with me.",
      "I'm designed to assist with a variety of topics. How else can I help you?",
      "Let me think about that for a moment... Based on my knowledge, I'd say...",
      "I appreciate your message. Here's some information that might be helpful."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const addMessage = (text: string, sender: 'user' | 'ai', type: 'normal' | 'text-edit-result' | 'url-extraction-result' | 'art-critique-result' = 'normal', data?: any): void => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: getCurrentTime(),
      type,
      data
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // 新增更新消息函数
  const updateMessage = (messageId: string, text: string, type: 'normal' | 'text-edit-result' | 'url-extraction-result', data?: any): void => {
    setMessages(prev => prev.map(message => 
      message.id === messageId 
        ? { ...message, text, type, data, timestamp: getCurrentTime() }
        : message
    ));
  };

  // 根据requestId查找并更新消息
  const updateMessageByRequestId = (requestId: string, text: string, type: 'normal' | 'text-edit-result' | 'url-extraction-result', data?: any): void => {
    setMessages(prev => prev.map(message => {
      if (message.type === 'text-edit-result' && 
          message.data?.requestId === requestId) {
        return { ...message, text, type, data, timestamp: getCurrentTime() };
      }
      return message;
    }));
  };

  // 根据requestId查找并更新URL提取消息
  const updateMessageByRequestIdForURLExtraction = (requestId: string, text: string, type: 'normal' | 'text-edit-result' | 'url-extraction-result' | 'art-critique-result', data?: any): void => {
    setMessages(prev => prev.map(message => {
      if (message.type === 'url-extraction-result' && 
          message.data?.requestId === requestId) {
        return { ...message, text, type, data, timestamp: getCurrentTime() };
      }
      return message;
    }));
  };

  // 根据requestId查找并更新绘画点评消息
  const updateMessageByRequestIdForArtCritique = (requestId: string, text: string, type: 'normal' | 'text-edit-result' | 'url-extraction-result' | 'art-critique-result', data?: any): void => {
    setMessages(prev => prev.map(message => {
      if (message.type === 'art-critique-result' && 
          message.data?.requestId === requestId) {
        return { ...message, text, type, data, timestamp: getCurrentTime() };
      }
      return message;
    }));
  };

  // 新增：处理多实例URL提取结果
  const handleMultiInstanceURLExtractionResult = (result: any) => {
    console.log('handleMultiInstanceURLExtractionResult received:', result);
    
    if (result.type === 'url-extraction-processing') {
      // 处理中状态，添加新消息
      addMessage('', 'ai', 'url-extraction-result', result);
    } else if (result.requestId) {
      // 处理完成或失败，更新现有的处理中消息
      updateMessageByRequestIdForURLExtraction(result.requestId, '', 'url-extraction-result', result);
    } else {
      // 兜底：直接添加结果消息
      addMessage('', 'ai', 'url-extraction-result', result);
    }
  };

  const sendMessage = (): void => {
    const messageText = inputValue.trim();
    if (messageText === '') return;

    // Add user message
    addMessage(messageText, 'user');
    setInputValue('');

    // Show typing indicator
    setIsTyping(true);

    // Simulate AI response after a delay
    setTimeout(() => {
      setIsTyping(false);
      addMessage(getAIResponse(messageText), 'ai');
    }, 1500);
  };

  // 处理图片点击预览
  const handleImagePreview = (image: any) => {
    setPreviewImage(image);
  };

  // 处理文章修改结果
  const handleTextEditResult = (result: any) => {
    console.log('handleTextEditResult received:', result);
    
    if (result.type === 'text-edit-processing') {
      // 处理中状态，添加新消息
      addMessage('', 'ai', 'text-edit-result', result);
    } else if (result.requestId) {
      // 处理完成或失败，更新现有的处理中消息
      updateMessageByRequestId(result.requestId, '', 'text-edit-result', result);
    } else {
      // 兜底：直接添加结果消息
      addMessage('', 'ai', 'text-edit-result', result);
    }
  };

  // 处理URL提取结果
  const handleURLExtractionResult = (result: any) => {
    console.log('handleURLExtractionResult received:', result);
    
    if (result.type === 'url-extraction-processing') {
      // 处理中状态，添加新消息
      addMessage('', 'ai', 'url-extraction-result', result);
    } else if (result.requestId) {
      // 处理完成或失败，更新现有的处理中消息
      updateMessageByRequestIdForURLExtraction(result.requestId, '', 'url-extraction-result', result);
    } else {
      // 兜底：直接添加结果消息
      addMessage('', 'ai', 'url-extraction-result', result);
    }
  };

  // 处理绘画点评结果
  const handleArtCritiqueResult = (result: any) => {
    console.log('handleArtCritiqueResult received:', result);
    
    // 添加调试信息
    if (result.success && result.result) {
      console.log('Art critique result data:', {
        sell_evaluation: result.result.sell_evaluation,
        point: result.result.point,
        style: result.result.style,
        description: result.result.description
      });
    }
    if (result.success && result.results) {
      console.log('Art critique results data:', result.results.map((item: any) => ({
        imageName: item.imageName,
        sell_evaluation: item.result?.sell_evaluation,
        point: item.result?.point
      })));
    }
    
    if (result.type === 'art-critique-processing') {
      // 处理中状态，添加新消息
      addMessage('', 'ai', 'art-critique-result', result);
    } else if (result.requestId) {
      // 处理完成或失败，更新现有的处理中消息
      updateMessageByRequestIdForArtCritique(result.requestId, '', 'art-critique-result', result);
    } else {
      // 兜底：直接添加结果消息
      addMessage('', 'ai', 'art-critique-result', result);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (files: FileList): void => {
    if (files.length === 1) {
      addMessage(`[${t('fileAttached')}: ${files[0].name}]`, 'user');
    } else {
      const fileList = Array.from(files).map(file => file.name).join(', ');
      addMessage(`[${t('multipleFilesAttached')}: ${fileList}]`, 'user');
    }
  };

  const getEditingSuggestions = (text: string): string => {
    const suggestions = [
      "建议缩短长句，增加可读性",
      "可以考虑添加更多细节来支持你的观点",
      "开头可以更吸引人一些",
      "结构清晰，但过渡可以更自然",
      "用词准确，但可以增加一些变化"
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  const handleToolbarAction = (action: string): void => {
    switch (action) {
      case 'edit':
        if (inputValue.trim()) {
          addMessage(`[${t('articleEditSuggestion')}]: ${getEditingSuggestions(inputValue)}`, 'ai');
        } else {
          addMessage(t('pleaseEnterArticle'), 'ai');
        }
        break;
      case 'art':
        addMessage(`[${t('artCritique')}]: ${t('artCritiquePrompt')}`, 'ai');
        break;
    }
  };

  const handleToolSelect = (tool: ToolItem): void => {
    switch (tool.id) {
      case 'text-edit':
        // 文章修改功能已存在，这里可以触发相应的modal
        addMessage(`已选择功能：${tool.name}`, 'ai');
        break;
      case 'text-edit-multi':
        // 创建新的文章修改器实例
        addMessage(`已打开新的文章修改器实例`, 'ai');
        // 这里触发MultiTextEdit创建新实例
        // 由于MultiTextEdit已经集成到工具栏，用户可以直接点击使用
        break;
      case 'url-extract':
        // URL提取功能已存在
        addMessage(`已选择功能：${tool.name}`, 'ai');
        break;
      case 'url-extract-multi':
        // 创建新的URL提取器实例
        addMessage(`已打开新的URL提取器实例`, 'ai');
        // 这里可以通过一个全局状态管理器来创建新实例
        // 暂时先显示消息
        break;
      case 'art-critique':
        // 绘画点评功能
        addMessage(`已选择功能：${tool.name}`, 'ai');
        break;
      case 'ocr':
        addMessage(`已选择功能：${tool.name} - ${tool.description}`, 'ai');
        break;
      default:
        addMessage(`功能"${tool.name}"正在开发中，敬请期待！`, 'ai');
        break;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-gray-800 overflow-hidden">
      {/* 美化后的 Header - 标题居中 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative shadow-lg z-10 py-2">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4">
          {/* 左侧留空以平衡布局 */}
          <div className="w-24"></div>
          
          {/* 居中标题 */}
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-center flex-grow mx-4 truncate">
            {t('title')}
          </h1>
          
          {/* 右侧链接 */}
            <Link 
            href="/mytools" 
            className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-full transition-all duration-300 flex items-center space-x-1 border border-white/30 hover:border-white/50 shadow-sm backdrop-blur-sm w-24 justify-center"
            >
            <span>看看工具箱</span>
          </Link>
        </div>
      </div>

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-2 py-4 pb-32 bg-gray-50 md:px-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex flex-col max-w-[95%] md:max-w-[85%] ${
              message.sender === 'user' ? 'self-end' : 'self-start'
            }`}
          >
            <div
              className={`p-2 md:p-3 shadow-sm overflow-hidden ${
                message.sender === 'user'
                  ? 'bg-white rounded-[18px_18px_0_18px]'
                  : 'bg-gray-50 rounded-[18px_18px_18px_0]'
              }`}
            >
              {/* 如果是文章修改结果，使用专门的显示组件 */}
              {message.type === 'text-edit-result' && message.data ? (
                <TextEditResultDisplay result={message.data} onImageClick={handleImagePreview} />
              ) : message.type === 'url-extraction-result' && message.data ? (
                <URLExtractionResultDisplay result={message.data} onImageClick={handleImagePreview} />
              ) : message.type === 'art-critique-result' && message.data ? (
                <ArtCritiqueResultDisplay result={message.data} onImageClick={handleImagePreview} />
              ) : (
                <>
                  {/* 图片预览 - 仅对结果显示 */}
                  {(message.type === 'text-edit-result' || message.type === 'url-extraction-result' || message.type === 'art-critique-result') && message.data?.imagePreview && (
                    <ImagePreviewGrid images={message.data.imagePreview} onImageClick={handleImagePreview} />
                  )}
                  
                  <div className={`leading-6 text-base break-words overflow-hidden ${
                    (message.type === 'text-edit-result' || message.type === 'url-extraction-result' || message.type === 'art-critique-result') ? 'whitespace-pre-wrap' : ''
                  }`}>
                    {message.text}
                  </div>
                </>
              )}
              
              <div className="text-xs text-gray-500 mt-1 text-right">
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex p-3 self-start">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-gray-400 rounded-full mx-0.5 animate-typing"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input Container */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-2 py-2 border-t border-gray-200 flex flex-col z-10 md:px-4">
        <div className="flex items-center">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-white border border-gray-200 rounded-3xl p-3 text-base outline-none resize-none max-h-32 min-h-[48px]"
            placeholder={t('placeholder')}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ height: '60px' }}
          />

          <div className="flex ml-2">
            <button
              className="w-10 h-10 rounded-full bg-indigo-500 text-white border-none flex items-center justify-center ml-2 cursor-pointer active:bg-indigo-600"
              onClick={() => fileInputRef.current?.click()}
              title={t('attachFiles')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="white"/>
                <path d="M18 20H6V4H13V9H18V20Z" fill="white"/>
              </svg>
            </button>

            {/* <button
              className="w-10 h-10 rounded-full bg-indigo-500 text-white border-none flex items-center justify-center ml-2 cursor-pointer active:bg-indigo-600"
              onClick={() => cameraInputRef.current?.click()}
              title={t('takePhoto')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="white"/>
                <path d="M20 4H16.83L15.59 2.65C15.22 2.24 14.68 2 14.12 2H9.88C9.32 2 8.78 2.24 8.4 2.65L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="white"/>
              </svg>
            </button> */}

            <button
              className="w-10 h-10 rounded-full bg-indigo-500 text-white border-none flex items-center justify-center ml-2 cursor-pointer active:bg-indigo-600"
              onClick={sendMessage}
              title={t('sendMessage')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="white"/>
              </svg>
            </button>


          </div>
        </div>

        {/* Toolbar */}
        <div className="flex justify-around py-2">
          <MultiURLExtractor onResult={handleMultiInstanceURLExtractionResult} />

          <MultiTextEdit onResult={handleTextEditResult} />

          <MultiArtCritique onResult={handleArtCritiqueResult} />

          <button
            className="bg-transparent border-none text-indigo-500 text-sm flex items-center py-1.5 px-3 rounded-2xl cursor-pointer active:bg-indigo-50"
            onClick={() => setShowMoreTools(true)}
          >
            <MoreHorizontal className="mr-1 w-4 h-4" />
            {/* 更多 */}
          </button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files);
          }
        }}
      />

      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            addMessage(`[${t('photoTaken')}: ${e.target.files[0].name}]`, 'user');
          }
        }}
      />

      {/* 图片预览Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-lg font-semibold">{previewImage?.name}</span>
                <span className="text-sm text-gray-500">{previewImage && formatFileSize(previewImage.size)}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
            <div className="relative max-w-full max-h-full">
              <img
                src={previewImage?.preview}
                alt={previewImage?.name || "预览图片"}
                className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
          
          <div className="px-6 py-4 border-t bg-white flex justify-between items-center">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>文件名: {previewImage?.name}</span>
              <span>大小: {previewImage && formatFileSize(previewImage.size)}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewImage(null)}
            >
              关闭预览
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 更多工具面板 */}
      <MoreToolsPanel
        open={showMoreTools}
        onOpenChange={setShowMoreTools}
        onToolSelect={handleToolSelect}
      />
    </div>
  );
}
