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

export interface PoopRecord {
  id: string;
  date: string;
  type: 'poop';
  content: string;
  attachments: FileAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  poopType: string;
  poopColor: string;
  poopSmell: string;
}

interface RecordsFile {
  uniqueOwnerId: string;
  records: PoopRecord[];
  lastUpdated: string;
  version: string;
  checksum: string;
}

interface UsePoopRecordsResult {
  records: PoopRecord[];
  addRecord: (record: PoopRecord, imageFile?: File) => Promise<void>;
  updateRecord: (record: PoopRecord) => Promise<void>;
  deleteRecord: (recordId: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  syncToCloud: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LOCAL_KEY_PREFIX = 'healthcalendar-poop-records-';
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

export function usePoopRecords(currentUserId: string, uniqueOwnerId: string): UsePoopRecordsResult {
  // Initialize with empty, load from localStorage on client only
  const [records, setRecords] = useState<PoopRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage only on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem(LOCAL_KEY_PREFIX + uniqueOwnerId);
      if (raw) {
        try {
          const parsed: RecordsFile = JSON.parse(raw);
          setRecords(parsed.records || []);
        } catch {
          setRecords([]);
        }
      } else {
        setRecords([]);
      }
    }
  }, [uniqueOwnerId]);

  // 上传图片到 Supabase Storage
  const uploadImage = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    const filePath = `users/user_${uniqueOwnerId}/attachments/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('healthcalendar').upload(filePath, file, { upsert: true });
    if (error) {
      setLoading(false);
      setError(error.message);
      throw error;
    }
    // 获取受控访问URL
    const { data, error: urlError } = await supabase.storage.from('healthcalendar').createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7天有效
    setLoading(false);
    if (urlError || !data?.signedUrl) {
      setError(urlError?.message || 'Failed to get image URL');
      throw urlError || new Error('Failed to get image URL');
    }
    return data.signedUrl;
  }, [uniqueOwnerId]);

  // 保存到 localStorage
  const saveLocal = useCallback((newRecords: PoopRecord[]) => {
    const now = new Date().toISOString();
    const recordsFile: RecordsFile = {
      uniqueOwnerId,
      records: newRecords,
      lastUpdated: now,
      version: RECORDS_VERSION,
      checksum: calcChecksum(JSON.stringify(newRecords)),
    };
    localStorage.setItem(LOCAL_KEY_PREFIX + uniqueOwnerId, JSON.stringify(recordsFile));
    setRecords(newRecords);
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
    const filePath = `users/user_${uniqueOwnerId}/records.json`;
    console.log('Uploading records.json to:', filePath);
    const blob = new Blob([raw], { type: 'application/json' });
    const { error } = await supabase.storage.from('healthcalendar').upload(filePath, blob, { upsert: true });
    if (error) {
      console.error('Upload error:', error.message);
      setError(error.message);
    } else {
      console.log('Upload success:', filePath);
    }
    setLoading(false);
  }, [uniqueOwnerId]);

  // 从 Supabase Storage 拉取 records.json
  const syncFromCloud = useCallback(async () => {
    setLoading(true);
    setError(null);
    const filePath = `users/user_${uniqueOwnerId}/records.json`;
    const { data, error } = await supabase.storage
      .from('healthcalendar')
      .download(`${filePath}?t=${Date.now()}`);
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }
    const text = await data.text();
    console.log('[syncFromCloud] Fetched records.json text:', text); // 调试输出原始内容
    try {
      const parsed: RecordsFile = JSON.parse(text);
      console.log('[syncFromCloud] Parsed records.json:', parsed); // 调试输出解析内容
      // 最后写入为准策略
      saveLocal(parsed.records);
    } catch (e) {
      setError('Failed to parse records.json');
    }
    setLoading(false);
  }, [uniqueOwnerId, saveLocal]);

  // 新增记录
  const addRecord = useCallback(async (record: PoopRecord, imageFile?: File) => {
    setLoading(true);
    setError(null);
    let attachments = record.attachments || [];
    if (imageFile) {
      const url = await uploadImage(imageFile);
      attachments = [
        ...attachments,
        {
          id: Date.now().toString(),
          name: imageFile.name,
          type: imageFile.type,
          size: imageFile.size,
          url,
        },
      ];
    }
    const newRecord = { ...record, attachments, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const newRecords = [...records, newRecord];
    saveLocal(newRecords);
    await syncToCloud();
    setLoading(false);
  }, [records, uploadImage, saveLocal, syncToCloud]);

  // 更新记录
  const updateRecord = useCallback(async (record: PoopRecord) => {
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

  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
    uploadImage,
    syncToCloud,
    syncFromCloud,
    loading,
    error,
  };
}