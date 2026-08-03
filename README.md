# Sully Plus

## Current Upstream Baseline

- Upstream SullyOS is merged through `5a14e1e4` (2026-08-03). The merged release point is `9967cd17`, published to `Silis-Aliya/Sully-plus` `master` for Vercel deployment.
- This baseline includes Active Message 2.0 subscription self-repair and diagnostics, background tool continuation, Deno proxy support, optional Capacitor/FCM push, analytics updates, Story Theater V6.27 follow-ups, voice autoplay traffic savings, and updated worker bundles.
- Plus also carries `22d4a4ff`, which normalizes Vertex/Gemini native tool-call responses before they reach chat rendering so raw provider JSON is not split into visible message bubbles.
- Plus-specific music together behavior, XHS phone/Lite paths, split OS contexts, backup behavior, and the private proxy worker default remain preserved.
- Local Memory Hub / Ombre bridge and VPS notes are work in progress and are intentionally excluded from release commits. If that status or behavior changes, update `FORK_MAINTENANCE_LOG.md` before publishing.

> **维护状态：主维护线。**
>
> 以后 SullyOS 二改的主要开发、语音/Ears Lite、上游合并和私有部署准备都以 `Silis-Aliya/Sully-plus` 为准。公开 fork 只保留当前快照，不再作为主要开发线。

Sully Plus 是基于 SullyOS / 手抓糯米机二改维护的个人 fork。

它保留原版“浏览器里的虚拟手机”和角色陪伴系统，同时把这一支 fork 调成更适合私人日常使用的形态：手机远程 Code、桌面 CLI 桥接、私有域名访问、小红书素材卡片、进度卡、增量导入导出、头像与媒体数据维护。

> 这不是上游 SullyOS 的官方发行版，而是一支持续二改的私人维护版。

## 这一支 Fork 是什么

Sully Plus 是一个 local-first 的虚拟手机 + 角色工作台。

核心方向：

- 保留角色聊天、记忆、人设、群聊、房间、音乐、电话、相册、日记、世界等原版体验。
- 增强 Code / Workbench，让角色、用户、Codex/CLI 可以在同一个 Code 对话里协作。
- 默认按“手机远程使用”理解 Code：手机连电脑桥接地址，不再假设只能填 `localhost`。
- 支持 Cloudflare Tunnel / 自定义域名作为桥梁，让电脑开着 bridge 就能被手机连接。
- 小红书链接和素材卡片可以进入聊天与 Code 上下文。
- 数据仍优先存在本地，靠导出/导入、WebDAV、GitHub 等方式迁移和备份。

这一支 fork 的目标不是把 SullyOS 做成公共 SaaS，而是把它变成一个更私人的日常操作系统。

## 主要改动

### Code / Workbench

Code 是这支 fork 的重点。

- Code 区可以连接本机 Codex CLI、Claude Code 或自定义 CLI。
- Codex 桥接使用常驻 `app-server` 会话，避免每条消息重新冷启动 CLI；同一条 Code 对话会复用对应 Codex 会话。
- Codex 请求执行受限命令或修改受保护文件时，Code 区显示临时审批卡。可选项以 Codex 本次实际提供的决定为准，包括“允许一次”“本次对话允许”和“拒绝”。
- 审批请求、待审批状态和审批选择只属于当前运行现场，不写入聊天、完整备份或 QuickSync；桥接重启后不会自动继承旧审批。
- 手机端使用远程 bridge 地址，电脑端负责真正执行 CLI。
- 角色可以在 Code 区一起工作，也可以在说完之后单独 `@Codex` 让 AI 助理接手。
- 进度卡会记录来源和作者，避免把 Codex 写的总结误认为角色写的，或反过来混淆。
- 每张进度卡可以单独删除；删除会同步清除 Code 对话和角色普通聊天中的对应卡片。卡片上的 `Memory · N` 标记表示该卡实际提炼出的 Code Memory 数量。
- Code Memory 与角色记忆宫殿相互隔离：它服务于 Code 跨对话上下文，可在 Code 设置中编辑或删除；普通聊天角色读取的是同步过去的进度卡，不会直接读取 Code Memory 本体。
- 当前提供临时的进度卡作者修正入口，修正结果会进入导入/导出和增量同步；历史数据修完后可移除该入口。
- 当前 Code 进度索引默认收起，需要时手动展开。
- Code 长消息支持复制、引用、编辑、删除和多选删除。
- Code 图片会作为视觉输入发送给支持图片的角色模型；连接电脑 Codex CLI 时，桥接会把最近的图片作为临时附件传入。
- Code 输入栏的回形针支持在 iPhone/iPad 或桌面浏览器上传 `md`、`txt`、配置文件和常见代码文件。文件以可下载的文本文件卡保存，完整正文会进入同一 Code 会话，AI 助理、备用 API 和“一起工作”的角色都能读取。
- 文本附件单个最多 64 KB，一次最多 4 个且总计不超过 128 KB；超限或疑似二进制文件会直接拒绝，不会静默截断后交给模型。上传正文随 `workbench_messages` / `workbench_artifacts` 进入完整备份与 QuickSync。
- “正在思考”显示为聊天页一致的三个点输入状态。
- Code 助理头像进入导入/导出和增量数据流程。

