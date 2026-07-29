export interface Member {
  id: string
  name: string
  ini: string
  color: string
  /** 缴纳的活动经费，整数分 */
  fundCents: number
}

export type ItemKind = 'shared' | 'personal'

export interface BillItem {
  id: string
  label: string
  /** 整数分 */
  amountCents: number
  kind: ItemKind
  /** shared: 参与均摊的成员；personal: 恰好一个归属成员 */
  memberIds: string[]
}

export interface Bill {
  id: string
  /** YYYY-MM-DD */
  date: string
  title: string
  /** 录入的账单总额（校验用），整数分；0 表示未填 */
  totalCents: number
  items: BillItem[]
  createdAt: number
}

export interface Activity {
  id: string
  name: string
  /** YYYY-MM-DD，可为空字符串 */
  startDate: string
  endDate: string
  members: Member[]
  bills: Bill[]
  /** 管钱人（基金池保管者）的成员 id；旧数据无此字段 */
  treasurerId?: string
  settled: boolean
  createdAt: number
}

export interface BackupFile {
  /** 旧备份写的是 'spitbill'（历史拼写错误），导入时两者都认 */
  app: 'splitbill' | 'spitbill'
  version: 1
  exportedAt: string
  activities: Activity[]
}
