'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Play, Pause, Square, SkipForward, RotateCcw } from 'lucide-react';

interface HanoiMove {
  from: number;
  to: number;
  disk: number;
}

interface HanoiState {
  towers: number[][];
  currentMove: HanoiMove | null;
  isMoving: boolean;
}

export function HanoiVisualization() {
  const t = useTranslations('hanoi');
  const [numDisks, setNumDisks] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState([500]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [moves, setMoves] = useState<HanoiMove[]>([]);
  const [state, setState] = useState<HanoiState>({
    towers: [[], [], []],
    currentMove: null,
    isMoving: false
  });
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({
    totalMoves: 0,
    timeElapsed: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  // Initialize towers
  const initializeTowers = useCallback(() => {
    const towers = [[], [], []] as number[][];
    for (let i = numDisks; i >= 1; i--) {
      towers[0].push(i);
    }
    setState({
      towers,
      currentMove: null,
      isMoving: false
    });
    setCurrentStep(0);
    setIsComplete(false);
    setStats({ totalMoves: 0, timeElapsed: 0 });
  }, [numDisks]);

  // Generate Hanoi moves using recursion
  const generateHanoiMoves = useCallback((n: number, from: number, to: number, aux: number): HanoiMove[] => {
    if (n === 1) {
      return [{ from, to, disk: n }];
    }
    return [
      ...generateHanoiMoves(n - 1, from, aux, to),
      { from, to, disk: n },
      ...generateHanoiMoves(n - 1, aux, to, from)
    ];
  }, []);

  // Initialize game
  useEffect(() => {
    initializeTowers();
    const newMoves = generateHanoiMoves(numDisks, 0, 2, 1);
    setMoves(newMoves);
    setTotalSteps(newMoves.length);
  }, [numDisks, initializeTowers, generateHanoiMoves]);

  // Execute single move
  const executeMove = useCallback((move: HanoiMove) => {
    setState(prevState => {
      const newTowers = prevState.towers.map(tower => [...tower]);
      const disk = newTowers[move.from].pop();
      if (disk !== undefined) {
        newTowers[move.to].push(disk);
      }
      return {
        towers: newTowers,
        currentMove: move,
        isMoving: true
      };
    });

    // Clear moving state after animation
    setTimeout(() => {
      setState(prevState => ({
        ...prevState,
        currentMove: null,
        isMoving: false
      }));
    }, Math.min(speed[0], 300));
  }, [speed]);

  // Auto play logic
  useEffect(() => {
    if (isPlaying && !isPaused && currentStep < moves.length) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      timeoutRef.current = setTimeout(() => {
        const move = moves[currentStep];
        executeMove(move);
        setCurrentStep(prev => prev + 1);
        setStats(prev => ({
          totalMoves: prev.totalMoves + 1,
          timeElapsed: startTimeRef.current ? Date.now() - startTimeRef.current : 0
        }));

        if (currentStep + 1 >= moves.length) {
          setIsPlaying(false);
          setIsComplete(true);
        }
      }, speed[0]);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [isPlaying, isPaused, currentStep, moves, executeMove, speed]);

  // Control functions
  const handlePlay = () => {
    if (isComplete) {
      handleReset();
    }
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleStep = () => {
    if (currentStep < moves.length) {
      const move = moves[currentStep];
      executeMove(move);
      setCurrentStep(prev => prev + 1);
      setStats(prev => ({ ...prev, totalMoves: prev.totalMoves + 1 }));

      if (currentStep + 1 >= moves.length) {
        setIsComplete(true);
      }
    }
  };

  const handleReset = () => {
    handleStop();
    initializeTowers();
    startTimeRef.current = undefined;
  };

  const handleDifficultyChange = (newNumDisks: number) => {
    setNumDisks(newNumDisks);
    handleStop();
  };

  // Get disk color
  const getDiskColor = (disk: number) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500', 
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500'
    ];
    return colors[(disk - 1) % colors.length];
  };

  // Get disk width
  const getDiskWidth = (disk: number) => {
    const baseWidth = 40;
    const increment = 20;
    return baseWidth + (disk - 1) * increment;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Visualization */}
          <div className="lg:col-span-3 space-y-6">
            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {t('controls.title')}
                  {isComplete && (
                    <Badge variant="default" className="bg-green-500">
                      {t('complete')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handlePlay}
                      disabled={isPlaying && !isPaused}
                      variant="default"
                      size="sm"
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      {t('controls.play')}
                    </Button>
                    <Button
                      onClick={handlePause}
                      disabled={!isPlaying}
                      variant="outline"
                      size="sm"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      {t('controls.pause')}
                    </Button>
                    <Button
                      onClick={handleStop}
                      disabled={!isPlaying && !isPaused}
                      variant="outline"
                      size="sm"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      {t('controls.stop')}
                    </Button>
                    <Button
                      onClick={handleStep}
                      disabled={isPlaying || currentStep >= moves.length}
                      variant="outline"
                      size="sm"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      {t('controls.step')}
                    </Button>
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      {t('controls.reset')}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('controls.speed')}</label>
                    <Slider
                      value={speed}
                      onValueChange={setSpeed}
                      max={1000}
                      min={100}
                      step={100}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center">
                      {speed[0]}ms
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hanoi Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>{t('visualization')}</CardTitle>
                <div className="text-sm text-gray-600">
                  {currentStep > 0 && (
                    <div>
                      {t('step')} {currentStep}: {t('moving')} {t('disk')} {moves[currentStep - 1]?.disk} {t('from')} {t('tower')} {moves[currentStep - 1]?.from + 1} {t('to')} {t('tower')} {moves[currentStep - 1]?.to + 1}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-end space-x-8 min-h-[400px] bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg p-8">
                  {state.towers.map((tower, towerIndex) => (
                    <div key={towerIndex} className="flex flex-col items-center space-y-1">
                      {/* Tower label */}
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {t('tower')} {towerIndex + 1}
                      </div>
                      
                      {/* Tower rod */}
                      <div className="relative">
                        <div className="w-2 h-60 bg-gray-700 rounded-t-full relative z-10"></div>
                        
                        {/* Disks */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex flex-col-reverse items-center">
                          {tower.map((disk, diskIndex) => {
                            const isCurrentlyMoving = state.currentMove?.from === towerIndex && 
                                                    diskIndex === tower.length - 1 && 
                                                    state.isMoving;
                            
                            return (
                              <div
                                key={`${towerIndex}-${diskIndex}`}
                                className={`
                                  ${getDiskColor(disk)} 
                                  h-6 rounded-lg border-2 border-white shadow-lg
                                  transition-all duration-300 ease-in-out
                                  ${isCurrentlyMoving ? 'transform -translate-y-16 scale-110 shadow-xl z-20' : ''}
                                `}
                                style={{
                                  width: `${getDiskWidth(disk)}px`,
                                  marginBottom: diskIndex === 0 ? '8px' : '2px'
                                }}
                              >
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                  {disk}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Base */}
                      <div className="w-32 h-4 bg-gray-600 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Difficulty Generator */}
            <Card>
              <CardHeader>
                <CardTitle>{t('generator.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('generator.difficulty')}</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[3, 4, 5, 6, 7, 8].map((num) => (
                      <Button
                        key={num}
                        onClick={() => handleDifficultyChange(num)}
                        variant={numDisks === num ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                      >
                        {num} {t('generator.disks')}
                        <span className="text-xs ml-2">
                          ({Math.pow(2, num) - 1} {t('generator.moves')})
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>{t('stats.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.currentStep')}</span>
                  <span className="font-medium">{currentStep} / {totalSteps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.totalMoves')}</span>
                  <span className="font-medium">{stats.totalMoves}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.timeElapsed')}</span>
                  <span className="font-medium">{(stats.timeElapsed / 1000).toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.complexity')}</span>
                  <span className="font-medium">O(2^n)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.minMoves')}</span>
                  <span className="font-medium">{Math.pow(2, numDisks) - 1}</span>
                </div>
              </CardContent>
            </Card>

            {/* Algorithm Explanation */}
            <Card>
              <CardHeader>
                <CardTitle>{t('explanation.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="font-medium">{t('explanation.rules')}</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {t('explanation.rule1')}</li>
                    <li>• {t('explanation.rule2')}</li>
                    <li>• {t('explanation.rule3')}</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t('explanation.algorithm')}</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {t('explanation.step1')}</li>
                    <li>• {t('explanation.step2')}</li>
                    <li>• {t('explanation.step3')}</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t('explanation.complexity')}</h4>
                  <p className="text-sm text-gray-600">{t('explanation.complexityDesc')}</p>
                </div>
              </CardContent>
            </Card>

            {/* Code Display */}
            <Card>
              <CardHeader>
                <CardTitle>{t('code.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-x-auto">
                  <code>{`function hanoi(n, from, to, aux) {
  if (n === 1) {
    move(from, to);
    return;
  }
  hanoi(n-1, from, aux, to);
  move(from, to);
  hanoi(n-1, aux, to, from);
}`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}