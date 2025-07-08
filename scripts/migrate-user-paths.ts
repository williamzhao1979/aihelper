/**
 * 数据迁移脚本：统一用户ID格式并清理重复的 user_ 前缀
 * 这个脚本将修复 Supabase 存储中的路径不一致问题
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface MigrationResult {
  success: boolean;
  migratedFiles: string[];
  errors: string[];
  summary: {
    totalFiles: number;
    migratedCount: number;
    errorCount: number;
  };
}

/**
 * 迁移存储桶中的文件，统一用户ID格式
 */
export async function migrateUserPaths(userId: string): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedFiles: [],
    errors: [],
    summary: {
      totalFiles: 0,
      migratedCount: 0,
      errorCount: 0
    }
  };

  try {
    console.log(`[Migration] 开始迁移用户 ${userId} 的数据...`);
    
    // 清理用户ID，移除可能存在的 user_ 前缀
    const cleanUserId = userId.replace(/^user_/, '');
    const standardUserPath = `user_${cleanUserId}`;
    const duplicateUserPath = `user_user_${cleanUserId}`;
    
    console.log(`[Migration] 标准路径: users/${standardUserPath}/`);
    console.log(`[Migration] 重复路径: users/${duplicateUserPath}/`);
    
    // 获取存储桶中的所有文件
    const { data: files, error: listError } = await supabase.storage
      .from('healthcalendar')
      .list('users', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      result.errors.push(`列出文件失败: ${listError.message}`);
      return result;
    }

    console.log(`[Migration] 找到 ${files?.length || 0} 个用户目录`);

    // 处理重复的 user_user_ 前缀目录
    for (const file of files || []) {
      if (file.name === duplicateUserPath) {
        console.log(`[Migration] 发现重复路径目录: ${file.name}`);
        
        // 获取重复路径下的所有文件
        const { data: duplicateFiles, error: duplicateListError } = await supabase.storage
          .from('healthcalendar')
          .list(`users/${duplicateUserPath}`, {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' }
          });

        if (duplicateListError) {
          result.errors.push(`列出重复路径文件失败: ${duplicateListError.message}`);
          continue;
        }

        // 递归处理子目录和文件
        for (const subItem of duplicateFiles || []) {
          await migrateSubPath(
            `users/${duplicateUserPath}/${subItem.name}`,
            `users/${standardUserPath}/${subItem.name}`,
            result
          );
        }
      }
    }

    result.summary.totalFiles = result.migratedFiles.length + result.errors.length;
    result.summary.migratedCount = result.migratedFiles.length;
    result.summary.errorCount = result.errors.length;
    result.success = result.errors.length === 0;

    console.log(`[Migration] 迁移完成! 成功: ${result.summary.migratedCount}, 失败: ${result.summary.errorCount}`);
    
    return result;

  } catch (error) {
    console.error('[Migration] 迁移过程中发生错误:', error);
    result.errors.push(`迁移失败: ${error}`);
    return result;
  }
}

/**
 * 递归迁移子路径
 */
async function migrateSubPath(
  fromPath: string, 
  toPath: string, 
  result: MigrationResult
): Promise<void> {
  try {
    console.log(`[Migration] 迁移: ${fromPath} -> ${toPath}`);

    // 检查是否是目录
    const { data: subFiles, error: subListError } = await supabase.storage
      .from('healthcalendar')
      .list(fromPath, { limit: 1 });

    if (subListError && !subListError.message.includes('not found')) {
      // 如果不是目录，则是文件，进行文件迁移
      await migrateFile(fromPath, toPath, result);
    } else if (subFiles && subFiles.length > 0) {
      // 是目录，递归处理子项
      const { data: allSubFiles, error: allSubListError } = await supabase.storage
        .from('healthcalendar')
        .list(fromPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (allSubListError) {
        result.errors.push(`列出子目录失败: ${fromPath} - ${allSubListError.message}`);
        return;
      }

      for (const subFile of allSubFiles || []) {
        await migrateSubPath(
          `${fromPath}/${subFile.name}`,
          `${toPath}/${subFile.name}`,
          result
        );
      }
    } else {
      // 是文件
      await migrateFile(fromPath, toPath, result);
    }

  } catch (error) {
    console.error(`[Migration] 迁移子路径失败: ${fromPath}`, error);
    result.errors.push(`迁移子路径失败: ${fromPath} - ${error}`);
  }
}

/**
 * 迁移单个文件
 */
async function migrateFile(
  fromPath: string,
  toPath: string,
  result: MigrationResult
): Promise<void> {
  try {
    // 下载原文件
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('healthcalendar')
      .download(fromPath);

    if (downloadError) {
      result.errors.push(`下载文件失败: ${fromPath} - ${downloadError.message}`);
      return;
    }

    // 上传到新路径
    const { error: uploadError } = await supabase.storage
      .from('healthcalendar')
      .upload(toPath, fileData, { upsert: true });

    if (uploadError) {
      result.errors.push(`上传文件失败: ${toPath} - ${uploadError.message}`);
      return;
    }

    // 验证新文件已成功上传
    const { data: verifyData, error: verifyError } = await supabase.storage
      .from('healthcalendar')
      .download(toPath);

    if (verifyError) {
      result.errors.push(`验证新文件失败: ${toPath} - ${verifyError.message}`);
      return;
    }

    // 删除原文件
    const { error: deleteError } = await supabase.storage
      .from('healthcalendar')
      .remove([fromPath]);

    if (deleteError) {
      result.errors.push(`删除原文件失败: ${fromPath} - ${deleteError.message}`);
      return;
    }

    result.migratedFiles.push(`${fromPath} -> ${toPath}`);
    console.log(`[Migration] 文件迁移成功: ${fromPath} -> ${toPath}`);

  } catch (error) {
    console.error(`[Migration] 迁移文件失败: ${fromPath}`, error);
    result.errors.push(`迁移文件失败: ${fromPath} - ${error}`);
  }
}

/**
 * 获取所有需要迁移的用户列表
 */
export async function getUsersNeedingMigration(): Promise<string[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from('healthcalendar')
      .list('users', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('[Migration] 获取用户列表失败:', error);
      return [];
    }

    const usersNeedingMigration: string[] = [];
    
    for (const file of files || []) {
      // 查找有 user_user_ 前缀的目录
      if (file.name.startsWith('user_user_')) {
        const userId = file.name.replace(/^user_user_/, '');
        usersNeedingMigration.push(userId);
      }
    }

    console.log(`[Migration] 发现需要迁移的用户: ${usersNeedingMigration.join(', ')}`);
    return usersNeedingMigration;

  } catch (error) {
    console.error('[Migration] 获取用户列表时发生错误:', error);
    return [];
  }
}

/**
 * 批量迁移所有用户
 */
export async function migrateAllUsers(): Promise<MigrationResult> {
  const users = await getUsersNeedingMigration();
  const totalResult: MigrationResult = {
    success: true,
    migratedFiles: [],
    errors: [],
    summary: {
      totalFiles: 0,
      migratedCount: 0,
      errorCount: 0
    }
  };

  for (const userId of users) {
    console.log(`[Migration] 开始迁移用户: ${userId}`);
    const userResult = await migrateUserPaths(userId);
    
    totalResult.migratedFiles.push(...userResult.migratedFiles);
    totalResult.errors.push(...userResult.errors);
    totalResult.summary.totalFiles += userResult.summary.totalFiles;
    totalResult.summary.migratedCount += userResult.summary.migratedCount;
    totalResult.summary.errorCount += userResult.summary.errorCount;
    
    if (!userResult.success) {
      totalResult.success = false;
    }
  }

  return totalResult;
}
