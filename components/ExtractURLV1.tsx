"use client"

// 复制自 page.tsx 的 imports
import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Camera, Copy, Link, RefreshCw, X, CheckCircle, Settings, RotateCw, RotateCcw } from "lucide-react"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"
import { DonationProvider } from "@/components/donation-provider"
import { DonationButton } from "@/components/donation-button"
import { DonationModal } from "@/components/donation-modal"
import LanguageSwitcher from "@/components/language-switcher"
import { useIsMobile, useOrientation } from '@/hooks/use-mobile'

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

// 智能URL提取与修正（含拼写容错）
const processURLs = (text: string): URLMatch[] => {
  let cleanText = text.replace(/\[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
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
  const urlStartRegex = /(https?:\/\/|www\.)/gi;
  let match;
  while ((match = urlStartRegex.exec(cleanText)) !== null) {
    let start = match.index;
    let end = start + match[0].length;
    let url = match[0];
    const rest = cleanText.slice(end);
    const urlBodyMatch = rest.match(/^([\w\-\./]+(\s+[\w\-\./]+)*)/);
    if (urlBodyMatch) {
      let body = urlBodyMatch[0].replace(/\s+/g, '');
      if (/([a-zA-Z0-9]+\s+[a-zA-Z0-9]+)/.test(urlBodyMatch[0])) {
        body = urlBodyMatch[0].replace(/\s+/g, '.');
      }
      url += body;
      end += urlBodyMatch[0].length;
    }
    url = url.replace(/[\.,;:!?)\]]+$/, '');
    urlMatches.push({
      original: cleanText.slice(start, end),
      processed: url,
      type: 'complete',
      position: { start, end }
    });
  }
  const fuzzyRegex = /([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
  let fuzzyMatch: RegExpExecArray | null;
  while ((fuzzyMatch = fuzzyRegex.exec(cleanText)) !== null) {
    const isOverlapped = urlMatches.some(m =>
      m.position.start <= fuzzyMatch!.index && m.position.end >= fuzzyMatch!.index + fuzzyMatch![0].length
    );
    if (!isOverlapped) {
      urlMatches.push({
        original: fuzzyMatch[0],
        processed: `https://${fuzzyMatch[0]}`,
        type: 'fuzzy',
        position: { start: fuzzyMatch.index!, end: fuzzyMatch.index! + fuzzyMatch[0].length }
      });
    }
  }
  return urlMatches.sort((a, b) => a.position.start - b.position.start);
}

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
  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((segment, index) => (
        segment.isUrl ? (
          <a
            key={index}
            href={segment.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`$${segment.type === 'complete' ? 'bg-blue-100 text-blue-800 border-b border-blue-300' : 'bg-green-100 text-green-800 border-b border-green-300'} px-1 rounded hover:underline`}
          >
            {segment.text}
          </a>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      ))}
    </div>
  )
}

const PermissionStatus = ({ status, onRequestPermission, t }: { 
  status: string; 
  onRequestPermission: () => void;
  t: any;
}) => {
  switch (status) {
    case 'granted':
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{t('extracturl.permissionGranted')}</span>
        </div>
      )
    case 'denied':
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{t('extracturl.permissionDenied')}</span>
          </div>
          <div className="text-xs text-gray-600 space-y-2">
            <p>{t('extracturl.permissionDeniedHelp')}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onRequestPermission} variant="outline">
                <RefreshCw className="w-3 h-3 mr-1" />
                {t('extracturl.retryPermission')}
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="#" onClick={(e) => {
                  e.preventDefault()
                  if (navigator.userAgent.includes('Chrome')) {
                    window.open('chrome://settings/content/camera')
                  } else if (navigator.userAgent.includes('Firefox')) {
                    window.open('about:preferences#privacy')
                  } else {
                    alert(t('extracturl.openBrowserSettings'))
                  }
                }}>
                  <Settings className="w-3 h-3 mr-1" />
                  {t('extracturl.openSettings')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      )
    case 'unsupported':
      return (
        <div className="flex items-center gap-2 text-orange-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{t('extracturl.browserNotSupported')}</span>
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-2 text-blue-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('extracturl.checkingPermission')}</span>
        </div>
      )
  }
}

