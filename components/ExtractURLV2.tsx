"use client"
import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Camera, Copy, Link, RefreshCw, X, CheckCircle, Settings, RotateCw, RotateCcw, Star, Clock, Target } from "lucide-react"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { useIsMobile, useOrientation } from '@/hooks/use-mobile'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface URLMatch {
  original: string
  processed: string
  type: 'complete' | 'fuzzy'
  position: { start: number; end: number }
}

interface ExtractURLState {
  isCapturing: boolean
  capturedImage: string | null
  extractedText: string
  extractedUrls: URLMatch[]
  cameraStream: MediaStream | null
  error: string | null
  isProcessing: boolean
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported'
  isCheckingPermission: boolean
  ocrProgress: number
  ocrStatus: string
}

interface ExtractURLV2Props {
  aiProviders: string[];
}

interface OCRResult {
  text: string
  urls: URLMatch[]
  loading: boolean
  error?: string
  confidence?: number
  processingTime?: number
  source: 'local' | 'openai'
}

interface TextDiff {
  type: 'same' | 'different' | 'local-only' | 'openai-only'
  text: string
  originalText: string
}

interface ComparisonResult {
  textSimilarity: number
  urlSimilarity: number
  recommendedSource: 'local' | 'openai' | 'both'
  differences: TextDiff[]
}

