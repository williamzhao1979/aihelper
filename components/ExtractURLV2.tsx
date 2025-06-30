"use client"
import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Camera, Copy, Link, RefreshCw, X, CheckCircle, Settings, RotateCw, RotateCcw } from "lucide-react"
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

// PermissionStatus组件（从V1复制，适配V2状态）
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
          <span className="text-sm">{t('permissionGranted')}</span>
        </div>
      )
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

export default function ExtractURLV2() {
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

  // 摄像头权限和流初始化
  useEffect(() => {
    if (!state.isCapturing) return;
    let stream: MediaStream;
    const getCamera = async () => {
      setState(s => ({ ...s, isCheckingPermission: true, error: null }));
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setState(s => ({ ...s, cameraStream: stream, permissionStatus: 'granted', isCheckingPermission: false }));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e: any) {
        setState(s => ({ ...s, error: t('camera_permission_denied'), permissionStatus: 'denied', isCheckingPermission: false }));
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.drawImage(video, 0, 0, vw, vh);
    ctx.restore();
    const processedImage = preprocessCanvas(canvas);
    setState(s => ({
      ...s,
      capturedImage: processedImage,
      isProcessing: true,
      ocrProgress: 0,
      ocrStatus: t('ocr_processing'),
      isCapturing: false
    }));
    setModalOpen(true);
    // 真实OCR识别
    try {
      let lang = 'eng';
      if (locale === 'zh') lang = 'chi_sim+eng';
      else if (locale === 'ja') lang = 'jpn+eng';
      setState(s => ({ ...s, ocrProgress: 10, ocrStatus: t('initializingOCR') }));
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker();
      setState(s => ({ ...s, ocrProgress: 20, ocrStatus: t('loadingLanguage') }));
      await worker.load();
      await (worker as any).loadLanguage(lang);
      await (worker as any).initialize(lang);
      setState(s => ({ ...s, ocrProgress: 40, ocrStatus: t('recognizingText') }));
      const { data: { text } } = await worker.recognize(processedImage);
      setState(s => ({ ...s, ocrProgress: 80, ocrStatus: t('extractingUrls') }));
      const urls = processURLs(text);
      setState(s => ({
        ...s,
        extractedText: text,
        extractedUrls: urls,
        isProcessing: false,
        ocrProgress: 100,
        ocrStatus: t('completed'),
      }));
      await worker.terminate();
    } catch (error) {
      setState(s => ({
        ...s,
        error: t('ocrError'),
        isProcessing: false,
        ocrProgress: 0,
        ocrStatus: ''
      }));
    }
  };

  // 重新拍摄
  const handleRetake = () => {
    setModalOpen(false);
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
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-4">
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
        {/* 遮罩禁用层 */}
        {!state.isCapturing && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center" />
        )}
        {/* 权限/错误提示 */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <PermissionStatus status={state.permissionStatus} onRequestPermission={() => setState(s => ({ ...s, isCapturing: true, error: null, permissionStatus: 'prompt' }))} t={t} />
        </div>
        {state.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-30">
            <div className="text-red-600 text-center">{state.error}</div>
          </div>
        )}
      </div>
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
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) handleRetake(); }}>
        <DialogContent className="max-w-md w-full">
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
          {/* 识别文本（始终显示） */}
          <div className="my-2">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <Badge>{t('ocr_text') || 'Recognized Text'}</Badge>
            </div>
            {state.extractedText
              ? <HighlightedText text={state.extractedText} urlMatches={state.extractedUrls} />
              : <div className="text-gray-400 text-sm">{t('noTextFound') || 'No text recognized.'}</div>
            }
          </div>
          {/* URL提取（始终显示） */}
          <div className="my-2">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <Link className="w-4 h-4" />
              {t('extracted_urls') || 'Extracted URLs'}
            </div>
            {state.extractedUrls.length > 0
              ? (
                <div className="flex flex-col gap-1">
                  {state.extractedUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url.processed}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline text-sm break-all"
                    >
                      {url.processed}
                    </a>
                  ))}
                </div>
              )
              : <div className="text-gray-400 text-sm">{t('noUrlsFound') || 'No URLs found.'}</div>
            }
          </div>
          {/* 识别文本卡片（V1风格） */}
          {state.extractedText && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  {t('extractedText') || 'Recognized Text'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <HighlightedText text={state.extractedText} urlMatches={state.extractedUrls} />
                </div>
              </CardContent>
            </Card>
          )}
          {/* 重新拍摄按钮 */}
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleRetake}
          >
            <RefreshCw className="w-4 h-4 mr-2" />{t('retake') || 'Retake'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
} 