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

## 自动部署到 GitHub Pages

仓库已配置 `.github/workflows/deploy-pages.yml`：每次推送到 `main`，自动安装依赖、运行 Svelte / TypeScript 检查、构建并发布 `dist/`。检查或构建失败时不会发布。

首次启用（手机浏览器也可以）：

1. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
2. 打开 **Actions → Deploy to GitHub Pages → Run workflow**，选择 `main` 并运行。这次发布也会包含最新的货币快照修复。
3. 等待 build 和 deploy 都成功，再打开 https://ischium002.github.io/splitbill/ 。如主屏幕 App 仍显示旧版，关闭后重新打开。

此后更新 `main` 就会自动发布，无需在电脑上运行 `npm run deploy`，也无需添加个人访问令牌或其他 Secrets。首次切换 Source 前如果自动运行失败，切换后重新运行即可。

启用 GitHub Actions 作为发布来源后，不再使用上面的 `npm run deploy` 命令；该命令只适用于以 `gh-pages` 分支为来源的旧发布方式。分享链接保存的是生成时的快照，旧链接不会自动补充新增字段；更新网页后需要重新分享，才能携带选择的货币符号。
