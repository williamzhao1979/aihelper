"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  UploadIcon, 
  RotateCcwIcon, 
  PlayIcon,
  PauseIcon,
  TrophyIcon,
  ClockIcon,
  MousePointerIcon,
  ImageIcon,
  SettingsIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from 'lucide-react';
import { useTranslations } from 'next-intl';

// 华容道棋子类型
interface GamePiece {
  id: string;
  name: string;
  width: number;  // 格子宽度
  height: number; // 格子高度
  x: number;      // 当前x坐标
  y: number;      // 当前y坐标
  color: string;  // 棋子颜色
  isTarget?: boolean; // 是否为目标棋子（曹操）
  backgroundImage?: string; // 棋子背景图片
}

// 游戏状态
interface GameState {
  pieces: GamePiece[];
  moves: number;
  timeElapsed: number;
  isPlaying: boolean;
  isComplete: boolean;
  startTime: number | null;
}

// 经典横刀立马布局
const INITIAL_LAYOUT: GamePiece[] = [
  // 曹操 (2x2) - 目标棋子
  { id: 'caocao', name: '曹操', width: 2, height: 2, x: 1, y: 0, color: 'bg-gradient-to-br from-red-500 to-red-700', isTarget: true },
  
  // 关羽 (2x1) - 横刀
  { id: 'guanyu', name: '关羽', width: 2, height: 1, x: 1, y: 2, color: 'bg-gradient-to-br from-green-500 to-green-700' },
  
  // 四个将军 (1x2) - 立马
  { id: 'zhangfei', name: '张飞', width: 1, height: 2, x: 0, y: 0, color: 'bg-gradient-to-br from-blue-500 to-blue-700' },
  { id: 'zhaoyun', name: '赵云', width: 1, height: 2, x: 3, y: 0, color: 'bg-gradient-to-br from-purple-500 to-purple-700' },
  { id: 'machao', name: '马超', width: 1, height: 2, x: 0, y: 2, color: 'bg-gradient-to-br from-yellow-500 to-yellow-700' },
  { id: 'huangzhong', name: '黄忠', width: 1, height: 2, x: 3, y: 2, color: 'bg-gradient-to-br from-orange-500 to-orange-700' },
  
  // 四个小兵 (1x1)
  { id: 'soldier1', name: '兵一', width: 1, height: 1, x: 1, y: 3, color: 'bg-gradient-to-br from-slate-400 to-slate-600' },
  { id: 'soldier2', name: '兵二', width: 1, height: 1, x: 2, y: 3, color: 'bg-gradient-to-br from-slate-400 to-slate-600' },
  { id: 'soldier3', name: '兵三', width: 1, height: 1, x: 0, y: 4, color: 'bg-gradient-to-br from-slate-400 to-slate-600' },
  { id: 'soldier4', name: '兵四', width: 1, height: 1, x: 3, y: 4, color: 'bg-gradient-to-br from-slate-400 to-slate-600' }
];

const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 5;