### 桌面 CLI Bridge

桥接服务运行在电脑上。手机访问 bridge，bridge 再调用本机 CLI。

常用命令：

```bash
pnpm workbench:bridge
pnpm workbench:bridge:startup
```

`workbench:bridge:startup` 用于开机自动启动 bridge 的场景。目标体验是：

- 电脑开着。
- bridge 进程在运行。
- 手机可以通过远程地址连接 Code。
- 不要求电脑浏览器一直打开 SullyOS 页面。

注意：如果 bridge 能执行本机 CLI，它就等同于一种远程操作入口，必须加 token 或访问控制。

### 私有远程访问

这支 fork 默认按私人使用处理，不建议裸奔公网。

推荐方式：

- 电脑运行 Code bridge。
- Cloudflare Tunnel 或其他 HTTPS 隧道暴露 bridge。
- bridge 自身设置 token。
- 自定义域名可以公开解析，但访问应通过 token、Cloudflare Access 或其他鉴权保护。

也就是说：别人可以看见域名，不代表别人应该能打开或调用你的 bridge。

私有远程访问只建议使用绑定自己域名的 Cloudflare named tunnel；本 fork 不再依赖会生成随机公开地址的 Quick Tunnel。

### 语音识别 / Ears Lite

这支 fork 内置轻量语音识别链路，用于把聊天里的录音转成文字，并把基础声音特征留在本机：

- 聊天录音会先走 Ears Lite：Groq Whisper 负责转写，Essentia.js 在浏览器本机提取轻量声音基线。
- 设置页里有独立的“语音识别”大栏，声音基线、Groq Whisper、主 Worker 密钥、腾讯云说话人识别、讯飞声音特征识别分开配置，不再嵌套成一堆卡片。
- Groq 转写支持语言选择：中文优先、English、自动。中文优先会显式传 `language=zh`，避免中文语音被 Whisper 偶发识别成其他语言；自动模式会省略 language 参数交给模型判断。
- 腾讯云和讯飞配置保留为增强通道：腾讯云用于说话人/声纹判断，讯飞用于年龄、性别等听感特征抽样。
- 语音 API Key、Worker 密钥、声纹 ID 等都属于私有配置，不应提交到公开仓库。

### 小红书 / XHS

原聊天页已有小红书链接识别和卡片渲染。这支 fork 把相关能力补到 Code / Workbench：

- 在 Code 区发小红书链接，可以解析并渲染卡片。
- 用户和角色发送的普通聊天小红书分享会先走统一规范化，再在 Code 中按卡片渲染，避免拆成多条字段气泡。
- 普通聊天与 Code 共用同一条小红书链接读取链路：展开短链后读取正文、作者、封面与评论；读取失败会明确提示，不用空卡冒充成功。
- 小红书卡片会进入 Code 上下文，Codex/角色能看到标题、正文、作者、noteId、链接和评论摘录。
- Code 区角色如果输出小红书工具指令，会走 Workbench 专用后处理链，调用配置好的 MCP/Lite/手机通道并把结果插回 Code 对话。
- 普通 HTTP(S) 网页与视频链接在聊天和 Code 中共用同一个 `WebpageShareCard` 组件与提取链路；两边的封面、标题、摘要、视频统计和点击跳转保持一致。

