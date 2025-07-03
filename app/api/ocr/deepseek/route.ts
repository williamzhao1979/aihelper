import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const { imageBase64 } = await req.json();

  // 验证并修复Base64格式
  let processedImage = imageBase64;
  if (!imageBase64.startsWith('data:image')) {
    // 自动添加JPEG前缀（根据日志都是JPEG）
    processedImage = `data:image/jpeg;base64,${imageBase64}`;
  }

  try {
    // 使用最新的官方OCR端点
    const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/ocr';

    const response = await fetch(DEEPSEEK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        image: processedImage,
        language: 'zh',
        detail: true,
      }),
    });

    // 增强错误处理
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status} - ${response.statusText}` };
      }

      console.error('DeepSeek API Error:', {
        status: response.status,
        error: errorData,
        endpoint: DEEPSEEK_ENDPOINT,
        imageLength: processedImage.length
      });

      throw new Error(errorData.error_msg || 'OCR request failed');
    }

    const ocrResult = await response.json();
    return NextResponse.json(ocrResult);
  } catch (error: any) {
    console.error('OCR Processing Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal Server Error',
        details: {
          imageLength: processedImage.length,
          endpoint: 'https://api.deepseek.com/ocr/v1/recognize'
        }
      },
      { status: 500 }
    );
  }
} 