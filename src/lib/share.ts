/**
 * 只读分享链接：活动数据 → 紧凑格式 → deflate 压缩 → base64url，全部塞进 URL hash。
 * 静态站没有后端，链接本身就是数据——对方打开即所见，是分享那一刻的快照。
 */
import type { Activity, Bill, BillItem } from './types'
import { uid } from './id'

/** 紧凑格式：成员用下标引用，去掉 UUID，键名压到一个字母 */
interface PackedItem {
  l: string
  a: number
  /** 0 shared / 1 personal */
  k: 0 | 1
  m: number[]
}
interface PackedBill {
  d: string
  t: string
  a: number
  i: PackedItem[]
}
interface Packed {
  v: 1
  n: string
  s: string
  e: string
  /** [name, ini, color, fundCents] */
  m: [string, string, string, number][]
  /** 管钱人下标 */
  t?: number
  b: PackedBill[]
}

function pack(a: Activity): Packed {
  const idx = new Map(a.members.map((m, i) => [m.id, i]))
  const tIdx = a.treasurerId !== undefined ? idx.get(a.treasurerId) : undefined
  return {
    v: 1,
    n: a.name,
    s: a.startDate,
    e: a.endDate,
    m: a.members.map((m) => [m.name, m.ini, m.color, m.fundCents]),
    ...(tIdx !== undefined ? { t: tIdx } : {}),
    b: [...a.bills]
      .sort((x, y) => x.date.localeCompare(y.date) || x.createdAt - y.createdAt)
      .map((b) => ({
        d: b.date,
        t: b.title,
        a: b.totalCents,
        i: b.items.map((it) => ({
          l: it.label,
          a: it.amountCents,
          k: it.kind === 'personal' ? 1 : 0,
          m: it.memberIds.map((id) => idx.get(id)!).filter((i) => i !== undefined),
        })),
      })),
  }
}

function unpack(p: Packed): Activity {
  const memberIds = p.m.map(() => uid())
  return {
    id: uid(),
    name: p.n,
    startDate: p.s,
    endDate: p.e,
    members: p.m.map(([name, ini, color, fundCents], i) => ({
      id: memberIds[i],
      name,
      ini,
      color,
      fundCents,
    })),
    treasurerId: p.t !== undefined ? memberIds[p.t] : undefined,
    bills: p.b.map(
      (b, i): Bill => ({
        id: uid(),
        date: b.d,
        title: b.t,
        totalCents: b.a,
        createdAt: i,
        items: b.i.map(
          (it): BillItem => ({
            id: uid(),
            label: it.l,
            amountCents: it.a,
            kind: it.k === 1 ? 'personal' : 'shared',
            memberIds: it.m.map((mi) => memberIds[mi]),
          })
        ),
      })
    ),
    settled: false,
    createdAt: 0,
  }
}

function toB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const buf = await new Response(
    new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  ).arrayBuffer()
  return new Uint8Array(buf)
}

/** 前缀 '1' = deflate 压缩，'0' = 明文（老浏览器兜底） */
export async function encodeShare(a: Activity): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(pack(a)))
  if (typeof CompressionStream !== 'undefined') {
    return '1' + toB64url(await pipe(json, new CompressionStream('deflate-raw')))
  }
  return '0' + toB64url(json)
}

export async function decodeShare(payload: string): Promise<Activity | null> {
  try {
    const bytes = fromB64url(payload.slice(1))
    const json =
      payload[0] === '1'
        ? await pipe(bytes, new DecompressionStream('deflate-raw'))
        : bytes
    const p = JSON.parse(new TextDecoder().decode(json)) as Packed
    if (p.v !== 1 || !Array.isArray(p.m) || !Array.isArray(p.b)) return null
    return unpack(p)
  } catch {
    return null
  }
}

/** 完整分享链接（hash 路由，静态站直接可开） */
export function shareUrl(payload: string): string {
  return `${location.origin}${location.pathname}#/view/${payload}`
}