小红书能力依赖你自己的配置，不包含公共账号或公共 cookie。

### 音乐分享与一起听

- 音乐 Now Playing 页可以把当前歌曲分享给角色的普通聊天，角色也能从自己的可分享歌曲中主动发歌。
- 分享卡片包含歌名、歌手、专辑、封面和播放信息；点击播放只切换自己的播放器，不会自动进入一起听。
- 角色可以按音乐人格和当下情境把歌曲收藏进 `musicProfile.playlists`，也可以从可分享歌曲列表里直接选择一首歌发送可接受或拒绝的一起听邀请。
- 角色发起的一起听邀请卡本身携带歌名、歌手、封面和播放数据；用户接受后才播放该歌曲并进入一起听，不会先发送一张普通分享卡再绑定邀请。
- 邀请卡、歌曲卡和退出记录按实际发送者或操作者显示；一起听期间展示双方头像，并阻止双方重复邀请。接受角色邀请时会先确认歌曲可播放，再把卡片标记为已接受。
- 角色读取歌曲资料和当前音乐上下文来回应，不读取或上传原始音频，也不会为每条聊天额外调用音乐分析模型。

### 聊天生成与 API 错误提示

- 手动触发角色回复后，即使先退出聊天页再回来，只要该角色仍在生成中，聊天界面会继续显示角色侧三个点输入气泡。
- API 请求通过内部重试链路处理时，中间重试用的 `429` / `5xx` 不会再提前弹成全局 URL error；只有最终仍失败的请求才会显示错误。
- API 调用日志仍会记录真实失败，方便区分“中间重试噪音”和“供应商额度/内容/网络导致的最终失败”。
- Vertex/Gemini 兼容接口返回原生 `functionCall` / `functionResponse` 时，会先转换成 SullyOS 的统一工具调用结构再进入后续处理；角色聊天不再把整段供应商响应 JSON 拆成多条气泡。转换只处理可确认的工具调用结构，普通文本回复保持原样。

### 数据、头像和备份

Sully Plus 仍然是 local-first。

- 聊天记录、角色、人设、设置和大部分应用数据存在 IndexedDB。
- 图片和头像尽量走 blob/ref 存储，避免一直塞 base64。
- 普通角色头像、Code 助理头像、小红书卡片、上传媒体等需要进入导入/导出和增量迁移流程。
- 角色音乐歌单、聊天音乐事件、`songs`、`vr_music`、生成音频资源、世界书和 Code / Workbench 数据均进入全局备份与 QuickSync 清单。
- 当前一起听会话只在本机刷新时作为最长 12 小时有效的短时现场快照恢复。完整备份和 QuickSync 仅迁移队列、当前歌曲与播放模式，不迁移参与角色、会话时间、切歌临时状态、角色选歌归属或下一次主动唤醒计划；导入成功会主动结束目标设备上的现有一起听会话。
- Code 连接的真实电脑项目文件内容不会打包进应用备份；用户从手机主动上传的小型文本附件属于 Code 对话数据，会随备份与 QuickSync 迁移。
- 主动消息 2.0 的角色开关、任务、副模型配置、已落库消息，以及全局 Worker 地址、用户 ID 和服务 token 都进入完整备份与 QuickSync。浏览器 PushSubscription、设备推送端点、待续跑工具调用和运行队列属于设备现场，不跨设备恢复；新设备导入后仍需重新授权通知并注册订阅。
- QuickSync 按 IndexedDB 记录主键和内容哈希比较：只传新增、修改、删除的记录；但某条记录一旦变化，会传这条记录的完整内容，并不是在一段文字内部制作字节补丁。
- QuickSync 对同一条记录采用后写覆盖，多设备同时修改同一记录时仍有覆盖风险。
- QuickSync 拉取 Code store 后会通知已经打开的 Code 页面刷新当前会话；完整导入对现代备份中的便携设置采用替换语义，备份里缺失的旧设置会在目标设备删除，旧版无设置区块的备份仍保持非破坏性导入。
- WebDAV / GitHub 备份应指向你自己的账号和私有空间。

