'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Play, Pause, Square, SkipForward, RotateCcw } from 'lucide-react';

interface SudokuCell {
  value: number;
  isOriginal: boolean;
  candidates: number[];
  isHighlighted: boolean;
  isAnalyzing: boolean;
  justSolved: boolean;
}

interface SudokuStep {
  type: 'naked_single' | 'hidden_single' | 'elimination' | 'guess';
  row: number;
  col: number;
  value: number;
  reason: string;
  affectedCells: { row: number; col: number }[];
}

interface SudokuState {
  grid: SudokuCell[][];
  currentStep: SudokuStep | null;
  completedSteps: SudokuStep[];
}

// 预设数独题目（不同难度）
const SUDOKU_PUZZLES = {
  easy: [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9]
  ],
  medium: [
    [0, 0, 0, 6, 0, 0, 4, 0, 0],
    [7, 0, 0, 0, 0, 3, 6, 0, 0],
    [0, 0, 0, 0, 9, 1, 0, 8, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 5, 0, 1, 8, 0, 0, 0, 3],
    [0, 0, 0, 3, 0, 6, 0, 4, 5],
    [0, 4, 0, 2, 0, 0, 0, 6, 0],
    [9, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 2, 0, 0, 0, 0, 1, 0, 0]
  ],
  hard: [
    [0, 0, 0, 0, 0, 6, 0, 0, 0],
    [0, 5, 9, 0, 0, 0, 0, 0, 8],
    [2, 0, 0, 0, 0, 8, 0, 0, 0],
    [0, 4, 5, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 6, 0, 0, 3, 0, 5, 4],
    [0, 0, 0, 3, 2, 5, 0, 0, 6],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ]
};

