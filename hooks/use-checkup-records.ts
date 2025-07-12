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

export interface CheckupRecord {
  id: string;
  date: string;
  datetime?: string;
  type: 'checkup'; // Changed from 'item' to 'checkup'
  content: string;
  attachments: FileAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface RecordsFile {
  uniqueOwnerId: string;
  records: CheckupRecord[];
  lastUpdated: string;
  version: string;
  checksum: string;
}

interface UseCheckupRecordsResult {
  records: CheckupRecord[];
  addRecord: (record: CheckupRecord) => Promise<void>;
  updateRecord: (record: CheckupRecord) => Promise<void>;
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

const LOCAL_KEY_PREFIX = 'healthcalendar-checkup-records-'; // Changed to checkup-records
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

export function useCheckupRecords(currentUserId: string, uniqueOwnerId: string): UseCheckupRecordsResult {
  // Initialize with empty, load from localStorage on client only
  const [records, setRecords] = useState<CheckupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage only on client - 强制获取最新数据
  useEffect(() => {
    if (typeof window !== "undefined" && uniqueOwnerId) {
      console.log('[useCheckupRecords] 初始化时强制获取本地数据，uniqueOwnerId:', uniqueOwnerId);
      
      const raw = localStorage.getItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
      if (raw) {
        try {
          const parsed: RecordsFile = JSON.parse(raw);
          console.log('[useCheckupRecords] 从localStorage获取到数据，记录数量:', parsed.records?.length || 0);
          console.log('[useCheckupRecords] 最后更新时间:', parsed.lastUpdated);
          
          // 强制更新状态
          setRecords([...parsed.records || []]);
        } catch (error) {
          console.error('[useCheckupRecords] 解析localStorage数据失败:', error);
          setRecords([]);
        }
      } else {
        console.log('[useCheckupRecords] localStorage中没有找到数据');
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
    
    console.log('[useCheckupRecords] 开始上传文件:', {
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
      const filePath = `users/${userPrefix}/checkup_attachments/${Date.now()}_${cleanFileName}`; // Changed to checkup_attachments
      
      console.log('[useCheckupRecords] 统一后的用户ID:', userPrefix);
      console.log('[useCheckupRecords] 上传路径:', filePath);
      
      const { error } = await supabase.storage.from('healthcalendar').upload(filePath, file, { upsert: true });
      if (error) {
        console.error('[useCheckupRecords] 上传失败:', error);
        setLoading(false);
        setError(error.message);
        throw error;
      }
      
      console.log('[useCheckupRecords] 上传成功，获取访问URL');
      
      // 获取受控访问URL
      const { data, error: urlError } = await supabase.storage.from('healthcalendar').createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7天有效
      
      setLoading(false);
      
      if (urlError || !data?.signedUrl) {
        console.error('[useCheckupRecords] 获取URL失败:', urlError);
        setError(urlError?.message || 'Failed to get image URL');
        throw urlError || new Error('Failed to get image URL');
      }
      
      console.log('[useCheckupRecords] 上传完成，URL:', data.signedUrl);
      return data.signedUrl;
    } catch (error) {
      console.error('[useCheckupRecords] 上传过程中出错:', error);
      setLoading(false);
      throw error;
    }
  }, [uniqueOwnerId]);

  // 保存到 localStorage - 强制更新
  const saveLocal = useCallback((newRecords: CheckupRecord[]) => {
    const now = new Date().toISOString();
    const recordsFile: RecordsFile = {
      uniqueOwnerId,
      records: newRecords,
      lastUpdated: now,
      version: RECORDS_VERSION,
      checksum: calcChecksum(JSON.stringify(newRecords)),
    };
    
    console.log('[useCheckupRecords] 强制更新本地存储，记录数量:', newRecords.length);
    console.log('[useCheckupRecords] 更新时间:', now);
    
    // 强制更新localStorage
    localStorage.setItem(LOCAL_KEY_PREFIX + uniqueOwnerId, JSON.stringify(recordsFile));
    
    // 强制更新状态
    setRecords([...newRecords]);
    
    console.log('[useCheckupRecords] 本地存储和状态已强制更新');
  }, [uniqueOwnerId]);

  // 上传 records.json 到 Supabase Storage
  const syncToCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    const raw = localStorage.getItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
    if (!raw) {
      setLoading(false);
      return;
    }
    const filePath = `users/${uniqueOwnerId}/checkup-records.json`; // Changed from item-records.json to checkup-records.json
    console.log('[useCheckupRecords] 上传 checkup-records.json 到:', filePath);
    const blob = new Blob([raw], { type: 'application/json' });
    const { error } = await supabase.storage.from('healthcalendar').upload(filePath, blob, { upsert: true });
    if (error) {
      console.error('[useCheckupRecords] 上传失败:', error.message);
      setError(error.message);
    } else {
      console.log('[useCheckupRecords] 上传成功:', filePath);
    }
    setLoading(false);
  }, [uniqueOwnerId]);

  // 从 Supabase Storage 拉取 records.json - 强制获取最新数据
  const syncFromCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filePath = `users/${uniqueOwnerId}/checkup-records.json`; // Changed from item-records.json to checkup-records.json
    
    // 使用更强的时间戳和随机数确保每次都获取最新数据
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const cacheBuster = `?t=${timestamp}&r=${random}&sync=true`;
    
    console.log('[useCheckupRecords] 开始强制获取最新数据，cacheBuster:', cacheBuster);
    
    const { data, error } = await supabase.storage
      .from('healthcalendar')
      .download(`${filePath}${cacheBuster}`);
      
    if (error) {
      console.error('[useCheckupRecords] 获取数据失败:', error);
      setLoading(false);
      setError(error.message);
      return;
    }
    
    const text = await data.text();
    console.log('[useCheckupRecords] 获取到的最新数据:', text);
    try {
      const parsed: RecordsFile = JSON.parse(text);
      console.log('[useCheckupRecords] 解析后的数据:', parsed);
      // 强制更新本地数据
      saveLocal(parsed.records);
      console.log('[useCheckupRecords] 本地数据已强制更新');
    } catch (e) {
      console.error('[useCheckupRecords] 解析数据失败:', e);
      setError('Failed to parse checkup-records.json');
    }
    setLoading(false);
  }, [uniqueOwnerId, saveLocal]);