浏览器缓存不是备份。重要数据请定期导出。

## 本地运行

安装依赖：

```bash
pnpm install
```

启动开发服务：

```bash
pnpm dev
```

构建生产包：

```bash
pnpm build
```

预览构建结果：

```bash
pnpm preview
```

## 部署 Web App

前端构建后是静态站点，可以部署到 Vercel、Netlify、Cloudflare Pages、GitHub Pages 或其他静态托管。

一般流程：

```bash
pnpm build
```

然后部署 `dist/`。

如果使用 Vercel，push 到绑定分支后应自动部署。当前 owner 的私有部署约定是绑定 `Silis-Aliya/Sully-plus` 的 `master`；不要把 `Silis-Aliya/sully-change` 当作当前部署目标。若线上没有更新，优先检查：

- 当前改动是否已经 commit 并 push 到部署分支。
- Vercel Project → Settings → Git 里绑定的仓库是否是 `Silis-Aliya/Sully-plus`。
- Vercel 是否完成了最新一次部署。
- 浏览器 / PWA / Service Worker 是否仍在缓存旧资源。

## Worker

`pnpm build` 会同时构建 worker bundle。

常见目录：

- `worker/instant-push/`
- `worker/xhs-lite/`
- `worker/mcp-proxy/`
- `worker/post-office/`
- `worker/loyal-recruitment/`

涉及私有 token、cookie、额度、用户数据的 worker，建议部署到自己的账号，不要长期依赖上游作者或别人的公共实例。

### 当前 owner 的主动消息 2.0 部署

截至 2026-08-03，主动消息 2.0 后端已经部署到 owner 自己的 Cloudflare 账号，并启用了 GitHub 构建部署：

| 项目 | 当前配置 |
|---|---|
| Worker | `sullyos-amsg` |
| Worker 源仓库 | `Silis-Aliya/sullyos-workers` |
| 生产分支 | `main` |
| Root directory | `/amsg` |
| Build command | `sh ./deploy-prepare.sh` |
| Deploy command | `npx wrangler deploy` |
| 构建变量 | `D1_DATABASE_ID` 已在 Cloudflare Build Variables 中配置，且未加密 |
| 数据库绑定 | `DB` -> owner 自己的 D1 数据库 |
| 定时触发器 | `* * * * *`，每分钟检查一次任务 |
| 验证状态 | Cloudflare 生产构建成功，`/config-check` 返回 HTTP 200 |

密钥值不写入仓库。`AMSG_MASTER_KEY`、VAPID 密钥和可选的 `AMSG_SERVER_TOKEN` 只保存在 Cloudflare Variables and Secrets 与 SullyOS 本地设置中；VAPID 公私钥和共享 token 两端必须一致。

这里有两层“自动更新”，不要混在一起：

1. `Silis-Aliya/sullyos-workers` 的 `main` 出现新提交后，Cloudflare 会自动构建并重新部署 `sullyos-amsg`。
2. 作者上游发布新 Worker 后，GitHub fork 默认不会自己追上上游；仍需在 `Silis-Aliya/sullyos-workers` 点击 **Sync fork -> Update branch**。同步产生提交后，Cloudflare 才会接着自动部署。

因此日常更新不再需要复制粘贴 `worker.bundle.js`，但仍要主动同步一次 fork。部署完成后检查 Cloudflare 最新 Production build、`DB` binding、Cron 和 `/config-check`，再回 SullyOS 的“主动消息 2.0”确认连接、通知订阅及角色任务均已启用。

完整首次部署与排障步骤见 [`docs/amsg2-setup-walkthrough.md`](./docs/amsg2-setup-walkthrough.md)，本 fork 的统一更新顺序见 [`FORK_UPDATE_GUIDE.md`](./FORK_UPDATE_GUIDE.md)。Vercel 前端与该 Worker 是两套部署：push `origin/master` 只会更新 Sully Plus 前端，不会更新 Cloudflare Worker。

当前前端已经吸收上游的 AMSG2 订阅自愈、推送诊断、后台工具续跑和 Deno 代理支持。要让 Cloudflare 后端同时获得对应能力，仍需单独同步 `Silis-Aliya/sullyos-workers` 并等待 `sullyos-amsg` 生产部署完成；只看到 Vercel 构建成功不能代表 Worker 已更新。

