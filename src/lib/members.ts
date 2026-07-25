/** 成员头像色盘，来自设计稿；超过 8 人循环使用 */
export const MEMBER_COLORS = [
  '#C4703A',
  '#7A8A5E',
  '#C09A3E',
  '#5B7B8C',
  '#B06580',
  '#8C6E9C',
  '#4E8D7C',
  '#A85B4B',
]

export function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

/** 头像字：中文取第一个字，拉丁取首字母大写 */
export function initialOf(name: string): string {
  const c = name.trim().charAt(0)
  return /[a-z]/i.test(c) ? c.toUpperCase() : c
}
