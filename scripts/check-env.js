#!/usr/bin/env node

/**
 * 简单的环境变量检查脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 环境变量检查\n');

// 读取.env.local文件
function readEnvFile() {
  const envFile = '.env.local';
  
  if (!fs.existsSync(envFile)) {
    console.log('❌ .env.local 文件不存在');
    return null;
  }
  
  const content = fs.readFileSync(envFile, 'utf8');
  const lines = content.split('\n');
  const envVars = {};
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key] = valueParts.join('=');
      }
    }
  });
  
  return envVars;
}

// 检查OneDrive相关环境变量
function checkOneDriveEnv(envVars) {
  console.log('📋 OneDrive环境变量检查：\n');
  
  const clientId = envVars['NEXT_PUBLIC_ONEDRIVE_CLIENT_ID'];
  const tenantType = envVars['NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE'];
  
  if (clientId) {
    console.log(`✅ NEXT_PUBLIC_ONEDRIVE_CLIENT_ID: ${clientId.substring(0, 8)}...`);
  } else {
    console.log('❌ NEXT_PUBLIC_ONEDRIVE_CLIENT_ID: 未设置');
  }
  
  if (tenantType) {
    console.log(`✅ NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE: ${tenantType}`);
  } else {
    console.log('⚠️  NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE: 未设置 (将使用默认值 "common")');
  }
  
  return { clientId, tenantType };
}

// 生成测试URL
function generateTestUrl(clientId, tenantType) {
  if (!clientId) {
    console.log('\n❌ 无法生成测试URL，客户端ID未设置');
    return;
  }
  
  const redirectUri = 'http://localhost:3000/onedrive-callback';
  const scopes = ['Files.ReadWrite', 'Files.ReadWrite.All', 'offline_access', 'User.Read'];
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    response_mode: 'query',
    state: 'test'
  });
  
  const authUrl = `https://login.microsoftonline.com/${tenantType || 'common'}/oauth2/v2.0/authorize?${params.toString()}`;
  
  console.log('\n🔗 测试认证URL：');
  console.log(authUrl);
  console.log('\n💡 您可以在浏览器中打开此URL来测试认证流程');
}

// 主函数
function main() {
  const envVars = readEnvFile();
  
  if (!envVars) {
    return;
  }
  
  const { clientId, tenantType } = checkOneDriveEnv(envVars);
  
  if (clientId) {
    generateTestUrl(clientId, tenantType);
    
    console.log('\n📋 下一步操作：');
    console.log('1. 在浏览器中打开上面的测试URL');
    console.log('2. 如果出现 "unauthorized_client" 错误，请检查Azure AD应用注册配置');
    console.log('3. 确保应用注册支持个人Microsoft账户');
    console.log('4. 确保重定向URI配置正确');
  } else {
    console.log('\n❌ 请先在 .env.local 文件中设置 NEXT_PUBLIC_ONEDRIVE_CLIENT_ID');
  }
}

main(); 