## Android / Capacitor

```bash
pnpm build
pnpm cap:sync
pnpm cap:android
```

然后在 Android Studio 里运行或打包 APK。

当前上游基线还加入了可选的 AMSG2 原生 FCM 通道。普通浏览器/PWA 构建不会加载 Capacitor Push Notifications，也不会因此改变现有 Web Push；只有 Capacitor 模式显式启用 `VITE_AMSG_NATIVE_PUSH=true` 时才注册原生 FCM token。Worker 端需要另行配置 Firebase 服务账号相关 Secrets，完整步骤见 [`docs/capacitor-fcm-tiao.md`](./docs/capacitor-fcm-tiao.md)。

## 设置入口

多数配置在应用内完成：

- 聊天 API：OpenAI-compatible Base URL / API Key / Model。
- TTS：MiniMax、Fish Audio 等语音配置。
- 备份：本地导出导入、WebDAV、GitHub。
- MCP：工具服务器、小红书、代理。
- Code：bridge 地址、token、CLI 路由、模型档位、备用聊天 API。
- 外观：主题、壁纸、聊天气泡、头像尺寸、Code 图标和默认名称。

`.env.local` 可以给开发环境放默认值，但应用内设置通常优先。

## 安全注意

- 不要提交真实 API Key、bridge token、Cloudflare token、小红书 cookie、WebDAV 密码、GitHub token。
- bridge endpoint 不要无鉴权暴露公网。
- “别人不知道 URL”不等于私有。
- 如果 bridge 能调用本机 CLI，请把它当成远程操作电脑的入口。
- 自定义域名建议配 Cloudflare Access 或等价鉴权。

## Fork 维护流程

完整的上游合并、WIP 隔离、Vercel 发布和 Cloudflare Worker 更新步骤见 [`FORK_UPDATE_GUIDE.md`](./FORK_UPDATE_GUIDE.md)。

合并上游或 push 前建议检查：

- 阅读 fork maintenance log，如果当前工作树里有。
- Memory Hub / Ombre bridge、VPS 说明等本地 WIP 不要混入普通上游同步或一起听/聊天修复提交；如果它们后续状态变化，先更新 `FORK_MAINTENANCE_LOG.md`。
- 当前上游合并基线与私有 Plus / Vercel 发布点以本 README 顶部状态和 `FORK_MAINTENANCE_LOG.md` 最新记录为准，不沿用下方历史条目中的旧提交号。
- 重点看这些容易冲突的文件：
  - `context/OSContext.tsx`
  - `apps/Chat.tsx`
  - `apps/WorkbenchApp.tsx`
  - `components/chat/MessageItem.tsx`
  - `utils/chatParser.ts`
  - `utils/context.ts`
  - `utils/chatPrompts.ts`
  - `utils/workbenchBridge.ts`
  - `worker/`
- 跑构建：

```bash
pnpm build
```

### 用户数据迁移契约

#### 上游与本 Fork 的备份原则

**Instant 消息 + 社区 & UI 维护 + 各种 Bug 修复**
Instant Push（发完消息就能锁屏走人、角色回复好了自己以推送的形式回到你手机上）**整套都出自 TO 佬**之手。而且不止于此——现在 **Instant 消息全线、社区维护、UI 维护、以及日常各种 Bug 的修复**都是 TO 在扛，事情做得又多又细。项目能一天天往前走、体验越来越顺手，真的多亏有他。**认认真真、好好感谢 TO 佬。** 🙏

- **上游以数据库为边界**：长期数据主要按 IndexedDB store 整体导出；数据库外的 `localStorage`、页面运行状态和缓存没有统一迁移契约，也没有 QuickSync。
- **本 Fork 以跨设备体验连续性为边界**：用户和角色后续仍需使用的持久数据、配置、操作结果及创作内容，必须同时覆盖完整导入导出与 QuickSync；新增、修改、删除遵守同一迁移语义。
- 用户生成且不可轻易重建的作品和素材属于存档，必须迁移真实数据；可重新抓取或重新生成的搜索结果、接口结果、TTS 等缓存不迁移。
- 当前歌曲、队列和播放模式可以迁移；一起听关系、会话时间、切歌临时状态、角色选歌归属、主动唤醒计划、播放秒数和播放/暂停状态不迁移。
- Code 项目文件正文留在桥接电脑，SullyOS 只迁移会话、摘要、记忆和文件卡片元数据；从手机上传并归属 Code 对话的小型文本附件则迁移完整正文。
- QuickSync 使用后写覆盖，目标是轻量且接近完整恢复，不承担实时多设备协同合并。

