# Sully Plus 更新指南

这份文档用于以后给 `Silis-Aliya/Sully-plus` 合并 SullyOS 上游更新并发布私有 Vercel 版本。它记录稳定流程和必须保留的 fork 约束；每次更新的具体提交、冲突与验证结果继续写入 [`FORK_MAINTENANCE_LOG.md`](./FORK_MAINTENANCE_LOG.md)。

## 先分清三类更新

| 更新对象 | 实际目标 | 是否由 Vercel push 自动完成 |
|---|---|---|
| Sully Plus 前端 | `origin/master` -> Vercel | 是 |
| Cloudflare Workers | 自己 Cloudflare 账号里的各个 Worker | 否 |
| 公开 SullyOS 快照 | `public-fork/master` | 否，且不是日常维护目标 |

`pnpm build` 会生成前端和 Worker bundle，但只生成文件，不会自动部署 Cloudflare Worker。

## 仓库与分支约定

- `upstream`：`qegj567-cloud/SullyOS`，只用于检查和合并作者更新。
- `origin`：私有 `Silis-Aliya/Sully-plus`，日常开发与 Vercel 发布目标。
- `public-fork`：公开 `Silis-Aliya/SullyOS`，只做明确要求的公开安全快照。
- 正常上游合并在 `codex/merge-upstream-plus-maintenance` 上完成。
- Vercel 当前应绑定私有仓库 `Silis-Aliya/Sully-plus` 的 `master`。
- 不再使用已经废弃的 `vercel-target` / `Silis-Aliya/sully-change`。

提交作者保持为：

```text
Silis-Aliya <3269831591@qq.com>
```

## 不能被普通上游更新带走的内容

合并时优先保留 Plus 已有行为，并逐项吸收上游修复，不能用整文件覆盖的方式解决冲突。重点保护：

- 一起听的选歌邀请、卡片、退出记录、播放状态与接受前可播放检查。
- XHS Lite 简单模式、前台 XHS Phone / Pixel MCP；后台 Worker 只暴露公网可达工具。
- OSContext 拆分、聊天 prompt 与后处理、Ears/语音路径。
- Workbench + Story Theater 的数据库、备份、导入和隔离逻辑。
- WebDAV QuickSync、GitHub 备份代理、移动端分批恢复、设备识别。
- 记忆宫殿修复与向量异常工具。
- 私有 Plus 的默认代理 Worker 地址；公开仓库不得带入这个私有地址。

改 prompt 前必须先给用户看对应的完整 prompt，确认后才能修改。

### 当前必须隔离的 WIP

除非用户明确批准发布，以下 Memory Hub / Ombre bridge 和 VPS 内容不得暂存、提交或 push：

```text
apps/MemoryPalaceApp.tsx
utils/memoryPalace/db.ts
utils/memoryPalace/export.ts
utils/memoryPalace/index.ts
utils/memoryPalace/ombreBridge.ts
docs/ombre-memory-palace-integration.md
VPS_README.md
```

如果这些文件的发布状态或行为发生变化，先提醒用户并更新 `FORK_MAINTENANCE_LOG.md`。

## 合并上游的标准步骤

### 1. 读取现状

```bash
git status --short
git branch --show-current
git remote -v
git log -1 --oneline upstream/master
git log -1 --oneline origin/master
```

先阅读 `README.md` 顶部状态和 `FORK_MAINTENANCE_LOG.md` 最新记录。不要因为工作树本来就有改动而清空或还原用户文件。

### 2. 获取并审阅作者更新

```bash
git fetch upstream master
git log --oneline --decorate HEAD..upstream/master
git diff --stat HEAD..upstream/master
```

先说明上游新增了什么、是否像未完成代码、可能触及哪些 Plus 功能。若没有新提交，不制造空 merge。

### 3. 隔离本地 WIP

优先提交已经完成且准备保留的普通改动。对尚未发布的内容，只按已确认的文件范围建立带日期的 stash，并记录 stash 名称；不要笼统处理或删除整个工作树。

隔离后再次运行 `git status --short`，确认 Memory Hub / Ombre / VPS 文件没有进入待合并范围。

### 4. 合并到维护分支

```bash
git switch codex/merge-upstream-plus-maintenance
git merge --no-ff upstream/master
```

发生冲突时逐文件理解两边功能。以下文件是高风险区，需要额外检查：

```text
context/OSContext.tsx
apps/Chat.tsx
apps/Settings.tsx
apps/WorkbenchApp.tsx
components/chat/MessageItem.tsx
utils/db.ts
utils/context.ts
utils/chatPrompts.ts
utils/chatParser.ts
utils/safeApi.ts
scripts/build-workers.mjs
worker/**
```

数据库冲突要同时保留两边 store、类型、建表、导出和导入路径；`DB_VERSION` 只能前进，不能回退。备份消息继续使用清理 Blob 后的 portable 数据，不能因吸收上游新字段而退回不可移植消息。

### 5. 验证合并结果

使用仓库统一包管理器：

```bash
pnpm vitest run
pnpm build
```

高风险功能还要运行对应 focused tests，并人工扫描：