const processURLs = (text: string): URLMatch[] => {
  let cleanText = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
  const typoMap: Record<string, string> = {
    'htlp://': 'http://',
    'htpp://': 'http://',
    'hhtp://': 'http://',
    'h t t p s : / /': 'https://',
    'h t t p : / /': 'http://',
    'wwW.': 'www.',
    'w w w .': 'www.',
    'com,': 'com',
    'con': 'com',
    '。com': '.com',
    '。cn': '.cn',
    '。jp': '.jp',
    '。net': '.net',
    '。org': '.org',
    '，com': '.com',
    '，cn': '.cn',
    '，jp': '.jp',
    '，net': '.net',
    '，org': '.org',
  };
  for (const typo in typoMap) {
    cleanText = cleanText.replace(new RegExp(typo, 'gi'), typoMap[typo]);
  }
  
  const urlMatches: URLMatch[] = [];
  
  // 改进的URL正则表达式，更好地处理完整URL
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  let match;
  
  while ((match = urlRegex.exec(cleanText)) !== null) {
    let url = match[0];
    const start = match.index;
    let end = start + url.length;
    
    // 清理URL末尾的标点符号
    url = url.replace(/[\.,;:!?)\]]+$/, '');
    
    // 确保URL有协议
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }
    
    // 验证URL格式
    try {
      new URL(url);
      urlMatches.push({
        original: cleanText.slice(start, end),
        processed: url,
        type: 'complete',
        position: { start, end }
      });
    } catch (e) {
      // 如果URL格式无效，尝试修复
      const fixedUrl = fixUrl(url);
      if (fixedUrl) {
        urlMatches.push({
          original: cleanText.slice(start, end),
          processed: fixedUrl,
          type: 'complete',
          position: { start, end }
        });
      }
    }
  }
  
  // 模糊匹配：查找可能的域名
  const domainRegex = /([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
  let domainMatch;
  
  while ((domainMatch = domainRegex.exec(cleanText)) !== null) {
    const domain = domainMatch[0];
    const start = domainMatch.index;
    const end = start + domain.length;
    
    // 检查是否已经被完整URL匹配覆盖
    const isOverlapped = urlMatches.some(m =>
      m.position.start <= start && m.position.end >= end
    );
    
    if (!isOverlapped) {
      urlMatches.push({
        original: domain,
        processed: `https://${domain}`,
        type: 'fuzzy',
        position: { start, end }
      });
    }
  }
  
  return urlMatches.sort((a, b) => a.position.start - b.position.start);
};

// 辅助函数：修复URL格式
const fixUrl = (url: string): string | null => {
  // 移除多余的空格和换行
  url = url.replace(/\s+/g, '');
  
  // 如果URL包含多个连续的斜杠，保留协议部分
  if (url.includes('://')) {
    const [protocol, rest] = url.split('://');
    if (protocol && rest) {
      // 清理路径部分的多余字符
      const cleanRest = rest.replace(/[^\w\-\.\/\?\=\&\#]/g, '');
      return `${protocol}://${cleanRest}`;
    }
  }
  
  // 如果是www开头的域名
  if (url.startsWith('www.')) {
    return `https://${url}`;
  }
  
  return null;
};

const HighlightedText = ({ text, urlMatches }: { text: string; urlMatches: URLMatch[] }) => {
  const segments: Array<{ text: string; isUrl: boolean; url?: string; type?: string }> = []
  let lastIndex = 0
  urlMatches.forEach(match => {
    if (match.position.start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.position.start),
        isUrl: false
      })
    }
    segments.push({
      text: match.original,
      isUrl: true,
      url: match.processed,
      type: match.type
    })
    lastIndex = match.position.end
  })
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      isUrl: false
    })
  }
  
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // 可以添加一个简单的toast提示
      console.log('URL copied to clipboard:', url);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };
  
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, index) => (
        segment.isUrl ? (
          <span key={index} className="inline-flex items-center gap-1">
            <a
              href={segment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${segment.type === 'complete' ? 'bg-blue-100 text-blue-800 border-b border-blue-300' : 'bg-green-100 text-green-800 border-b border-green-300'} px-1 rounded hover:underline`}
            >
              {segment.text}
            </a>
            <button
              onClick={() => handleCopyUrl(segment.url!)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Copy URL"
            >
              <Copy className="w-3 h-3 text-gray-500 hover:text-gray-700" />
            </button>
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      ))}
    </div>
  )
}

const preprocessCanvas = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas.toDataURL('image/jpeg', 0.8);
  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageDataObj.data;
  const contrast = 1.8;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let v = avg;
    v = factor * (v - 128) + 128;
    v = Math.max(0, Math.min(255, v));
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageDataObj, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// PermissionStatus组件（从V1复制，适配V2状态）
const PermissionStatus = ({ status, onRequestPermission, t }: { 
  status: string; 
  onRequestPermission: () => void;
  t: any;
}) => {
  switch (status) {
    case 'granted':
      return null; // 权限已授予时不显示任何内容，避免影响预览
    case 'denied':
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{t('permissionDenied')}</span>
          </div>
          <div className="text-xs text-gray-600 space-y-2">
            <p>{t('permissionDeniedHelp')}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onRequestPermission} variant="outline">
                <RefreshCw className="w-3 h-3 mr-1" />
                {t('retryPermission')}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="#" onClick={e => {
                  e.preventDefault();
                  if (navigator.userAgent.includes('Chrome')) {
                    window.open('chrome://settings/content/camera');
                  } else if (navigator.userAgent.includes('Firefox')) {
                    window.open('about:preferences#privacy');
                  } else {
                    alert(t('openBrowserSettings'));
                  }
                }}>
                  <Settings className="w-3 h-3 mr-1" />
                  {t('openSettings')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      )
    case 'unsupported':
      return (
        <div className="flex items-center gap-2 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{t('browserNotSupported')}</span>
        </div>
      )
    case 'prompt':
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{t('requestingPermission') || 'Requesting camera permission...'}</span>
        </div>
      )
    default:
      return null;
  }
};

// FloatingExtractButton组件（从V1复制，适配V2状态）
const FloatingExtractButton = ({ onClick, disabled, t, isMobile, orientation, isCapturing, isProcessing }: { onClick: () => void; disabled: boolean; t: any; isMobile: boolean; orientation: string; isCapturing: boolean; isProcessing: boolean }) => {
  if (!isMobile || !isCapturing || isProcessing) return null;
  const positionClass = orientation === 'landscape'
    ? 'top-4 right-4'
    : 'bottom-4 right-4';
  return (
    <button
      onClick={onClick}
      className={`fixed z-50 ${positionClass} bg-blue-600 text-white rounded-full shadow-lg p-4 flex items-center justify-center active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400`}
      aria-label={t('extractUrl')}
      style={{ minWidth: 56, minHeight: 56 }}
      disabled={disabled}
    >
      <Camera className="w-7 h-7" />
    </button>
  );
};

// 工具函数：计算编辑距离
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
};

// 工具函数：计算文本相似度
const calculateTextSimilarity = (text1: string, text2: string): number => {
  if (!text1 || !text2) return 0;
  const distance = levenshteinDistance(text1, text2);
  const maxLength = Math.max(text1.length, text2.length);
  return Math.max(0, 1 - distance / maxLength);
};

// 工具函数：URL标准化
const normalizeUrl = (url: string): string => {
  return url.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .replace(/www\./, '');
};

// 工具函数：计算URL相似度
const calculateUrlSimilarity = (urls1: URLMatch[], urls2: URLMatch[]): number => {
  if (urls1.length === 0 && urls2.length === 0) return 1;
  if (urls1.length === 0 || urls2.length === 0) return 0;
  
  const normalized1 = urls1.map(u => normalizeUrl(u.processed));
  const normalized2 = urls2.map(u => normalizeUrl(u.processed));
  
  const intersection = normalized1.filter(url => normalized2.includes(url));
  const union = [...new Set([...normalized1, ...normalized2])];
  
  return intersection.length / union.length;
};

// 工具函数：计算置信度
const calculateConfidence = (result: OCRResult, imageQuality?: number): number => {
  if (result.error) return 0;
  
  let confidence = 0.5; // 基础置信度
  
  // 基于文本长度
  if (result.text.length > 0) {
    confidence += 0.2;
  }
  
  // 基于URL数量
  if (result.urls.length > 0) {
    confidence += 0.1;
  }
  
  // 基于处理时间（本地识别越快越好，OpenAI越慢越准确）
  if (result.processingTime) {
    if (result.source === 'local' && result.processingTime < 3000) {
      confidence += 0.1;
    } else if (result.source === 'openai' && result.processingTime > 5000) {
      confidence += 0.1;
    }
  }
  
  // 基于源类型
  if (result.source === 'openai') {
    confidence += 0.1; // OpenAI默认更高置信度
  }
  
  return Math.min(1, confidence);
};

// 工具函数：生成文本差异
const generateTextDiff = (localText: string, openaiText: string): TextDiff[] => {
  const diffs: TextDiff[] = [];
  
  // 简单实现：按句子分割比较
  const localSentences = localText.split(/[.!?。！？]/).filter(s => s.trim());
  const openaiSentences = openaiText.split(/[.!?。！？]/).filter(s => s.trim());
  
  const maxLength = Math.max(localSentences.length, openaiSentences.length);
  
  for (let i = 0; i < maxLength; i++) {
    const localSentence = localSentences[i] || '';
    const openaiSentence = openaiSentences[i] || '';
    
    if (localSentence && openaiSentence) {
      const similarity = calculateTextSimilarity(localSentence, openaiSentence);
      if (similarity > 0.8) {
        diffs.push({
          type: 'same',
          text: localSentence,
          originalText: localSentence
        });
      } else {
        diffs.push({
          type: 'different',
          text: localSentence,
          originalText: openaiSentence
        });
      }
    } else if (localSentence) {
      diffs.push({
        type: 'local-only',
        text: localSentence,
        originalText: localSentence
      });
    } else if (openaiSentence) {
      diffs.push({
        type: 'openai-only',
        text: openaiSentence,
        originalText: openaiSentence
      });
    }
  }
  
  return diffs;
};

// 工具函数：比较结果
const compareResults = (localResult: OCRResult, openaiResult: OCRResult): ComparisonResult => {
  const textSimilarity = calculateTextSimilarity(localResult.text, openaiResult.text);
  const urlSimilarity = calculateUrlSimilarity(localResult.urls, openaiResult.urls);
  
  let recommendedSource: 'local' | 'openai' | 'both' = 'both';
  
  if (localResult.confidence && openaiResult.confidence) {
    if (openaiResult.confidence > localResult.confidence + 0.1) {
      recommendedSource = 'openai';
    } else if (localResult.confidence > openaiResult.confidence + 0.1) {
      recommendedSource = 'local';
    }
  }
  
  const differences = generateTextDiff(localResult.text, openaiResult.text);
  
  return {
    textSimilarity,
    urlSimilarity,
    recommendedSource,
    differences
  };
};

// 工具函数：渲染置信度星星
const ConfidenceStars = ({ confidence }: { confidence: number }) => {
  const stars = [];
  const fullStars = Math.floor(confidence * 5);
  const hasHalfStar = confidence * 5 % 1 >= 0.5;
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    } else if (i === fullStars && hasHalfStar) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />);
    } else {
      stars.push(<Star key={i} className="w-4 h-4 text-gray-300" />);
    }
  }
  
  return <div className="flex gap-1">{stars}</div>;
};

// 工具函数：渲染进度条
const ProgressBar = ({ value, max = 100, className = "" }: { value: number; max?: number; className?: string }) => {
  const percentage = (value / max) * 100;
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// 工具函数：渲染文本差异
const TextDiffDisplay = ({ diffs }: { diffs: TextDiff[] }) => {
  return (
    <div className="space-y-2">
      {diffs.map((diff, index) => (
        <div key={index} className={`p-2 rounded text-sm ${
          diff.type === 'same' ? 'bg-green-50 border border-green-200' :
          diff.type === 'different' ? 'bg-yellow-50 border border-yellow-200' :
          diff.type === 'local-only' ? 'bg-blue-50 border border-blue-200' :
          'bg-purple-50 border border-purple-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {diff.type === 'same' && <CheckCircle className="w-3 h-3 text-green-600" />}
            {diff.type === 'different' && <AlertCircle className="w-3 h-3 text-yellow-600" />}
            {diff.type === 'local-only' && <span className="text-blue-600 text-xs">本地独有</span>}
            {diff.type === 'openai-only' && <span className="text-purple-600 text-xs">OpenAI独有</span>}
          </div>
          <div className="font-mono text-xs">
            {diff.text}
          </div>
          {diff.type === 'different' && (
            <div className="text-xs text-gray-500 mt-1">
              OpenAI: {diff.originalText}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function ExtractURLV2({ aiProviders }: ExtractURLV2Props) {
  const t = useTranslations('extracturl');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const orientation = useOrientation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<ExtractURLState>({
    isCapturing: true,
    capturedImage: null,
    extractedText: '',
    extractedUrls: [],
    cameraStream: null,
    error: null,
    isProcessing: false,
    permissionStatus: 'prompt',
    isCheckingPermission: false,
    ocrProgress: 0,
    ocrStatus: '',
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [localResult, setLocalResult] = useState<OCRResult | null>(null);
  const [openaiResult, setOpenaiResult] = useState<OCRResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [currentCamera, setCurrentCamera] = useState<'environment' | 'user'>('environment');

  // 拷贝URL函数
  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      console.log('URL copied to clipboard:', url);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // 切换摄像头
  const switchCamera = async () => {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
    }
    const newCamera = currentCamera === 'environment' ? 'user' : 'environment';
    setCurrentCamera(newCamera);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: newCamera,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setState(s => ({ ...s, cameraStream: stream, error: null }));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e: any) {
      setState(s => ({ ...s, error: t('camera_switch_failed') }));
    }
  };

  // 摄像头权限和流初始化
  useEffect(() => {
    if (!state.isCapturing) return;
    let stream: MediaStream;
    const getCamera = async () => {
      setState(s => ({ ...s, isCheckingPermission: true, error: null }));
      try {
        // 优先使用后置摄像头（environment），如果失败则回退到前置摄像头
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
        setState(s => ({ ...s, cameraStream: stream, permissionStatus: 'granted', isCheckingPermission: false }));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e: any) {
        // 如果后置摄像头失败，尝试前置摄像头
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } 
          });
          setState(s => ({ ...s, cameraStream: stream, permissionStatus: 'granted', isCheckingPermission: false }));
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (fallbackError: any) {
          setState(s => ({ ...s, error: t('camera_permission_denied'), permissionStatus: 'denied', isCheckingPermission: false }));
        }
      }
    };
    getCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, [state.isCapturing]);

  // 拍摄按钮点击（真实OCR识别）
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.save();
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();
    const processedImage = preprocessCanvas(canvas);
    setModalOpen(true);
    // 清空结果，设置 loading
    if (aiProviders.includes('local')) setLocalResult({ text: '', urls: [], loading: true, source: 'local' });
    if (aiProviders.includes('openai')) setOpenaiResult({ text: '', urls: [], loading: true, source: 'openai' });
    // 本地识别
    if (aiProviders.includes('local')) {
      (async () => {
        try {
          let lang = 'eng';
          if (locale === 'zh') lang = 'chi_sim+eng';
          else if (locale === 'ja') lang = 'jpn+eng';
          console.log('[OCR] 开始本地识别，语言包:', lang);
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker(lang);
          console.log('[OCR] worker initialized');
          console.log('[OCR] 识别图片数据前100字符:', processedImage.slice(0, 100));
          const { data: { text } } = await worker.recognize(processedImage);
          console.log('[OCR] 识别完成，文本内容:', text);
          await worker.terminate();
          const startTime = Date.now();
          const urls = processURLs(text);
          const processingTime = Date.now() - startTime;
          const result: OCRResult = { text, urls, loading: false, source: 'local', processingTime };
          result.confidence = calculateConfidence(result);
          setLocalResult(result);
        } catch (e) {
          console.error('[OCR] Tesseract.js 本地识别异常:', e);
          setLocalResult({ text: '', urls: [], loading: false, error: t('ocrError'), source: 'local' });
        }
      })();
    }
    // OpenAI识别
    if (aiProviders.includes('openai')) {
      (async () => {
        try {
          const blob = await (await fetch(processedImage)).blob();
          const formData = new FormData();
          formData.append('image_0', blob, 'capture.jpg');
          formData.append('mergeImages', 'false');
          const res = await fetch('/api/ocr', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.success && data.results?.[0]?.result?.text) {
            const text = data.results[0].result.text;
            const startTime = Date.now();
            const urls = processURLs(text);
            const processingTime = Date.now() - startTime;
            const result: OCRResult = { text, urls, loading: false, source: 'openai', processingTime };
            result.confidence = calculateConfidence(result);
            setOpenaiResult(result);
          } else {
            setOpenaiResult({ text: '', urls: [], loading: false, error: data.error || t('ocrError'), source: 'openai' });
          }
        } catch (e) {
          setOpenaiResult({ text: '', urls: [], loading: false, error: t('ocrError'), source: 'openai' });
        }
              })();
    }
  };

  // 当两个结果都完成时，进行比较
  useEffect(() => {
    if (localResult && !localResult.loading && openaiResult && !openaiResult.loading) {
      const comparison = compareResults(localResult, openaiResult);
      setComparisonResult(comparison);
    }
  }, [localResult, openaiResult]);

  // 重新拍摄
  const handleRetake = () => {
    setModalOpen(false);
    setLocalResult(null);
    setOpenaiResult(null);
    setComparisonResult(null);
    setCurrentCamera('environment'); // 重置为后置摄像头
    setState(s => ({
      ...s,
      isCapturing: true,
      capturedImage: null,
      extractedText: '',
      extractedUrls: [],
      isProcessing: false,
      ocrProgress: 0,
      ocrStatus: '',
      error: null,
    }));
  };

  // UI
  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[60vh] p-4">
      {/* 标题和描述区 */}
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
          {t('title')}
        </h1>
      </div>
      {/* 摄像头区 */}
      <div className="relative w-full max-w-xs aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
        {state.isCapturing ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ display: state.permissionStatus === 'granted' ? 'block' : 'none' }}
          />
        ) : (
          <img
            src={state.capturedImage || ''}
            alt="Captured"
            className="w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* 摄像头切换按钮 */}
        {state.isCapturing && state.permissionStatus === 'granted' && (
          <button
            onClick={switchCamera}
            className="absolute top-2 right-2 z-40 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
            title={currentCamera === 'environment' ? '切换到前置摄像头' : '切换到后置摄像头'}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
        
        {/* 遮罩禁用层 */}
        {!state.isCapturing && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center" />
        )}
        
        {/* 错误提示 */}
        {state.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-30">
            <div className="text-red-600 text-center">{state.error}</div>
          </div>
        )}
      </div>
      
      {/* 权限状态提示 - 只在需要时显示 */}
      {(state.permissionStatus === 'denied' || state.permissionStatus === 'unsupported' || state.permissionStatus === 'prompt') && (
        <div className="mt-2">
          <PermissionStatus 
            status={state.permissionStatus} 
            onRequestPermission={() => setState(s => ({ ...s, isCapturing: true, error: null, permissionStatus: 'prompt' }))} 
            t={t} 
          />
        </div>
      )}
      {/* 拍摄按钮（移动端浮动，桌面端覆盖视频中心） */}
      {isMobile
        ? <FloatingExtractButton onClick={handleCapture} disabled={state.isProcessing} t={t} isMobile={isMobile} orientation={orientation} isCapturing={state.isCapturing} isProcessing={state.isProcessing} />
        : (state.isCapturing && !state.error &&
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              onClick={handleCapture}
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg border-2 border-white pointer-events-auto"
            >
              <Camera className="w-6 h-6 mr-2" />
              {t('extractUrl')}
            </Button>
          </div>
        )}
      {/* Modal结果卡片 */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('result_card_title') || 'Result'}</DialogTitle>
          </DialogHeader>
          {/* 进度条 */}
          {state.isProcessing && (
            <div className="w-full my-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-2 transition-all"
                  style={{ width: `${state.ocrProgress}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">{state.ocrStatus}</div>
            </div>
          )}
          {/* 拍摄图片 */}
          {state.capturedImage && (
            <img
              src={state.capturedImage}
              alt="Captured"
              className="w-full rounded-lg my-2 border"
            />
          )}
 
          {/* 本地识别结果 */}
          {aiProviders.includes('local') && localResult && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>本地识别结果</span>
                  {localResult.confidence && (
                    <div className="flex items-center gap-2">
                      <ConfidenceStars confidence={localResult.confidence} />
                      <span className="text-sm text-gray-500">
                        {Math.round(localResult.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </CardTitle>
                {localResult.processingTime && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {localResult.processingTime}ms
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {localResult.loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    识别中...
                  </div>
                ) : localResult.error ? (
                  <div className="text-red-500">{localResult.error}</div>
                ) : (
                  <div>
                    <div className="mb-2">
                      <div className="text-sm font-medium mb-1">识别文本</div>
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        {localResult.text || '无文本内容'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">提取URLs</div>
                      {localResult.urls.length > 0 ? (
                        <div className="space-y-1">
                          {localResult.urls.map((url, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                              <a
                                href={url.processed}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm flex-1"
                              >
                                {url.processed}
                              </a>
                              <button
                                onClick={() => handleCopyUrl(url.processed)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Copy URL"
                              >
                                <Copy className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">未发现URL</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* OpenAI识别结果 */}
          {aiProviders.includes('openai') && openaiResult && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>OpenAI识别结果</span>
                  {openaiResult.confidence && (
                    <div className="flex items-center gap-2">
                      <ConfidenceStars confidence={openaiResult.confidence} />
                      <span className="text-sm text-gray-500">
                        {Math.round(openaiResult.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </CardTitle>
                {openaiResult.processingTime && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {openaiResult.processingTime}ms
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {openaiResult.loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    识别中...
                  </div>
                ) : openaiResult.error ? (
                  <div className="text-red-500">{openaiResult.error}</div>
                ) : (
                  <div>
                    <div className="mb-2">
                      <div className="text-sm font-medium mb-1">识别文本</div>
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        {openaiResult.text || '无文本内容'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">提取URLs</div>
                      {openaiResult.urls.length > 0 ? (
                        <div className="space-y-1">
                          {openaiResult.urls.map((url, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                              <a
                                href={url.processed}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm flex-1"
                              >
                                {url.processed}
                              </a>
                              <button
                                onClick={() => handleCopyUrl(url.processed)}
                                className="p-1 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Copy URL"
                              >
                                <Copy className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm">未发现URL</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

         {/* 对比分析 */}
         {comparisonResult && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  对比分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">文本相似度</div>
                    <ProgressBar value={comparisonResult.textSimilarity * 100} />
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(comparisonResult.textSimilarity * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">URL匹配度</div>
                    <ProgressBar value={comparisonResult.urlSimilarity * 100} />
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(comparisonResult.urlSimilarity * 100)}%
                    </div>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="font-medium">推荐：</span>
                  {comparisonResult.recommendedSource === 'openai' && 'OpenAI结果更准确'}
                  {comparisonResult.recommendedSource === 'local' && '本地结果更准确'}
                  {comparisonResult.recommendedSource === 'both' && '两个结果都很好'}
                </div>
                {comparisonResult.differences.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-2">文本差异详情</div>
                    <TextDiffDisplay diffs={comparisonResult.differences} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 底部操作区 */}
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRetake}
            >
              <Camera className="w-4 h-4 mr-2" />
              {t('retake') || 'Retake'}
            </Button>
            <Button
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              <X className="w-4 h-4 mr-2" />
              {t('close') || 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 