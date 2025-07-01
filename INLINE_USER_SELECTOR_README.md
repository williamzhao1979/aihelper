# 内联用户选择器 (Inline User Selector)

## 概述

内联用户选择器是一个新的用户界面组件，用于在健康记录页面中提供更好的用户选择体验。它结合了**方案一（内联用户选择器）**和**方案二（智能默认选择）**的设计理念。

## 主要特性

### 1. 单用户选择
- 每次记录只针对一个用户，简化选择逻辑
- 避免多用户选择的复杂性
- 符合健康记录的实际使用场景

### 2. 智能默认选择
- **优先级1**：记住用户上次在特定记录类型中选择的用户
- **优先级2**：选择主用户（primary user）
- **优先级3**：选择第一个可用用户
- 使用 localStorage 持久化用户偏好

### 3. 内联布局
- 集成到页面头部，不占用主要内容区域
- 水平排列的用户头像+昵称按钮组
- 响应式设计，支持移动端水平滚动

### 4. 快速切换
- 点击任意用户头像即可切换
- 立即保存用户偏好
- 平滑的视觉反馈和过渡动画

## 组件结构

### 文件位置
```
components/healthcalendar/shared/inline-user-selector.tsx
```

### 接口定义
```typescript
interface InlineUserSelectorProps {
  selectedUser: UserProfile | null
  onUserChange: (user: UserProfile) => void
  availableUsers: UserProfile[]
  recordType: 'period' | 'poop' | 'other'
  className?: string
}
```

### 用户配置文件
```typescript
interface UserProfile {
  uniqueOwnerId: string
  ownerId: string
  ownerName: string
  nickname: string
  avatar?: string
  role: 'primary' | 'family'
  relationship?: string
  isActive: boolean
}
```

## 使用方法

### 基本用法
```tsx
import InlineUserSelector from "@/components/healthcalendar/shared/inline-user-selector"

function MyComponent() {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const { users: availableUsers } = useUserManagement()

  return (
    <InlineUserSelector
      selectedUser={selectedUser}
      onUserChange={setSelectedUser}
      availableUsers={availableUsers}
      recordType="period"
    />
  )
}
```

### 在记录页面中使用
```tsx
// 在例假记录页面中
<Card className="bg-white/90 backdrop-blur-sm shadow-lg">
  <CardContent className="p-4">
    <InlineUserSelector
      selectedUser={selectedUser}
      onUserChange={setSelectedUser}
      availableUsers={availableUsers}
      recordType="period"
    />
  </CardContent>
</Card>
```

## 智能选择逻辑

### 默认用户选择算法
```typescript
const getDefaultUser = (recordType: string, availableUsers: UserProfile[]): UserProfile | null => {
  if (availableUsers.length === 0) return null
  
  // 1. 检查上次使用的用户
  const lastUsedId = getUserPreference(recordType)
  if (lastUsedId) {
    const lastUsed = availableUsers.find(u => u.uniqueOwnerId === lastUsedId)
    if (lastUsed) return lastUsed
  }
  
  // 2. 选择主用户
  const primaryUser = availableUsers.find(u => u.role === 'primary')
  if (primaryUser) return primaryUser
  
  // 3. 选择第一个用户
  return availableUsers[0]
}
```

### 用户偏好存储
- 使用 localStorage 存储用户选择偏好
- 按记录类型分别存储：`user_preference_${recordType}`
- 支持不同记录类型的不同默认用户

## 视觉设计

### 用户卡片样式
- **未选中**：灰色边框，正常背景
- **选中**：主题色边框，浅色背景，选中图标
- **悬停**：边框颜色加深，轻微背景色变化

### 响应式设计
- **桌面端**：固定排列的用户卡片
- **移动端**：水平滚动的用户卡片
- **触摸友好**：确保点击区域足够大（至少44px）

### 状态指示
- 选中状态使用红色主题色（适合健康应用）
- 选中图标位于头像右上角
- 用户关系标识（"本人"、"女儿"等）

## 无障碍设计

### 键盘导航
- 支持 Tab 键在用户间切换
- 支持 Enter 键选择用户
- 提供清晰的焦点指示

### 屏幕阅读器
- 为每个用户提供描述性的 aria-label
- 选中状态使用 aria-selected 属性
- 提供用户切换的语音提示

## 测试

### 测试页面
访问 `/healthcalendar/test-inline-selector` 可以测试内联用户选择器的功能。

### 测试功能
- 用户选择切换
- 智能默认选择
- 用户偏好记忆
- 响应式布局
- 无障碍功能

## 已集成的页面

1. **例假记录页面** (`/healthcalendar/period`)
   - 使用 `recordType="period"`
   - 智能记住上次选择的用户

2. **大便记录页面** (`/healthcalendar/poop`)
   - 使用 `recordType="poop"`
   - 支持编辑模式下的用户选择

## 优势

### 用户体验提升
- **减少操作步骤**：智能默认选择减少不必要的操作
- **视觉清晰**：内联布局不占用主要内容区域
- **快速切换**：一键切换用户，操作便捷
- **个性化**：记住用户偏好，提供个性化体验

### 技术优势
- **类型安全**：完整的 TypeScript 类型定义
- **可复用**：可在不同记录类型中复用
- **可扩展**：易于添加新的记录类型支持
- **性能优化**：最小化重渲染，优化动画性能

## 未来改进

1. **用户偏好同步**：支持跨设备同步用户偏好
2. **智能推荐**：基于使用频率推荐用户选择
3. **快捷操作**：支持手势操作和快捷键
4. **主题适配**：支持不同主题色的适配
5. **多语言支持**：完善国际化文本

## 注意事项

1. **数据隔离**：确保用户数据完全隔离
2. **隐私保护**：用户偏好仅存储在本地
3. **性能考虑**：大量用户时的渲染优化
4. **兼容性**：确保在不同浏览器中的兼容性 