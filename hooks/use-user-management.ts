import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { UserProfile } from '@/components/healthcalendar/shared/user-selector'

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 本地存储键
const STORAGE_KEY = 'healthcalendar_users'
const USERS_VERSION = '1.0.0'

// 扩展的用户数据类型，包含备注和时间字段
type ExtendedUserProfile = UserProfile & {
  notes?: string
  createdAt?: string
  updatedAt?: string
}

// 用户文件结构
interface UsersFile {
  uniqueOwnerId: string
  users: ExtendedUserProfile[]
  lastUpdated: string
  version: string
  checksum: string
}

// 默认用户数据
const defaultUsers: ExtendedUserProfile[] = [
  {
    uniqueOwnerId: "user_001",
    ownerId: "device_001",
    ownerName: "本人",
    nickname: "本人",
    role: "primary",
    isActive: true,
    notes: "主用户账户，拥有所有权限",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-15T10:30:00.000Z"
  },
  {
    uniqueOwnerId: "user_002",
    ownerId: "device_002",
    ownerName: "孩子妈妈",
    nickname: "妈妈",
    role: "family",
    relationship: "孩子妈妈",
    isActive: true,
    notes: "负责孩子的健康记录管理",
    createdAt: "2024-01-02T08:00:00.000Z",
    updatedAt: "2024-01-14T16:45:00.000Z"
  },
  {
    uniqueOwnerId: "user_003",
    ownerId: "device_003",
    ownerName: "大女儿",
    nickname: "大女儿",
    role: "family",
    relationship: "大女儿",
    isActive: true,
    notes: "10岁，需要定期健康检查",
    createdAt: "2024-01-03T09:15:00.000Z",
    updatedAt: "2024-01-13T14:20:00.000Z"
  },
  {
    uniqueOwnerId: "user_004",
    ownerId: "device_004",
    ownerName: "小女儿",
    nickname: "小女儿",
    role: "family",
    relationship: "小女儿",
    isActive: true,
    notes: "7岁，过敏体质，需要特别注意",
    createdAt: "2024-01-04T10:30:00.000Z",
    updatedAt: "2024-01-12T11:10:00.000Z"
  },
  {
    uniqueOwnerId: "user_005",
    ownerId: "device_005",
    ownerName: "爸爸",
    nickname: "爸爸",
    role: "family",
    relationship: "爸爸",
    isActive: true,
    notes: "工作繁忙，偶尔查看健康记录",
    createdAt: "2024-01-05T11:45:00.000Z",
    updatedAt: "2024-01-11T20:30:00.000Z"
  },
  {
    uniqueOwnerId: "user_006",
    ownerId: "device_006",
    ownerName: "妈妈",
    nickname: "妈妈",
    role: "family",
    relationship: "妈妈",
    isActive: true,
    notes: "退休在家，经常关注家人健康",
    createdAt: "2024-01-06T12:00:00.000Z",
    updatedAt: "2024-01-10T15:25:00.000Z"
  }
]

function calcChecksum(data: string): string {
  // 简单校验和实现
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
}

