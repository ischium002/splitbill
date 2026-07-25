import Dexie, { type EntityTable } from 'dexie'
import type { Activity, BackupFile } from './types'

// 库名保留历史拼写 'spitbill'：IndexedDB 换名等于开新空库，会丢现有数据
const db = new Dexie('spitbill') as Dexie & {
  activities: EntityTable<Activity, 'id'>
  meta: EntityTable<{ key: string; value: string }, 'key'>
}

db.version(1).stores({
  activities: 'id, createdAt',
  meta: 'key',
})

export const store = $state({
  loaded: false,
  activities: [] as Activity[],
  lastExportAt: '',
})

let loadPromise: Promise<void> | null = null

export function loadAll(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      store.activities = await db.activities.orderBy('createdAt').reverse().toArray()
      store.lastExportAt = (await db.meta.get('lastExportAt'))?.value ?? ''
      store.loaded = true
    })()
  }
  return loadPromise
}

/** 组件改完 activity 对象后调用，落库 */
export function persist(a: Activity) {
  void db.activities.put($state.snapshot(a) as Activity)
}

export function addActivity(a: Activity) {
  store.activities.unshift(a)
  persist(a)
}

export function removeActivity(id: string) {
  store.activities = store.activities.filter((a) => a.id !== id)
  void db.activities.delete(id)
}

export function markExported() {
  store.lastExportAt = new Date().toISOString()
  void db.meta.put({ key: 'lastExportAt', value: store.lastExportAt })
}

export function exportBackup(): BackupFile {
  return {
    app: 'splitbill',
    version: 1,
    exportedAt: new Date().toISOString(),
    activities: $state.snapshot(store.activities) as Activity[],
  }
}

/** 导入备份：整体覆盖 */
export async function importBackup(data: BackupFile) {
  await db.activities.clear()
  await db.activities.bulkPut(data.activities)
  store.activities = await db.activities.orderBy('createdAt').reverse().toArray()
}
