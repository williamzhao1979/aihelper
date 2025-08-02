"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PlayIcon, PauseIcon, SquareIcon, StepForwardIcon, ShuffleIcon } from 'lucide-react';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useTranslations } from 'next-intl';

interface SortStep {
  array: number[];
  comparing: [number, number] | null;
  swapped: boolean;
  isComplete: boolean;
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  count: number;
  min: number;
  max: number;
}

const difficultyConfigs: Record<DifficultyLevel, DifficultyConfig> = {
  easy: { count: 5, min: 1, max: 20 },
  medium: { count: 8, min: 1, max: 50 },
  hard: { count: 12, min: 1, max: 100 }
};

const BubbleSortVisualization: React.FC = () => {
  const t = useTranslations('bubbleSort');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy');
  const [originalArray, setOriginalArray] = useState<number[]>([64, 34, 25, 12, 22, 11, 90]);
  const [currentArray, setCurrentArray] = useState<number[]>([64, 34, 25, 12, 22, 11, 90]);
  const [steps, setSteps] = useState<SortStep[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number[]>([500]);
  const [comparing, setComparing] = useState<[number, number] | null>(null);
  const [swapped, setSwapped] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);

  // Generate random array based on difficulty
  const generateRandomArray = useCallback((difficulty: DifficultyLevel): number[] => {
    const config = difficultyConfigs[difficulty];
    const array: number[] = [];
    
    for (let i = 0; i < config.count; i++) {
      const randomNum = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
      array.push(randomNum);
    }
    
    return array;
  }, []);

  // Generate all steps for bubble sort
  const generateBubbleSortSteps = useCallback((arr: number[]): SortStep[] => {
    const steps: SortStep[] = [];
    const array = [...arr];
    const n = array.length;
    
    // Initial state
    steps.push({
      array: [...array],
      comparing: null,
      swapped: false,
      isComplete: false
    });

    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - i - 1; j++) {
        // Show comparison
        steps.push({
          array: [...array],
          comparing: [j, j + 1],
          swapped: false,
          isComplete: false
        });

        // Check if swap is needed
        if (array[j] > array[j + 1]) {
          // Swap elements
          [array[j], array[j + 1]] = [array[j + 1], array[j]];
          
          // Show swap
          steps.push({
            array: [...array],
            comparing: [j, j + 1],
            swapped: true,
            isComplete: false
          });
        }
      }
    }

    // Final state
    steps.push({
      array: [...array],
      comparing: null,
      swapped: false,
      isComplete: true
    });

    return steps;
  }, []);

  // Initialize with easy difficulty array
  useEffect(() => {
    const initialArray = generateRandomArray('easy');
    setOriginalArray(initialArray);
    setCurrentArray(initialArray);
    const sortSteps = generateBubbleSortSteps(initialArray);
    setSteps(sortSteps);
    setCurrentStep(0);
  }, [generateRandomArray, generateBubbleSortSteps]);

  // Update current state based on step
  useEffect(() => {
    if (steps.length > 0 && currentStep < steps.length) {
      const step = steps[currentStep];
      setCurrentArray(step.array);
      setComparing(step.comparing);
      setSwapped(step.swapped);
      setIsComplete(step.isComplete);
    }
  }, [currentStep, steps]);

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentStep < steps.length - 1) {
      interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speed[0]);
    } else if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentStep, steps.length, speed]);

  const handlePlay = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleStepForward = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    const sortSteps = generateBubbleSortSteps(originalArray);
    setSteps(sortSteps);
  };

  const handleGenerateNewArray = () => {
    setIsPlaying(false);
    const newArray = generateRandomArray(difficulty);
    setOriginalArray(newArray);
    setCurrentArray(newArray);
    setCurrentStep(0);
    const sortSteps = generateBubbleSortSteps(newArray);
    setSteps(sortSteps);
  };

  const handleDifficultyChange = (newDifficulty: DifficultyLevel) => {
    setDifficulty(newDifficulty);
    setIsPlaying(false);
    const newArray = generateRandomArray(newDifficulty);
    setOriginalArray(newArray);
    setCurrentArray(newArray);
    setCurrentStep(0);
    const sortSteps = generateBubbleSortSteps(newArray);
    setSteps(sortSteps);
  };

  const getBarColor = (index: number): string => {
    if (isComplete) return 'bg-gradient-to-t from-emerald-400 to-green-500';
    if (comparing && comparing.includes(index)) {
      return swapped 
        ? 'bg-gradient-to-t from-red-400 to-pink-500' 
        : 'bg-gradient-to-t from-amber-400 to-yellow-500';
    }
    return 'bg-gradient-to-t from-blue-400 to-indigo-500';
  };

  const bubbleSortCode = `function bubbleSort(arr) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      // Compare adjacent elements
      if (arr[j] > arr[j + 1]) {
        // Swap if they are in wrong order
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }
  
  return arr;
}`;

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

        {/* Visualization */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-white/20">
            <h2 className="text-2xl font-semibold text-slate-800 text-center">{t('visualization')}</h2>
          </div>
          
          <div className="p-8">
            {/* Array Visualization */}
            <div className="mb-8">
              <div className="flex items-end justify-center gap-2 h-80 bg-gradient-to-t from-slate-100/50 to-white/30 rounded-xl p-6 relative">
                {/* Grid Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-full border-t border-slate-200/50"
                      style={{ bottom: `${20 + (i * 15)}%` }}
                    />
                  ))}
                </div>
                
                {currentArray.map((value, index) => {
                  const maxValue = Math.max(...originalArray);
                  const minValue = Math.min(...originalArray);
                  const normalizedHeight = minValue === maxValue ? 50 : ((value - minValue) / (maxValue - minValue)) * 60 + 20;
                  const barWidth = Math.min(70, Math.max(45, 500 / currentArray.length));
                  
                  return (
                    <div
                      key={`${index}-${value}`}
                      className={`relative flex flex-col items-center justify-end transition-all duration-500 ease-in-out ${getBarColor(index)} rounded-t-lg shadow-lg flex-shrink-0 group hover:scale-105`}
                      style={{
                        height: `${normalizedHeight}%`,
                        width: `${barWidth}px`,
                        minWidth: '45px',
                      }}
                    >
                      {/* Value Label */}
                      <div className="absolute -top-8 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-md border border-white/20">
                        <span className="text-slate-800 font-bold text-sm">{value}</span>
                      </div>
                      
                      {/* Index Label */}
                      <div className="absolute -bottom-8 text-slate-600 font-medium text-xs">
                        [{index}]
                      </div>
                      
                      {/* Highlight effect for active comparisons */}
                      {comparing && comparing.includes(index) && (
                        <div className="absolute inset-0 bg-white/20 rounded-t-lg animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status Information */}
            <div className="text-center mb-8">
              <div className="bg-gradient-to-r from-slate-100/50 to-blue-100/50 rounded-xl p-6 mb-6">
                <div className="text-2xl font-bold text-slate-800 mb-2">
                  {t('step')}: {currentStep + 1} / {steps.length}
                </div>
                {comparing && (
                  <div className="text-lg text-slate-600 mb-2">
                    {t('comparing')} {comparing[0]} {t('swapped').includes('和') ? '和' : 'and'} {comparing[1]}
                    {swapped && <span className="text-red-500 font-semibold ml-2">{t('swapped')}</span>}
                  </div>
                )}
                {isComplete && (
                  <div className="text-2xl font-bold text-green-600 animate-pulse">
                    {t('complete')}
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              {/* Main Control Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                {!isPlaying ? (
                  <Button 
                    onClick={handlePlay} 
                    size="lg"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
                  >
                    <PlayIcon className="w-5 h-5 mr-2" />
                    {t('controls.play')}
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
                  onClick={handleStop} 
                  size="lg"
                  variant="outline" 
                  className="border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  <SquareIcon className="w-5 h-5 mr-2" />
                  {t('controls.stop')}
                </Button>
                
                <Button 
                  onClick={handleStepForward} 
                  size="lg"
                  variant="outline" 
                  disabled={currentStep >= steps.length - 1}
                  className="border-2 border-blue-300 hover:border-blue-400 text-blue-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <StepForwardIcon className="w-5 h-5 mr-2" />
                  {t('controls.step')}
                </Button>
                
                <Button 
                  onClick={handleReset}
                  size="lg" 
                  variant="outline"
                  className="border-2 border-purple-300 hover:border-purple-400 text-purple-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
                >
                  {t('controls.reset')}
                </Button>
              </div>

              {/* Speed Control */}
              <div className="flex items-center justify-center space-x-6 bg-gradient-to-r from-slate-100/50 to-purple-100/50 rounded-xl p-6">
                <span className="text-lg font-medium text-slate-700">{t('controls.speed')}:</span>
                <div className="w-64">
                  <Slider
                    value={speed}
                    onValueChange={setSpeed}
                    min={100}
                    max={2000}
                    step={100}
                    className="w-full"
                  />
                </div>
                <span className="text-lg font-semibold text-slate-700 min-w-[80px]">{speed[0]}ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Array Generator - Fancy Buttons */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
          <div className="text-center space-y-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">{t('generator.title')}</h2>
            
            {/* Difficulty Level Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <button
                onClick={() => handleDifficultyChange('easy')}
                className={`group relative overflow-hidden rounded-xl px-6 py-4 transition-all duration-300 transform hover:scale-105 ${
                  difficulty === 'easy' 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg shadow-green-200' 
                    : 'bg-white/80 text-slate-700 hover:bg-green-50 border border-green-200'
                }`}
              >
                <div className="relative z-10">
                  <div className="font-bold text-lg">{t('generator.easy')}</div>
                  <div className="text-sm opacity-90">{t('generator.easyDesc')}</div>
                </div>
                {difficulty === 'easy' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-500/20 animate-pulse"></div>
                )}
              </button>

              <button
                onClick={() => handleDifficultyChange('medium')}
                className={`group relative overflow-hidden rounded-xl px-6 py-4 transition-all duration-300 transform hover:scale-105 ${
                  difficulty === 'medium' 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-200' 
                    : 'bg-white/80 text-slate-700 hover:bg-yellow-50 border border-yellow-200'
                }`}
              >
                <div className="relative z-10">
                  <div className="font-bold text-lg">{t('generator.medium')}</div>
                  <div className="text-sm opacity-90">{t('generator.mediumDesc')}</div>
                </div>
                {difficulty === 'medium' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 animate-pulse"></div>
                )}
              </button>

              <button
                onClick={() => handleDifficultyChange('hard')}
                className={`group relative overflow-hidden rounded-xl px-6 py-4 transition-all duration-300 transform hover:scale-105 ${
                  difficulty === 'hard' 
                    ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white shadow-lg shadow-red-200' 
                    : 'bg-white/80 text-slate-700 hover:bg-red-50 border border-red-200'
                }`}
              >
                <div className="relative z-10">
                  <div className="font-bold text-lg">{t('generator.hard')}</div>
                  <div className="text-sm opacity-90">{t('generator.hardDesc')}</div>
                </div>
                {difficulty === 'hard' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-500/20 animate-pulse"></div>
                )}
              </button>
            </div>

            {/* Generate New Array Button */}
            <Button 
              onClick={handleGenerateNewArray}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-purple-200 transition-all duration-300 transform hover:scale-105 hover:shadow-xl"
            >
              <ShuffleIcon className="w-5 h-5 mr-2" />
              {t('generator.generate')}
            </Button>
          </div>
        </div>
        
        {/* Algorithm Code */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 p-6 border-b border-white/20">
            <h2 className="text-2xl font-semibold text-slate-800 text-center">{t('code')}</h2>
          </div>
          <div className="p-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 shadow-inner">
              <pre className="text-green-400 overflow-x-auto text-sm md:text-base leading-relaxed">
                <code>{bubbleSortCode}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Algorithm Explanation */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 border-b border-white/20">
            <h2 className="text-2xl font-semibold text-slate-800 text-center">{t('explanation.title')}</h2>
          </div>
          <div className="p-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Algorithm Steps */}
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl p-6 border border-blue-200/50">
                <h3 className="font-bold text-xl mb-4 text-blue-800 flex items-center">
                  <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
                  {t('explanation.steps')}
                </h3>
                <ol className="space-y-3 text-slate-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">1.</span>
                    <span>{t('explanation.step1')}</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">2.</span>
                    <span>{t('explanation.step2')}</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">3.</span>
                    <span>{t('explanation.step3')}</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">4.</span>
                    <span>{t('explanation.step4')}</span>
                  </li>
                </ol>
              </div>
              
              {/* Color Legend */}
              <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-xl p-6 border border-amber-200/50">
                <h3 className="font-bold text-xl mb-4 text-amber-800 flex items-center">
                  <span className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
                  {t('explanation.legend')}
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-t from-blue-400 to-indigo-500 rounded-lg shadow-sm"></div>
                    <span className="text-slate-700">{t('explanation.normal')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-t from-amber-400 to-yellow-500 rounded-lg shadow-sm"></div>
                    <span className="text-slate-700">{t('explanation.comparing')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-t from-red-400 to-pink-500 rounded-lg shadow-sm"></div>
                    <span className="text-slate-700">{t('explanation.swapping')}</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gradient-to-t from-emerald-400 to-green-500 rounded-lg shadow-sm"></div>
                    <span className="text-slate-700">{t('explanation.sorted')}</span>
                  </li>
                </ul>
              </div>

              {/* Time Complexity */}
              <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl p-6 border border-purple-200/50 md:col-span-2 lg:col-span-1">
                <h3 className="font-bold text-xl mb-4 text-purple-800 flex items-center">
                  <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
                  {t('explanation.complexity')}
                </h3>
                <ul className="space-y-3 text-slate-700">
                  <li className="bg-green-100/50 rounded-lg p-3 border border-green-200">
                    <strong className="text-green-700">{t('explanation.bestCase')}</strong>
                  </li>
                  <li className="bg-yellow-100/50 rounded-lg p-3 border border-yellow-200">
                    <strong className="text-yellow-700">{t('explanation.averageCase')}</strong>
                  </li>
                  <li className="bg-red-100/50 rounded-lg p-3 border border-red-200">
                    <strong className="text-red-700">{t('explanation.worstCase')}</strong>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BubbleSortVisualization;