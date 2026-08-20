# Sully-Ombre Memory Core 统一记忆方案

本文件是本地实验草稿：把 SullyOS 记忆宫殿与外置 Memory Hub / Ombre 后端做桥接。

当前原则：
- SullyOS 本地 IndexedDB 仍是主库。
- Memory Hub 只做远端副本、审计和跨设备汇合。
- 角色记忆必须继续按 `charId` / `groupId` / `visibility` 隔离。
- 外置后端不得覆盖 SullyOS 本地记忆，也不得自动把其它角色的记忆暴露给当前角色。

这份草稿不应进入公开上游版本。
