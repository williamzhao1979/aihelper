import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// 类型定义
export type FileAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
};

export interface MealRecord {
  id: string;
  date: string;
  datetime?: string; // 添加datetime字段，对应用餐记录页面的日期时间
  type: 'meal';
  content: string;
  attachments: FileAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  mealType: string; // 餐次类型：早餐、午餐、晚餐等
  foodTypes: string[]; // 食物类型数组
  mealPortion: string; // 进食量
  mealCondition: string; // 进食情况
}

interface RecordsFile {
  uniqueOwnerId: string;
  records: MealRecord[];
  lastUpdated: string;
  version: string;
  checksum: string;
}

interface UseMealRecordsResult {
  records: MealRecord[];
  addRecord: (record: MealRecord) => Promise<void>;
  updateRecord: (record: MealRecord) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  forceRefresh: () => Promise<void>; // 强制刷新数据
  directSyncToCloud: (recordsToSync: MealRecord[]) => Promise<void>; // 直接同步指定记录
  loading: boolean;
  error: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LOCAL_KEY_PREFIX = 'healthcalendar-meal-records-';
const RECORDS_VERSION = '1.0.0';

function calcChecksum(data: string): string {
  // 简单校验和实现
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

export function useMealRecords(currentUserId: string, uniqueOwnerId: string): UseMealRecordsResult {
  // Initialize with empty, load from localStorage on client only
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage only on client - 强制获取最新数据
  useEffect(() => {
    if (typeof window !== "undefined" && uniqueOwnerId) {
      console.log('[useEffect] 初始化时强制获取本地数据，uniqueOwnerId:', uniqueOwnerId);
      
      const raw = localStorage.getItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
      if (raw) {
        try {
          const parsed: RecordsFile = JSON.parse(raw);
          console.log('[useEffect] 从localStorage获取到数据，记录数量:', parsed.records?.length || 0);
          console.log('[useEffect] 最后更新时间:', parsed.lastUpdated);
          
          // 强制更新状态
          setRecords([...parsed.records || []]);
        } catch (error) {
          console.error('[useEffect] 解析localStorage数据失败:', error);
          setRecords([]);
        }
      } else {
        console.log('[useEffect] localStorage中没有找到数据');
        setRecords([]);
      }
    }
  }, [uniqueOwnerId]);

  // 上传图片到 Supabase Storage
  const uploadImage = useCallback(async (file: File) => {
    if (!file) {
      throw new Error('文件不能为空')
    }
    
    if (!uniqueOwnerId) {
      throw new Error('用户ID不能为空')
    }
    
    setLoading(true);
    setError(null);
    
    console.log('[uploadImage] 开始上传文件:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uniqueOwnerId
    });
    
    try {
      // 清理文件名，移除特殊字符，避免上传问题
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      
      // 统一用户ID格式，确保只有一个 user_ 前缀
      const cleanUserId = uniqueOwnerId.replace(/^user_/, ''); // 移除现有的 user_ 前缀
      const userPrefix = `user_${cleanUserId}`; // 添加统一的 user_ 前缀
      const filePath = `users/${userPrefix}/attachments/meal/${Date.now()}_${cleanFileName}`;
      
      console.log('[uploadImage] 统一后的用户ID:', userPrefix);
      console.log('[uploadImage] 上传路径:', filePath);
      
      const { error } = await supabase.storage.from('healthcalendar').upload(filePath, file, { upsert: true });
      if (error) {
        console.error('[uploadImage] 上传失败:', error);
        setLoading(false);
        setError(error.message);
        throw error;
      }
      
      console.log('[uploadImage] 上传成功，获取访问URL');
      
      // 获取受控访问URL
      const { data, error: urlError } = await supabase.storage.from('healthcalendar').createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7天有效
      
      setLoading(false);
      
      if (urlError || !data?.signedUrl) {
        console.error('[uploadImage] 获取URL失败:', urlError);
        setError(urlError?.message || 'Failed to get image URL');
        throw urlError || new Error('Failed to get image URL');
      }
      
      console.log('[uploadImage] 上传完成，URL:', data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error('[uploadImage] 上传过程中出错:', error);
      setLoading(false);
      throw error;
    }
  }, [uniqueOwnerId]);

  // Save to localStorage
  const saveToLocal = useCallback((newRecords: MealRecord[]) => {
    if (typeof window !== "undefined" && uniqueOwnerId) {
      const recordsFile: RecordsFile = {
        uniqueOwnerId,
        records: newRecords,
        lastUpdated: new Date().toISOString(),
        version: RECORDS_VERSION,
        checksum: calcChecksum(JSON.stringify(newRecords))
      };
      localStorage.setItem(LOCAL_KEY_PREFIX + uniqueOwnerId, JSON.stringify(recordsFile));
      console.log('[saveToLocal] 保存到localStorage，记录数量:', newRecords.length);
    }
  }, [uniqueOwnerId]);

  // 同步到云端
  const syncToCloud = useCallback(async () => {
    if (!uniqueOwnerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 获取最新的记录状态，避免使用过期的闭包值
      const currentRecords = records;
      console.log('[syncToCloud] 开始同步到云端，uniqueOwnerId:', uniqueOwnerId);
      console.log('[syncToCloud] 同步记录数:', currentRecords.length);
      
      // 统一用户ID格式
      const cleanUserId = uniqueOwnerId.replace(/^user_/, ''); // 移除现有的 user_ 前缀
      const userPrefix = `user_${cleanUserId}`; // 添加统一的 user_ 前缀
      
      const recordsFile: RecordsFile = {
        uniqueOwnerId,
        records: currentRecords,
        lastUpdated: new Date().toISOString(),
        version: RECORDS_VERSION,
        checksum: calcChecksum(JSON.stringify(currentRecords))
      };

      const fileName = `users/${userPrefix}/meal-records.json`;
      console.log('[syncToCloud] 统一后的文件路径:', fileName);
      const fileBlob = new Blob([JSON.stringify(recordsFile, null, 2)], { type: 'application/json' });

      // 验证文件内容非空
      if (fileBlob.size === 0) {
        console.error('[syncToCloud] 错误: 试图上传空文件');
        throw new Error('Cannot upload empty file content');
      }
      
      // 检查文件内容是否包含记录
      const fileContent = await fileBlob.text();
      const parsedContent = JSON.parse(fileContent);
      console.log('[syncToCloud] 待上传文件内容检查:', {
        hasUniqueOwnerId: !!parsedContent.uniqueOwnerId,
        recordsCount: parsedContent.records?.length || 0,
        fileSize: fileBlob.size,
        checksum: parsedContent.checksum
      });
      
      if (!parsedContent.records || parsedContent.records.length === 0) {
        console.warn('[syncToCloud] 警告: 上传的记录数组为空');
      }
      
      // 重新创建文件Blob以确保内容有效
      const verifiedBlob = new Blob([JSON.stringify(parsedContent, null, 2)], { type: 'application/json' });
      
      // 执行上传
      const { error: uploadError } = await supabase.storage
        .from('healthcalendar')
        .upload(fileName, verifiedBlob, { upsert: true });

      if (uploadError) {
        console.error('[syncToCloud] 上传失败，错误:', uploadError);
        throw new Error(`Cloud sync failed: ${uploadError.message}`);
      }

      console.log('[syncToCloud] 云端同步成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[syncToCloud] 云端同步失败:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [records, uniqueOwnerId]);

  // 从云端同步
  const syncFromCloud = useCallback(async () => {
    if (!uniqueOwnerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[syncFromCloud] 开始从云端同步，uniqueOwnerId:', uniqueOwnerId);
      
      // 统一用户ID格式
      const cleanUserId = uniqueOwnerId.replace(/^user_/, ''); // 移除现有的 user_ 前缀
      const userPrefix = `user_${cleanUserId}`; // 添加统一的 user_ 前缀
      const fileName = `users/${userPrefix}/meal-records.json`;
      
      console.log('[syncFromCloud] 统一后的文件路径:', fileName);
      const { data, error: downloadError } = await supabase.storage
        .from('healthcalendar')
        .download(fileName);

      if (downloadError) {
        if (downloadError.message.includes('not found')) {
          console.log('[syncFromCloud] 云端文件不存在，使用本地数据');
          return;
        }
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      const text = await data.text();
      const cloudRecordsFile: RecordsFile = JSON.parse(text);
      
      console.log('[syncFromCloud] 从云端获取到数据，记录数量:', cloudRecordsFile.records?.length || 0);
      console.log('[syncFromCloud] 云端最后更新时间:', cloudRecordsFile.lastUpdated);

      // 比较版本和校验和
      const localData = localStorage.getItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
      let shouldUpdate = true;
      
      if (localData) {
        const localRecordsFile: RecordsFile = JSON.parse(localData);
        const localTime = new Date(localRecordsFile.lastUpdated);
        const cloudTime = new Date(cloudRecordsFile.lastUpdated);
        
        console.log('[syncFromCloud] 本地时间:', localTime, '云端时间:', cloudTime);
        
        if (localTime >= cloudTime && localRecordsFile.checksum === cloudRecordsFile.checksum) {
          console.log('[syncFromCloud] 本地数据更新或相同，不需要更新');
          shouldUpdate = false;
        }
      }

      if (shouldUpdate) {
        console.log('[syncFromCloud] 更新本地数据');
        setRecords([...cloudRecordsFile.records || []]);
        saveToLocal(cloudRecordsFile.records || []);
      }

      console.log('[syncFromCloud] 云端同步完成');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[syncFromCloud] 云端同步失败:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [uniqueOwnerId, saveToLocal]);

  // 强制刷新 - 清除缓存并重新获取云端数据
  const forceRefresh = useCallback(async () => {
    if (!uniqueOwnerId) return;
    
    console.log('[forceRefresh] 开始强制刷新');
    
    // 清除本地缓存
    localStorage.removeItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
    setRecords([]);
    
    try {
      // 从云端重新获取
      await syncFromCloud();
    } catch (error) {
      console.log('[forceRefresh] 云端获取失败，保持空状态');
      setRecords([]);
    }
    
    console.log('[forceRefresh] 强制刷新完成');
  }, [uniqueOwnerId, syncFromCloud]);



  // 直接同步指定记录到云端（不依赖组件状态）
  const directSyncToCloud = useCallback(async (recordsToSync: MealRecord[]) => {
    if (!uniqueOwnerId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[directSyncToCloud] 开始同步到云端，uniqueOwnerId:', uniqueOwnerId);
      console.log('[directSyncToCloud] 同步记录数量:', recordsToSync.length);
      
      // 统一用户ID格式
      const cleanUserId = uniqueOwnerId.replace(/^user_/, ''); // 移除现有的 user_ 前缀
      const userPrefix = `user_${cleanUserId}`; // 添加统一的 user_ 前缀
      
      const recordsFile: RecordsFile = {
        uniqueOwnerId,
        records: recordsToSync,
        lastUpdated: new Date().toISOString(),
        version: RECORDS_VERSION,
        checksum: calcChecksum(JSON.stringify(recordsToSync))
      };

      const fileName = `users/${userPrefix}/meal-records.json`;
      console.log('[directSyncToCloud] 统一后的文件路径:', fileName);
      
      // 创建文件内容
      const fileContent = JSON.stringify(recordsFile, null, 2);
      console.log('[directSyncToCloud] 文件内容字节数:', fileContent.length);
      const fileBlob = new Blob([fileContent], { type: 'application/json' });
      
      // 验证文件内容
      console.log('[directSyncToCloud] 文件对象大小:', fileBlob.size);
      if (fileBlob.size === 0) {
        console.error('[directSyncToCloud] 错误: 试图上传空文件');
        throw new Error('Cannot upload empty file content');
      }
      
      // 执行上传
      const { error: uploadError } = await supabase.storage
        .from('healthcalendar')
        .upload(fileName, fileBlob, { upsert: true });

      if (uploadError) {
        console.error('[directSyncToCloud] 上传失败，错误:', uploadError);
        throw new Error(`Cloud sync failed: ${uploadError.message}`);
      }

      console.log('[directSyncToCloud] 云端同步成功');
      
      // 成功后重新获取云端数据以确认同步成功
      try {
        // 下载刚上传的文件以验证
        const { data: verifyData, error: verifyError } = await supabase.storage
          .from('healthcalendar')
          .download(fileName);
          
        if (verifyError) {
          console.error('[directSyncToCloud] 验证下载失败:', verifyError);
        } else {
          const verifiedContent = await verifyData.text();
          const verifiedFile = JSON.parse(verifiedContent);
          console.log('[directSyncToCloud] 验证下载成功，记录数:', verifiedFile.records.length);
        }
      } catch (verifyErr) {
        console.error('[directSyncToCloud] 验证过程错误:', verifyErr);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[directSyncToCloud] 云端同步失败:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [uniqueOwnerId]);

  // 更新记录
  const updateRecord = useCallback(async (record: MealRecord) => {
    setLoading(true);
    setError(null);
    const idx = records.findIndex(r => r.id === record.id);
    if (idx === -1) {
      setLoading(false);
      setError('Record not found');
      return;
    }
    const newRecords = [...records];
    newRecords[idx] = { ...record, updatedAt: new Date().toISOString() };
    saveToLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, saveToLocal, syncToCloud]);

  // 删除记录
  const deleteRecord = useCallback(async (recordId: string) => {
    setLoading(true);
    setError(null);
    const newRecords = records.filter(r => r.id !== recordId);
    saveToLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, saveToLocal, syncToCloud]);
  
  // 添加记录
  const addRecord = useCallback(async (record: MealRecord) => {
    setLoading(true);
    setError(null);
    
    const newRecord = { ...record, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const newRecords = [...records, newRecord];
    saveToLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, saveToLocal, syncToCloud]);

  // 返回API对象，确保包含所有需要的函数
  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
    uploadImage,
    syncToCloud,
    syncFromCloud,
    forceRefresh,
    directSyncToCloud,
    loading,
    error
  };
}