export function useUserManagement() {
  const [users, setUsers] = useState<ExtendedUserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 保存到localStorage
  const saveLocal = useCallback((newUsers: ExtendedUserProfile[]) => {
    const now = new Date().toISOString();
    const usersFile: UsersFile = {
      uniqueOwnerId: "system", // 系统级用户数据
      users: newUsers,
      lastUpdated: now,
      version: USERS_VERSION,
      checksum: calcChecksum(JSON.stringify(newUsers)),
    };
    
    console.log('[saveLocal] 保存用户数据到本地存储，用户数量:', newUsers.length);
    console.log('[saveLocal] 更新时间:', now);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usersFile));
    setUsers([...newUsers]);
    
    console.log('[saveLocal] 本地存储和状态已更新');
  }, []);

  // 从localStorage加载用户数据
  const loadUsers = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: UsersFile = JSON.parse(stored)
        console.log('[loadUsers] 从localStorage加载用户数据，用户数量:', parsed.users?.length || 0);
        setUsers(parsed.users || [])
      } else {
        // 首次使用，设置默认用户
        console.log('[loadUsers] 首次使用，设置默认用户');
        saveLocal(defaultUsers)
      }
    } catch (err) {
      console.error('Failed to load users:', err)
      setError('加载用户数据失败')
      setUsers(defaultUsers)
    } finally {
      setIsLoading(false)
    }
  }, [saveLocal])

  // 上传用户数据到Supabase Storage
  const syncToCloud = useCallback(async () => {
    console.log('[syncToCloud] 开始同步用户数据到云端');
    setError(null);
    
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        console.log('[syncToCloud] 本地没有用户数据，跳过同步');
        return;
      }
      
      const filePath = `users/system/users.json`;
      console.log('[syncToCloud] 上传用户数据到:', filePath);
      
      const blob = new Blob([raw], { type: 'application/json' });
      const { error } = await supabase.storage
        .from('healthcalendar')
        .upload(filePath, blob, { upsert: true });
        
      if (error) {
        console.error('[syncToCloud] 上传失败:', error.message);
        setError(error.message);
      } else {
        console.log('[syncToCloud] 上传成功:', filePath);
      }
    } catch (error) {
      console.error('[syncToCloud] 同步失败:', error);
      setError('同步到云端失败');
    }
  }, []);

  // 从Supabase Storage拉取用户数据
  const syncFromCloud = useCallback(async () => {
    console.log('[syncFromCloud] 开始从云端获取用户数据');
    setError(null);
    
    try {
      const filePath = `users/system/users.json`;
      
      // 使用时间戳和随机数确保每次都获取最新数据
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const cacheBuster = `?t=${timestamp}&r=${random}&sync=true`;
      
      console.log('[syncFromCloud] 使用缓存破坏参数:', cacheBuster);
      
      const { data, error } = await supabase.storage
        .from('healthcalendar')
        .download(`${filePath}${cacheBuster}`);
        
      if (error) {
        console.error('[syncFromCloud] 获取数据失败:', error);
        setError(error.message);
        return;
      }
      
      const text = await data.text();
      console.log('[syncFromCloud] 获取到的用户数据:', text);
      
      try {
        const parsed: UsersFile = JSON.parse(text);
        console.log('[syncFromCloud] 解析后的用户数据:', parsed);
        // 更新本地数据
        saveLocal(parsed.users);
        console.log('[syncFromCloud] 本地用户数据已更新');
      } catch (e) {
        console.error('[syncFromCloud] 解析用户数据失败:', e);
        setError('Failed to parse users.json');
      }
    } catch (error) {
      console.error('[syncFromCloud] 从云端获取用户数据失败:', error);
      setError('从云端获取用户数据失败');
    }
  }, [saveLocal]);

  // 强制刷新用户数据
  const forceRefresh = useCallback(async () => {
    console.log('[forceRefresh] 开始强制刷新用户数据');
    setError(null);
    
    try {
      // 清除localStorage缓存
      localStorage.removeItem(STORAGE_KEY);
      console.log('[forceRefresh] 已清除localStorage缓存');
      
      // 清除内存中的用户状态
      setUsers([]);
      console.log('[forceRefresh] 已清除内存中的用户状态');
      
      // 强制从云端获取最新数据
      const filePath = `users/system/users.json`;
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const cacheBuster = `?t=${timestamp}&r=${random}&force=true`;
      
      console.log('[forceRefresh] 使用强制缓存破坏参数:', cacheBuster);
      
      const { data, error } = await supabase.storage
        .from('healthcalendar')
        .download(`${filePath}${cacheBuster}`);
        
      if (error) {
        console.error('[forceRefresh] 获取用户数据失败:', error);
        setError(error.message);
        return;
      }
      
      const text = await data.text();
      console.log('[forceRefresh] 获取到的最新用户数据:', text);
      
      try {
        const parsed: UsersFile = JSON.parse(text);
        console.log('[forceRefresh] 解析后的用户数据:', parsed);
        // 强制更新本地数据
        saveLocal(parsed.users);
        console.log('[forceRefresh] 强制刷新完成，用户数量:', parsed.users.length);
      } catch (e) {
        console.error('[forceRefresh] 解析用户数据失败:', e);
        setError('Failed to parse users.json');
      }
    } catch (error) {
      console.error('[forceRefresh] 强制刷新用户数据失败:', error);
      setError('强制刷新用户数据失败');
    }
  }, [saveLocal]);

  // 添加新用户
  const addUser = useCallback(async (user: Omit<ExtendedUserProfile, 'uniqueOwnerId' | 'ownerId'>) => {
    const newUser: ExtendedUserProfile = {
      ...user,
      uniqueOwnerId: `user_${Date.now()}`,
      ownerId: `device_${Date.now()}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    const newUsers = [...users, newUser]
    saveLocal(newUsers)
    
    // 同步到云端
    await syncToCloud()
    
    return newUser
  }, [users, saveLocal, syncToCloud])

  // 更新用户
  const updateUser = useCallback(async (uniqueOwnerId: string, updates: Partial<ExtendedUserProfile>) => {
    const newUsers = users.map(user => 
      user.uniqueOwnerId === uniqueOwnerId 
        ? { ...user, ...updates }
        : user
    )
    saveLocal(newUsers)
    
    // 同步到云端
    await syncToCloud()
  }, [users, saveLocal, syncToCloud])

  // 删除用户
  const deleteUser = useCallback(async (uniqueOwnerId: string) => {
    const newUsers = users.filter(user => user.uniqueOwnerId !== uniqueOwnerId)
    saveLocal(newUsers)
    
    // 同步到云端
    await syncToCloud()
  }, [users, saveLocal, syncToCloud])

  // 获取主用户
  const getPrimaryUser = useCallback(() => {
    return users.find(user => user.role === 'primary') || users[0]
  }, [users])

  // 获取活跃用户
  const getActiveUsers = useCallback(() => {
    return users.filter(user => user.isActive)
  }, [users])

  // 根据ID获取用户
  const getUserById = useCallback((uniqueOwnerId: string) => {
    return users.find(user => user.uniqueOwnerId === uniqueOwnerId)
  }, [users])

  // 初始化
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return {
    users,
    isLoading,
    error,
    addUser,
    updateUser,
    deleteUser,
    getPrimaryUser,
    getActiveUsers,
    getUserById,
    saveLocal,
    syncToCloud,
    syncFromCloud,
    forceRefresh
  }
} 