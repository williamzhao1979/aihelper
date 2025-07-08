// 一日三餐记录选项定义
// 用于在多个组件中共享的选项配置

// 餐次类型
export const mealTypes = [
  { value: "breakfast", label: "早餐", description: "一天的第一餐" },
  { value: "lunch", label: "午餐", description: "一天的第二餐" },
  { value: "dinner", label: "晚餐", description: "一天的第三餐" },
  { value: "snack", label: "加餐/零食", description: "正餐之间的补充食物" },
  { value: "midnight", label: "夜宵", description: "晚上的额外进食" }
]

// 食物类型
export const foodTypes = [
  { value: "staple", label: "主食", description: "米饭、面条、馒头、面包等" },
  { value: "protein", label: "蛋白质", description: "肉类、鱼类、蛋类、豆制品等" },
  { value: "vegetable", label: "蔬菜", description: "各种蔬菜类食物" },
  { value: "fruit", label: "水果", description: "各种水果类食物" },
  { value: "dairy", label: "乳制品", description: "牛奶、酸奶、奶酪等" },
  { value: "nuts", label: "坚果", description: "花生、核桃、杏仁等" },
  { value: "beverage", label: "饮品", description: "茶、咖啡、果汁等" },
  { value: "dessert", label: "甜品", description: "蛋糕、冰淇淋、糖果等" },
  { value: "fried", label: "油炸食品", description: "炸鸡、薯条、油条等" },
  { value: "processed", label: "加工食品", description: "罐头、腌制品、速食等" },
  { value: "other", label: "其他", description: "其他类型食物" }
]

// 进食量评估
export const mealPortions = [
  { value: "very_little", label: "很少", description: "约25%正常饭量" },
  { value: "little", label: "较少", description: "约50%正常饭量" },
  { value: "normal", label: "正常", description: "100%正常饭量" },
  { value: "more", label: "较多", description: "约125%正常饭量" },
  { value: "very_much", label: "很多", description: "约150%以上正常饭量" }
]

// 进食情况
export const mealConditions = [
  { value: "normal", label: "正常", description: "正常进食，无特殊情况" },
  { value: "rushed", label: "匆忙", description: "进食时间匆忙，咀嚼不充分" },
  { value: "slow", label: "缓慢", description: "进食缓慢，细嚼慢咽" },
  { value: "appetite_good", label: "食欲良好", description: "食欲很好，进食愉快" },
  { value: "appetite_poor", label: "食欲不振", description: "食欲不好，勉强进食" },
  { value: "nausea", label: "恶心", description: "进食时有恶心感" },
  { value: "pain", label: "疼痛", description: "进食时有胃痛或腹痛" },
  { value: "bloated", label: "腹胀", description: "进食后感到腹胀" },
  { value: "satisfied", label: "饱腹感强", description: "容易产生饱腹感" },
  { value: "hungry", label: "饥饿感强", description: "容易产生饥饿感" }
]

// 工具函数：根据value获取label
export const getMealTypeLabel = (value: string): string => {
  return mealTypes.find(t => t.value === value)?.label || value
}

export const getFoodTypeLabel = (value: string): string => {
  return foodTypes.find(f => f.value === value)?.label || value
}

export const getMealPortionLabel = (value: string): string => {
  return mealPortions.find(p => p.value === value)?.label || value
}

export const getMealConditionLabel = (value: string): string => {
  return mealConditions.find(c => c.value === value)?.label || value
}
