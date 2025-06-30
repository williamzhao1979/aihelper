#!/usr/bin/env node

/**
 * OneDrive配置诊断脚本
 * 用于检查OneDrive集成的配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 OneDrive配置诊断工具\n');

// 检查环境变量文件
function checkEnvFile() {
  console.log('📁 检查环境变量文件...');
  
  const envFiles = ['.env.local', '.env', '.env.development'];
  let envFile = null;
  
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      envFile = file;
      break;
    }
  }
  
  if (!envFile) {
    console.log('❌ 未找到环境变量文件 (.env.local, .env, .env.development)');
    console.log('   请创建 .env.local 文件并添加以下配置：');
    console.log('   NEXT_PUBLIC_ONEDRIVE_CLIENT_ID=your_client_id_here');
    console.log('   NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE=common');
    return false;
  }
  
  console.log(`✅ 找到环境变量文件: ${envFile}`);
  return true;
}

// 检查环境变量内容
function checkEnvVariables() {
  console.log('\n🔧 检查环境变量...');
  
  const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
  const tenantType = process.env.NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE;
  
  if (!clientId) {
    console.log('❌ NEXT_PUBLIC_ONEDRIVE_CLIENT_ID 未设置');
    console.log('   请在 .env.local 文件中添加：');
    console.log('   NEXT_PUBLIC_ONEDRIVE_CLIENT_ID=your_client_id_here');
    return false;
  }
  
  if (clientId === 'your_client_id_here') {
    console.log('❌ NEXT_PUBLIC_ONEDRIVE_CLIENT_ID 仍为默认值');
    console.log('   请替换为实际的Azure AD应用注册客户端ID');
    return false;
  }
  
  console.log(`✅ NEXT_PUBLIC_ONEDRIVE_CLIENT_ID: ${clientId.substring(0, 8)}...`);
  
  if (!tenantType) {
    console.log('⚠️  NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE 未设置，将使用默认值 "common"');
  } else {
    console.log(`✅ NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE: ${tenantType}`);
  }
  
  return true;
}

// 检查Azure AD配置建议
function checkAzureADConfig() {
  console.log('\n🌐 Azure AD配置建议...');
  
  const tenantType = process.env.NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE || 'common';
  
  console.log('📋 请在Azure Portal中检查以下配置：');
  console.log('');
  console.log('1. 应用注册设置：');
  console.log('   - 访问: https://portal.azure.com');
  console.log('   - 搜索 "App registrations"');
  console.log('   - 找到您的应用');
  console.log('');
  console.log('2. 支持的账户类型：');
  if (tenantType === 'common') {
    console.log('   ✅ 选择: "Accounts in any organizational directory and personal Microsoft accounts"');
  } else if (tenantType === 'consumers') {
    console.log('   ✅ 选择: "Personal Microsoft accounts only"');
  } else {
    console.log('   ✅ 选择: "Accounts in any organizational directory and personal Microsoft accounts" (推荐)');
  }
  console.log('');
  console.log('3. 重定向URI：');
  console.log('   - 平台类型: Web');
  console.log('   - URI: http://localhost:3000/onedrive-callback');
  console.log('');
  console.log('4. API权限：');
  console.log('   - Microsoft Graph > Delegated permissions');
  console.log('   - Files.ReadWrite');
  console.log('   - Files.ReadWrite.All');
  console.log('   - User.Read');
  console.log('   - offline_access');
}

// 检查代码文件
function checkCodeFiles() {
  console.log('\n📝 检查代码文件...');
  
  const files = [
    'lib/onedrive-client.ts',
    'hooks/use-onedrive-auth.ts',
    'app/[locale]/onedrive-callback/page.tsx'
  ];
  
  let allFilesExist = true;
  
  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} (文件不存在)`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

// 生成测试URL
function generateTestUrl() {
  console.log('\n🔗 测试URL生成...');
  
  const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID;
  const tenantType = process.env.NEXT_PUBLIC_ONEDRIVE_TENANT_TYPE || 'common';
  
  if (!clientId || clientId === 'your_client_id_here') {
    console.log('❌ 无法生成测试URL，客户端ID未正确配置');
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
  
  const authUrl = `https://login.microsoftonline.com/${tenantType}/oauth2/v2.0/authorize?${params.toString()}`;
  
  console.log('📋 测试认证URL：');
  console.log(authUrl);
  console.log('');
  console.log('💡 您可以在浏览器中打开此URL来测试认证流程');
}

// 主函数
function main() {
  console.log('🚀 开始OneDrive配置诊断...\n');
  
  const envFileExists = checkEnvFile();
  const envVarsValid = checkEnvVariables();
  const codeFilesExist = checkCodeFiles();
  
  checkAzureADConfig();
  generateTestUrl();
  
  console.log('\n📊 诊断结果：');
  console.log(`   环境变量文件: ${envFileExists ? '✅' : '❌'}`);
  console.log(`   环境变量配置: ${envVarsValid ? '✅' : '❌'}`);
  console.log(`   代码文件: ${codeFilesExist ? '✅' : '❌'}`);
  
  if (envFileExists && envVarsValid && codeFilesExist) {
    console.log('\n🎉 配置看起来正确！');
    console.log('   请按照Azure AD配置建议进行设置，然后测试OneDrive连接。');
  } else {
    console.log('\n⚠️  配置存在问题，请按照上述建议进行修复。');
  }
  
  console.log('\n📚 更多信息请查看：');
  console.log('   - TROUBLESHOOTING_GUIDE.md');
  console.log('   - AZURE_AD_SETUP_GUIDE.md');
  console.log('   - ONEDRIVE_CONFIG.md');
}

// 运行诊断
main(); 