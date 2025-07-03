'use client';
import { useState } from 'react';

export default function OCRTester() {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-ocr', { method: 'POST' });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">DeepSeek OCR API 调试器</h2>
      
      <button
        onClick={runTest}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4"
      >
        {loading ? '测试中...' : '运行API测试'}
      </button>
      
      {testResult && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="font-bold mb-2">测试结果：</h3>
          <pre className="whitespace-pre-wrap text-sm bg-gray-800 text-green-400 p-3 rounded">
            {JSON.stringify(testResult, null, 2)}
          </pre>
          
          {testResult.status === 200 && (
            <div className="mt-3 p-3 bg-green-50 text-green-700 rounded">
              API连接成功！请检查响应数据结构
            </div>
          )}
          
          {testResult.status === 404 && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded">
              <p className="font-bold">端点未找到：{testResult.endpoint}</p>
              <p>可能的原因：</p>
              <ul className="list-disc pl-5 mt-2">
                <li>API端点已变更</li>
                <li>您的账户未启用OCR服务</li>
                <li>区域限制（尝试VPN）</li>
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-6 p-4 bg-yellow-50 rounded-md">
        <h3 className="font-bold mb-2">后续步骤：</h3>
        <ol className="list-decimal pl-5 space-y-2">
          <li>运行上面的测试</li>
          <li>如果测试失败，检查DeepSeek控制台：<a 
            href="https://platform.deepseek.com/" 
            target="_blank"
            className="text-blue-600 underline"
          >
            https://platform.deepseek.com/
          </a></li>
          <li>确保API密钥有<code className="bg-gray-100 px-1">ocr</code>权限</li>
          <li>联系DeepSeek支持：<a 
            href="mailto:support@deepseek.com" 
            className="text-blue-600 underline"
          >
            support@deepseek.com
          </a></li>
        </ol>
      </div>
    </div>
  );
}