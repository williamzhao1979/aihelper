/**
 * 测试sync-status.json文件的创建和更新功能
 * 验证文件已存在时会被更新而不是创建新文件
 */

// 测试创建或更新状态文件
async function testStatusFileUpdate() {
  console.log('=== 测试sync-status.json文件创建和更新功能 ===')
  
  try {
    // 第一次同步 - 应该创建新文件
    console.log('\n1. 第一次同步 - 创建新文件')
    const response1 = await fetch('/api/google-drive/sync-with-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'test-sync'
      })
    })

    const result1 = await response1.json()
    console.log('第一次同步结果:', result1)
    
    if (result1.success) {
      console.log('✅ 第一次同步成功，应该创建了新的sync-status.json文件')
    } else {
      console.log('❌ 第一次同步失败:', result1.error)
      return
    }
    
    // 等待一秒
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 第二次同步 - 应该更新现有文件
    console.log('\n2. 第二次同步 - 更新现有文件')
    const response2 = await fetch('/api/google-drive/sync-with-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'test-sync'
      })
    })

    const result2 = await response2.json()
    console.log('第二次同步结果:', result2)
    
    if (result2.success) {
      console.log('✅ 第二次同步成功，应该更新了现有的sync-status.json文件')
    } else {
      console.log('❌ 第二次同步失败:', result2.error)
      return
    }
    
    // 检查状态文件
    console.log('\n3. 检查状态文件')
    const statusResponse = await fetch('/api/google-drive/sync-with-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'get-status'
      })
    })

    const statusResult = await statusResponse.json()
    console.log('状态文件检查结果:', statusResult)
    
    if (statusResult.success) {
      console.log('✅ 状态文件检查成功')
      console.log('最后同步时间:', statusResult.lastSyncTime)
      console.log('同步进度:', statusResult.syncProgress)
    } else {
      console.log('❌ 状态文件检查失败:', statusResult.error)
    }
    
    console.log('\n=== 测试完成 ===')
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 测试清理重复状态文件
async function testCleanupStatusFiles() {
  console.log('\n=== 测试清理重复状态文件 ===')
  
  try {
    const response = await fetch('/api/google-drive/sync-with-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'cleanup-status'
      })
    })

    const result = await response.json()
    console.log('清理结果:', result)
    
    if (result.success) {
      console.log('✅ 清理成功')
      console.log(`删除了 ${result.deleted} 个重复状态文件`)
      console.log(`保留了状态文件ID: ${result.kept}`)
    } else {
      console.log('❌ 清理失败:', result.error)
    }
  } catch (error) {
    console.error('清理测试失败:', error)
  }
}

// 主测试函数
async function runTests() {
  console.log('开始测试sync-status.json文件管理功能...')
  
  // 先清理重复状态文件
  await testCleanupStatusFiles()
  
  // 然后测试创建和更新功能
  await testStatusFileUpdate()
  
  console.log('\n所有测试完成!')
}

// 如果直接运行此脚本
if (typeof window !== 'undefined') {
  // 在浏览器环境中运行
  runTests().catch(console.error)
} else {
  // 在Node.js环境中运行
  console.log('请在浏览器中运行此测试脚本')
} 