export function SudokuVisualization() {
  const t = useTranslations('sudoku');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState([800]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [state, setState] = useState<SudokuState>({
    grid: [],
    currentStep: null,
    completedSteps: []
  });
  const [steps, setSteps] = useState<SudokuStep[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({
    totalSteps: 0,
    nakedSingles: 0,
    hiddenSingles: 0,
    eliminations: 0,
    timeElapsed: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  // 初始化数独网格
  const initializeSudoku = useCallback((puzzle: number[][]) => {
    const grid: SudokuCell[][] = puzzle.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        value: cell,
        isOriginal: cell !== 0,
        candidates: cell === 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [],
        isHighlighted: false,
        isAnalyzing: false,
        justSolved: false
      }))
    );

    // 初始化候选数字
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col].value === 0) {
          grid[row][col].candidates = getValidCandidates(grid, row, col);
        }
      }
    }

    setState({
      grid,
      currentStep: null,
      completedSteps: []
    });
    setCurrentStepIndex(0);
    setIsComplete(false);
    setStats({
      totalSteps: 0,
      nakedSingles: 0,
      hiddenSingles: 0,
      eliminations: 0,
      timeElapsed: 0
    });
  }, []);

  // 获取有效的候选数字
  const getValidCandidates = (grid: SudokuCell[][], row: number, col: number): number[] => {
    const used = new Set<number>();

    // 检查行
    for (let c = 0; c < 9; c++) {
      if (grid[row][c].value !== 0) {
        used.add(grid[row][c].value);
      }
    }

    // 检查列
    for (let r = 0; r < 9; r++) {
      if (grid[r][col].value !== 0) {
        used.add(grid[r][col].value);
      }
    }

    // 检查3x3方块
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if (grid[r][c].value !== 0) {
          used.add(grid[r][c].value);
        }
      }
    }

    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(num => !used.has(num));
  };

  // 寻找裸单数（Naked Single）
  const findNakedSingles = (grid: SudokuCell[][]): SudokuStep[] => {
    const steps: SudokuStep[] = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col].value === 0 && grid[row][col].candidates.length === 1) {
          steps.push({
            type: 'naked_single',
            row,
            col,
            value: grid[row][col].candidates[0],
            reason: `唯一候选数字 ${grid[row][col].candidates[0]}`,
            affectedCells: []
          });
        }
      }
    }
    return steps;
  };

  // 寻找隐单数（Hidden Single）
  const findHiddenSingles = (grid: SudokuCell[][]): SudokuStep[] => {
    const steps: SudokuStep[] = [];

    // 检查每个数字在每行、列、方块中的唯一位置
    for (let num = 1; num <= 9; num++) {
      // 检查行
      for (let row = 0; row < 9; row++) {
        const possibleCols = [];
        for (let col = 0; col < 9; col++) {
          if (grid[row][col].value === 0 && grid[row][col].candidates.includes(num)) {
            possibleCols.push(col);
          }
        }
        if (possibleCols.length === 1) {
          const col = possibleCols[0];
          if (grid[row][col].candidates.length > 1) {
            steps.push({
              type: 'hidden_single',
              row,
              col,
              value: num,
              reason: `数字 ${num} 在第 ${row + 1} 行的唯一位置`,
              affectedCells: []
            });
          }
        }
      }

      // 检查列
      for (let col = 0; col < 9; col++) {
        const possibleRows = [];
        for (let row = 0; row < 9; row++) {
          if (grid[row][col].value === 0 && grid[row][col].candidates.includes(num)) {
            possibleRows.push(row);
          }
        }
        if (possibleRows.length === 1) {
          const row = possibleRows[0];
          if (grid[row][col].candidates.length > 1) {
            steps.push({
              type: 'hidden_single',
              row,
              col,
              value: num,
              reason: `数字 ${num} 在第 ${col + 1} 列的唯一位置`,
              affectedCells: []
            });
          }
        }
      }

      // 检查3x3方块
      for (let boxRow = 0; boxRow < 3; boxRow++) {
        for (let boxCol = 0; boxCol < 3; boxCol++) {
          const possibleCells = [];
          for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
            for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
              if (grid[r][c].value === 0 && grid[r][c].candidates.includes(num)) {
                possibleCells.push({ row: r, col: c });
              }
            }
          }
          if (possibleCells.length === 1) {
            const { row, col } = possibleCells[0];
            if (grid[row][col].candidates.length > 1) {
              steps.push({
                type: 'hidden_single',
                row,
                col,
                value: num,
                reason: `数字 ${num} 在方块 ${boxRow + 1}-${boxCol + 1} 的唯一位置`,
                affectedCells: []
              });
            }
          }
        }
      }
    }
    return steps;
  };

  // 生成解题步骤
  const generateSolvingSteps = useCallback((initialGrid: SudokuCell[][]): SudokuStep[] => {
    const steps: SudokuStep[] = [];
    const grid = initialGrid.map(row => row.map(cell => ({ ...cell, candidates: [...cell.candidates] })));

    let changed = true;
    while (changed) {
      changed = false;

      // 寻找裸单数
      const nakedSingles = findNakedSingles(grid);
      for (const step of nakedSingles) {
        steps.push(step);
        grid[step.row][step.col].value = step.value;
        grid[step.row][step.col].candidates = [];
        updateCandidates(grid, step.row, step.col, step.value);
        changed = true;
        break; // 一次只处理一个步骤
      }

      if (!changed) {
        // 寻找隐单数
        const hiddenSingles = findHiddenSingles(grid);
        for (const step of hiddenSingles) {
          steps.push(step);
          grid[step.row][step.col].value = step.value;
          grid[step.row][step.col].candidates = [];
          updateCandidates(grid, step.row, step.col, step.value);
          changed = true;
          break; // 一次只处理一个步骤
        }
      }

      // 检查是否完成
      if (isGridComplete(grid)) {
        break;
      }
    }

    return steps;
  }, []);

  // 更新候选数字
  const updateCandidates = (grid: SudokuCell[][], row: number, col: number, value: number) => {
    // 更新同行
    for (let c = 0; c < 9; c++) {
      grid[row][c].candidates = grid[row][c].candidates.filter(num => num !== value);
    }

    // 更新同列
    for (let r = 0; r < 9; r++) {
      grid[r][col].candidates = grid[r][col].candidates.filter(num => num !== value);
    }

    // 更新同方块
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        grid[r][c].candidates = grid[r][c].candidates.filter(num => num !== value);
      }
    }
  };

  // 检查数独是否完成
  const isGridComplete = (grid: SudokuCell[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col].value === 0) {
          return false;
        }
      }
    }
    return true;
  };

  // 初始化数独
  useEffect(() => {
    const puzzle = SUDOKU_PUZZLES[difficulty];
    initializeSudoku(puzzle);
  }, [difficulty, initializeSudoku]);

  // 生成解题步骤
  useEffect(() => {
    if (state.grid.length > 0) {
      const solvingSteps = generateSolvingSteps(state.grid);
      setSteps(solvingSteps);
      setStats(prev => ({ ...prev, totalSteps: solvingSteps.length }));
    }
  }, [state.grid, generateSolvingSteps]);

  // 执行单个步骤
  const executeStep = useCallback((step: SudokuStep) => {
    setState(prevState => {
      const newGrid = prevState.grid.map(row => row.map(cell => ({ 
        ...cell, 
        isHighlighted: false, 
        isAnalyzing: false, 
        justSolved: false 
      })));

      // 高亮相关区域
      newGrid[step.row][step.col].isAnalyzing = true;

      // 设置当前步骤
      return {
        ...prevState,
        grid: newGrid,
        currentStep: step
      };
    });

    // 延迟执行实际填入
    setTimeout(() => {
      setState(prevState => {
        const newGrid = prevState.grid.map(row => row.map(cell => ({ ...cell })));
        newGrid[step.row][step.col].value = step.value;
        newGrid[step.row][step.col].candidates = [];
        newGrid[step.row][step.col].justSolved = true;
        newGrid[step.row][step.col].isAnalyzing = false;

        // 更新候选数字
        updateCandidates(newGrid, step.row, step.col, step.value);

        return {
          ...prevState,
          grid: newGrid,
          completedSteps: [...prevState.completedSteps, step]
        };
      });
    }, Math.min(speed[0] / 2, 400));
  }, [speed]);

  // 自动播放逻辑
  useEffect(() => {
    if (isPlaying && !isPaused && currentStepIndex < steps.length) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }

      timeoutRef.current = setTimeout(() => {
        const step = steps[currentStepIndex];
        executeStep(step);
        setCurrentStepIndex(prev => prev + 1);
        
        setStats(prev => ({
          ...prev,
          [step.type === 'naked_single' ? 'nakedSingles' : 
            step.type === 'hidden_single' ? 'hiddenSingles' : 'eliminations']: 
            prev[step.type === 'naked_single' ? 'nakedSingles' : 
                 step.type === 'hidden_single' ? 'hiddenSingles' : 'eliminations'] + 1,
          timeElapsed: startTimeRef.current ? Date.now() - startTimeRef.current : 0
        }));

        if (currentStepIndex + 1 >= steps.length) {
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
  }, [isPlaying, isPaused, currentStepIndex, steps, executeStep, speed]);

  // 控制函数
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
    if (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      executeStep(step);
      setCurrentStepIndex(prev => prev + 1);
      
      setStats(prev => ({
        ...prev,
        [step.type === 'naked_single' ? 'nakedSingles' : 
          step.type === 'hidden_single' ? 'hiddenSingles' : 'eliminations']: 
          prev[step.type === 'naked_single' ? 'nakedSingles' : 
               step.type === 'hidden_single' ? 'hiddenSingles' : 'eliminations'] + 1
      }));

      if (currentStepIndex + 1 >= steps.length) {
        setIsComplete(true);
      }
    }
  };

  const handleReset = () => {
    handleStop();
    const puzzle = SUDOKU_PUZZLES[difficulty];
    initializeSudoku(puzzle);
    startTimeRef.current = undefined;
  };

  const handleDifficultyChange = (newDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDifficulty);
    handleStop();
  };

  // 获取格子样式
  const getCellStyle = (cell: SudokuCell, row: number, col: number) => {
    let className = "w-12 h-12 border flex items-center justify-center text-lg font-semibold transition-all duration-300 ";
    
    if (cell.isOriginal) {
      className += "bg-gray-100 text-gray-800 ";
    } else if (cell.justSolved) {
      className += "bg-green-200 text-green-800 animate-pulse ";
    } else if (cell.isAnalyzing) {
      className += "bg-yellow-200 text-yellow-800 ring-2 ring-yellow-400 ";
    } else if (cell.value !== 0) {
      className += "bg-blue-100 text-blue-800 ";
    } else {
      className += "bg-white text-gray-600 ";
    }

    // 边框样式
    if (row % 3 === 0) className += "border-t-2 border-t-gray-800 ";
    if (col % 3 === 0) className += "border-l-2 border-l-gray-800 ";
    if (row === 8) className += "border-b-2 border-b-gray-800 ";
    if (col === 8) className += "border-r-2 border-r-gray-800 ";

    return className;
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
                      disabled={isPlaying || currentStepIndex >= steps.length}
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
                      max={2000}
                      min={300}
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

            {/* Sudoku Grid */}
            <Card>
              <CardHeader>
                <CardTitle>{t('visualization')}</CardTitle>
                <div className="text-sm text-gray-600">
                  {state.currentStep && (
                    <div className="p-2 bg-blue-50 rounded">
                      {t('step')} {currentStepIndex}: {state.currentStep.reason}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="inline-block border-2 border-gray-800 rounded-lg overflow-hidden">
                    {state.grid.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex">
                        {row.map((cell, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={getCellStyle(cell, rowIndex, colIndex)}
                          >
                            {cell.value !== 0 ? cell.value : ''}
                            {cell.value === 0 && cell.candidates.length <= 3 && (
                              <div className="text-xs text-gray-400">
                                {cell.candidates.join('')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Difficulty Selector */}
            <Card>
              <CardHeader>
                <CardTitle>{t('generator.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('generator.difficulty')}</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((level) => (
                      <Button
                        key={level}
                        onClick={() => handleDifficultyChange(level)}
                        variant={difficulty === level ? "default" : "outline"}
                        size="sm"
                        className="w-full"
                      >
                        {t(`generator.${level}`)}
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
                  <span className="font-medium">{currentStepIndex} / {steps.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.nakedSingles')}</span>
                  <span className="font-medium">{stats.nakedSingles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.hiddenSingles')}</span>
                  <span className="font-medium">{stats.hiddenSingles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.timeElapsed')}</span>
                  <span className="font-medium">{(stats.timeElapsed / 1000).toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('stats.progress')}</span>
                  <span className="font-medium">{Math.round((currentStepIndex / steps.length) * 100)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Techniques Explanation */}
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
                  <h4 className="font-medium">{t('explanation.techniques')}</h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div>
                      <span className="font-medium text-blue-600">{t('explanation.nakedSingle')}</span>
                      <p>{t('explanation.nakedSingleDesc')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-600">{t('explanation.hiddenSingle')}</span>
                      <p>{t('explanation.hiddenSingleDesc')}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t('explanation.legend')}</h4>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-100 border"></div>
                      <span>{t('explanation.original')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-200 border"></div>
                      <span>{t('explanation.analyzing')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-200 border"></div>
                      <span>{t('explanation.solved')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 border"></div>
                      <span>{t('explanation.filled')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}