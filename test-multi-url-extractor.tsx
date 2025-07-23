import MultiURLExtractor from '@/components/multi-url-extractor'

export default function TestMultiURLExtractor() {
  const handleResult = (result: any) => {
    console.log('URL提取结果:', result)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">多实例URL提取器测试</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">功能说明</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            <li>主要的"URL提取"按钮可以打开第一个提取器</li>
            <li>点击"+"按钮可以创建额外的提取器实例（最多3个）</li>
            <li>每个实例都有独立的会话ID和处理状态</li>
            <li>可以同时运行多个URL提取任务</li>
            <li>点击实例标签可以重新打开对应的提取器</li>
            <li>点击"×"可以移除不需要的实例</li>
          </ul>
        </div>

        <div className="bg-white p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-3">多实例URL提取器</h2>
          <MultiURLExtractor 
            onResult={handleResult}
            maxInstances={3}
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-3 text-blue-800">使用建议</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
            <li><strong>批量处理:</strong> 为不同类型的图片创建不同的提取器实例</li>
            <li><strong>组织管理:</strong> 每个实例可以处理不同项目或分类的图片</li>
            <li><strong>效率提升:</strong> 同时处理多个任务，节省等待时间</li>
            <li><strong>状态跟踪:</strong> 每个实例的处理状态都独立显示</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