const HuarongdaoGame: React.FC = () => {
  const t = useTranslations('huarongdao');
  
  const [gameState, setGameState] = useState<GameState>({
    pieces: [...INITIAL_LAYOUT],
    moves: 0,
    timeElapsed: 0,
    isPlaying: false,
    isComplete: false,
    startTime: null
  });
  
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pieceUploadingId, setPieceUploadingId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pieceFileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 检查位置是否被占用
  const isPositionOccupied = useCallback((x: number, y: number, excludePieceId?: string): boolean => {
    return gameState.pieces.some(piece => {
      if (piece.id === excludePieceId) return false;
      return x >= piece.x && x < piece.x + piece.width && 
             y >= piece.y && y < piece.y + piece.height;
    });
  }, [gameState.pieces]);

  // 检查棋子是否可以移动到指定位置
  const canMovePiece = useCallback((piece: GamePiece, newX: number, newY: number): boolean => {
    // 检查边界
    if (newX < 0 || newY < 0 || newX + piece.width > BOARD_WIDTH || newY + piece.height > BOARD_HEIGHT) {
      return false;
    }
    
    // 检查是否与其他棋子重叠
    for (let x = newX; x < newX + piece.width; x++) {
      for (let y = newY; y < newY + piece.height; y++) {
        if (isPositionOccupied(x, y, piece.id)) {
          return false;
        }
      }
    }
    
    return true;
  }, [isPositionOccupied]);

  // 获取棋子可以移动的方向
  const getPossibleMoves = useCallback((piece: GamePiece): Array<{direction: string, x: number, y: number}> => {
    const moves = [];
    const directions = [
      { direction: 'up', x: piece.x, y: piece.y - 1 },
      { direction: 'down', x: piece.x, y: piece.y + 1 },
      { direction: 'left', x: piece.x - 1, y: piece.y },
      { direction: 'right', x: piece.x + 1, y: piece.y }
    ];
    
    for (const move of directions) {
      if (canMovePiece(piece, move.x, move.y)) {
        moves.push(move);
      }
    }
    
    return moves;
  }, [canMovePiece]);

  // 移动棋子
  const movePiece = useCallback((pieceId: string, newX: number, newY: number) => {
    setGameState(prev => {
      const newPieces = prev.pieces.map(piece => 
        piece.id === pieceId ? { ...piece, x: newX, y: newY } : piece
      );
      
      // 检查是否获胜（曹操到达底部中央位置）
      const caocao = newPieces.find(p => p.id === 'caocao');
      const isComplete = caocao && caocao.x === 1 && caocao.y === 3;
      
      if (isComplete && !prev.isComplete) {
        // 停止计时器
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      
      return {
        ...prev,
        pieces: newPieces,
        moves: prev.moves + 1,
        isComplete: !!isComplete
      };
    });
    
    setSelectedPiece(null);
  }, []);

  // 处理棋子点击（现在主要用于选择，拖拽在mouseDown中处理）
  const handlePieceClick = useCallback((pieceId: string) => {
    if (gameState.isComplete || isDragging) return;
    
    if (selectedPiece === pieceId) {
      setSelectedPiece(null);
      return;
    }
    
    setSelectedPiece(pieceId);
  }, [gameState.isComplete, isDragging, selectedPiece]);

  // 处理方向键移动
  const handleDirectionMove = useCallback((direction: string) => {
    if (!selectedPiece || gameState.isComplete) return;
    
    const piece = gameState.pieces.find(p => p.id === selectedPiece);
    if (!piece) return;
    
    let newX = piece.x;
    let newY = piece.y;
    
    switch (direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }
    
    if (canMovePiece(piece, newX, newY)) {
      movePiece(selectedPiece, newX, newY);
    }
  }, [selectedPiece, gameState, canMovePiece, movePiece]);

  // 重置游戏
  const resetGame = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setGameState({
      pieces: [...INITIAL_LAYOUT],
      moves: 0,
      timeElapsed: 0,
      isPlaying: false,
      isComplete: false,
      startTime: null
    });
    
    setSelectedPiece(null);
  }, []);

  // 开始游戏
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isPlaying: true,
      startTime: Date.now()
    }));
    
    // 启动计时器
    intervalRef.current = setInterval(() => {
      setGameState(prev => {
        if (!prev.isPlaying || prev.isComplete) return prev;
        return {
          ...prev,
          timeElapsed: prev.startTime ? Math.floor((Date.now() - prev.startTime) / 1000) : 0
        };
      });
    }, 1000);
  }, []);

  // 暂停游戏
  const pauseGame = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setGameState(prev => ({
      ...prev,
      isPlaying: false
    }));
  }, []);

  // 处理棋盘背景图片上传
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBackgroundImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // 处理棋子背景图片上传
  const handlePieceImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/') && pieceUploadingId) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setGameState(prev => ({
          ...prev,
          pieces: prev.pieces.map(piece => 
            piece.id === pieceUploadingId 
              ? { ...piece, backgroundImage: imageUrl }
              : piece
          )
        }));
        setPieceUploadingId(null);
      };
      reader.readAsDataURL(file);
    }
  }, [pieceUploadingId]);

  // 处理棋子右键点击（上传图片）
  const handlePieceRightClick = useCallback((event: React.MouseEvent, pieceId: string) => {
    event.preventDefault();
    setPieceUploadingId(pieceId);
    pieceFileInputRef.current?.click();
  }, []);

  // 鼠标按下事件
  const handleMouseDown = useCallback((event: React.MouseEvent, pieceId: string) => {
    if (gameState.isComplete) return;
    
    // 右键点击处理图片上传
    if (event.button === 2) {
      handlePieceRightClick(event, pieceId);
      return;
    }
    
    // 左键点击处理拖拽
    if (event.button === 0) {
      const piece = gameState.pieces.find(p => p.id === pieceId);
      if (!piece) return;
      
      const rect = event.currentTarget.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      
      setDraggedPiece(pieceId);
      setSelectedPiece(pieceId);
      setDragOffset({ x: offsetX, y: offsetY });
      setIsDragging(true);
      
      event.preventDefault();
    }
  }, [gameState, handlePieceRightClick]);

  // 鼠标移动事件
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !draggedPiece) return;
    
    const boardElement = document.querySelector('[data-board="true"]') as HTMLElement;
    if (!boardElement) return;
    
    const boardRect = boardElement.getBoundingClientRect();
    const mouseX = event.clientX - boardRect.left - dragOffset.x;
    const mouseY = event.clientY - boardRect.top - dragOffset.y;
    
    // 计算网格位置
    const gridX = Math.round((mouseX - 8) / 96);
    const gridY = Math.round((mouseY - 8) / 96);
    
    const piece = gameState.pieces.find(p => p.id === draggedPiece);
    if (piece && canMovePiece(piece, gridX, gridY)) {
      // 实时预览移动位置
      const draggedElement = document.querySelector(`[data-piece-id="${draggedPiece}"]`) as HTMLElement;
      if (draggedElement) {
        draggedElement.style.left = `${8 + gridX * 96}px`;
        draggedElement.style.top = `${8 + gridY * 96}px`;
        draggedElement.style.zIndex = '1000';
        draggedElement.style.opacity = '0.8';
      }
    }
  }, [isDragging, draggedPiece, dragOffset, gameState.pieces, canMovePiece]);

  // 鼠标释放事件
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (!isDragging || !draggedPiece) return;
    
    const boardElement = document.querySelector('[data-board="true"]') as HTMLElement;
    if (!boardElement) return;
    
    const boardRect = boardElement.getBoundingClientRect();
    const mouseX = event.clientX - boardRect.left - dragOffset.x;
    const mouseY = event.clientY - boardRect.top - dragOffset.y;
    
    // 计算网格位置
    const gridX = Math.round((mouseX - 8) / 96);
    const gridY = Math.round((mouseY - 8) / 96);
    
    const piece = gameState.pieces.find(p => p.id === draggedPiece);
    if (piece && canMovePiece(piece, gridX, gridY)) {
      movePiece(draggedPiece, gridX, gridY);
    }
    
    // 重置拖拽状态和样式
    const draggedElement = document.querySelector(`[data-piece-id="${draggedPiece}"]`) as HTMLElement;
    if (draggedElement) {
      draggedElement.style.zIndex = '';
      draggedElement.style.opacity = '';
    }
    
    setDraggedPiece(null);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, [isDragging, draggedPiece, dragOffset, gameState.pieces, canMovePiece, movePiece]);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 格式化时间
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!selectedPiece) return;
      
      switch (event.key) {
        case 'ArrowUp': handleDirectionMove('up'); break;
        case 'ArrowDown': handleDirectionMove('down'); break;
        case 'ArrowLeft': handleDirectionMove('left'); break;
        case 'ArrowRight': handleDirectionMove('right'); break;
        case 'Escape': setSelectedPiece(null); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedPiece, handleDirectionMove]);

  // 清理计时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const selectedPieceData = selectedPiece ? gameState.pieces.find(p => p.id === selectedPiece) : null;
  const possibleMoves = selectedPieceData ? getPossibleMoves(selectedPieceData) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Game Controls */}
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-white/20">
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-red-600" />
                {t('controls.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Background Image Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  {t('controls.backgroundImage')}
                </label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {/* 棋子图片上传 */}
                  <input
                    ref={pieceFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePieceImageUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full border-2 border-dashed border-slate-300 hover:border-red-400 text-slate-600 hover:text-red-700 font-semibold py-3 rounded-xl transition-all duration-300"
                  >
                    <UploadIcon className="w-5 h-5 mr-2" />
                    {t('controls.selectImage')}
                  </Button>
                </div>
                {backgroundImage && (
                  <div className="text-xs text-green-600 text-center">
                    ✓ {t('controls.imageUploaded')}
                  </div>
                )}
              </div>

              {/* Game Control Buttons */}
              <div className="space-y-3">
                {!gameState.isPlaying ? (
                  <Button
                    onClick={startGame}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300"
                  >
                    <PlayIcon className="w-5 h-5 mr-2" />
                    {t('controls.start')}
                  </Button>
                ) : (
                  <Button
                    onClick={pauseGame}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300"
                  >
                    <PauseIcon className="w-5 h-5 mr-2" />
                    {t('controls.pause')}
                  </Button>
                )}
                
                <Button
                  onClick={resetGame}
                  variant="outline"
                  className="w-full border-2 border-red-300 hover:border-red-400 text-red-700 font-semibold py-3 rounded-xl transition-all duration-300"
                >
                  <RotateCcwIcon className="w-5 h-5 mr-2" />
                  {t('controls.reset')}
                </Button>

                <Button
                  onClick={() => setShowInstructions(!showInstructions)}
                  variant="outline"
                  className="w-full border-2 border-blue-300 hover:border-blue-400 text-blue-700 font-semibold py-3 rounded-xl transition-all duration-300"
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  {showInstructions ? t('controls.hideHelp') : t('controls.showHelp')}
                </Button>
              </div>

              {/* Movement Controls */}
              {selectedPiece && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-slate-700">{t('controls.moveSelected')}</h4>
                  <div className="grid grid-cols-3 gap-2 max-w-32 mx-auto">
                    <div></div>
                    <Button
                      onClick={() => handleDirectionMove('up')}
                      size="sm"
                      variant="outline"
                      className="aspect-square"
                      disabled={!possibleMoves.some(m => m.direction === 'up')}
                    >
                      <ArrowUpIcon className="w-4 h-4" />
                    </Button>
                    <div></div>
                    
                    <Button
                      onClick={() => handleDirectionMove('left')}
                      size="sm"
                      variant="outline"
                      className="aspect-square"
                      disabled={!possibleMoves.some(m => m.direction === 'left')}
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center justify-center text-xs text-slate-500">
                      {selectedPieceData?.name}
                    </div>
                    <Button
                      onClick={() => handleDirectionMove('right')}
                      size="sm"
                      variant="outline"
                      className="aspect-square"
                      disabled={!possibleMoves.some(m => m.direction === 'right')}
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </Button>
                    
                    <div></div>
                    <Button
                      onClick={() => handleDirectionMove('down')}
                      size="sm"
                      variant="outline"
                      className="aspect-square"
                      disabled={!possibleMoves.some(m => m.direction === 'down')}
                    >
                      <ArrowDownIcon className="w-4 h-4" />
                    </Button>
                    <div></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Game Stats */}
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-white/20">
              <CardTitle className="flex items-center gap-2">
                <StarIcon className="w-6 h-6 text-blue-600" />
                {t('stats.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-700">{t('stats.time')}</span>
                  </div>
                  <span className="text-xl font-bold text-blue-700">
                    {formatTime(gameState.timeElapsed)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <MousePointerIcon className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-slate-700">{t('stats.moves')}</span>
                  </div>
                  <span className="text-xl font-bold text-green-700">{gameState.moves}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-slate-700">{t('stats.status')}</span>
                  </div>
                  <Badge className={gameState.isComplete ? 'bg-yellow-500' : 'bg-slate-400'}>
                    {gameState.isComplete ? t('stats.completed') : t('stats.playing')}
                  </Badge>
                </div>

                {gameState.isComplete && (
                  <div className="text-center p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl border-2 border-yellow-300">
                    <div className="text-2xl mb-2">🎉</div>
                    <div className="font-bold text-orange-700">{t('game.victory')}</div>
                    <div className="text-sm text-orange-600">
                      {formatTime(gameState.timeElapsed)} • {gameState.moves} {t('stats.movesCount')}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          {showInstructions && (
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-white/20">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-6 h-6 text-amber-600" />
                  {t('instructions.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 text-sm text-slate-700">
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">{t('instructions.objective')}</h4>
                    <p>{t('instructions.objectiveDesc')}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">{t('instructions.howToPlay')}</h4>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>{t('instructions.step1')}</li>
                      <li>{t('instructions.step2')}</li>
                      <li>{t('instructions.step3')}</li>
                      <li>{t('instructions.step4')}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800 mb-2">{t('instructions.pieces')}</h4>
                    <ul className="space-y-1 text-xs">
                      <li><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>{t('pieces.caocao')}</li>
                      <li><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>{t('pieces.guanyu')}</li>
                      <li><span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>{t('pieces.generals')}</li>
                      <li><span className="inline-block w-3 h-3 bg-slate-500 rounded mr-2"></span>{t('pieces.soldiers')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Game Board */}
        <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-white/20">
            <CardTitle className="text-center">
              {t('game.boardTitle')} - {t('layout.hengdaolima')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div 
                data-board="true"
                className="relative bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl shadow-inner border-4 border-amber-300"
                style={{ 
                  width: '400px', 
                  height: '500px',
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundBlendMode: backgroundImage ? 'overlay' : 'normal'
                }}
              >
                {/* Grid lines */}
                <div className="absolute inset-2 grid grid-cols-4 grid-rows-5 gap-1">
                  {Array.from({ length: 20 }).map((_, index) => (
                    <div key={index} className="border border-amber-300/30 rounded-sm" />
                  ))}
                </div>
                
                {/* Game pieces */}
                {gameState.pieces.map((piece) => (
                  <div
                    key={piece.id}
                    data-piece-id={piece.id}
                    className={`
                      absolute cursor-pointer select-none transition-all duration-300 rounded-xl border-2 shadow-lg overflow-hidden
                      ${!piece.backgroundImage ? piece.color : 'bg-white'}
                      ${selectedPiece === piece.id 
                        ? 'ring-4 ring-yellow-400 ring-opacity-75 scale-105 border-yellow-300' 
                        : 'border-white/50 hover:scale-105 hover:shadow-xl'
                      }
                      ${piece.isTarget ? 'ring-2 ring-red-300' : ''}
                      ${isDragging && draggedPiece === piece.id ? 'cursor-grabbing' : 'cursor-grab'}
                    `}
                    style={{
                      left: `${8 + piece.x * 96}px`,
                      top: `${8 + piece.y * 96}px`,
                      width: `${piece.width * 96 - 4}px`,
                      height: `${piece.height * 96 - 4}px`,
                      backgroundImage: piece.backgroundImage ? `url(${piece.backgroundImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundBlendMode: piece.backgroundImage ? 'overlay' : 'normal'
                    }}
                    onClick={() => handlePieceClick(piece.id)}
                    onMouseDown={(e) => handleMouseDown(e, piece.id)}
                    onContextMenu={(e) => handlePieceRightClick(e, piece.id)}
                  >
                    <div className="flex items-center justify-center h-full text-white font-bold text-shadow">
                      <span className={`
                        ${piece.width === 2 && piece.height === 2 ? 'text-xl' : ''}
                        ${piece.width === 2 && piece.height === 1 ? 'text-lg' : ''}
                        ${piece.width === 1 && piece.height === 2 ? 'text-base' : ''}
                        ${piece.width === 1 && piece.height === 1 ? 'text-sm' : ''}
                      `}>
                        {piece.name}
                      </span>
                    </div>
                    
                    {/* Target indicator for Cao Cao */}
                    {piece.isTarget && (
                      <div className="absolute -top-2 -right-2">
                        <TrophyIcon className="w-6 h-6 text-yellow-500" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Exit area indicator */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-48 h-24 border-4 border-dashed border-yellow-400 rounded-xl bg-yellow-200/30 flex items-center justify-center">
                  <div className="text-yellow-700 font-bold text-center">
                    <TrophyIcon className="w-8 h-8 mx-auto mb-1" />
                    <div className="text-xs">{t('game.exitArea')}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {!gameState.isPlaying && !gameState.isComplete && (
              <div className="text-center mt-6 text-sm text-slate-600">
                {t('game.clickStart')}
              </div>
            )}
            
            {gameState.isPlaying && !gameState.isComplete && (
              <div className="text-center mt-6 text-sm text-slate-600">
                {selectedPiece 
                  ? t('game.pieceSelected').replace('{piece}', selectedPieceData?.name || '')
                  : t('game.selectPiece')
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HuarongdaoGame;