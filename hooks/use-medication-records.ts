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

export interface MedicationRecord {
  id: string;
  date: string;
  datetime?: string;
  type: 'medication';
  content: string;
  attachments: FileAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface RecordsFile {
  uniqueOwnerId: string;
  records: MedicationRecord[];
  lastUpdated: string;
  version: string;
  checksum: string;
}

interface UseMedicationRecordsResult {
  records: MedicationRecord[];
  addRecord: (record: MedicationRecord) => Promise<void>;
  updateRecord: (record: MedicationRecord) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LOCAL_KEY_PREFIX = 'healthcalendar-medication-records-'; // 与其他记录类型保持一致
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

export function useMedicationRecords(currentUserId: string, uniqueOwnerId: string): UseMedicationRecordsResult {
  // Initialize with empty, load from localStorage on client only
  const [records, setRecords] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载本地记录 - 直接从localStorage获取
  useEffect(() => {
    if (typeof window !== "undefined" && uniqueOwnerId) {
      console.log('[useMedicationRecords] 初始化时强制获取本地数据，uniqueOwnerId:', uniqueOwnerId);
      
      const raw = localStorage.getItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
      if (raw) {
        try {
          const parsed: RecordsFile = JSON.parse(raw);
          console.log('[useMedicationRecords] 从localStorage获取到数据，记录数量:', parsed.records?.length || 0);
          console.log('[useMedicationRecords] 最后更新时间:', parsed.lastUpdated);
          
          // 强制更新状态
          setRecords([...parsed.records || []]);
        } catch (error) {
          console.error('[useMedicationRecords] 解析localStorage数据失败:', error);
          setRecords([]);
        }
      } else {
        console.log('[useMedicationRecords] localStorage中没有找到数据');
        setRecords([]);
      }
    }
  }, [uniqueOwnerId]);

  // 保存到 localStorage - 强制更新
  const saveLocal = useCallback((newRecords: MedicationRecord[]) => {
    const now = new Date().toISOString();
    const recordsFile: RecordsFile = {
      uniqueOwnerId,
      records: newRecords,
      lastUpdated: now,
      version: RECORDS_VERSION,
      checksum: calcChecksum(JSON.stringify(newRecords)),
    };
    
    console.log('[useMedicationRecords] 强制更新本地存储，记录数量:', newRecords.length);
    console.log('[useMedicationRecords] 更新时间:', now);
    
    // 强制更新localStorage
    localStorage.setItem(LOCAL_KEY_PREFIX + uniqueOwnerId, JSON.stringify(recordsFile));
    
    // 强制更新状态
    setRecords([...newRecords]);
    
    console.log('[useMedicationRecords] 本地存储和状态已强制更新');
  }, [uniqueOwnerId]);

  // 保存到本地存储
  const saveToLocal = useCallback((newRecords: MedicationRecord[]) => {
    console.log('[useMedicationRecords] saveToLocal 开始执行');
    console.log('[useMedicationRecords] 用户ID:', uniqueOwnerId);
    console.log('[useMedicationRecords] 记录数量:', newRecords.length);
    
    if (!uniqueOwnerId) {
      console.warn('[useMedicationRecords] saveToLocal: uniqueOwnerId 为空，跳过保存');
      return;
    }
    
    try {
      const recordsData: RecordsFile = {
        uniqueOwnerId,
        records: newRecords,
        lastUpdated: new Date().toISOString(),
        version: RECORDS_VERSION,
        checksum: calcChecksum(JSON.stringify(newRecords))
      };
      
      const storageKey = LOCAL_KEY_PREFIX + uniqueOwnerId;
      console.log('[useMedicationRecords] localStorage key:', storageKey);
      console.log('[useMedicationRecords] 数据校验和:', recordsData.checksum);
      
      localStorage.setItem(storageKey, JSON.stringify(recordsData));
      console.log('[useMedicationRecords] Saved to local storage:', newRecords.length, 'records');
      console.log('[useMedicationRecords] saveToLocal 执行成功');
    } catch (err) {
      console.error('[useMedicationRecords] Error saving to local storage:', err);
      console.error('[useMedicationRecords] saveToLocal 错误详情:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }, [uniqueOwnerId]);

  // 上传 medication-records.json 到 Supabase Storage
  const syncToCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    const raw = localStorage.getItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
    if (!raw) {
      setLoading(false);
      return;
    }
    const filePath = `users/${uniqueOwnerId}/medication-records.json`;
    console.log('[useMedicationRecords] 上传 medication-records.json 到:', filePath);
    const blob = new Blob([raw], { type: 'application/json' });
    const { error } = await supabase.storage.from('healthcalendar').upload(filePath, blob, { upsert: true });
    if (error) {
      console.error('[useMedicationRecords] 上传失败:', error.message);
      setError(error.message);
    } else {
      console.log('[useMedicationRecords] 上传成功:', filePath);
    }
    setLoading(false);
  }, [uniqueOwnerId]);

  // 从 Supabase Storage 拉取 medication-records.json - 强制获取最新数据
  const syncFromCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filePath = `users/${uniqueOwnerId}/medication-records.json`;
    
    // 使用更强的时间戳和随机数确保每次都获取最新数据
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const cacheBuster = `?t=${timestamp}&r=${random}&sync=true`;
    
    console.log('[useMedicationRecords] 开始强制获取最新数据，cacheBuster:', cacheBuster);
    
    const { data, error } = await supabase.storage
      .from('healthcalendar')
      .download(`${filePath}${cacheBuster}`);
      
    if (error) {
      console.error('[useMedicationRecords] 获取数据失败:', error);
      setLoading(false);
      setError(error.message);
      return;
    }
    
    const text = await data.text();
    console.log('[useMedicationRecords] 获取到的最新数据:', text);
    try {
      const parsed: RecordsFile = JSON.parse(text);
      console.log('[useMedicationRecords] 解析后的数据:', parsed);
      // 强制更新本地数据
      saveToLocal(parsed.records);
      console.log('[useMedicationRecords] 本地数据已强制更新');
    } catch (e) {
      console.error('[useMedicationRecords] 解析数据失败:', e);
      setError('Failed to parse medication-records.json');
    }
    setLoading(false);
  }, [uniqueOwnerId, saveToLocal]);

  // 强制刷新数据 - 清除缓存并重新获取
  const forceRefresh = useCallback(async () => {
    console.log('[useMedicationRecords] 开始强制刷新数据');
    setLoading(true);
    setError(null);
    
    try {
      // 清除localStorage缓存
      localStorage.removeItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
      console.log('[useMedicationRecords] 已清除localStorage缓存');
      
      // 清除内存中的记录状态
      setRecords([]);
      console.log('[useMedicationRecords] 已清除内存中的记录状态');
      
      // 强制从云端获取最新数据，使用更强的缓存破坏
      const filePath = `users/${uniqueOwnerId}/medication-records.json`;
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const cacheBuster = `?t=${timestamp}&r=${random}&force=true`;
      
      console.log('[useMedicationRecords] 使用强制缓存破坏参数:', cacheBuster);
      
      const { data, error } = await supabase.storage
        .from('healthcalendar')
        .download(`${filePath}${cacheBuster}`);
        
      if (error) {
        console.error('[useMedicationRecords] 获取数据失败:', error);
        setError(error.message);
        setLoading(false);
        return;
      }
      
      const text = await data.text();
      console.log('[useMedicationRecords] 获取到的最新数据:', text);
      try {
        const parsed: RecordsFile = JSON.parse(text);
        console.log('[useMedicationRecords] 解析后的数据:', parsed);
        // 强制更新本地数据
        saveLocal(parsed.records);
        console.log('[useMedicationRecords] 强制刷新完成，记录数量:', parsed.records.length);
      } catch (e) {
        console.error('[useMedicationRecords] 解析数据失败:', e);
        setError('Failed to parse medication-records.json');
      }
    } catch (error) {
      console.error('[useMedicationRecords] 强制刷新失败:', error);
      setError('强制刷新失败');
    } finally {
      setLoading(false);
    }
  }, [uniqueOwnerId, saveLocal]);

  // 新增记录
  const addRecord = useCallback(async (record: MedicationRecord) => {
    setLoading(true);
    setError(null);
    const newRecord = { ...record, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const newRecords = [...records, newRecord];
    saveLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, saveLocal, syncToCloud]);

  // 更新记录
  const updateRecord = useCallback(async (record: MedicationRecord) => {
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
    saveLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, saveLocal, syncToCloud]);

  // 删除记录
  const deleteRecord = useCallback(async (recordId: string) => {
    setLoading(true);
    setError(null);
    const newRecords = records.filter(r => r.id !== recordId);
    saveLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, saveLocal, syncToCloud]);

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
    
    console.log('[useMedicationRecords] 开始上传文件:', {
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
      const filePath = `users/${userPrefix}/medication_attachments/${Date.now()}_${cleanFileName}`;
      
      console.log('[useMedicationRecords] 统一后的用户ID:', userPrefix);
      console.log('[useMedicationRecords] 上传路径:', filePath);
      
      const { error } = await supabase.storage.from('healthcalendar').upload(filePath, file, { upsert: true });
      if (error) {
        console.error('[useMedicationRecords] 上传失败:', error);
        setLoading(false);
        setError(error.message);
        throw error;
      }
      
      console.log('[useMedicationRecords] 上传成功，获取访问URL');
      
      // 获取受控访问URL
      const { data, error: urlError } = await supabase.storage.from('healthcalendar').createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7天有效
      
      setLoading(false);
      
      if (urlError || !data?.signedUrl) {
        console.error('[useMedicationRecords] 获取URL失败:', urlError);
        setError(urlError?.message || 'Failed to get image URL');
        throw urlError || new Error('Failed to get image URL');
      }
      
      console.log('[useMedicationRecords] 上传完成，URL:', data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error('[useMedicationRecords] 上传过程中出错:', error);
      setLoading(false);
      throw error;
    }
  }, [uniqueOwnerId]);

  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
    uploadImage,
    syncToCloud,
    syncFromCloud,
    forceRefresh,
    loading,
    error
  };
}