- 用户、角色、角色分组及其新增、修改和删除，都必须同时进入完整导出/导入与 QuickSync 增量。
- 功能选项、角色操作结果、聊天卡片和 Code 会话只要已持久化，就随所属的设置项或 IndexedDB 记录迁移；新增字段不应另造一套备份旁路。
- 头像、壁纸、卡片图片、Code 头像等 `blobref:*` 图片同时迁移引用记录和 `blob_assets` 二进制。QuickSync 必须覆盖图片新增、替换和删除，避免目标设备残留孤儿图片。
- 当前歌曲、队列和播放模式属于可迁移音乐状态；一起听参与角色、会话时间、切歌临时状态、角色选歌归属、主动唤醒计划、播放进度秒数和播放/暂停状态不属于用户存档。完整导入或 QuickSync 应用成功后，目标设备默认退出一起听。
- 角色音色配置和语音消息文字属于存档；已合成的 `voice_msg_*` / `tts_*` 音频属于可重建缓存。用户生成的歌曲属于作品，不按缓存处理，其音频本体应进入迁移链路。
- 每次增加新的持久化 store、localStorage 设置或图片入口，都要同步更新完整备份、增量清单、删除语义和覆盖测试。

- 手动验证：
  - 聊天页普通角色回复。
  - Code / Workbench 连接 bridge。
  - 手机远程 bridge 地址。
  - Code 区 `@Codex`。
  - 小红书链接卡片。
  - 进度卡作者显示。
  - 导入/导出和头像恢复。
  - 移动端安全区、顶部导航和输入框布局。

## 项目结构

- `apps/`：各个应用页面，包括 Chat、Settings、Workbench、Music、Room、World 等。
- `context/OSContext.tsx`：全局系统状态和很多跨应用流程。
- `utils/`：数据库、prompt、桥接、解析器、工具调用、导入导出等共享逻辑。
- `components/`：通用 UI 组件。
- `worker/`：Cloudflare Worker、Instant Push、XHS Lite、代理等。
- `scripts/`：本地 bridge、构建、代理和维护脚本。
- `docs/`：专题文档和交接说明。

**聊天细节微调（外观 · 聊天界面）**
外观里的「聊天细节微调」可视化设置（隐藏头像、头像对齐微调、消息贴边、气泡缩进、字号行距等）收编自社区作者 **毛豆腐和面机**（DC）流传的「神秘拼好码」白框美化——连选择器都沿用她在真实 DOM 上验证过的形态，等于把她手写的美化代码变成了人人可点的开关。感谢她。

## 上游与致谢

Sully Plus 基于 SullyOS / 手抓糯米机。原始项目的人设系统、虚拟手机概念、Sully 角色、核心 UI 世界和大量应用能力来自上游作者与社区贡献者。

这一支 fork 保留上游许可证和署名要求。发布自己的 fork 时，请继续保留：

- `LICENSE`
- 上游 required notice
- 原作者和相关贡献者署名
- 第三方项目许可说明

相关集成与贡献包括但不限于：

- ReiStandard / AMSG / Instant Push。
- xiaohongshu-skills。
- Spider_XHS / XHS Lite。
- NeteaseCloudMusicApi Enhanced。
- hot_news。
- 原 SullyOS 社区的 UI、教程、维护与调试贡献。

## License

许可证以仓库内 `LICENSE` 为准。

简要理解：

- 可以个人使用和非商业 fork。
- 不可以商业售卖源码、成品、会员或服务。
- 不要删除署名和 required notice。
- 不要把 Sully 角色、人设、台词风格或形象单独扒出来当免费角色包或商业 AI 角色素材。

如果你继续二改，请把上游 credit 留好。这个 fork 是站在原项目和社区维护上的，不是凭空长出来的。