- 普通聊天、手动生成、退出后再进入的三个点状态。
- 一起听邀请、接受、播放失败、退出与仅有一首歌的情况。
- 备份导出、导入、QuickSync 和新增 IndexedDB store。
- XHS 前台工具与 AMSG2 后台 MCP 的可达性区分。
- API 重试：中间 `429/5xx` 不弹窗，最终失败仍提示并记录。
- 私有默认 Worker 地址仍是预期地址，且没有密钥进入 git diff。

恢复隔离的 WIP 后，再运行一次 `pnpm build`，确认 WIP 与新上游可以共存；WIP 仍保持未暂存。

### 6. 写维护记录并精确提交

更新：

- `README.md` 顶部的当前上游基线和发布状态。
- `FORK_MAINTENANCE_LOG.md` 的上游提交、冲突取舍、测试结果、Worker 后续动作和 WIP 状态。

只显式暂存本次文件，然后核对：

```bash
git add -- <本次确认的文件>
git diff --cached --name-only
git diff --cached
git status --short
```

暂存列表里出现 Memory Hub / Ombre / VPS WIP 时立即停止，不要提交。

## 发布到 Vercel

只有合并、测试和暂存范围都确认无误后才能发布：

1. 再次 fetch 上游，确认审阅后没有突然出现未处理的新提交。
2. 先 push 当前维护分支作为远端备份。
3. 用户明确要求发布后，才把已验证提交 push 到私有 `origin/master`。
4. 到 Vercel Dashboard 确认项目绑定 `Silis-Aliya/Sully-plus`、部署提交正确且构建成功。
5. 打开线上站点检查版本；若仍是旧页面，检查 PWA / Service Worker / 浏览器缓存。

常用发布命令：

```bash
git push origin HEAD:codex/merge-upstream-plus-maintenance
git push origin HEAD:master
```

push 前必须确认是 `origin`。不要把私有维护线 push 到 `public-fork`，也不要使用 `vercel-target`。

## Cloudflare Worker 更新

Worker 与 Vercel 是两套部署。只有上游变化涉及相应 Worker 时才更新它，且每个 Worker 独立验收。

### 主动消息 2.0（AMSG2）

首次部署按 [`docs/amsg2-setup-walkthrough.md`](./docs/amsg2-setup-walkthrough.md) 操作。需要：

- 自己的 Cloudflare Worker 和 D1 数据库。
- `DB` D1 binding。
- 每分钟一次的 Cron：`* * * * *`。
- `AMSG_MASTER_KEY`。
- 与 SullyOS 设置页完全相同的一对 `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`。
- 可选 `VAPID_EMAIL` 和 `AMSG_SERVER_TOKEN`；使用 token 时前后两边必须一致。

以后更新优先使用独立的 `sullyos-workers` fork：

1. GitHub 打开自己的 `sullyos-workers`。
2. 点击 **Sync fork -> Update branch**。
3. 等 Cloudflare 自动部署完成。
4. 检查 `DB` binding、Cron、Secrets 没有丢失。
5. 打开 `https://你的-worker/capabilities`；JSON 或 `INVALID_CLIENT_TOKEN` 都说明 Worker 在运行。
6. 回 SullyOS 的“主动消息 2.0”确认绿色“已连接”，开启通知，并建立一条短时间测试任务。

若使用手动粘贴方式，则替换为最新版 `worker.bundle.js` 后重新 Deploy。若直接从本仓库用 Wrangler 部署，必须先确认 `worker/amsg/wrangler.toml` 中不再是 `REPLACE_WITH_YOUR_D1_ID`；绝不能把占位配置部署到生产。

### 其他 Worker

- `instant-push`：更新后验证后台回复、SSE/Push 送达判断及 VAPID。
- `mcp-proxy`：验证公网 HTTPS 可达性、token 和 XHS/MCP 工具调用。
- 主代理、XHS Lite、Post Office、漂流瓶等：按改动目录分别部署，不能因为 Vercel 成功就视为 Worker 已更新。

## 公开 fork 更新

公开仓库不是私有 Plus 的直接镜像。需要公开快照时：

1. 从 `public-fork/master` 单独准备。
2. 只移植用户明确要求公开的改动。
3. 检查 `utils/proxyWorker.ts` 的公开默认地址。
4. 搜索私有 Worker 地址、API Key、token、cookie 和账户信息。
5. 运行 `pnpm build` 后再 push `public-fork/master`。

不要把包含私有 Worker 默认值和私人历史的 `origin` 分支直接推到公开仓库。

## 完成判定

一次更新只有同时满足以下条件才算完成：

- 上游提交已审阅并正确合并，没有靠整文件覆盖丢失 Plus 功能。
- focused tests、完整测试和生产构建按风险通过。
- Memory Hub / Ombre / VPS WIP 仍未进入发布提交。
- `FORK_MAINTENANCE_LOG.md` 已记录真实变更和剩余风险。
- 私有前端已 push 到正确的 `origin/master`，且 Vercel 部署已核实。
- 受影响的 Cloudflare Worker 已单独部署和验证；未受影响的 Worker 不必重复部署。

遇到未理解的冲突、测试失败、上游在发布前再次前进、部署目标不明确或暂存列表混入 WIP 时，停止发布并先说明情况。