  // 新增记录
  const addRecord = useCallback(async (record: CheckupRecord) => {
    setLoading(true);
    setError(null);
    const newRecord = { ...record, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const newRecords = [...records, newRecord];
    saveLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, saveLocal, syncToCloud]);

  // 更新记录
  const updateRecord = useCallback(async (record: CheckupRecord) => {
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

  // 强制刷新数据 - 清除缓存并重新获取
  const forceRefresh = useCallback(async () => {
    console.log('[useCheckupRecords] 开始强制刷新数据');
    setLoading(true);
    setError(null);
    
    try {
      // 清除localStorage缓存
      localStorage.removeItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
      console.log('[useCheckupRecords] 已清除localStorage缓存');
      
      // 清除内存中的记录状态
      setRecords([]);
      console.log('[useCheckupRecords] 已清除内存中的记录状态');
      
      // 强制从云端获取最新数据，使用更强的缓存破坏
      const filePath = `users/${uniqueOwnerId}/checkup-records.json`; // Changed to checkup-records.json
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const cacheBuster = `?t=${timestamp}&r=${random}&force=true`;
      
      console.log('[useCheckupRecords] 使用强制缓存破坏参数:', cacheBuster);
      
      const { data, error } = await supabase.storage
        .from('healthcalendar')
        .download(`${filePath}${cacheBuster}`);
        
      if (error) {
        console.error('[useCheckupRecords] 获取数据失败:', error);
        setError(error.message);
        setLoading(false);
        return;
      }
      
      const text = await data.text();
      console.log('[useCheckupRecords] 获取到的最新数据:', text);
      try {
        const parsed: RecordsFile = JSON.parse(text);
        console.log('[useCheckupRecords] 解析后的数据:', parsed);
        // 强制更新本地数据
        saveLocal(parsed.records);
        console.log('[useCheckupRecords] 强制刷新完成，记录数量:', parsed.records.length);
      } catch (e) {
        console.error('[useCheckupRecords] 解析数据失败:', e);
        setError('Failed to parse checkup-records.json');
      }
    } catch (error) {
      console.error('[useCheckupRecords] 强制刷新失败:', error);
      setError('强制刷新失败');
    } finally {
      setLoading(false);
    }
  }, [uniqueOwnerId, saveLocal]);

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
    error,
  };
}
