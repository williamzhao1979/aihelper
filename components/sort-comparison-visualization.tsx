"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { PlayIcon, PauseIcon, SquareIcon, ShuffleIcon } from 'lucide-react';
import { Slider } from './ui/slider';
import { useTranslations } from 'next-intl';

type SortAlgorithm = 'bubble' | 'quick' | 'insertion';
type DataSize = 'small' | 'medium' | 'large';

interface SortStep {
  array: number[];
  comparing: number[];
  swapping: number[];
  pivot?: number;
  sorted: number[];
  algorithm: SortAlgorithm;
}

interface SortStats {
  comparisons: number;
  swaps: number;
  startTime: number;
  endTime?: number;
  isFinished: boolean;
}

interface AlgorithmState {
  steps: SortStep[];
  currentStep: number;
  stats: SortStats;
  isRunning: boolean;
}

const dataSizeConfigs = {
  small: { count: 10, min: 1, max: 30 },
  medium: { count: 20, min: 1, max: 50 },
  large: { count: 50, min: 1, max: 100 }
};

const SortComparisonVisualization: React.FC = () => {
  const t = useTranslations('compareSort');
  
  const [dataSize, setDataSize] = useState<DataSize>('small');
  const [originalArray, setOriginalArray] = useState<number[]>([5, 2, 8, 1, 9]);
  const [speed, setSpeed] = useState<number[]>([300]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Create initial default step
  const createDefaultStep = (algorithm: SortAlgorithm): SortStep => ({
    array: [5, 2, 8, 1, 9],
    comparing: [],
    swapping: [],
    sorted: [],
    algorithm
  });

  const [algorithmStates, setAlgorithmStates] = useState<Record<SortAlgorithm, AlgorithmState>>({
    bubble: { 
      steps: [createDefaultStep('bubble')], 
      currentStep: 0, 
      stats: { comparisons: 0, swaps: 0, startTime: 0, isFinished: false }, 
      isRunning: false 
    },
    quick: { 
      steps: [createDefaultStep('quick')], 
      currentStep: 0, 
      stats: { comparisons: 0, swaps: 0, startTime: 0, isFinished: false }, 
      isRunning: false 
    },
    insertion: { 
      steps: [createDefaultStep('insertion')], 
      currentStep: 0, 
      stats: { comparisons: 0, swaps: 0, startTime: 0, isFinished: false }, 
      isRunning: false 
    }
  });

  // Generate random array
  const generateRandomArray = useCallback((size: DataSize): number[] => {
    const config = dataSizeConfigs[size];
    const array: number[] = [];
    
    for (let i = 0; i < config.count; i++) {
      const randomNum = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
      array.push(randomNum);
    }
    
    return array;
  }, []);

  // Bubble Sort Algorithm
  const generateBubbleSortSteps = useCallback((arr: number[]): { steps: SortStep[], stats: SortStats } => {
    const steps: SortStep[] = [];
    const array = [...arr];
    const n = array.length;
    let comparisons = 0;
    let swaps = 0;
    const startTime = Date.now();
    
    // Initial state
    steps.push({
      array: [...array],
      comparing: [],
      swapping: [],
      sorted: [],
      algorithm: 'bubble'
    });

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        comparisons++;
        
        // Show comparison
        steps.push({
          array: [...array],
          comparing: [j, j + 1],
          swapping: [],
          sorted: Array.from({ length: i }, (_, k) => n - 1 - k),
          algorithm: 'bubble'
        });

        if (array[j] > array[j + 1]) {
          swaps++;
          [array[j], array[j + 1]] = [array[j + 1], array[j]];
          
          // Show swap
          steps.push({
            array: [...array],
            comparing: [],
            swapping: [j, j + 1],
            sorted: Array.from({ length: i }, (_, k) => n - 1 - k),
            algorithm: 'bubble'
          });
        }
      }
    }

    // Final state
    steps.push({
      array: [...array],
      comparing: [],
      swapping: [],
      sorted: Array.from({ length: n }, (_, i) => i),
      algorithm: 'bubble'
    });

    return { 
      steps, 
      stats: { 
        comparisons, 
        swaps, 
        startTime, 
        endTime: Date.now(),
        isFinished: false 
      } 
    };
  }, []);

  // Quick Sort Algorithm
  const generateQuickSortSteps = useCallback((arr: number[]): { steps: SortStep[], stats: SortStats } => {
    const steps: SortStep[] = [];
    const array = [...arr];
    let comparisons = 0;
    let swaps = 0;
    const startTime = Date.now();
    const sorted: number[] = [];
    
    // Initial state
    steps.push({
      array: [...array],
      comparing: [],
      swapping: [],
      sorted: [],
      algorithm: 'quick'
    });

    const quickSort = (low: number, high: number) => {
      if (low < high) {
        const pivotIndex = partition(low, high);
        sorted.push(pivotIndex);
        
        quickSort(low, pivotIndex - 1);
        quickSort(pivotIndex + 1, high);
      }
    };

    const partition = (low: number, high: number): number => {
      const pivot = array[high];
      let i = low - 1;

      // Show pivot
      steps.push({
        array: [...array],
        comparing: [],
        swapping: [],
        pivot: high,
        sorted: [...sorted],
        algorithm: 'quick'
      });

      for (let j = low; j < high; j++) {
        comparisons++;
        
        // Show comparison with pivot
        steps.push({
          array: [...array],
          comparing: [j, high],
          swapping: [],
          pivot: high,
          sorted: [...sorted],
          algorithm: 'quick'
        });

        if (array[j] < pivot) {
          i++;
          if (i !== j) {
            swaps++;
            [array[i], array[j]] = [array[j], array[i]];
            
            // Show swap
            steps.push({
              array: [...array],
              comparing: [],
              swapping: [i, j],
              pivot: high,
              sorted: [...sorted],
              algorithm: 'quick'
            });
          }
        }
      }

      // Place pivot in correct position
      if (i + 1 !== high) {
        swaps++;
        [array[i + 1], array[high]] = [array[high], array[i + 1]];
        
        steps.push({
          array: [...array],
          comparing: [],
          swapping: [i + 1, high],
          sorted: [...sorted],
          algorithm: 'quick'
        });
      }

      return i + 1;
    };

    quickSort(0, array.length - 1);

    // Final state
    steps.push({
      array: [...array],
      comparing: [],
      swapping: [],
      sorted: Array.from({ length: array.length }, (_, i) => i),
      algorithm: 'quick'
    });

    return { 
      steps, 
      stats: { 
        comparisons, 
        swaps, 
        startTime, 
        endTime: Date.now(),
        isFinished: false 
      } 
    };
  }, []);

  // Insertion Sort Algorithm
  const generateInsertionSortSteps = useCallback((arr: number[]): { steps: SortStep[], stats: SortStats } => {
    const steps: SortStep[] = [];
    const array = [...arr];
    const n = array.length;
    let comparisons = 0;
    let swaps = 0;
    const startTime = Date.now();
    
    // Initial state
    steps.push({
      array: [...array],
      comparing: [],
      swapping: [],
      sorted: [0],
      algorithm: 'insertion'
    });

    for (let i = 1; i < n; i++) {
      const key = array[i];
      let j = i - 1;

      // Show element being inserted
      steps.push({
        array: [...array],
        comparing: [i],
        swapping: [],
        sorted: Array.from({ length: i }, (_, k) => k),
        algorithm: 'insertion'
      });

      while (j >= 0) {
        comparisons++;
        
        // Show comparison
        steps.push({
          array: [...array],
          comparing: [j, i],
          swapping: [],
          sorted: Array.from({ length: i }, (_, k) => k),
          algorithm: 'insertion'
        });

        if (array[j] <= key) break;
        
        swaps++;
        array[j + 1] = array[j];
        
        // Show shift
        steps.push({
          array: [...array],
          comparing: [],
          swapping: [j, j + 1],
          sorted: Array.from({ length: i }, (_, k) => k),
          algorithm: 'insertion'
        });
        
        j--;
      }
      
      array[j + 1] = key;
      
      // Show insertion complete
      steps.push({
        array: [...array],
        comparing: [],
        swapping: [],
        sorted: Array.from({ length: i + 1 }, (_, k) => k),
        algorithm: 'insertion'
      });
    }

    // Final state
    steps.push({
      array: [...array],
      comparing: [],
      swapping: [],
      sorted: Array.from({ length: n }, (_, i) => i),
      algorithm: 'insertion'
    });

    return { 
      steps, 
      stats: { 
        comparisons, 
        swaps, 
        startTime, 
        endTime: Date.now(),
        isFinished: false 
      } 
    };
  }, []);

  // Initialize arrays and generate steps
  const initializeAlgorithms = useCallback(() => {
    const newArray = generateRandomArray(dataSize);
    setOriginalArray(newArray);

    const bubble = generateBubbleSortSteps(newArray);
    const quick = generateQuickSortSteps(newArray);
    const insertion = generateInsertionSortSteps(newArray);

    setAlgorithmStates({
      bubble: { ...bubble, currentStep: 0, isRunning: false },
      quick: { ...quick, currentStep: 0, isRunning: false },
      insertion: { ...insertion, currentStep: 0, isRunning: false }
    });
  }, [dataSize, generateRandomArray, generateBubbleSortSteps, generateQuickSortSteps, generateInsertionSortSteps]);

  // Initialize on mount and data size change
  useEffect(() => {
    initializeAlgorithms();
  }, [initializeAlgorithms]);

  // Animation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setAlgorithmStates(prev => {
          const newStates = { ...prev };
          let allFinished = true;

          Object.keys(newStates).forEach(key => {
            const algorithm = key as SortAlgorithm;
            const state = newStates[algorithm];
            
            if (!state.stats.isFinished && state.currentStep < state.steps.length - 1) {
              allFinished = false;
              newStates[algorithm] = {
                ...state,
                currentStep: state.currentStep + 1,
                isRunning: true
              };
            } else if (!state.stats.isFinished) {
              newStates[algorithm] = {
                ...state,
                stats: { ...state.stats, isFinished: true, endTime: Date.now() },
                isRunning: false
              };
            }
          });

          if (allFinished) {
            setIsPlaying(false);
          }

          return newStates;
        });
      }, speed[0]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, speed]);

  const handleStart = () => {
    setIsPlaying(true);
    setAlgorithmStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        const algorithm = key as SortAlgorithm;
        if (!newStates[algorithm].stats.isFinished) {
          newStates[algorithm] = {
            ...newStates[algorithm],
            stats: { ...newStates[algorithm].stats, startTime: Date.now() }
          };
        }
      });
      return newStates;
    });
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setAlgorithmStates(prev => {
      const newStates = { ...prev };
      Object.keys(newStates).forEach(key => {
        const algorithm = key as SortAlgorithm;
        newStates[algorithm] = {
          ...newStates[algorithm],
          currentStep: 0,
          stats: { ...newStates[algorithm].stats, isFinished: false, startTime: 0, endTime: undefined },
          isRunning: false
        };
      });
      return newStates;
    });
  };

  const handleDataSizeChange = (newSize: DataSize) => {
    setDataSize(newSize);
    setIsPlaying(false);
  };

  const getBarColor = (algorithm: SortAlgorithm, index: number, step: SortStep): string => {
    if (step.sorted.includes(index)) return 'bg-gradient-to-t from-emerald-400 to-green-500';
    if (step.pivot === index) return 'bg-gradient-to-t from-purple-400 to-violet-500';
    if (step.comparing.includes(index)) return 'bg-gradient-to-t from-amber-400 to-yellow-500';
    if (step.swapping.includes(index)) return 'bg-gradient-to-t from-red-400 to-pink-500';
    
    switch (algorithm) {
      case 'bubble': return 'bg-gradient-to-t from-blue-400 to-indigo-500';
      case 'quick': return 'bg-gradient-to-t from-green-400 to-emerald-500';
      case 'insertion': return 'bg-gradient-to-t from-orange-400 to-red-500';
      default: return 'bg-gradient-to-t from-gray-400 to-slate-500';
    }
  };

  const getAlgorithmThemeColor = (algorithm: SortAlgorithm): string => {
    switch (algorithm) {
      case 'bubble': return 'from-blue-500/10 to-indigo-500/10';
      case 'quick': return 'from-green-500/10 to-emerald-500/10';
      case 'insertion': return 'from-orange-500/10 to-red-500/10';
      default: return 'from-gray-500/10 to-slate-500/10';
    }
  };

  const getCurrentStep = (algorithm: SortAlgorithm): SortStep => {
    const state = algorithmStates[algorithm];
    if (!state.steps || state.steps.length === 0) {
      return createDefaultStep(algorithm);
    }
    return state.steps[state.currentStep] || state.steps[0];
  };

  const getWinner = (): SortAlgorithm | null => {
    const finishedAlgorithms = Object.entries(algorithmStates)
      .filter(([_, state]) => state.stats.isFinished && state.stats.endTime)
      .sort(([_, a], [__, b]) => (a.stats.endTime! - a.stats.startTime) - (b.stats.endTime! - b.stats.startTime));
    
    return finishedAlgorithms.length > 0 ? finishedAlgorithms[0][0] as SortAlgorithm : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {t('title')}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            
            {/* Data Size Selection */}
            <div className="flex flex-wrap justify-center gap-4">
              {(['small', 'medium', 'large'] as DataSize[]).map(size => (
                <button
                  key={size}
                  onClick={() => handleDataSizeChange(size)}
                  className={`group relative overflow-hidden rounded-xl px-6 py-4 transition-all duration-300 transform hover:scale-105 ${
                    dataSize === size 
                      ? 'bg-gradient-to-r from-purple-400 to-pink-500 text-white shadow-lg shadow-purple-200' 
                      : 'bg-white/80 text-slate-700 hover:bg-purple-50 border border-purple-200'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="font-bold text-lg">{t(`generator.${size}`)}</div>
                    <div className="text-sm opacity-90">{t(`generator.${size}Desc`)}</div>
                  </div>
                  {dataSize === size && (
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-500/20 animate-pulse"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-4">
              {!isPlaying ? (
                <Button 
                  onClick={handleStart} 
                  size="lg"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <PlayIcon className="w-5 h-5 mr-2" />
                  {t('controls.start')}
                </Button>
              ) : (
                <Button 
                  onClick={handlePause}
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  <PauseIcon className="w-5 h-5 mr-2" />
                  {t('controls.pause')}
                </Button>
              )}
              
              <Button 
                onClick={handleReset}
                size="lg" 
                variant="outline"
                className="border-2 border-purple-300 hover:border-purple-400 text-purple-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                <SquareIcon className="w-5 h-5 mr-2" />
                {t('controls.reset')}
              </Button>

              <Button 
                onClick={initializeAlgorithms}
                size="lg"
                variant="outline"
                className="border-2 border-blue-300 hover:border-blue-400 text-blue-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                <ShuffleIcon className="w-5 h-5 mr-2" />
                {t('generator.generate')}
              </Button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center space-x-4 bg-gradient-to-r from-slate-100/50 to-purple-100/50 rounded-xl p-4">
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{t('controls.speed')}:</span>
              <div className="w-32">
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={50}
                  max={1000}
                  step={50}
                  className="w-full"
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 min-w-[60px]">{speed[0]}ms</span>
            </div>
          </div>
        </div>

        {/* Algorithm Visualizations */}
        <div className="grid lg:grid-cols-3 gap-6">
          {(['bubble', 'quick', 'insertion'] as SortAlgorithm[]).map(algorithm => {
            const currentStep = getCurrentStep(algorithm);
            const state = algorithmStates[algorithm];
            const maxValue = Math.max(...originalArray);
            const minValue = Math.min(...originalArray);
            const winner = getWinner();
            
            return (
              <div key={algorithm} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
                <div className={`bg-gradient-to-r ${getAlgorithmThemeColor(algorithm)} p-4 border-b border-white/20 relative`}>
                  <h3 className="text-xl font-semibold text-slate-800 text-center">
                    {t(`algorithms.${algorithm}`)}
                  </h3>
                  {winner === algorithm && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      🏆 {t('stats.winner')}
                    </div>
                  )}
                  {state.stats.isFinished && (
                    <div className="absolute top-2 left-2 bg-green-400 text-green-900 px-2 py-1 rounded-full text-xs font-bold">
                      ✓ {t('stats.finished')}
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  {/* Visualization */}
                  <div className="h-48 bg-gradient-to-t from-slate-100/50 to-white/30 rounded-xl p-3 mb-4 relative">
                    <div className="flex items-end justify-center gap-1 h-full">
                      {currentStep.array.map((value, index) => {
                        const normalizedHeight = minValue === maxValue ? 50 : ((value - minValue) / (maxValue - minValue)) * 70 + 15;
                        const barWidth = Math.min(40, Math.max(20, 300 / currentStep.array.length));
                        
                        return (
                          <div
                            key={`${algorithm}-${index}`}
                            className={`relative flex flex-col items-center justify-end transition-all duration-300 ease-in-out ${getBarColor(algorithm, index, currentStep)} rounded-t-lg shadow-sm flex-shrink-0`}
                            style={{
                              height: `${normalizedHeight}%`,
                              width: `${barWidth}px`,
                              minWidth: '18px',
                            }}
                          >
                            {/* Value Label */}
                            <div className="absolute -top-6 bg-white/90 backdrop-blur-sm rounded px-1 py-0.5 shadow-sm border border-white/20">
                              <span className="text-slate-800 font-bold text-xs">{value}</span>
                            </div>
                            
                            {/* Index Label */}
                            <div className="absolute -bottom-6 text-slate-600 font-medium text-xs">
                              {index}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('stats.comparisons')}:</span>
                      <span className="font-semibold text-slate-800">{state.stats.comparisons}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('stats.swaps')}:</span>
                      <span className="font-semibold text-slate-800">{state.stats.swaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('stats.time')}:</span>
                      <span className="font-semibold text-slate-800">
                        {state.stats.isFinished && state.stats.endTime 
                          ? `${state.stats.endTime - state.stats.startTime}ms`
                          : state.isRunning 
                            ? `${Date.now() - state.stats.startTime}ms`
                            : '0ms'
                        }
                      </span>
                    </div>
                    <div className="text-center mt-3">
                      <div className="text-xs text-slate-500">
                        {t('stats.timeComplexity')}
                      </div>
                      <div className="text-sm font-semibold text-slate-700">
                        {t(`explanation.complexity.${algorithm}.average`)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Algorithm Explanations */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 border-b border-white/20">
            <h2 className="text-2xl font-semibold text-slate-800 text-center">{t('explanation.title')}</h2>
          </div>
          <div className="p-8">
            <div className="grid md:grid-cols-3 gap-8">
              {(['bubble', 'quick', 'insertion'] as SortAlgorithm[]).map(algorithm => (
                <div key={algorithm} className={`bg-gradient-to-br ${getAlgorithmThemeColor(algorithm)} rounded-xl p-6 border border-white/50`}>
                  <h3 className="font-bold text-xl mb-4 text-slate-800">
                    {t(`explanation.${algorithm}Title`)}
                  </h3>
                  <p className="text-slate-700 mb-4 leading-relaxed">
                    {t(`explanation.${algorithm}Desc`)}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-slate-800">{t('stats.timeComplexity')}:</div>
                    <div className="space-y-1">
                      <div className="text-green-700">{t(`explanation.complexity.${algorithm}.best`)}</div>
                      <div className="text-yellow-700">{t(`explanation.complexity.${algorithm}.average`)}</div>
                      <div className="text-red-700">{t(`explanation.complexity.${algorithm}.worst`)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SortComparisonVisualization;