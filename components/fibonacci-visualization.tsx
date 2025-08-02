"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PlayIcon, PauseIcon, SquareIcon, StepForwardIcon } from 'lucide-react';
import { Slider } from './ui/slider';
import { useTranslations } from 'next-intl';

interface TreeNode {
  id: string;
  n: number;
  result?: number;
  x: number;
  y: number;
  level: number;
  parent?: string;
  children: string[];
  status: 'pending' | 'calculating' | 'computed' | 'base-case';
  callOrder: number;
}

interface AnimationStep {
  nodeId: string;
  action: 'start-calculating' | 'show-result' | 'highlight-base-case';
  timestamp: number;
}

const FibonacciVisualization: React.FC = () => {
  const t = useTranslations('fibonacci');
  
  const [inputN, setInputN] = useState<number>(5);
  const [tree, setTree] = useState<Map<string, TreeNode>>(new Map());
  const [animationSteps, setAnimationSteps] = useState<AnimationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number[]>([800]);
  const [stats, setStats] = useState({
    totalCalls: 0,
    redundantCalls: 0,
    maxDepth: 0,
    result: 0
  });

  // Generate Fibonacci call tree
  const generateFibonacciTree = useCallback((n: number): { tree: Map<string, TreeNode>, steps: AnimationStep[] } => {
    const tree = new Map<string, TreeNode>();
    const steps: AnimationStep[] = [];
    const memo = new Map<number, number>();
    const positions = new Map<string, { x: number, y: number }>();
    let callOrder = 0;
    let totalCalls = 0;
    let redundantCalls = 0;
    let maxDepth = 0;

    // Calculate node positions for tree layout
    const calculatePositions = (n: number, level: number = 0, offsetX: number = 0): number => {
      if (n <= 1) return 1;
      
      const leftWidth = calculatePositions(n - 1, level + 1, offsetX);
      const rightWidth = calculatePositions(n - 2, level + 1, offsetX + leftWidth);
      
      return leftWidth + rightWidth;
    };

    const positionNodes = (n: number, level: number = 0, offsetX: number = 0, parentId?: string): number => {
      const nodeId = `fib-${n}-${level}-${offsetX}`;
      
      if (n <= 1) {
        const x = offsetX * 120 + 60;
        const y = level * 80 + 50;
        positions.set(nodeId, { x, y });
        
        tree.set(nodeId, {
          id: nodeId,
          n,
          result: n,
          x,
          y,
          level,
          parent: parentId,
          children: [],
          status: 'base-case',
          callOrder: callOrder++
        });

        steps.push({
          nodeId,
          action: 'highlight-base-case',
          timestamp: callOrder * 100
        });

        totalCalls++;
        maxDepth = Math.max(maxDepth, level);
        return 1;
      }

      const leftWidth = positionNodes(n - 1, level + 1, offsetX, nodeId);
      const rightWidth = positionNodes(n - 2, level + 1, offsetX + leftWidth, nodeId);
      
      const x = (offsetX + leftWidth / 2) * 120 + 60;
      const y = level * 80 + 50;
      positions.set(nodeId, { x, y });

      const leftChildId = `fib-${n-1}-${level+1}-${offsetX}`;
      const rightChildId = `fib-${n-2}-${level+1}-${offsetX + leftWidth}`;

      tree.set(nodeId, {
        id: nodeId,
        n,
        x,
        y,
        level,
        parent: parentId,
        children: [leftChildId, rightChildId],
        status: 'pending',
        callOrder: callOrder++
      });

      steps.push({
        nodeId,
        action: 'start-calculating',
        timestamp: callOrder * 100
      });

      totalCalls++;
      maxDepth = Math.max(maxDepth, level);

      // Check for redundant calls
      if (memo.has(n)) {
        redundantCalls++;
      } else {
        memo.set(n, 1);
      }

      return leftWidth + rightWidth;
    };

    // Generate the tree structure
    positionNodes(n);

    // Generate animation steps in execution order
    const generateAnimationSteps = () => {
      const executionOrder: string[] = [];
      const processed = new Set<string>();
      
      // First, collect the execution order (depth-first)
      const collectExecutionOrder = (nodeId: string) => {
        const node = tree.get(nodeId);
        if (!node || processed.has(nodeId)) return;
        
        executionOrder.push(nodeId);
        processed.add(nodeId);
        
        if (node.n > 1) {
          // Process children first (recursive calls)
          collectExecutionOrder(node.children[0]);
          collectExecutionOrder(node.children[1]);
        }
      };
      
      // Then generate steps and calculate results
      const processResults = (nodeId: string): number => {
        const node = tree.get(nodeId);
        if (!node) return 0;
        
        if (node.n <= 1) {
          return node.n;
        }

        const leftResult = processResults(node.children[0]);
        const rightResult = processResults(node.children[1]);
        const result = leftResult + rightResult;
        
        node.result = result;
        steps.push({
          nodeId,
          action: 'show-result',
          timestamp: (steps.length + 1) * 100
        });
        
        return result;
      };

      const rootNodeId = Array.from(tree.keys()).find(id => tree.get(id)?.level === 0);
      if (rootNodeId) {
        collectExecutionOrder(rootNodeId);
        const finalResult = processResults(rootNodeId);
        setStats({
          totalCalls,
          redundantCalls,
          maxDepth,
          result: finalResult
        });
      }
    };

    generateAnimationSteps();
    
    return { tree, steps };
  }, []);

  // Initialize tree
  const initializeTree = useCallback(() => {
    const { tree: newTree, steps } = generateFibonacciTree(inputN);
    setTree(newTree);
    setAnimationSteps(steps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  }, [inputN, generateFibonacciTree]);

  // Initialize on mount and input change
  useEffect(() => {
    initializeTree();
  }, [initializeTree]);

  // Animation loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && currentStepIndex < animationSteps.length) {
      interval = setInterval(() => {
        setCurrentStepIndex(prev => {
          const nextIndex = prev + 1;
          if (nextIndex >= animationSteps.length) {
            setIsPlaying(false);
            return prev;
          }
          
          const step = animationSteps[nextIndex];
          if (step) {
            setTree(prevTree => {
              const newTree = new Map(prevTree);
              const node = newTree.get(step.nodeId);
              if (node) {
                const updatedNode = { ...node };
                switch (step.action) {
                  case 'start-calculating':
                    updatedNode.status = 'calculating';
                    break;
                  case 'show-result':
                    updatedNode.status = 'computed';
                    break;
                  case 'highlight-base-case':
                    updatedNode.status = 'base-case';
                    break;
                }
                newTree.set(step.nodeId, updatedNode);
              }
              return newTree;
            });
          }
          
          return nextIndex;
        });
      }, speed[0]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentStepIndex, animationSteps, speed]);

  const handleStart = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setTree(prevTree => {
      const newTree = new Map();
      prevTree.forEach((node, key) => {
        newTree.set(key, {
          ...node,
          status: node.n <= 1 ? 'base-case' : 'pending'
        });
      });
      return newTree;
    });
  };

  const handleStep = () => {
    if (currentStepIndex < animationSteps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const step = animationSteps[nextIndex];
      if (step) {
        setTree(prevTree => {
          const newTree = new Map(prevTree);
          const node = newTree.get(step.nodeId);
          if (node) {
            const updatedNode = { ...node };
            switch (step.action) {
              case 'start-calculating':
                updatedNode.status = 'calculating';
                break;
              case 'show-result':
                updatedNode.status = 'computed';
                break;
              case 'highlight-base-case':
                updatedNode.status = 'base-case';
                break;
            }
            newTree.set(step.nodeId, updatedNode);
          }
          return newTree;
        });
      }
      setCurrentStepIndex(nextIndex);
    }
  };

  const handleInputChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setInputN(num);
    }
  };

  const getNodeColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-gradient-to-br from-slate-200 to-slate-300 border-slate-400';
      case 'calculating': return 'bg-gradient-to-br from-yellow-400 to-orange-500 border-orange-600 animate-pulse';
      case 'computed': return 'bg-gradient-to-br from-green-400 to-emerald-500 border-emerald-600';
      case 'base-case': return 'bg-gradient-to-br from-blue-400 to-indigo-500 border-indigo-600';
      default: return 'bg-gradient-to-br from-gray-300 to-gray-400 border-gray-500';
    }
  };

  const fibonacciCode = `function fibonacci(n) {
  // Base cases
  if (n <= 1) {
    return n;
  }
  
  // Recursive calls
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

  const memoizedCode = `function fibonacciMemo(n, memo = {}) {
  // Check memo first
  if (n in memo) {
    return memo[n];
  }
  
  // Base cases
  if (n <= 1) {
    return n;
  }
  
  // Store result in memo
  memo[n] = fibonacciMemo(n - 1, memo) + 
             fibonacciMemo(n - 2, memo);
  
  return memo[n];
}`;

  const treeNodes = Array.from(tree.values());
  const maxX = Math.max(...treeNodes.map(node => node.x), 0);
  const maxY = Math.max(...treeNodes.map(node => node.y), 0);

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

        {/* Input and Controls */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            
            {/* Input Section */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('input.number')}
                </label>
                <Input
                  type="number"
                  value={inputN}
                  onChange={(e) => handleInputChange(e.target.value)}
                  min={1}
                  max={10}
                  className="w-20 text-center text-lg font-bold"
                />
                <p className="text-xs text-slate-500 mt-1">{t('input.numberDesc')}</p>
              </div>
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
                onClick={handleStep}
                size="lg"
                variant="outline"
                disabled={currentStepIndex >= animationSteps.length - 1}
                className="border-2 border-blue-300 hover:border-blue-400 text-blue-700 font-semibold px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
              >
                <StepForwardIcon className="w-5 h-5 mr-2" />
                {t('controls.step')}
              </Button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center space-x-4 bg-gradient-to-r from-slate-100/50 to-purple-100/50 rounded-xl p-4">
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{t('controls.speed')}:</span>
              <div className="w-32">
                <Slider
                  value={speed}
                  onValueChange={setSpeed}
                  min={200}
                  max={2000}
                  step={100}
                  className="w-full"
                />
              </div>
              <span className="text-sm font-semibold text-slate-700 min-w-[60px]">{speed[0]}ms</span>
            </div>
          </div>
        </div>

        {/* Recursion Tree Visualization */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 border-b border-white/20">
            <h2 className="text-2xl font-semibold text-slate-800 text-center">{t('tree.title')}</h2>
          </div>
          
          <div className="p-8">
            <div className="overflow-x-auto">
              <svg 
                width={Math.max(maxX + 120, 800)} 
                height={Math.max(maxY + 100, 400)}
                className="border border-slate-200 rounded-xl bg-gradient-to-br from-white to-slate-50"
              >
                {/* Draw connections */}
                {treeNodes.map(node => 
                  node.children.map(childId => {
                    const child = tree.get(childId);
                    if (!child) return null;
                    
                    return (
                      <line
                        key={`${node.id}-${childId}`}
                        x1={node.x}
                        y1={node.y + 20}
                        x2={child.x}
                        y2={child.y - 20}
                        stroke="#64748b"
                        strokeWidth="2"
                        className="opacity-60"
                      />
                    );
                  })
                )}
                
                {/* Draw nodes */}
                {treeNodes.map(node => (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="25"
                      className={`${getNodeColor(node.status)} border-2 transition-all duration-500`}
                      style={{
                        filter: node.status === 'calculating' ? 'drop-shadow(0 0 10px rgba(251, 146, 60, 0.5))' : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                      }}
                    />
                    <text
                      x={node.x}
                      y={node.y - 2}
                      textAnchor="middle"
                      className="text-sm font-bold fill-white"
                      style={{ pointerEvents: 'none' }}
                    >
                      F({node.n})
                    </text>
                    {node.result !== undefined && node.status !== 'pending' && (
                      <text
                        x={node.x}
                        y={node.y + 12}
                        textAnchor="middle"
                        className="text-xs font-semibold fill-white"
                        style={{ pointerEvents: 'none' }}
                      >
                        = {node.result}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
            
            {/* Legend */}
            <div className="mt-6 flex flex-wrap justify-center gap-6">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-slate-200 to-slate-300 border border-slate-400 rounded-full"></div>
                <span className="text-sm text-slate-700">{t('tree.pending')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 border border-orange-600 rounded-full"></div>
                <span className="text-sm text-slate-700">{t('tree.calculating')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 border border-emerald-600 rounded-full"></div>
                <span className="text-sm text-slate-700">{t('tree.computed')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 border border-indigo-600 rounded-full"></div>
                <span className="text-sm text-slate-700">{t('tree.baseCase')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 p-6 border-b border-white/20">
            <h2 className="text-2xl font-semibold text-slate-800 text-center">{t('stats.title')}</h2>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{stats.totalCalls}</div>
                <div className="text-sm text-blue-600">{t('stats.totalCalls')}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200">
                <div className="text-2xl font-bold text-red-700">{stats.redundantCalls}</div>
                <div className="text-sm text-red-600">{t('stats.redundantCalls')}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{stats.maxDepth}</div>
                <div className="text-sm text-purple-600">{t('stats.maxDepth')}</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-700">{stats.result}</div>
                <div className="text-sm text-green-600">{t('stats.result')}</div>
              </div>
            </div>
            <div className="mt-6 text-center space-y-2">
              <div className="text-sm text-slate-600">{t('stats.timeComplexity')}</div>
              <div className="text-sm text-slate-600">{t('stats.spaceComplexity')}</div>
            </div>
          </div>
        </div>

        {/* Algorithm Code */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500/10 to-pink-500/10 p-6 border-b border-white/20">
              <h3 className="text-xl font-semibold text-slate-800 text-center">{t('code.naive')}</h3>
            </div>
            <div className="p-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 shadow-inner">
                <pre className="text-green-400 overflow-x-auto text-sm leading-relaxed">
                  <code>{fibonacciCode}</code>
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 p-6 border-b border-white/20">
              <h3 className="text-xl font-semibold text-slate-800 text-center">{t('code.optimized')}</h3>
            </div>
            <div className="p-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 shadow-inner">
                <pre className="text-green-400 overflow-x-auto text-sm leading-relaxed">
                  <code>{memoizedCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 border-b border-white/20">
            <h2 className="text-2xl font-semibold text-slate-800 text-center">{t('explanation.title')}</h2>
          </div>
          <div className="p-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* Formula */}
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl p-6 border border-blue-200/50">
                <h3 className="font-bold text-xl mb-4 text-blue-800 flex items-center">
                  <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-3">1</span>
                  {t('explanation.recursiveFormula')}
                </h3>
                <div className="text-center mb-4">
                  <div className="text-2xl font-mono font-bold text-blue-700 bg-blue-100 p-4 rounded-lg">
                    {t('explanation.formulaText')}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-blue-800">{t('explanation.baseCases')}</div>
                  <div className="text-sm text-slate-700">{t('explanation.baseCase1')}</div>
                  <div className="text-sm text-slate-700">{t('explanation.baseCase2')}</div>
                </div>
              </div>
              
              {/* Process */}
              <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-xl p-6 border border-amber-200/50">
                <h3 className="font-bold text-xl mb-4 text-amber-800 flex items-center">
                  <span className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm mr-3">2</span>
                  {t('explanation.process')}
                </h3>
                <ol className="space-y-3 text-slate-700">
                  <li className="text-sm">{t('explanation.step1')}</li>
                  <li className="text-sm">{t('explanation.step2')}</li>
                  <li className="text-sm">{t('explanation.step3')}</li>
                  <li className="text-sm">{t('explanation.step4')}</li>
                </ol>
              </div>

              {/* Complexity */}
              <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl p-6 border border-purple-200/50 md:col-span-2 lg:col-span-1">
                <h3 className="font-bold text-xl mb-4 text-purple-800 flex items-center">
                  <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm mr-3">3</span>
                  {t('explanation.complexity')}
                </h3>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="bg-red-100/50 rounded-lg p-3 border border-red-200">
                    <strong className="text-red-700">{t('explanation.timeDesc')}</strong>
                  </div>
                  <div className="bg-blue-100/50 rounded-lg p-3 border border-blue-200">
                    <strong className="text-blue-700">{t('explanation.spaceDesc')}</strong>
                  </div>
                  <div className="bg-green-100/50 rounded-lg p-3 border border-green-200">
                    <div className="font-semibold text-green-800 mb-2">{t('explanation.optimization')}</div>
                    <div className="text-green-700">{t('explanation.optimizationDesc')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FibonacciVisualization;