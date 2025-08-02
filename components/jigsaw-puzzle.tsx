"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { 
  UploadIcon, 
  PlayIcon, 
  PauseIcon, 
  RotateCcwIcon, 
  ShuffleIcon,
  CheckCircleIcon,
  ClockIcon,
  MousePointerIcon,
  ImageIcon,
  SettingsIcon,
  StarIcon
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PuzzlePiece {
  id: number;
  currentPosition: number;
  correctPosition: number;
  imageX: number;
  imageY: number;
  width: number;
  height: number;
  isCorrect: boolean;
}

interface GameStats {
  moves: number;
  timeElapsed: number;
  isComplete: boolean;
  difficulty: string;
}

const JigsawPuzzle: React.FC = () => {
  const t = useTranslations('puzzle');
  
  // Preset images
  const presetImages = [
    {
      id: 'peruere',
      src: '/Peruere.png',
      name: t('presets.peruere'),
      category: 'character'
    },
    {
      id: 'aether-lumine',
      src: '/AetherLumine.png',
      name: t('presets.aetherLumine'),
      category: 'character'
    },
    {
      id: 'family',
      src: '/family1.jpg',
      name: t('presets.family'),
      category: 'photo'
    },
    {
      id: 'cute',
      src: '/poop2.jpg',
      name: t('presets.cute'),
      category: 'fun'
    }
  ];
  
  const [image, setImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [cols, setCols] = useState<number[]>([4]);
  const [rows, setRows] = useState<number[]>([3]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [stats, setStats] = useState<GameStats>({
    moves: 0,
    timeElapsed: 0,
    isComplete: false,
    difficulty: 'medium'
  });
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [draggedPiece, setDraggedPiece] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle preset image selection
  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = presetImages.find(p => p.id === presetId);
    if (preset) {
      setImage(preset.src);
      setSelectedPreset(presetId);
      setGameStarted(false);
      setPieces([]);
      setStats(prev => ({ ...prev, moves: 0, timeElapsed: 0, isComplete: false }));
    }
  }, [presetImages]);

  // Handle image upload
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setSelectedPreset(null); // Clear preset selection when uploading custom image
        setGameStarted(false);
        setPieces([]);
        setStats(prev => ({ ...prev, moves: 0, timeElapsed: 0, isComplete: false }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Generate puzzle pieces
  const generatePieces = useCallback(() => {
    if (!image) return;

    const totalPieces = cols[0] * rows[0];
    const newPieces: PuzzlePiece[] = [];
    
    const pieceWidth = 400 / cols[0];
    const pieceHeight = 300 / rows[0];

    for (let i = 0; i < totalPieces; i++) {
      const row = Math.floor(i / cols[0]);
      const col = i % cols[0];
      
      newPieces.push({
        id: i,
        currentPosition: i,
        correctPosition: i,
        imageX: col * pieceWidth,
        imageY: row * pieceHeight,
        width: pieceWidth,
        height: pieceHeight,
        isCorrect: true
      });
    }

    setPieces(newPieces);
  }, [image, cols, rows]);

  // Shuffle pieces
  const shufflePieces = useCallback(() => {
    if (pieces.length === 0) return;

    const shuffled = [...pieces];
    const positions = shuffled.map((_, index) => index);
    
    // Fisher-Yates shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const newPieces = shuffled.map((piece, index) => ({
      ...piece,
      currentPosition: positions[index],
      isCorrect: positions[index] === piece.correctPosition
    }));

    setPieces(newPieces);
    setGameStarted(true);
    const currentDifficulty = getDifficulty();
    setStats(prev => ({ 
      ...prev, 
      moves: 0, 
      timeElapsed: 0, 
      isComplete: false,
      difficulty: currentDifficulty
    }));
    
    // Start timer
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setStats(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 1 }));
    }, 1000);
  }, [pieces]);

  // Get difficulty level
  const getDifficulty = useCallback(() => {
    const total = cols[0] * rows[0];
    if (total <= 6) return 'easy';
    if (total <= 12) return 'medium';
    if (total <= 24) return 'hard';
    return 'expert';
  }, [cols, rows]);

  // Handle piece selection and swapping
  const handlePieceClick = useCallback((pieceId: number) => {
    if (!gameStarted || stats.isComplete) return;

    if (selectedPiece === null) {
      setSelectedPiece(pieceId);
    } else if (selectedPiece === pieceId) {
      setSelectedPiece(null);
    } else {
      // Swap pieces
      const newPieces = pieces.map(piece => {
        if (piece.id === selectedPiece) {
          const targetPiece = pieces.find(p => p.id === pieceId);
          return {
            ...piece,
            currentPosition: targetPiece!.currentPosition,
            isCorrect: targetPiece!.currentPosition === piece.correctPosition
          };
        } else if (piece.id === pieceId) {
          const selectedPieceData = pieces.find(p => p.id === selectedPiece);
          return {
            ...piece,
            currentPosition: selectedPieceData!.currentPosition,
            isCorrect: selectedPieceData!.currentPosition === piece.correctPosition
          };
        }
        return piece;
      });

      setPieces(newPieces);
      setSelectedPiece(null);
      setStats(prev => ({ ...prev, moves: prev.moves + 1 }));

      // Check if puzzle is complete
      const isComplete = newPieces.every(piece => piece.isCorrect);
      if (isComplete) {
        setStats(prev => ({ ...prev, isComplete: true }));
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  }, [gameStarted, selectedPiece, pieces, stats.isComplete]);

  // Handle drag and drop
  const handleDragStart = useCallback((e: React.DragEvent, pieceId: number) => {
    setDraggedPiece(pieceId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetPieceId: number) => {
    e.preventDefault();
    
    if (draggedPiece !== null && draggedPiece !== targetPieceId) {
      handlePieceClick(draggedPiece);
      handlePieceClick(targetPieceId);
    }
    
    setDraggedPiece(null);
  }, [draggedPiece, handlePieceClick]);

  // Reset game
  const resetGame = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setGameStarted(false);
    setSelectedPiece(null);
    setStats({ moves: 0, timeElapsed: 0, isComplete: false, difficulty: 'medium' });
    generatePieces();
  }, [generatePieces]);

  // Format time
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Generate pieces when image or grid size changes
  useEffect(() => {
    if (image) {
      generatePieces();
    }
  }, [image, generatePieces]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentDifficulty = getDifficulty();
  const difficultyColors = {
    easy: 'bg-green-500',
    medium: 'bg-yellow-500',
    hard: 'bg-orange-500',
    expert: 'bg-red-500'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Game Controls */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Upload & Settings */}
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-white/20">
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-purple-600" />
                {t('settings.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Preset Images */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  {t('settings.presetImages')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {presetImages.map((preset) => (
                    <div
                      key={preset.id}
                      className={`
                        relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 group
                        ${selectedPreset === preset.id 
                          ? 'border-purple-500 ring-2 ring-purple-300 ring-opacity-50' 
                          : 'border-slate-200 hover:border-purple-300'
                        }
                      `}
                      onClick={() => handlePresetSelect(preset.id)}
                    >
                      <div className="aspect-[4/3] bg-slate-100">
                        <img
                          src={preset.src}
                          alt={preset.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="text-white text-xs font-medium truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {preset.name}
                        </div>
                      </div>
                      {selectedPreset === preset.id && (
                        <div className="absolute top-2 right-2">
                          <CheckCircleIcon className="w-5 h-5 text-purple-500 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Image Upload */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">
                  {t('settings.uploadImage')}
                </label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full border-2 border-dashed border-slate-300 hover:border-purple-400 text-slate-600 hover:text-purple-700 font-semibold py-3 rounded-xl transition-all duration-300"
                  >
                    <UploadIcon className="w-5 h-5 mr-2" />
                    {t('settings.selectImage')}
                  </Button>
                </div>
              </div>

              {/* Grid Size Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('settings.columns')}: {cols[0]}
                  </label>
                  <Slider
                    value={cols}
                    onValueChange={setCols}
                    min={2}
                    max={8}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {t('settings.rows')}: {rows[0]}
                  </label>
                  <Slider
                    value={rows}
                    onValueChange={setRows}
                    min={2}
                    max={6}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Difficulty Display */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl">
                <span className="text-sm font-medium text-slate-700">{t('stats.difficulty')}:</span>
                <Badge className={`${difficultyColors[currentDifficulty]} text-white`}>
                  {t(`difficulty.${currentDifficulty}`)} ({cols[0]}×{rows[0]})
                </Badge>
              </div>

              {/* Game Controls */}
              <div className="space-y-3">
                <Button
                  onClick={shufflePieces}
                  disabled={!image}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  <ShuffleIcon className="w-5 h-5 mr-2" />
                  {t('controls.start')}
                </Button>
                
                <Button
                  onClick={resetGame}
                  disabled={!gameStarted}
                  variant="outline"
                  className="w-full border-2 border-purple-300 hover:border-purple-400 text-purple-700 font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50"
                >
                  <RotateCcwIcon className="w-5 h-5 mr-2" />
                  {t('controls.reset')}
                </Button>

                <Button
                  onClick={() => setShowPreview(!showPreview)}
                  disabled={!image}
                  variant="outline"
                  className="w-full border-2 border-indigo-300 hover:border-indigo-400 text-indigo-700 font-semibold py-3 rounded-xl transition-all duration-300 disabled:opacity-50"
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  {showPreview ? t('controls.hidePreview') : t('controls.showPreview')}
                </Button>
              </div>
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
                    {formatTime(stats.timeElapsed)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <MousePointerIcon className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-slate-700">{t('stats.moves')}</span>
                  </div>
                  <span className="text-xl font-bold text-green-700">{stats.moves}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-slate-700">{t('stats.progress')}</span>
                  </div>
                  <span className="text-xl font-bold text-purple-700">
                    {pieces.filter(p => p.isCorrect).length} / {pieces.length}
                  </span>
                </div>

                {stats.isComplete && (
                  <div className="text-center p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl border-2 border-yellow-300">
                    <div className="text-2xl mb-2">🎉</div>
                    <div className="font-bold text-orange-700">{t('game.completed')}</div>
                    <div className="text-sm text-orange-600">
                      {formatTime(stats.timeElapsed)} • {stats.moves} {t('stats.movesCount')}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Image Preview */}
          {showPreview && image && (
            <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-white/20">
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-6 h-6 text-indigo-600" />
                  {t('preview.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="aspect-[4/3] rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Puzzle Board */}
        {image && pieces.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-b border-white/20">
              <CardTitle className="text-center">
                {t('game.puzzleBoard')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex justify-center">
                <div 
                  className="grid gap-1 p-4 bg-slate-100 rounded-2xl shadow-inner"
                  style={{ 
                    gridTemplateColumns: `repeat(${cols[0]}, 1fr)`,
                    gridTemplateRows: `repeat(${rows[0]}, 1fr)`,
                    width: '480px',
                    height: '360px'
                  }}
                >
                  {Array.from({ length: cols[0] * rows[0] }).map((_, position) => {
                    const piece = pieces.find(p => p.currentPosition === position);
                    const isEmpty = !piece;
                    
                    return (
                      <div
                        key={position}
                        className={`
                          relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 border-2
                          ${isEmpty ? 'bg-slate-200 border-slate-300' : ''}
                          ${selectedPiece === piece?.id ? 'ring-4 ring-purple-400 ring-opacity-75 scale-105' : ''}
                          ${piece?.isCorrect ? 'border-green-400' : 'border-slate-300'}
                          ${!isEmpty ? 'hover:scale-105 hover:shadow-lg' : ''}
                        `}
                        onClick={() => piece && handlePieceClick(piece.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => piece && handleDrop(e, piece.id)}
                        style={{
                          backgroundImage: piece ? `url(${image})` : 'none',
                          backgroundPosition: piece ? `-${piece.imageX}px -${piece.imageY}px` : 'none',
                          backgroundSize: '480px 360px',
                          backgroundRepeat: 'no-repeat'
                        }}
                        draggable={!!piece && gameStarted}
                        onDragStart={(e) => piece && handleDragStart(e, piece.id)}
                      >
                        {piece?.isCorrect && (
                          <div className="absolute top-1 right-1">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          </div>
                        )}
                        {isEmpty && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-slate-400 text-sm font-medium">
                              {position + 1}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {gameStarted && !stats.isComplete && (
                <div className="text-center mt-6 text-sm text-slate-600">
                  {t('game.instructions')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!image && (
          <Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="space-y-6">
                <div className="text-6xl mb-4">🧩</div>
                <h3 className="text-2xl font-bold text-slate-700">{t('emptyState.title')}</h3>
                <p className="text-slate-600 max-w-md mx-auto">{t('emptyState.description')}</p>
                
                {/* Quick Preset Selection */}
                <div className="space-y-4">
                  <p className="text-sm font-medium text-slate-600">{t('emptyState.quickStart')}</p>
                  <div className="flex flex-wrap justify-center gap-4 max-w-lg mx-auto">
                    {presetImages.map((preset) => (
                      <div
                        key={preset.id}
                        className="relative cursor-pointer rounded-lg overflow-hidden border-2 border-slate-200 hover:border-purple-400 transition-all duration-300 group"
                        onClick={() => handlePresetSelect(preset.id)}
                      >
                        <div className="w-16 h-12 bg-slate-100">
                          <img
                            src={preset.src}
                            alt={preset.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                        <div className="absolute inset-0 bg-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-slate-400 text-sm">{t('emptyState.or')}</div>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg transition-all duration-300"
                >
                  <UploadIcon className="w-5 h-5 mr-2" />
                  {t('emptyState.uploadButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default JigsawPuzzle;