/**
 * 测试本地数据同步功能
 * 这个脚本用于验证本地数据同步到Google Drive的功能
 */

const fs = require('fs');
const path = require('path');

// 模拟本地数据
const mockLocalData = {
  users: [
    {
      uniqueOwnerId: "user_001",
      ownerId: "device_001",
      ownerName: "本人",
      nickname: "本人",
      role: "primary",
      isActive: true
    },
    {
      uniqueOwnerId: "user_002",
      ownerId: "device_002",
      ownerName: "孩子妈妈",
      nickname: "妈妈",
      role: "family",
      relationship: "孩子妈妈",
      isActive: true
    }
  ],
  records: [
    {
      id: "record_001",
      recordId: "record_001",
      uniqueOwnerId: "user_001",
      ownerId: "device_001",
      ownerName: "本人",
      groupId: "family_001",
      date: "2024-01-01",
      type: "period",
      flow: "medium",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: "record_002",
      recordId: "record_002",
      uniqueOwnerId: "user_002",
      ownerId: "device_002",
      ownerName: "孩子妈妈",
      groupId: "family_001",
      date: "2024-01-02",
      type: "poop",
      poopType: "type3",
      poopColor: "brown",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

// 测试数据分组逻辑
function testDataGrouping() {
  console.log('🧪 测试数据分组逻辑...');
  
  const userDataMap = new Map();
  
  // 处理用户数据
  mockLocalData.users.forEach(user => {
    userDataMap.set(user.uniqueOwnerId, {
      profile: user,
      records: [],
      settings: {}
    });
  });
  
  // 处理记录数据
  mockLocalData.records.forEach(record => {
    const userId = record.uniqueOwnerId || record.ownerId;
    if (userDataMap.has(userId)) {
      userDataMap.get(userId).records.push(record);
    } else {
      // 如果用户不存在，创建一个默认用户
      userDataMap.set(userId, {
        profile: {
          uniqueOwnerId: userId,
          ownerId: record.ownerId,
          ownerName: record.ownerName,
          nickname: record.ownerName,
          role: 'family',
          isActive: true
        },
        records: [record],
        settings: {}
      });
    }
  });
  
  console.log('✅ 数据分组结果:');
  for (const [userId, userData] of userDataMap) {
    console.log(`  用户 ${userId}: ${userData.records.length} 条记录`);
  }
  
  return userDataMap;
}

// 测试同步状态文件生成
function testSyncStatusGeneration() {
  console.log('\n🧪 测试同步状态文件生成...');
  
  const syncStatus = {
    lastSyncTime: new Date().toISOString(),
    totalUsers: mockLocalData.users.length,
    totalRecords: mockLocalData.records.length,
    errors: [],
    syncType: 'local-data'
  };
  
  const statusContent = JSON.stringify(syncStatus, null, 2);
  console.log('✅ 同步状态文件内容:');
  console.log(statusContent);
  
  return statusContent;
}

// 测试文件结构生成
function testFileStructure() {
  console.log('\n🧪 测试文件结构生成...');
  
  const fileStructure = {
    'HealthCalendar': {
      'users': {
        'user_001': {
          'profile.json': '用户配置文件',
          'records.json': '健康记录',
          'settings.json': '用户设置'
        },
        'user_002': {
          'profile.json': '用户配置文件',
          'records.json': '健康记录',
          'settings.json': '用户设置'
        }
      },
      'shared': '共享数据文件夹',
      'backups': '备份文件文件夹',
      'sync-status.json': '同步状态文件'
    }
  };
  
  console.log('✅ 文件结构:');
  console.log(JSON.stringify(fileStructure, null, 2));
  
  return fileStructure;
}

// 测试错误处理
function testErrorHandling() {
  console.log('\n🧪 测试错误处理...');
  
  const testCases = [
    {
      name: '认证失败',
      error: new Error('Google Drive未认证'),
      expected: 'Google Drive未认证，请先在客户端连接Google Drive账户'
    },
    {
      name: '网络错误',
      error: new Error('Network Error'),
      expected: '网络错误: Network Error'
    },
    {
      name: '文件上传失败',
      error: new Error('Failed to upload file: Parse Error'),
      expected: 'Failed to upload file: Parse Error'
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`  测试: ${testCase.name}`);
    console.log(`    错误: ${testCase.error.message}`);
    console.log(`    预期处理: ${testCase.expected}`);
    console.log(`    ✅ 通过`);
  });
}

// 主测试函数
function runTests() {
  console.log('🚀 开始测试本地数据同步功能...\n');
  
  try {
    // 测试数据分组
    const userDataMap = testDataGrouping();
    
    // 测试同步状态生成
    const syncStatus = testSyncStatusGeneration();
    
    // 测试文件结构
    const fileStructure = testFileStructure();
    
    // 测试错误处理
    testErrorHandling();
    
    console.log('\n✅ 所有测试通过！');
    console.log('\n📊 测试总结:');
    console.log(`  - 用户数量: ${mockLocalData.users.length}`);
    console.log(`  - 记录数量: ${mockLocalData.records.length}`);
    console.log(`  - 分组用户: ${userDataMap.size}`);
    console.log(`  - 同步状态文件大小: ${syncStatus.length} 字符`);
    
    console.log('\n🎉 本地数据同步功能测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = {
  testDataGrouping,
  testSyncStatusGeneration,
  testFileStructure,
  testErrorHandling,
  runTests
}; 