// 排便记录选项定义
// 用于在多个组件中共享的选项配置

// 布里斯托大便分类法
export const bristolStoolTypes = [
  { value: "type1", label: "类型1", description: "分离的硬块，像坚果一样（难以排出）" },
  { value: "type2", label: "类型2", description: "香肠状但结块" },
  { value: "type3", label: "类型3", description: "香肠状但表面有裂缝" },
  { value: "type4", label: "类型4", description: "香肠状或蛇状，光滑柔软" },
  { value: "type5", label: "类型5", description: "软块，边缘清晰（容易排出）" },
  { value: "type6", label: "类型6", description: "糊状，边缘不清晰" },
  { value: "type7", label: "类型7", description: "完全液体，无固体块" },
  { value: "other", label: "其他", description: "其他类型" }
]

// 便便颜色选项
export const poopColors = [
  { value: "brown", label: "棕色", description: "正常颜色，胆汁代谢正常" },
  { value: "light_yellow", label: "浅黄或灰白", description: "胆汁分泌或胆道阻塞异常" },
  { value: "black", label: "黑色", description: "可能有上消化道出血或铁剂摄入" },
  { value: "red", label: "红色", description: "可能有下消化道出血或吃了红色食物" },
  { value: "green", label: "绿色", description: "可能是食物残留或肠道蠕动过快" },
  { value: "yellow_foamy", label: "黄色泡沫状", description: "脂肪吸收不良，脂肪泻" },
  { value: "other", label: "其他", description: "其他颜色" }
]

// 便便气味与成分选项
export const poopSmells = [
  { value: "normal", label: "正常气味", description: "正常的大便气味" },
  { value: "foul", label: "恶臭", description: "消化不良、感染性腹泻、腐败蛋白产气" },
  { value: "oily_floating", label: "油脂光泽、漂浮", description: "脂肪吸收不良、胰腺功能障碍" },
  { value: "mucus", label: "粘液", description: "肠道炎症、感染或刺激性食物" },
  { value: "blood", label: "带血", description: "痔疮、肠炎、肠癌" },
  { value: "parasites", label: "含寄生虫/虫卵", description: "肠道寄生虫感染" },
  { value: "other", label: "其他", description: "其他特征" }
]

// 工具函数：根据value获取label
export const getPoopTypeLabel = (value: string): string => {
  return bristolStoolTypes.find(t => t.value === value)?.label || value
}

export const getPoopColorLabel = (value: string): string => {
  return poopColors.find(c => c.value === value)?.label || value
}

export const getPoopSmellLabel = (value: string): string => {
  return poopSmells.find(s => s.value === value)?.label || value
}

// 工具函数：生成排便记录摘要
export const generatePoopSummary = (poopType?: string, poopColor?: string, poopSmell?: string): string => {
  const typeText = poopType ? getPoopTypeLabel(poopType) : ''
  const colorText = poopColor ? getPoopColorLabel(poopColor) : ''
  const smellText = poopSmell ? getPoopSmellLabel(poopSmell) : ''
  
  return [typeText, colorText, smellText].filter(Boolean).join(' · ') || '排便记录'
} 