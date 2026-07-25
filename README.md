# splitbill ʕ·ᴥ·ʔ

朋友出游分账记账本 · 基金池统一付，小荷包各自记。

每人先交一笔活动经费进基金池，账单统一从池里付；每笔账单拆成共享（参与者均摊）和个人（谁点谁付）两部分，各自的虚拟荷包自动扣减，活动结束一键出结算单，多退少补。

**在线使用：https://ischium002.github.io/splitbill/** （iOS Safari 打开 → 分享 → 添加到主屏幕，当 App 用）

纯前端 PWA，无后端无账号，数据只存在你自己的浏览器里（记得定期在设置页导出 JSON 备份）。

## 开发

Svelte 5 + Vite + TypeScript + Tailwind CSS 4 + Dexie (IndexedDB)。

```bash
npm install
npm run dev      # 本地开发
npm run build    # 构建到 dist/
npm run deploy   # 构建并发布到 GitHub Pages（gh-pages 分支）
```
