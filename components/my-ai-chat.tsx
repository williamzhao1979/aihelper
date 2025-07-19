'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import TextEditModal from './text-edit-modal';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  type?: 'normal' | 'text-edit-result';
  data?: any;
}

// 图片预览组件
const ImagePreviewGrid = ({ images }: { images: any[] }) => {
  if (!images || images.length === 0) return null;
  
  return (
    <div className="my-3">
      <div className="text-xs text-gray-600 mb-2 font-medium">📷 处理图片 ({images.length}张)</div>
      <div className="grid grid-cols-2 gap-2 max-w-sm">
        {images.map((img: any, index: number) => (
          <div key={img.id || index} className="relative group">
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
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

  const addMessage = (text: string, sender: 'user' | 'ai', type: 'normal' | 'text-edit-result' = 'normal', data?: any): void => {
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

  // 处理文章修改结果
  const handleTextEditResult = (result: any) => {
    console.log('handleTextEditResult received:', result);
    let resultMessage = '';
    
    if (result.type === 'text-edit-processing') {
      // 处理中消息
      resultMessage = `🔄 **文章修改处理中**\n\n`;
      resultMessage += `📊 **处理信息：**\n`;
      resultMessage += `• 图片数量：${result.imageCount} 张\n`;
      resultMessage += `• 处理方式：${result.processingType}\n`;
      resultMessage += `• 状态：正在处理中，请稍候...\n\n`;
      resultMessage += `⏳ 预计处理时间：2-3秒`;
    } else if (!result.success) {
      resultMessage = `❌ 文章修改处理失败：${result.error || '未知错误'}`;
    } else if (result.merged && result.result) {
      // 合并处理结果
      resultMessage = `✅ **文章修改完成** (${result.result.image_count} 张图片)\n\n`;
      resultMessage += `🌐 **检测语言：** ${result.result.lang === 'zh' ? '中文' : result.result.lang}\n\n`;
      resultMessage += `📄 **原文内容：**\n${result.result.text}\n\n`;
      resultMessage += `✨ **修改建议：**\n`;
      result.result.advice.forEach((advice: string, index: number) => {
        resultMessage += `${index + 1}. ${advice}\n`;
      });
      resultMessage += `\n📝 **优化后内容：**\n${result.result.text_refined}`;
    } else if (result.results && result.results.length > 0) {
      // 单独处理结果
      resultMessage = `✅ **文章修改完成** (${result.results.length} 张图片)\n\n`;
      result.results.forEach((item: any, index: number) => {
        if (item.success && item.result) {
          resultMessage += `**📷 图片 ${index + 1}：${item.imageName}**\n`;
          resultMessage += `📄 原文：${item.result.text}\n`;
          resultMessage += `✨ 建议：${item.result.advice.join('，')}\n`;
          resultMessage += `📝 优化：${item.result.text_refined}\n\n`;
        } else {
          resultMessage += `**📷 图片 ${index + 1}：${item.imageName}** ❌ ${item.error || '处理失败'}\n\n`;
        }
      });
    }
    
    addMessage(resultMessage, 'ai', 'text-edit-result', result);
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

  const extractURLs = (text: string): string => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls ? urls.join('\n') : t('noUrlDetected');
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
      case 'url':
        if (inputValue.trim()) {
          addMessage(`[${t('urlExtractionResult')}]: ${extractURLs(inputValue)}`, 'ai');
        } else {
          addMessage(t('pleaseEnterText'), 'ai');
        }
        break;
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

  return (
    <div className="flex flex-col h-screen bg-white text-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-500 text-white p-3 text-center font-bold text-lg relative shadow-sm z-10">
        {t('title')}
      </div>

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 pb-32 bg-gray-50"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 flex flex-col max-w-[85%] ${
              message.sender === 'user' ? 'self-end' : 'self-start'
            }`}
          >
            <div
              className={`p-3 shadow-sm ${
                message.sender === 'user'
                  ? 'bg-white rounded-[18px_18px_0_18px]'
                  : 'bg-gray-50 rounded-[18px_18px_18px_0]'
              }`}
            >
              {/* 图片预览 - 仅对文章修改结果显示 */}
              {message.type === 'text-edit-result' && message.data?.imagePreview && (
                <ImagePreviewGrid images={message.data.imagePreview} />
              )}
              
              <div className={`leading-6 text-base ${
                message.type === 'text-edit-result' ? 'whitespace-pre-wrap' : ''
              }`}>
                {message.text}
              </div>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white p-2 border-t border-gray-200 flex flex-col z-10">
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

            <button
              className="w-10 h-10 rounded-full bg-indigo-500 text-white border-none flex items-center justify-center ml-2 cursor-pointer active:bg-indigo-600"
              onClick={() => cameraInputRef.current?.click()}
              title={t('takePhoto')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="white"/>
                <path d="M20 4H16.83L15.59 2.65C15.22 2.24 14.68 2 14.12 2H9.88C9.32 2 8.78 2.24 8.4 2.65L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="white"/>
              </svg>
            </button>

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
          <button
            className="bg-transparent border-none text-indigo-500 text-sm flex items-center py-1.5 px-3 rounded-2xl cursor-pointer active:bg-indigo-50"
            onClick={() => handleToolbarAction('url')}
          >
            <svg className="mr-1 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"/>
            </svg>
            {t('urlExtraction')}
          </button>

          <TextEditModal onResult={handleTextEditResult}>
            <button className="bg-transparent border-none text-indigo-500 text-sm flex items-center py-1.5 px-3 rounded-2xl cursor-pointer active:bg-indigo-50">
              <svg className="mr-1 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              {t('articleEdit')}
            </button>
          </TextEditModal>

          <button
            className="bg-transparent border-none text-indigo-500 text-sm flex items-center py-1.5 px-3 rounded-2xl cursor-pointer active:bg-indigo-50"
            onClick={() => handleToolbarAction('art')}
          >
            <svg className="mr-1 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <path d="M8.5 15.5l4.71-4.71 2.79 2.79 1.41-1.41-2.79-2.79L15.5 8.5z"/>
            </svg>
            {t('artCritique')}
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
    </div>
  );
}