const preprocessCanvas = (canvas: HTMLCanvasElement): string => {
  const ctx = canvas.getContext('2d');
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

export default function ExtractURLV1() {
  const t = useTranslations()
  const locale = useLocale()
  const [state, setState] = useState<ExtractURLState>({
    isCapturing: false,
    capturedImage: null,
    extractedText: '',
    extractedUrls: [],
    cameraStream: null,
    error: null,
    isProcessing: false,
    permissionStatus: 'prompt',
    isCheckingPermission: true,
    ocrProgress: 0,
    ocrStatus: ''
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);
  const [rotation, setRotation] = useState(0);
  const isMobile = useIsMobile();
  const orientation = useOrientation();

  // ...全部 hooks、方法、useEffect、UI渲染，去除 Provider 和右上角语言选择器外层div...
  // 详见 page.tsx ExtractURLPage 组件体

  // 绑定摄像头流到video（确保videoRef已挂载）
  useEffect(() => {
    if (videoRef.current && state.cameraStream) {
      videoRef.current.srcObject = state.cameraStream;
    } else if (videoRef.current && pendingStream) {
      videoRef.current.srcObject = pendingStream;
      setPendingStream(null);
    }
  }, [state.cameraStream, pendingStream]);

  // 检查权限状态
  const checkPermissionStatus = async () => {
    setState(prev => ({ ...prev, isCheckingPermission: true }))
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setState(prev => ({ 
          ...prev, 
          permissionStatus: 'unsupported',
          isCheckingPermission: false 
        }))
        return
      }
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName })
        if (permissions.state === 'granted') {
          setState(prev => ({ 
            ...prev, 
            permissionStatus: 'granted',
            isCheckingPermission: false 
          }))
          await startCamera()
        } else if (permissions.state === 'denied') {
          setState(prev => ({ 
            ...prev, 
            permissionStatus: 'denied',
            isCheckingPermission: false 
          }))
        } else {
          setState(prev => ({ 
            ...prev, 
            permissionStatus: 'prompt',
            isCheckingPermission: false 
          }))
        }
      } catch (permissionError) {
        setState(prev => ({ 
          ...prev, 
          permissionStatus: 'prompt',
          isCheckingPermission: false 
        }))
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        permissionStatus: 'prompt',
        isCheckingPermission: false 
      }))
    }
  }

  // 请求摄像头权限（需手势触发）
  const requestCameraPermission = async () => {
    try {
      setState(prev => ({ ...prev, isCheckingPermission: true }))
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        setPendingStream(stream);
      }
      setState(prev => ({ 
        ...prev, 
        cameraStream: stream, 
        error: null,
        permissionStatus: 'granted',
        isCheckingPermission: false
      }))
      return true
    } catch (error) {
      let errorMessage = t('extracturl.cameraPermission')
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = t('extracturl.permissionDenied')
        } else if (error.name === 'NotFoundError') {
          errorMessage = t('extracturl.cameraNotFound')
        } else if (error.name === 'NotSupportedError') {
          errorMessage = t('extracturl.browserNotSupported')
        } else if (error.name === 'NotReadableError') {
          errorMessage = t('extracturl.cameraInUse')
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = t('extracturl.cameraConstraints')
        }
      }
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        permissionStatus: 'denied',
        isCheckingPermission: false
      }))
      return false
    }
  }

  const startCamera = async () => {
    setState(prev => ({ ...prev, isCapturing: true, error: null }))
    const success = await requestCameraPermission()
    if (!success) {
      setState(prev => ({ ...prev, isCapturing: false }))
    }
  }

  const retryCamera = async () => {
    stopCamera();
    await startCamera();
  }

  const stopCamera = () => {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop())
    }
    setState(prev => ({ 
      ...prev, 
      isCapturing: false, 
      cameraStream: null,
      capturedImage: null,
      extractedText: '',
      extractedUrls: []
    }))
    setPendingStream(null)
    resetRotation()
  }

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetRotation = () => {
    setRotation(0);
  };

  const reRecognize = async () => {
    if (!state.capturedImage) return;
    setState(prev => ({ 
      ...prev, 
      isProcessing: true,
      extractedText: '',
      extractedUrls: [],
      error: null
    }))
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    const img = new Image();
    img.onload = () => {
      const isVertical = rotation === 90 || rotation === 270;
      const canvasWidth = isVertical ? img.height : img.width;
      const canvasHeight = isVertical ? img.width : img.height;
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      tempCtx.clearRect(0, 0, canvasWidth, canvasHeight);
      tempCtx.translate(canvasWidth / 2, canvasHeight / 2);
      tempCtx.rotate((rotation * Math.PI) / 180);
      tempCtx.drawImage(img, -img.width / 2, -img.height / 2);
      performOCR(tempCanvas.toDataURL('image/png'));
    };
    img.src = state.capturedImage;
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    const vw = video.videoWidth
    const vh = video.videoHeight
    canvas.width = vw
    canvas.height = vh
    context.save()
    context.drawImage(video, 0, 0, vw, vh)
    context.restore()
    const processedImage = preprocessCanvas(canvas)
    setState(prev => ({ 
      ...prev, 
      capturedImage: processedImage,
      isProcessing: true 
    }))
    performOCR(processedImage)
  }

  const performOCR = async (imageData: string) => {
    try {
      setState(prev => ({ 
        ...prev, 
        ocrProgress: 0,
        ocrStatus: t('extracturl.initializingOCR')
      }))
      let lang = 'eng'
      if (locale === 'zh') {
        lang = 'chi_sim+eng'
      } else if (locale === 'ja') {
        lang = 'jpn+eng'
      }
      setState(prev => ({ 
        ...prev, 
        ocrProgress: 20,
        ocrStatus: t('extracturl.loadingLanguage')
      }))
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker(lang)
      setState(prev => ({ 
        ...prev, 
        ocrProgress: 60,
        ocrStatus: t('extracturl.recognizingText')
      }))
      const { data: { text } } = await worker.recognize(imageData)
      setState(prev => ({ 
        ...prev, 
        ocrProgress: 80,
        ocrStatus: t('extracturl.extractingUrls')
      }))
      const urlMatches = processURLs(text)
      setState(prev => ({
        ...prev,
        extractedText: text,
        extractedUrls: urlMatches,
        isProcessing: false,
        ocrProgress: 100,
        ocrStatus: t('extracturl.completed')
      }))
      await worker.terminate()
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: t('extracturl.ocrError'),
        isProcessing: false,
        ocrProgress: 0,
        ocrStatus: ''
      }))
    }
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
    } catch (error) {}
  }

  const retake = () => {
    setState(prev => ({
      ...prev,
      capturedImage: null,
      extractedText: '',
      extractedUrls: [],
      isProcessing: false,
      ocrProgress: 0,
      ocrStatus: ''
    }))
  }

  useEffect(() => {
    checkPermissionStatus()
  }, [])

  useEffect(() => {
    return () => {
      if (state.cameraStream) {
        state.cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [state.cameraStream])

  const FloatingExtractButton = () => {
    if (!isMobile || !state.isCapturing || state.isProcessing) return null;
    const positionClass = orientation === 'landscape'
      ? 'top-4 right-4'
      : 'bottom-4 right-4';
    return (
      <button
        onClick={captureImage}
        className={`fixed z-50 ${positionClass} bg-blue-600 text-white rounded-full shadow-lg p-4 flex items-center justify-center active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400`}
        aria-label={t('extracturl.extractUrl')}
        style={{ minWidth: 56, minHeight: 56 }}
      >
        <Camera className="w-7 h-7" />
      </button>
    );
  };

  return (
    <>
      <FloatingExtractButton />
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-4">
              {t('extracturl.title')}
            </h1>
            <p className="text-gray-600 text-lg">
              {t('extracturl.description')}
            </p>
          </div>
          {(state.isProcessing || state.extractedUrls.length > 0 || state.error) && (
            <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-4">
              {state.isProcessing && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">{state.ocrStatus}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${state.ocrProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {state.ocrProgress}%
                  </div>
                </div>
              )}
              {state.extractedUrls.length > 0 && !state.isProcessing && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {t('extracturl.completed')} - {state.extractedUrls.length} {t('extracturl.extractedUrls')}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const resultsElement = document.getElementById('results-section');
                      if (resultsElement) {
                        resultsElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {t('extracturl.viewResults')}
                  </Button>
                </div>
              )}
              {state.error && !state.isProcessing && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{state.error}</span>
                </div>
              )}
            </div>
          )}
          {state.error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{state.error}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setState(prev => ({ ...prev, error: null }))} 
                  className="mt-2"
                >
                  {t('common.cancel')}
                </Button>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                {t('extracturl.camera')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.permissionStatus === 'granted' && state.isCapturing ? (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-lg border"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    {!isMobile && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 rounded-lg">
                        <Button 
                          onClick={captureImage} 
                          size="lg"
                          className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg border-2 border-white"
                        >
                          <Camera className="w-6 h-6 mr-2" />
                          {t('extracturl.extractUrl')}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={stopCamera} className="flex-1">
                      <X className="w-4 h-4 mr-2" />
                      {t('common.cancel')}
                    </Button>
                    <Button variant="outline" onClick={retryCamera} className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('extracturl.retryCamera')}
                    </Button>
                  </div>
                </div>
              ) : state.permissionStatus === 'denied' ? (
                <div className="space-y-4">
                  <PermissionStatus 
                    status="denied" 
                    onRequestPermission={requestCameraPermission}
                    t={t}
                  />
                </div>
              ) : state.permissionStatus === 'unsupported' ? (
                <div className="space-y-4">
                  <PermissionStatus 
                    status="unsupported" 
                    onRequestPermission={requestCameraPermission}
                    t={t}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <Button onClick={startCamera} className="w-full">
                    <Camera className="w-4 h-4 mr-2" />
                    {t('extracturl.startCamera')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          <div id="results-section">
            {state.capturedImage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    {t('extracturl.capturedImage')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <img
                      src={state.capturedImage}
                      alt="Captured"
                      className="w-full rounded-lg border"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: 'transform 0.3s ease'
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={rotateImage}
                      className="flex-1"
                    >
                      <RotateCw className="w-4 h-4 mr-2" />
                      {rotation}°
                    </Button>
                    {rotation !== 0 && (
                      <Button 
                        variant="outline" 
                        onClick={resetRotation}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={reRecognize}
                      disabled={state.isProcessing}
                      className="flex-1"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${state.isProcessing ? 'animate-spin' : ''}`} />
                      {state.isProcessing ? t('extracturl.processing') : t('extracturl.reRecognize')}
                    </Button>
                  </div>
                  <Button variant="outline" onClick={retake} className="w-full">
                    <Camera className="w-4 h-4 mr-2" />
                    {t('extracturl.retake')}
                  </Button>
                </CardContent>
              </Card>
            )}
            {state.extractedUrls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="w-5 h-5" />
                    {t('extracturl.extractedUrls')} ({state.extractedUrls.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {state.extractedUrls.map((urlMatch, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={urlMatch.type === 'complete' ? 'default' : 'secondary'}>
                            {urlMatch.type === 'complete' ? t('extracturl.completeUrl') : t('extracturl.autoCompletedUrl')}
                          </Badge>
                        </div>
                        <div className="text-sm">
                          <div className="text-gray-600 mb-1">{t('extracturl.original')}: {urlMatch.original}</div>
                          <div className="font-medium">{t('extracturl.processed')}: {urlMatch.processed}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(urlMatch.processed)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={urlMatch.processed}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Link className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {state.extractedText && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="w-5 h-5" />
                    {t('extracturl.extractedText')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <HighlightedText 
                      text={state.extractedText} 
                      urlMatches={state.extractedUrls} 
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
} 