# SullyOS Fork Maintenance Log

## 2026-08-23 Call UI, Live2D Setup, And iOS Launcher Reordering

- Rebuilt the Call app around the supplied `3028` / `5226` / `0210` UI references instead of retaining the legacy SullyOS layout. The landing list, voice call, video call, call history, connection setup, model import, rehearsal, camera, and Live2D action-library pages now share the same soft system gray-blue visual language.
- The Call landing page no longer shows the old decorative top-right avatar. Voice/video switching remains at the top; every character row exposes the appropriate call control, and video rows expose their own settings entry. Existing call records are loaded for every character and keep their detail and delete behavior.
- Video setup is kept outside the clean call stage. Its settings sheet links to opponent appearance, model quality/import/rehearsal, and the user's camera. Model import and action rehearsal use the supplied nested-sheet hierarchy while preserving the existing Live2D import, preview, action permission, camera, translation, audio, and transcript behavior.
- Replaced the remaining generic opponent/avatar and camera controls with the exact `5226` nested-card hierarchy. Opponent appearance now presents built-in Sully, custom Live2D, and static portrait as three numbered pipelines; My Camera presents off, static position, local emotion, and per-turn snapshot as four numbered privacy modes. Each card calls the existing production handler, and closing either child returns to the connection-settings overview rather than dismissing the entire setup flow.
- Added a persistent day/night toggle beside Call history using SullyOS's existing sun/moon SVG language. Night mode is a gray-blue counterpart of the new interface rather than the removed purple/black legacy skin, and applies across landing, history, setup, voice, and video pages.
- Anchored the voice/video segmented control to the physical horizontal center of the mobile Call header. The asymmetric left back button and right theme/history pair no longer pull the switch off-center; very narrow screens use a slightly narrower switch to preserve button clearance.
- Replaced fixed launcher swapping with iOS-style insertion reordering: long-press enters edit mode, dragged apps insert while neighbors shift, empty slots stay visually transparent, edge-hover changes pages, and apps can move across pages. The order persists through `launcherAppOrder`.
- Added persistent user-created launcher page boundaries through `OSTheme.launcherAppPageStarts`. Dragging onto the transparent trailing edit page creates another page and page dot; empty extra pages collapse again. The first page adapts between 8 and 12 apps by available height, the widget page remains capped at 8, and later plain-app pages can use a 4 x 4 grid above the pager/dock.
- Page buckets now remain explicit after every drag instead of being flattened and automatically back-filled. A 12-slot first page may intentionally contain only 8 apps, moving an app to another page preserves that sparse boundary, the trailing edit page can always become a new page, and only over-capacity items flow forward.
- Edit mode no longer disables page navigation globally. A swipe beginning on wallpaper or a transparent empty slot changes pages while editing; a gesture beginning on an app/widget remains reserved for dragging. This allows returning to a previous page first and then bringing another app across.
- Capped the second launcher's pinwheel grid at 720px on wide screens. The phone layout remains full width, while desktop previews no longer enlarge the square music/widget cells until their lower app group falls below the viewport; apps such as `VRWorld / 彼方` remain visible on page two.
- Retired the Appearance page's unused `Desktop Decoration DIY / Fancy Mode` editor from the visible UI. Existing saved decorations and imported decoration data are deliberately not deleted, so hiding the editor does not destroy a user's previous layout.
- Release commit: `e27a8a24` (`feat: redesign calls and add iOS launcher reordering`), pushed to `origin/codex/merge-upstream-plus-maintenance`. It was not pushed to `origin/master` in this maintenance step.
- Verification: repeated `pnpm build` runs completed successfully after the Call, launcher pagination, and Appearance changes. The temporary development-HMR `APPS_PER_PAGE is not defined` regression was removed; the final source no longer references that deleted constant.

## 2026-08-22 Instant Manual Trigger And Optional Queue

- Ordinary chat sends now only save the message; unified instant chat, legacy Instant Push, and local generation start only after the user taps the top-bar lightning button.
- AMSG Queue is no longer a capability or default deployment requirement. Without a Queue binding, the Worker starts through `waitUntil` and retains the per-minute cron fallback.
- Removed the undeclared Queue binding from the default `wrangler.toml`, preventing fresh Git deployments from failing because the Queue does not exist yet.
- Verification: 33 focused instant-chat tests passed and `pnpm build` completed successfully.

## 2026-08-20 VR Reading, Story Diagnosis, And Voice Favorite Entrypoints

- Added per-character VR reading preference UI with search, pagination, automatic full-library fallback, randomized rotation, and last-book avoidance.
- Added story-theater-only network failure diagnosis. It reports endpoint host, elapsed time and request size without logging authorization headers or story text; unrelated API requests keep their normal error behavior.
- Extended the existing voice favorites archive to Call and Date. Call bubbles and both Date reading modes can now persist or remove the synthesized audio Blob.
- Confirmed the previously merged Live2D lip-sync split still independently drives mouth-open amplitude and mouth form; no duplicate patch was added.
- Verification: 54 focused tests passed and `pnpm build` completed successfully.

## 2026-08-20 VR Safety And Portable Scheduling

- Synced the upstream VR safety behavior: three consecutive model failures pause autonomous visits, stale schedules are removed, and automatic calls have an in-memory minimum-gap guard; manual visits remain immediate.
- Added visible failure counters, diagnostic log rows, and a copyable VR troubleshooting snapshot that excludes API key contents.
- VR schedules, last-fire timestamps, and failure counters now participate in both full backup/restore and QuickSync setting upserts/deletes. Character reading preferences and all durable `vr_*` stores continue through their existing character/IndexedDB coverage.
- Verification: VR, local-settings, QuickSync, and full-backup suites passed (76 tests before the dedicated scheduling assertion), followed by a successful production build.

This file is the handoff log for the Silis-Aliya SullyOS fork. Keep it short, practical, and updated after every upstream merge or custom feature change.

## Next-Window Prompt

Copy this block into a new Codex window when continuing maintenance:

```text
You are maintaining my SullyOS fork at D:\SullyOS-fork.

Important rules:
- Preserve my custom features first: music together, XHS Lite simple mode, XHS phone channel / Pixel MCP, WebDAV QuickSync, GitHub backup proxy, mobile restore batching, device detection, memory palace vector anomaly tools, and the local Memory Hub / Ombre bridge WIP.
- Memory Hub / Ombre bridge and VPS notes are local WIP unless I explicitly approve publishing them. Do not stage, commit, push, or merge them into production by accident. If later work changes this status, remind me to update `FORK_MAINTENANCE_LOG.md`.
- When merging upstream, do not overwrite my OSContext / chat prompt / post-processing changes blindly.
- If editing prompts, show me the full prompt first and wait for confirmation.
- After changes, run pnpm build.
- Deployment default: after fetching/checking upstream and confirming there are no new upstream commits to merge, a user request to `push`, deploy, or update Vercel means push the verified current release directly to private `origin` (`Silis-Aliya/Sully-plus.git`) `master`. Do not use `Silis-Aliya/sully-change`, `vercel-target`, or `public-fork` for normal work. If upstream has advanced, conflicts exist, or verification failed, stop and report before touching private production `master`.
- Keep this file updated with what changed, risk points, and follow-up checks.

Current known baseline:
- upstream/master is merged through `1d8e42b`.
- Current fork release branch is `codex/merge-upstream-plus-maintenance`.
- Current verified private Plus release commit is `6f85b8f`, pushed to both `origin/codex/merge-upstream-plus-maintenance` and `origin/master`.
- The active private deployment target is `origin/master` for `Silis-Aliya/Sully-plus.git`; older notes may mention `Silis-Aliya/sully-change`, `vercel-target`, or `public-fork`, but those are not the normal private deployment target.
- Last verified production build passed with `pnpm build` after the 2026-07-29 upstream merge through `1d8e42b`.
- Vercel should auto-deploy from `master` after the push; verify the deployment dashboard before treating production as updated.
- Local uncommitted WIP currently includes Memory Hub / Ombre bridge files and `VPS_README.md`; keep them out of public/production pushes unless I explicitly say otherwise.
- Pre-context-split recovery tag: `backup/pre-context-split` at `e968fc3`. This tag includes the earlier fork features but predates the 2026-07-26 OS context split.
```

## 2026-07-27 Repository Map And Push Rules

This section supersedes the stale repository/baseline bullets inside the copied Next-Window Prompt above. Do not edit that prompt block without first showing the full revised prompt to the user for confirmation.

Current effective state after the 2026-08-03 upstream refresh:

- The reusable upstream merge, WIP isolation, Vercel publishing, and independent Worker deployment procedure is documented in [`FORK_UPDATE_GUIDE.md`](./FORK_UPDATE_GUIDE.md). Keep that guide procedural; keep dated commit and conflict details in this log.
- Local upstream merge commit is `155a17f4` on `codex/merge-upstream-plus-maintenance`.
- `upstream/master` is merged through `7fb5ccad`.
- `origin/master` and `origin/codex/merge-upstream-plus-maintenance` remain published at `c5b69a36`; the 2026-08-03 merge has not been pushed yet.
- Private Plus / Vercel publishing should use `origin/master` for `Silis-Aliya/Sully-plus.git`; verify the Vercel dashboard before treating production as updated.
- Local Memory Hub / Ombre bridge and VPS notes are WIP-only and must stay uncommitted unless the user explicitly approves publishing them.

## 2026-08-06 iOS Startup And AMSG Resume Stabilization

- Matched the pre-React document background and Web App manifest theme/background to Sully Plus's dark startup surface. This removes the fork-introduced white startup strip before the animated splash without changing the later home/chat safe-area layout.
- Added a page-session ReiClient initialization cache keyed by normalized AMSG Worker URL, user ID, and server token. Repeated foreground reconciliation now reuses a successful `/get-user-key` initialization instead of starting duplicate requests.
- Debounced iOS standalone push-registration reconciliation and delayed it by 900ms after startup, `pageshow`, or visibility restoration. This gives the resumed PWA network stack time to become usable and suppresses transient `Load failed` errors when the Worker itself is healthy.
- The cache clears naturally when the Worker URL, user ID, or server token changes. Test setup also resets it explicitly so connection tests remain isolated.
- This is frontend-only release commit `a5e096b4`, pushed to both `origin/codex/merge-upstream-plus-maintenance` and private `origin/master`. Vercel should deploy it automatically; the Cloudflare AMSG Worker and Instant Push Worker do not need redeployment for this change.
- Verification passed: `pnpm vitest run utils/activeMsgClient.test.ts utils/activeMsgRuntime.test.ts` (180 tests) and `pnpm build`.
- Memory Hub / Ombre bridge, Memory Palace WIP, fixtures, and `VPS_README.md` remained outside the commit and production push.

## 2026-08-06 iOS AMSG Notification Independence

- Fixed the fork contract between Active Message 2.0 / autonomous wake and Instant Push. Disabling Instant Push no longer means autonomous wake notifications should stop; the two features may share browser Web Push primitives, but their enablement and task lifecycles remain independent.
- Added an iOS-standalone scheduling guard in `utils/activeMsgClient.ts`. When the current iPhone explicitly schedules an AMSG task, it refreshes the user-level APNs subscription even if the Worker still has an older endpoint. Desktop scheduling keeps the existing phone endpoint and does not steal delivery from iOS.
- AMSG content payloads now set `notification.show = when-hidden`. A visible Sully Plus client receives the inbox/chat update without an iOS banner; background, locked, or closed PWA delivery still shows the system notification.
- This does not route ordinary foreground chat through AMSG and does not require Instant Push to be enabled. Instant Push continues to cover only the user's just-sent reply flow when its own switch is enabled.
- Frontend and Worker deployment remain separate. Commit `91e02bd1` was pushed to both `origin/codex/merge-upstream-plus-maintenance` and private `origin/master`, so Vercel can deploy the subscription fix. Production `sullyos-amsg` must also receive the regenerated `worker/amsg/worker.bundle.js` through the separate `Silis-Aliya/sullyos-workers` deployment or a manual Worker deploy; the Instant Push Worker is unchanged.
- Verification passed: `worker/amsg/src/agentic.test.ts` and `utils/activeMsgClient.test.ts` (157 tests), followed by the complete production `pnpm build` including regenerated Worker bundles.
- Memory Hub / Ombre bridge, Memory Palace WIP, and `VPS_README.md` remained unstaged and were not included in the release commit.

## 2026-08-06 Autonomous Wake Prompt Decision

- Refined the Switch / “主动唤醒” prompts so the character remains responsible for whether to schedule another wake and for choosing its time. The prompt does not impose a fixed one-to-two-hour interval and still permits the character to stop after the current contact.
- Normal chat now carries the compact `【自主联系】` block. It exposes the current rolling quota, earliest valid time, and quiet hours, then allows only the next `[[AMSG_WAKE_AT: ...]]` decision.
- A cloud-fired wake now uses the confirmed `【自主唤醒】` wording: decide the current message from the latest relationship, chat, memory, time, and wake context; afterward optionally schedule only the next wake. If none is scheduled, the character sleeps until a later normal chat can schedule again.
- Removed repeated conservative wording such as “拿不准时可以不安排”, “不要为了维持唤醒链”, and the duplicated prose rule “任意连续 60 分钟内最多 3 次”. The dynamic quota line and “额度用完时不得早于最早可用时间” remain visible to the model.
- The rolling maximum of three autonomous wakes per 60 minutes and quiet-hour rejection remain hard program-side guards. Removing the duplicated prose did not weaken those checks.
- The conditional autonomous XHS block remains intact and is still exposed only when the Worker enables it for that wake.
- Commit `088c28a0` was pushed to both `origin/codex/merge-upstream-plus-maintenance` and private `origin/master`; Vercel can deploy the foreground prompt. The regenerated `worker/amsg/worker.bundle.js` still needs to reach the production AMSG Worker before cloud-fired wakes use the new wording.
- Verification passed: `utils/amsg2TaskContext.test.ts` and `utils/amsgFireSchedule.test.ts` (47 tests), followed by the complete production `pnpm build` including Worker bundle generation.
- Memory Hub / Ombre bridge, Memory Palace WIP, and `VPS_README.md` remained unstaged and excluded.

## 2026-08-03 Code Records Forwarded To Character Chat

- Extended the existing Code long-press selection mode from delete-only to batch operations with a `转发` action and the normal character-group target picker.
- Forwarded records are stored in the target private chat as the existing `chat_forward` message type, so Chat continues to own card rendering, expansion, persistence, and model-context conversion.
- Code forwards carry `source: workbench`, a visible `Code 区记录` label, the source Code conversation title, and per-message sender names. Non-user text also retains its speaker label in the context payload so the target character can distinguish Codex, character, and system output.
- Code-only webpage, XHS, and text-file cards are converted to readable text inside the forwarding payload; images and emoji retain the standard Chat forwarding behavior.
- This change does not alter Memory Hub / Ombre bridge or VPS WIP files and has not been committed or pushed yet.

## 2026-08-03 Indexed Code Runtime Panel And Parallel Character Chat

- Moved the Codex runtime UI out of the Code message stream into an `AI 助理` entry below the computer connection state in the Code index. The entry remains the task-status source when the floating panel is closed.
- The independent no-backdrop panel survives index collapse, has an SVG close button that only hides the panel, retains progress/approval history/approval actions, and can interrupt only the current Codex turn or CLI child process. It closes automatically when the Codex result is appended.
- Split Workbench background-task locking by speaker: one Codex task and one character reply may coexist in the same Code session, while duplicate Codex tasks and duplicate character generations remain blocked.
- Removed the Codex waiting avatar/dots from the message stream. Character generation keeps its own character-avatar typing indicator, and ordinary messages, emoji, images, files, and the character response action remain available while Codex runs.
- Runtime status is not injected into the character model prompt in this change. Repository rules require the complete corresponding prompt to be shown and confirmed before that separate prompt adjustment.

## 2026-08-03 Code Task Slot Recovery

- Added a 10-second timeout to each Code job status poll and cancellation request so a suspended request cannot hold the mobile task slot forever.
- After three consecutive bridge poll failures, the phone attempts to cancel the computer job, marks the foreground task as failed, and immediately releases the Codex slot for a retry.
- A job that remains `running` for five minutes without any new bridge activity is treated as stalled and released. `waiting_approval` is exempt from the inactivity rule so a legitimate approval card remains actionable.
- Authentication failures, expired jobs, explicit bridge errors, cancellations, and invalid repeated status payloads now all leave the running state instead of silently continuing the one-hour poll loop.
- This change touches only Workbench bridge task lifecycle code and tests; Memory Hub / Ombre bridge and VPS WIP remain excluded.

## 2026-08-03 Character Reads Completed Code Output

- Character generation in Code now reloads the current Workbench thread directly from IndexedDB before building its request, rather than trusting a potentially stale React `messages` closure after a background Codex result arrives.
- Completed Codex messages are carried as an explicitly attributed external-AI context envelope using a relay-compatible user role. This avoids OpenAI-compatible relays that discard mid-thread `system` messages while still telling the character the content was written by Code, not by the user or itself.
- Existing hidden Code action receipts remain system context. Parallel generations still cannot receive messages created after their API request began; a later character generation now reliably receives the persisted Codex result.
- Memory Hub / Ombre bridge and VPS WIP remain untouched and excluded.

## 2026-08-03 Upstream Active Message 2.0 Refresh

- Fetched and merged `upstream/master` through `7fb5ccad`; local merge commit is `155a17f4` (`Merge upstream Active Message 2.0 update`).
- Main upstream additions include Active Message 2.0 multitask/background tools and MCP support, analytics, Story Theater fixes, voice autoplay controls, date-history/memory improvements, worker deployment updates, and regenerated worker bundles.
- Conflict resolution preserved Plus behavior:
  - retained together-listening numbered song selection, share/invite cards, leave receipts, live playback snapshots, and play-before-accept semantics;
  - kept music invite cards on the sender side with the sender's outer avatar, while HTML cards remain standalone modules;
  - retained XHS Lite simple mode and the local XHS phone/Pixel MCP path for foreground chat; fire-pack prompts expose only worker-reachable services;
  - retained split OS contexts, Ears/voice paths, Workbench + Story Theater backup data, portable message cleanup, GitHub/WebDAV backup UI, and device context;
  - retained the private default proxy worker `https://sullyos-main-proxy.sully-aliya.workers.dev`.
- Active Message fire-pack prompts intentionally omit stale build-time time/weather/news/schedule/music/VR-room state and local browser-only scheduling instructions; the worker fills trigger-time state instead. Normal foreground chat keeps the existing music, schedule, device, and phone behavior.
- Active Message 2.0 deployment and upgrades should follow the upstream [AMSG2 setup walkthrough](https://github.com/qegj567-cloud/SullyOS/blob/master/docs/amsg2-setup-walkthrough.md). It is the reference for the separate Cloudflare AMSG Worker deployment, D1 binding, Cron, `AMSG_MASTER_KEY`, VAPID keys, optional `AMSG_SERVER_TOKEN`, and connection verification.
- A Vercel frontend deployment does not deploy or update the AMSG Worker. After upstream Worker changes, rebuild and deploy `worker/amsg/worker.bundle.js`, then verify the connection in Settings -> Active Message 2.0 before treating the backend update as complete.
- Validation passed:
  - targeted music/parser/prompt/Active Message tests: 8 files, 124 tests;
  - follow-up layout/state-sync tests: 5 files, 43 tests;
  - full `pnpm vitest run` suite;
  - `pnpm build`, including all worker bundle generation and the production Vite build.
- Memory Hub / Ombre bridge and VPS WIP was stashed before the merge and restored afterward without conflict. It remains uncommitted and excluded from the merge. If its status or behavior changes later, update this maintenance log before publishing.
- This merge has not been pushed to private Plus / Vercel yet.

## 2026-08-02 Upstream Story Theater Refresh

- Fetched `upstream/master`; it advanced from `b24709a` to `8c640ec`.
- Merged upstream multi-character Story Theater mode and its memory-ownership follow-up into `codex/merge-upstream-plus-maintenance`.
- Local merge commit: `7088a48` (`Merge upstream Story Theater update`). This commit has parents `13cc0be` (Plus fork) and `8c640ec` (upstream).
- Resolved conflicts without dropping either feature line:
  - `apps/Chat.tsx`: retained Plus hidden/system-card filters, added `story_theater_memory` isolation, and retained the upstream exhausted-history count clamp.
  - `context/OSContext.tsx`: retained both Workbench and Story Theater stores in low-memory backup routing; Story Theater masks remain image-processed because masks can contain avatars.
  - `utils/db.ts`: retained Workbench/Code and Story Theater types, stores, backup export, and restore paths; kept sanitized portable chat messages; advanced the merged IndexedDB schema to v72.
- Verification passed:
  - `pnpm vitest run utils/storyTheater.test.ts utils/storyTheaterVectorMemory.test.ts utils/db.storyTheater.test.ts utils/chatGenEvents.test.ts utils/safeApi.apiCallLog.test.ts utils/safeApi.stream.test.ts` (6 files, 53 tests)
  - `pnpm build`
- This merge has not been pushed to private Plus / Vercel yet.
- Memory Hub / Ombre bridge and VPS WIP was stashed before merge and restored afterward; it remains uncommitted and excluded.

## 2026-08-01 Upstream Hot-News Refresh and Chat/API Maintenance

- Fetched `upstream/master`; it advanced to `b24709a`.
- Merged upstream hot-news API migration into `codex/merge-upstream-plus-maintenance`.
- Merge commit: `13cc0be` (`Merge remote-tracking branch 'upstream/master' into codex/merge-upstream-plus-maintenance`).
- Upstream highlights:
  - `59c66f5` / PR #471 migrates the hot-news API path.
- Fork maintenance included before the merge:
  - `d1a5f7d` keeps the normal chat reply three-dot typing bubble visible when the user manually triggers a reply, leaves the chat screen, and re-enters while generation is still running.
  - `aaab4a0` suppresses transient retryable API URL error popups for intermediate `429`, `500`, `502`, `503`, and `504` attempts when `safeFetchJson` still has retries left; final failures still surface.
- Verification passed:
  - `pnpm vitest run utils/chatGenEvents.test.ts`
  - `pnpm vitest run utils/safeApi.apiCallLog.test.ts utils/safeApi.stream.test.ts`
  - `pnpm vitest run utils/realtimeContext.hotNews.test.ts`
  - `pnpm build`
- Pushed the verified release to:
  - `origin/codex/merge-upstream-plus-maintenance`
  - `origin/master` for Vercel/private Plus deployment.
- Memory Hub / Ombre bridge and VPS WIP remains excluded. Do not stage:
  - `apps/MemoryPalaceApp.tsx`
  - `utils/memoryPalace/db.ts`
  - `utils/memoryPalace/export.ts`
  - `utils/memoryPalace/index.ts`
  - `utils/memoryPalace/ombreBridge.ts`
  - `docs/ombre-memory-palace-integration.md`
  - `VPS_README.md`

## 2026-07-31 Music Together, VR Music Room, and API Error Noise

- Updated together-listening prompt and parser semantics:
  - characters now use `[[MUSIC_TOGETHER_REQUEST:N]]` to choose the Nth shareable song and create one together-listening invite card with song name, artist, cover, and accept/reject controls.
  - `[[MUSIC_SHARE:N]]` remains the plain music-share card path.
  - the new prompt no longer teaches unnumbered `[[MUSIC_TOGETHER_REQUEST]]`; parser keeps it only as old-output compatibility.
  - numbered together requests no longer fall back to the current player or an unrelated card when N is out of range.
- Hardened character-initiated together invite acceptance:
  - accepting first plays the invited song and joins together-listening only after playback hooks succeed,
  - the invite card is marked accepted only after the successful playback/join path,
  - accepting a character invite no longer forces shuffle mode, so a one-song invite stays focused on that selected song.
- Fixed noisy API URL errors for retryable chat calls:
  - intermediate retry attempts for `429`, `500`, `502`, `503`, and `504` are no longer logged as global URL errors while `safeFetchJson` still has retries left,
  - final failures still surface normally.
- Fixed VRWorld listening-room song mismatch:
  - when the model writes a natural activity like `点了《Kamasutra》` but misses the strict `<点歌 序号="N"/>` tag, VR music parsing now falls back to matching the mentioned title against the character's pickable songs,
  - if the mentioned title cannot be matched, the room no longer auto-randomizes a different song and produces a misleading now-playing card.
- Verification passed:
  - `pnpm vitest run utils/chatParser.musicTogetherRequest.test.ts utils/chatParser.musicShareNumbering.test.ts utils/chatParser.musicActionOutcome.test.ts`
  - `pnpm vitest run utils/vrWorld/vrWorld.test.ts`
  - `pnpm build`
- Known unrelated test note:
  - `utils/messageItemModuleLayout.test.ts` still has pre-existing layout assertions around outer avatar markup (`alt="avatar"`). The failure is not from the together-listening accept/playback logic.
- Memory Hub / Ombre bridge and VPS WIP remains excluded from this maintenance commit. Do not stage:
  - `apps/MemoryPalaceApp.tsx`
  - `utils/memoryPalace/db.ts`
  - `utils/memoryPalace/export.ts`
  - `utils/memoryPalace/index.ts`
  - `utils/memoryPalace/ombreBridge.ts`
  - `docs/ombre-memory-palace-integration.md`
  - `VPS_README.md`

## 2026-07-30 Upstream Refresh to 2835b63

- Fetched `upstream/master`; it advanced from `1d8e42b` to `2835b63`.
- Merged upstream schedule-context/private-chat alignment and large backup export stabilization into `codex/merge-upstream-plus-maintenance`.
- Merge commit: `5902531` (`Merge remote-tracking branch 'upstream/master' into codex/merge-upstream-plus-maintenance`).
- Upstream highlights:
  - `b90557b` / PR #462 aligns schedule context with private chat and extracts prompt message cleanup helpers.
  - `262ee5d` / PR #466 adds low-memory backup export paths, including streaming store reads, prewritten v2 backup shards, and chunked memory-vector backup encoding.
- Resolved conflict in:
  - `utils/chatRequestPayload.ts`
- Kept Plus fork behavior while resolving:
  - preserved `shouldInjectMusicMigrationEnded`,
  - preserved Code-surface gating for HTML/thinking/MCP/McD/Luckin blocks,
  - preserved Plus music snapshot / track-change request payload behavior,
  - adopted upstream `promptMessageCleanup` extraction.
- Verification passed:
  - `pnpm build`
- Pushed as `fd58d84` to `origin/codex/merge-upstream-plus-maintenance` and `origin/master`.
- Local Memory Hub / Ombre bridge and VPS WIP remains excluded from the merge commit and must be restored only as worktree WIP unless the user explicitly approves publishing it.

## 2026-07-29 Upstream Refresh to 1d8e42b And Plus Master Push

- Fetched `upstream/master`; it advanced from `fc226b7` to `1d8e42b`.
- Merged upstream backup/chat feedback fixes, memory-palace high-water-mark recovery, API call log reliability fixes, group relative-time context, phone evidence normalization, and PR labeler test-file exclusion into `codex/merge-upstream-plus-maintenance`.
- Merge commit: `6f85b8f` (`Merge remote-tracking branch 'upstream/master' into codex/merge-upstream-plus-maintenance`).
- Resolved conflicts in:
  - `utils/chatPrompts.ts`
  - `utils/memoryPalace/pipeline.ts`
- Kept Plus fork behavior while resolving:
  - private group-context wording stayed on the Plus wording, but now includes upstream relative age text (`about N days ago` style) so characters do not treat old group chat as current speech.
  - memory-palace pipeline keeps the Plus `hidden` / `noMemory` message filter while using upstream's reliable high-water-mark storage.
- Verification passed:
  - `pnpm build`
- Pushed the verified clean release to:
  - `origin/codex/merge-upstream-plus-maintenance`
  - `origin/master` for Vercel/private Plus deployment.
- The local Memory Hub / Ombre bridge work remains intentionally uncommitted and was not included in the pushed release:
  - `apps/MemoryPalaceApp.tsx`
  - `utils/memoryPalace/db.ts`
  - `utils/memoryPalace/export.ts`
  - `utils/memoryPalace/index.ts`
  - `utils/memoryPalace/ombreBridge.ts`
  - `docs/ombre-memory-palace-integration.md`
  - `VPS_README.md`
- After the push, the local Memory Hub settings panel had its test-read button restored as a worktree-only change; do not stage it into the public/production release unless the user explicitly asks.

## 2026-07-29 Upstream Refresh to fc226b7 And Public Repo Rule

- Fetched `upstream/master`; it advanced from `9753431` to `fc226b7`.
- Merged upstream transfer-format hardening, chat avatar-above-group layout, Check Phone/PersonaSim life-log management, and instant-push classifier updates into `codex/merge-upstream-plus-maintenance`.
- Merge commit: `0614261` (`Merge remote-tracking branch 'upstream/master' into codex/merge-upstream-plus-maintenance`).
- Resolved conflicts in:
  - `components/chat/MessageItem.tsx`
  - `public/instant-worker.deno.bundle.js`
  - `utils/chatParser.ts`
  - `utils/chatPrompts.ts`
  - `utils/sanitize.ts`
  - `worker/instant-push/worker.bundle.js`
  - `worker/instant-push/worker.deno.bundle.js`
- Kept Plus fork behavior while resolving:
  - music share / together-listening module-card ownership and avatar rules,
  - fork music action helpers in `chatParser`,
  - new upstream `transferFormat` parser as the single transfer command source,
  - new sanitize rules for `[[记录:...]]` plus existing music wake/share/together tags.
- Verification passed:
  - `pnpm vitest run utils/transferFormat.test.ts utils/chatParser.transfer.test.ts utils/sanitize.test.ts utils/chatFineTuneCss.test.ts worker/instant-push/src/classifier.test.ts`
  - `pnpm build`
- The memory/VPS work-in-progress was intentionally not committed:
  - `apps/MemoryPalaceApp.tsx`
  - `utils/memoryPalace/db.ts`
  - `utils/memoryPalace/export.ts`
  - `utils/memoryPalace/index.ts`
  - `utils/memoryPalace/ombreBridge.ts`
  - `docs/ombre-memory-palace-integration.md`
  - `VPS_README.md`
- Pushed the private maintenance branch to `origin/codex/merge-upstream-plus-maintenance`.

### Public/Vercel Repository Update

- The old dedicated `vercel-target` remote is gone from local git and must not be used.
- User reports the old Vercel/`sully-change` setup was deleted/retired, but GitHub still returns a repository-moved redirect from `public-fork` pushes to `https://github.com/Silis-Aliya/sully-change.git`; treat `public-fork` as the local public remote name and verify the actual GitHub/Vercel dashboard before assuming the deployed source.
- The intended public workflow path is `public-fork` = `https://github.com/Silis-Aliya/SullyOS.git`.
- If Vercel is connected to the public repo, update it by pushing a public-safe snapshot to `public-fork master`.
- Never push the private Plus line directly to `public-fork`: private history contains private Worker defaults. Public updates must be prepared from `public-fork/master` and must keep `utils/proxyWorker.ts` defaulting to `https://sullymeow.ccwu.cc`.

## 2026-07-28 Upstream Refresh to 9753431

- Fetched `upstream/master`; it advanced from `835a4d7` to `9753431`.
- Merged upstream memory import/recall repair and synchronized schedule-card theming into `codex/merge-upstream-plus-maintenance`.
- Prompt-bearing additions were reviewed with the user before merge:
  - schedule-card AI CSS helper prompt,
  - external-memory no-loss migration prompt,
  - recall-repair guide diagnosis prompt.
- Resolved conflicts in:
  - `apps/Chat.tsx`
  - `components/chat/ChatInputArea.tsx`
- Kept Plus fork behavior while resolving:
  - narrow OS context hooks in Chat instead of reverting to aggregate `useOS()`,
  - Ears Lite voice input and cloud review flow,
  - shared XHS link resolver and Code/XHS title preservation path,
  - hidden `code_card` / music invite result visibility rules,
  - remote vector config handoff for memory repair re-embedding.
- Integrated upstream features:
  - external raw-memory import with 50k-character local limit, no-loss LLM cleaning, vectorization, linking, and same-batch traditional memory writeback,
  - per-round recall repair portal from the chat action panel, including editable recalled nodes/EventBox expansion and same-`memoryId` re-embedding,
  - unified schedule-card appearance presets/custom scoped CSS for desktop, room, and chat schedule cards.
- Preserved fork maintenance requirements:
  - Memory Palace vector anomaly/debug tools remain; upstream recall repair is the daily correction path, not a replacement for vector health checks.
  - QuickSync/local settings coverage for `memory_vectors`, `memoryId` manifests, and portable config remains tested.
  - Code/Workbench isolation and backup behavior were not changed by this merge.
- Verification passed:
  - `pnpm build`
  - `pnpm vitest run utils/memoryPalace/externalMemory.test.ts utils/memoryPalace/memoryRepair.test.ts utils/memoryPalace/memoryEdit.test.ts utils/memoryPalace/memoryDate.test.ts utils/scheduleAppearance.test.ts utils/quickSync.test.ts utils/localSettingsBackup.test.ts`

### Maintenance Direction Update

- `Sully-plus` is now the main active maintenance line.
- The public fork is a frozen/current-version snapshot. Do not continue normal feature work there.
- Future private features, voice work, upstream merge resolution, and Vercel/private deployment preparation should happen on `origin` (`Silis-Aliya/Sully-plus.git`) first.
- Only touch `public-fork` for explicit snapshot/readme/security updates, and keep private Worker addresses out of that repository.
- Local git is configured so normal pushes prefer Plus:
  - `remote.pushDefault = origin`
  - `branch.codex/plus-maintenance-doc.pushRemote = origin`
- Use commit author `Silis-Aliya <3269831591@qq.com>` for Plus commits. Vercel Hobby + private repo blocks deployments when the commit author is mapped to an account without contributing access, as happened with the old `lanber1027 <lanber1027@outlook.com>` author.

### Remotes And Ownership

- `upstream` = `https://github.com/qegj567-cloud/SullyOS.git`
  - Original SullyOS project. Read/fetch only for this fork workflow.
  - Merge from `upstream/master` into the private working line only after checking conflicts and preserving fork behavior.
- `origin` = `https://github.com/Silis-Aliya/Sully-plus.git`
  - Private owner repo for active SullyOS-plus development.
  - Contains the voice/Ears Lite work and the owner's private default Worker address unless intentionally changed.
  - Use this as the normal development target for private features and Vercel/private deployment work.
- `public-fork` = `https://github.com/Silis-Aliya/SullyOS.git`
  - Public fork and the only public GitHub repository path after the old `sully-change` repository was deleted.
  - Public code must not expose the owner's private Worker URL.
  - Public default proxy worker must remain `https://sullymeow.ccwu.cc` or another explicit public/placeholder address.
- `vercel-target` / `Silis-Aliya/sully-change`
  - Deleted/retired local deployment target. Do not add or push a `vercel-target` remote; no normal workflow should depend on it.
  - GitHub may still report a moved-repository redirect from `public-fork` to `sully-change`; verify the dashboard before treating that as an active Vercel source.
  - If Vercel is attached to public code, use `public-fork` with a public-safe snapshot.
  - If Vercel is attached to private Plus, use `origin/master` only after explicit production approval.

### Baseline Heads Before This Maintenance Note

- Private Plus voice-feature baseline: `origin/master` at `aea2ed3` (`fix: simplify abnormal voice history wording`).
- Public fork baseline after hiding the private Worker default: `public-fork/master` at `ecd2dd8` (`chore: restore public default proxy worker`).
- The public fork is intentionally one commit ahead of Plus only to remove the owner's private Worker default.
- Local branch `codex/merge-upstream-20260721` may point at the public-only commit after a public push. Before continuing private Plus work, reset/switch back to `origin/master` or make a private branch from `origin/master` so the public Worker-default commit is not accidentally pushed to Plus.

### Worker Address Rule

- Private Plus may use the owner's private Cloudflare Worker configured locally or in the private repo.
- Public fork must not contain the owner's private Worker host.
- Before any public push, run:
  - `rg -n "workers\\.dev|DEFAULT_PROXY_WORKER" utils worker docs FORK_MAINTENANCE_LOG.md`
  - Inspect the matches manually and confirm only public placeholders, original public defaults, or generic examples remain.
- The key file is `utils/proxyWorker.ts`, especially `DEFAULT_PROXY_WORKER`.

### Normal Future Flow

- Private feature/change:
  - Start from `origin/master`.
  - Implement, run focused tests plus `pnpm build`.
  - Push with `git push origin HEAD:master`.
- Public fork update:
  - Start from `public-fork/master`; do not push the private Plus history directly to public.
  - Port only the desired public-safe changes.
  - Ensure `utils/proxyWorker.ts` uses the public default Worker.
  - Search for private Worker URL leaks.
  - Run `pnpm build`.
  - Push with `git push public-fork HEAD:master`.
- Vercel production update:
  - First identify whether Vercel is attached to private `Sully-plus` or public `SullyOS`.
  - Private source: use `git push origin HEAD:master` only after explicit production approval.
  - Public source: use the public fork update flow above.
  - Do not push `vercel-target`/`sully-change`; that repo is deleted/deprecated.
  - Verify deployment separately before calling it live.

### Upstream Merge Check On 2026-07-27

- Refreshed remotes with `git fetch --all --prune`.
- `upstream/master` advanced from `7602a5b` to `3e5bd60`.
- New upstream topics include character timezone fixes, schedule card clock, Check Phone record detail view, custom CSS secret-scan false-positive fix, and XHS free comments defaults/recovery.
- A direct merge from `upstream/master` into `origin/master` is not clean. `git merge-tree` reports changed-in-both conflicts in:
  - `apps/Chat.tsx`
  - `apps/Launcher.tsx`
  - `apps/music/CharVisitPage.tsx`
  - `apps/Settings.tsx`
  - `components/os/TamagotchiHome.tsx`
  - `context/OSContext.tsx`
  - `types.ts`
  - `utils/applyAssistantPostProcessing.ts`
  - `utils/chatParser.ts`
  - `utils/chatPrompts.ts`
  - `utils/context.ts`
  - `utils/datePrompts.ts`
  - `utils/db.ts`
  - `utils/realtimeContext.ts`
  - `worker/index.js`
- Conclusion: upstream can likely be merged into Sully-plus, but it needs a deliberate conflict-resolution pass. Do not auto-merge into `origin/master` or production.
- Preserve the fork's voice/Ears Lite pipeline while resolving `apps/Chat.tsx`, `utils/chatPrompts.ts`, `utils/context.ts`, `types.ts`, `apps/Settings.tsx`, `apps/UserApp.tsx`, `utils/voiceCloud.ts`, and `worker/index.js`.
- After resolving, run at minimum `pnpm build`; if time permits also run focused tests for `proxyWorker`, schedule/timezone, Chat prompt serialization, and Worker voice routes.

### Verified Plus/Vercel Release On 2026-07-27

- Current release branch: `codex/merge-upstream-plus-maintenance`.
- Merged `upstream/master` through `835a4d7` and preserved Plus fork behavior.
- Included Ears Lite ASR language selection, flattened Settings voice-recognition section, Now Playing render isolation, and XHS `note_card.title` normalization so shared Rednote/XHS cards keep titles in character and push context.
- Prompt change reviewed with the user before landing: XHS detail follow-up now has a `commentsUnavailable` branch that tells the character not to invent comments when only body/counters loaded.
- Verification passed:
  - `pnpm build`
  - `pnpm vitest run utils/earsLite.test.ts utils/musicProgressVisibility.test.ts utils/musicSettingsNavigation.test.ts utils/musicRuntimeBackup.test.ts utils/applyAssistantPostProcessing.test.ts utils/datePromptsTimezone.test.ts utils/scheduleTimezone.e2e.test.ts utils/wallClockToTimestamp.test.ts utils/realtimeContext.specialDates.test.ts utils/scheduleTime.test.ts utils/timezone.test.ts`
  - `pnpm vitest run utils/xhsMcpClient.test.ts utils/xhsShareLink.test.ts`
- Historical note: this release originally referenced `vercel-target/master`. Current private workflow supersedes it: normal Vercel publishing should push the verified Plus commit to `origin/master`, not `vercel-target`, unless the user explicitly says otherwise.

## 2026-07-26 Verified Production Release And Recovery Point

- Historical record: release `4949d6b` was published at that time to both `origin/codex/merge-upstream-20260721` and `Silis-Aliya/sully-change` `master`.
- Historical record: the old production URL `https://sully-change.vercel.app` returned HTTP 200 after that `master` push.
- Historical record: annotated recovery tag `backup/pre-context-split` was added at `e968fc3` and pushed to `Silis-Aliya/sully-change`.
- The recovery tag is not the pure upstream version. It preserves the fork features present at that point, including the together-listening work, while providing a known state before the OS context performance split.
- Historical old Vercel flow: this note originally published through `vercel-target`. Current workflow supersedes it; do not use `vercel-target`/`sully-change`. Publish verified Plus releases with `git push origin HEAD:master`.
- If a domain-context regression is suspected, first switch only the affected component back to the retained aggregate `useOS()` compatibility hook. Do not roll back unrelated fork features or user data.

### Features Included In `4949d6b`

- Together-listening requests use the live playback snapshot at generation time, including the current track and available lyric window.
- Character-triggered next-track and song-pick actions remember attribution only while that selected track remains current, preventing later replies from blaming the user for the character's own selection.
- Full import and QuickSync end the device-local together-listening session after successful migration, clear related wake schedules and transient attribution, and inject one hidden migration-ended state for affected characters.
- Portable music settings keep durable queue/current-track/play-mode data while excluding the live together session and together-wake schedule.
- PersonaSim parsing moved into tested utilities and now repairs common trailing-comma/control-character JSON failures while normalizing missing nested arrays before rendering archived or newly generated scripts.
- The UI clock moved from the aggregate OS context to a minute-aligned `ClockContext`.
- Music progress React updates run only while visible progress UI consumers exist; prompt/snapshot readers still read the live audio position and derive the current lyric directly.
- OS state was split into navigation, character data, alerts, message activity, system logs, backup, appearance, and system configuration domains. The aggregate `useOS()` remains available for compatibility and rollback diagnosis.
- The active App outlet is isolated in `AppViewport`; Toast/error state is isolated in `GlobalAlerts`, so ordinary Toast and unread updates no longer force the active App subtree through the phone-shell render path.
- Chat, Launcher, Settings, StatusBar, desktop variants, player overlays, and other high-frequency surfaces now use the narrower domain hooks.

### Known Risks And Upstream Merge Rules

- Upstream still uses one aggregate `OSContext`, updates its UI clock every second, and updates music progress on every audio `timeupdate`. Preserve the fork's clock/music/domain isolation when resolving upstream conflicts.
- Upstream keeps the global `ErrorDialog` outside `sully-shell-content`. In `4949d6b`, `ErrorDialog` moved inside `GlobalAlerts`, which is rendered under an `overflow-hidden` shell. This is a fork-only UI risk on iOS/PWA safe-area layouts and should be corrected by moving only `ErrorDialog` back outside while leaving Toast isolation intact.
- `AppViewport` currently reads `activeCharacterId` through the broad `CharacterDataContext`; worldbook/song/novel/user-profile changes can still rerender the outlet, although they do not remount it while `activeApp` is unchanged.
- The legacy aggregate `NotificationContext` and `useOS()` remain intentionally. Do not remove them until remaining consumers are migrated and real render-behavior tests exist.
- When upstream adds an OS field, land the business behavior in the aggregate context first, then expose it through a narrow domain only when the ownership and update frequency are clear.
- Verification for this release: 147 test files / 1284 tests passed, production build passed, and `git diff --check` passed.

## 2026-07-26 Clock Context Performance Split

- Moved the UI clock out of the large `OSContext` into `ClockContext`, so clock ticks no longer broadcast updates to every `useOS()` consumer.
- Clock updates align to minute boundaries because the UI displays no seconds. Returning to a visible or focused page immediately resynchronizes the clock before scheduling the next minute.
- Updated all clock consumers to use `useClock`; scheduled-message scanning, music playback, together-listening, and prompt timestamps are unchanged.
- Music progress now updates React only while the page is visible and at least one progress UI is mounted. Audio playback continues independently; opening a progress UI or returning to the foreground immediately reads the real audio position.
- Non-React music snapshots read `audio.currentTime` and derive the active lyric at request time, so chat and together-listening wakes still receive live progress while UI rendering is paused.
- The Music App together-duration display also stops ticking while hidden and catches up immediately when visible.
- Split the remaining high-impact OS state into stable `Navigation`, `CharacterData`, `Notification`, `Backup`, `Appearance`, and `SystemConfig` contexts. Stable action tables prevent unrelated provider values from changing when `OSProvider` renders.
- The always-mounted phone shell, launcher and desktop variants, status bar, player overlays, Chat, and Settings now subscribe only to their required domains. The aggregate `useOS` hook remains as a compatibility path for lower-frequency screens.
- Architecture tests prevent those high-impact surfaces from falling back to the aggregate context during future upstream merges.
- Verification: 147 test files / 1284 tests passed; production build passed.

## 2026-07-26 Together-Listening Migration Boundary

- Full backup and QuickSync keep durable music state (queue, selected song, play mode) but no longer migrate the live together-listening session or wake schedules.
- Export strips `togetherSession`; import also strips it from legacy backups. Wake schedules are excluded from portable local settings.
- After a successful full import or QuickSync pull, the target device exits its current together session, clears transient track attribution, and cancels all together-listening wakes.
- The roles who were listening on the target device receive one non-visible, session-only system state on their next generation: the previous together session ended because of data migration. It is not saved as a chat message and clears after the next assistant reply.
- Chat history, music shares, invitations, action receipts, character playlists, and generated music remain portable.
- Verification: 145 test files / 1278 tests passed; production build passed.

## Merge Attention: Fork Decisions and Card Placement

- Confirmed fork decisions override conflicting upstream behavior. Do not restore an upstream rule merely because an old upstream test, comment, or implementation still expects it.
- Current protected chat rule: music shares and together-listening invitations are chat-owned messages, not centered modules. They stay on the actual sender/inviter side; character-side cards keep the outer character avatar; together-listening cards also keep their internal participant avatars.
- Code/Workbench has its own layout and may use centered tool/progress cards. Do not generalize Code card layout back into normal chat.
- For any new feature or new card type, or any change that would affect card alignment, sender ownership, outer avatars, internal avatars, or message/card ordering, stop before implementation and explicitly alert the user that the change may revisit the earlier card-layout plan.
- Present concrete choices instead of choosing silently:
  - **A. Chat-owned message:** follows the real sender left/right and uses that sender's normal outer avatar.
  - **B. Centered module:** centered independently and has no normal message-side ownership/avatar.
  - **C. Card-specific rule:** describe the exact sender, alignment, avatar, and ordering behavior for this card.
- State the current fork behavior and the upstream behavior beside those options, recommend one, and wait for the user's choice before changing runtime layout.
- If an upstream merge touches `components/chat/MessageItem.tsx`, `utils/messageItemModuleLayout.test.ts`, chat card metadata, or module-alignment settings, re-audit this decision explicitly and report any conflict before resolving it.

## Optional Future Idea: XHS Image Understanding

- This is a non-binding design note, not a current defect, required task, merge requirement, or standing recommendation.
- Current XHS behavior may remain text-first: characters and Code assistants read the title, body, author, comments, link, and available card metadata. The card cover is visual UI media and is not currently sent to models as multimodal input.
- A possible future implementation, only if the user explicitly asks to let models inspect XHS post images, is: use the authenticated Lite service to fetch a limited number of images, compress/cache or expose them through short-lived signed URLs, and attach them as `image_url` parts for vision-capable models while retaining a text-only fallback.
- Such an implementation would need an explicit product decision about first image vs. up to three images vs. user-triggered viewing, plus review of account-risk, request volume, privacy, payload size, model compatibility, and cost.
- Do not implement this idea merely because it appears in this log. Do not repeatedly ask whether the user wants it during ordinary audits, upstream merges, or unrelated XHS work. Revisit it only when the user explicitly requests XHS image understanding or asks to review this future idea.

## 2026-07-24 Workbench Bridge Token Hardening

- The Workbench CLI bridge now refuses to start on non-loopback hosts such as `0.0.0.0` unless `--token` or `WORKBENCH_BRIDGE_TOKEN` is set.
- The bridge also reads `%USERPROFILE%\.sullyos-workbench-bridge-token` and repo-local `.workbench-bridge-token`, so existing autostart tasks can recover after the token file is placed.
- Local unauthenticated debugging remains possible only with loopback hosts (`localhost`, `127.0.0.1`, or `::1`).
- `scripts/start-workbench-bridge.bat` now loads the token from `WORKBENCH_BRIDGE_TOKEN`, `%USERPROFILE%\.sullyos-workbench-bridge-token`, or `.workbench-bridge-token` before prompting interactively.
- `scripts/autostart-workbench-bridge.cmd` now loads the same token sources and fails fast instead of waiting for manual input at login.
- `scripts/install-workbench-bridge-startup.ps1` now rejects non-local scheduled-task installs without `-Token`.
- Cloudflare named tunnel remains the intended remote path; random temporary public tunnel access should not be used for Code bridge exposure.
- Code no longer probes the Cloudflare `/health` route on mount or every 10 seconds. Connection checks happen only through the explicit test command or lazily before a real AI-assistant request.
- A lazy check failure, including `401`, `403`, or `Unauthorized`, only changes the capability label to `电脑未连接`, switches to Inspiration when needed, and silently uses the fallback API when configured. It must not create a `SYSTEM ERROR` message or repeated error toast.
- A successful lazy check marks the computer connected and continues the requested assistant turn. A later real bridge disconnect returns to the same silent offline path.

## 2026-07-24 Portable Data Audit And Upstream Refresh

- Audited persisted user/character records, character groups, action receipts, options, chat/Code cards, and referenced images against full export/import and QuickSync.
- Character action receipts are ordinary persisted `messages`; hiding system logs changes rendering only and does not remove them from history, character context, backup, or incremental sync.
- QuickSync already propagated row and local-setting additions, edits, and deletions. It now also writes and applies explicit `blob_assets` deletion lists, so replacing or removing the last synced image reference does not leave the receiving device with an orphaned avatar, wallpaper, or card image.
- Fixed QuickSync metadata serialization order so local-setting changes are included in the delta's published counts and progress total.
- Added persistent Post Office identity/base URL, Signal authorship/reuse records, and mobile-game skin settings to incremental settings coverage. Post Office admin credentials and one-turn Signal whispers remain intentionally device-local.
- Merged `upstream/master` through a5e8230. Kept the fork's shared Chat/Code XHS resolver, card placement rules, music-session context, and Code surface behavior while adopting upstream OpenRouter heartbeat parsing, Gemini MCP tool compatibility, character-scoped emoji filtering, Memory Palace fixes, and normalized XHS Lite comments/interactions.
- Updated the shared XHS resolver to use upstream's safe nested comment normalizer instead of maintaining a second raw-comment parser.
- Hardened `safeResponseJson` for Response-compatible proxy/test objects that omit `headers`; normal browser responses remain unchanged.
- Verification: 127 test files / 1212 tests passed; production build passed.

## 2026-07-24 Code XHS Share Parity

- Code XHS cards now use the same persisted-detail principle as normal chat for all three senders: user, selected character, and AI assistant.
- Before saving a newly generated XHS card whose body is empty, Code uses the existing XHS Lite/MCP configuration to resolve its `sourceUrl` or generated `noteId + xsecToken` URL once. The enriched title, author, body, comments, interaction metadata, locator, and token are saved inside `workbench_messages.metadata.xhsNote`.
- Later character and AI turns read the persisted card metadata through the existing Workbench context serializers. They do not refetch the post merely to remember a card already saved with details.
- Tapping a Code XHS card now opens its persisted `sourceUrl`, or reconstructs the ordinary XHS explore URL from `noteId + xsecToken`. Multi-select mode still selects the message instead of navigating.
- Existing historical cards that were already saved without a body are not bulk-refetched on Code startup. This avoids an unexpected burst of XHS Lite requests; resharing creates a fully enriched card.
- Focused XHS/Workbench tests: 10 passed; production build passed.

## 2026-07-24 Music Sharing, Together Listening, Code/XHS, and Backup Audit

### Upstream and Deployment

- Rechecked `upstream/master`; no newer upstream commit was present beyond 3255ee7, so no merge was performed.
- Continued development on `codex/merge-upstream-20260721`.
- Historical old Vercel flow: this entry updated `Silis-Aliya/sully-change` on `master`. That repo is no longer the normal deployment target; use private `Silis-Aliya/Sully-plus` instead.
- Current documented release head: ef24df1 (`show together listening exits on the actor side`).

### Music Sharing

- Added a Share action to music Now Playing. It sends the current track to a selected character's normal chat as the existing `music_card` with share intent.
- Added character-initiated sharing through `[[MUSIC_SHARE:N]]`, restricted to the supplied shareable-song list.
- Split normal-chat music tools into three states: a short always-available daily share guide, full collect/react/invite guidance only when the user shared a music card in the current turn, and the existing player controls while already listening together.
- Daily character sharing uses `[[MUSIC_SHARE:N]]`; `[[MUSIC_TOGETHER_REQUEST]]` may accompany that same-turn share but must not be sent alone without a song.
- Music cards carry and render title, artist, album, cover, and playable track data. Prompt context expands this metadata instead of exposing only `[音乐分享]`.
- User-sent and character-sent music cards preserve the actual sender side.
- Characters can collect shared or currently playing tracks through `MUSIC_ACTION:add`, `add|歌单标题`, or `add_new|新歌单标题|描述`; results persist in `character.musicProfile.playlists`.
- Characters do not receive or analyse raw audio. They receive current song metadata and available music context; no per-message lyric/comment lookup or extra listening-analysis model call was added.

### Together-Listening Lifecycle

- Added character-created invitations through `[[MUSIC_TOGETHER_REQUEST]]` and reused the established accept/reject invitation UI.
- Invitation cards are owned by the inviter. Avatar order is inviter first and invitee second, and result copy identifies the participant who actually accepted.
- The Now Playing together indicator displays both participants and preserves inviter-first ordering.
- Changing tracks does not silently end an active together-listening session.
- Active or pending sessions block duplicate invitations from either side, including repeated model directives.
- Accepting a character-created invitation keeps the user's existing queue, starts with the shared song, and switches the queue to shuffle; later manual mode changes remain authoritative.
- User and character exits reuse the established exit-event design while preserving actor ownership: user exits render on the user/right side and character exits on the assistant/left side.
- The user's Now Playing exit control opens a centered two-option confirmation dialog.
- Together-listening restores as a short-lived live-session snapshot for at most 12 hours. It carries participants, current song metadata, queue, and play mode through refresh, full backup, and QuickSync; playback position and playing/paused state remain transient.

### Code / Workbench

- Extended Workbench rendering so ordinary-chat Xiaohongshu share payloads and links use the same normalized card path in Code for both user and character messages.
- Workbench image messages now remain multimodal for character requests instead of being flattened to `[图片]`.
- Bridge requests carry recent Code image data; the computer bridge writes up to three images to request-scoped temporary files and passes them to Codex CLI through `--image`, then removes the files.
- Increased the authenticated bridge request-body default to 4 MB for compressed Code images; each decoded CLI image is capped at 2 MB.
- Chat and Workbench now call the same `resolveXhsShareLink` pipeline for short-link expansion, note ID/token extraction, MCP/Lite detail loading, comments, and card metadata.
- A short-link expansion failure is reported as a real read failure and does not create a fake empty card; a resolved link may still retain basic metadata when the configured detail service fails.
- Existing already-saved malformed text bubbles are not destructively rewritten; newly parsed or rendered records use the corrected path.
- Added a temporary progress-card author correction control for historically misattributed records. Corrections propagate to related Workbench summary and chat/code-card records so export and incremental sync retain the selected author.
- Remove the temporary author selector only after the user confirms all historical progress cards have been corrected.

### Backup, Import/Export, and QuickSync

- Character records include `musicProfile.playlists`, so character music collections are covered by full export/import and character-row QuickSync.
- Chat messages include music shares, invitations, invitation results, and exit events.
- Added the `songs` and `vr_music` stores and generated-audio prefixes including `acestep_` and `mmmusic_` to the global backup/sync inventory.
- Workbench/Code settings, conversations, summaries, tasks, cards, and metadata are included. Real project file bodies outside the app database remain excluded.
- Worldbook records and mounted worldbook snapshots are included, so edits to world settings are preserved.
- QuickSync remains whole-record last-write-wins; simultaneous edits to the same row on two devices can overwrite one another.
- Ephemeral UI/runtime state, including the current together-listening session, is intentionally excluded.

### Verification

- The full-suite baseline passed at 109 files / 1163 tests before the final narrow UI ownership fixes.
- Focused music-card, prompt-context, together-invitation, duplicate-session, Code/XHS parsing, and backup tests passed after their respective changes.
- Repeated production builds passed through the documented release head.

## 2026-07-23 Upstream Refresh to 3255ee7

### Result

- Fetched upstream and found `upstream/master` advanced from `ece65a3` to `3255ee7`.
- Merged latest upstream into `codex/merge-upstream-20260721`.
- Resolved conflicts in:
  - `apps/Chat.tsx`
  - `apps/MemoryPalaceApp.tsx`
  - `hooks/useChatAI.ts`
  - `types.ts`
- Kept `AGENTS.md` untracked and out of the merge commit.

### Upstream Changes Integrated

- Decoupled chat raw-context range from Memory Palace high-water mark:
  - adaptive range for auto-memory characters
  - manual 20-5000 message range
  - user breakpoint constrained inside the maximum readable range
- Added safer Xiaohongshu / RedNote link handling:
  - `rednote.com`
  - mobile `xhslink.cn`
  - stricter hostname checks before extracting note IDs
- Added Memory Palace range-selection search helpers and tests.
- Included voice transcripts and metadata-backed cards in memory-context relevance.
- Added psyche card long-press copy behavior and iOS copy fallback refinements.

### Conflict / Risk Notes

- `apps/Chat.tsx`: adopted upstream full-message history for AI raw-range management so UI display filters do not shift prompt boundaries.
- `hooks/useChatAI.ts`: kept local filtering that prevents `[Code 进度]` system cards from entering emotion evaluation, while adopting upstream `evalChar` freshness fix.
- `types.ts`: kept local `music_invite_result` / `code_card` message types and added upstream `voice`.
- `components/chat/MessageItem.tsx`: music cards remain ordinary chat-owned messages rather than centered modules: they stay on the actual sender/inviter side and character-side cards keep the outer message avatar; together-listening cards also retain their internal participant avatars.
- `utils/chatPrompts.ts`: auto-merged a context-breakpoint code-path update only; no prompt prose was changed by conflict resolution.

### Verification

- `pnpm vitest run utils/chatContextRange.test.ts utils/webpageExtractor.test.ts utils/videoParser.test.ts utils/memoryPalace/rangeSelection.test.ts utils/memoryPalace/querySanitizer.test.ts utils/memoryPalace/bufferCount.test.ts utils/backupRoundtrip.test.ts utils/messageItemModuleLayout.test.ts` passed.
- `pnpm build` passed.

### Follow-Up Checks

- Manual runtime check recommended for Chat settings' `AI 原文读取范围`, Memory Palace range selection, mobile `xhslink.cn` share cards, RedNote links, psyche long-press copy on iOS, and music-together card layout.

## 2026-07-23 Workbench Mobile Polish / Upstream Check

### Result

- Checked `upstream/master`; no new upstream commits were available, so no merge commit was needed.
- Added normal-chat-style image sending to Code/Workbench:
  - input bar now has an image button
  - selected screenshots/images are compressed with the same mobile chat settings
  - image messages render as image bubbles
  - quote/copy/context fall back to `[图片]` instead of leaking base64
  - fallback chat API can send Workbench images as OpenAI-compatible `image_url` parts when the model supports vision
- Fixed Code assistant avatar rendering:
  - avatar upload now immediately saves into active Workbench config, not only the settings draft
  - old Codex messages prefer the current Code avatar over stale per-message `speakerAvatar`
  - unresolved blobref avatars still show the side avatar fallback instead of disappearing
- Fixed iOS horizontal wobble in the Code transcript:
  - message scroll area now locks horizontal overscroll
  - message bubbles and file cards use `min-width: 0` / bounded widths
  - file preview code stays inside the card instead of stretching the whole page
- Kept `AGENTS.md` untracked and out of the push.

### Verification

- `git fetch upstream` completed successfully.
- `git log --oneline HEAD..upstream/master` returned no commits.
- `npm run build` passed after the local Workbench changes.

### Risk Notes

- Computer CLI bridge is still a text-stdin route; uploaded images are represented as `[图片]` there. Full visual understanding currently requires the fallback chat API path with a vision-capable model.
- Image messages are stored in `workbench_messages`, so full backup and QuickSync include them as normal Workbench message data; large screenshot volume can increase backup size.
- The iOS wobble fix intentionally hides page-level horizontal overflow. If a future card needs horizontal inspection, it must scroll inside its own card, not the whole transcript.

## 2026-07-22 Code Bridge Startup / Mobile Remote Fix

### Result

- Clarified and enforced the Code bridge model: the CLI bridge is an independent computer-side HTTP service and does not require SullyOS to be open in the computer browser.
- Bridge `/health` now reports the HTTP bridge as online even if the CLI probe fails, returning `cliStatus` / `cliError` separately so mobile Code settings do not show "not connected" when only the Codex/Claude executable probe failed.
- Bridge CORS responses now include `Access-Control-Allow-Private-Network: true` for HTTPS SullyOS pages calling a LAN bridge from Chrome-like browsers.
- Added `pnpm workbench:bridge:startup`, backed by `scripts/install-workbench-bridge-startup.ps1`, to register the bridge as a Windows user-logon scheduled task.
- Workbench bridge config now resolves addresses by client device:
  - mobile clients prefer `remoteBridgeUrl` and will not accidentally use `localhost`
  - desktop clients prefer `cliBridgeUrl` / `http://localhost:3001`
  - both URLs are still stored separately in `workbench_bridge_config_v1`
- Updated Code settings/help copy so users configure phone remote address separately from the local computer address.
- Code token monitoring in settings now shows only local estimated `本周` and `本月` usage.
- Code AI assistant avatar uploads are compressed, stored in `blob_assets`, and saved as `codexAvatar: "blobref:*"` inside `workbench_bridge_config_v1`.
- Code message/thinking/settings avatar rendering now resolves `blobref:*`, so the AI assistant avatar survives backup/restore and QuickSync delta pull.

### Verification

- `pnpm vitest run utils/workbenchBridge.test.ts utils/localSettingsBackup.test.ts utils/quickSync.test.ts` passed.
- `pnpm build` passed.
- PowerShell startup installer parsed successfully with `[scriptblock]::Create(...)`.

### Manual Setup Note

- On the computer, run `pnpm workbench:bridge:startup -- -Token YOUR_KEY` once to start the bridge automatically after Windows login.
- On the phone, Code remote address must be the computer LAN/Tailscale address such as `http://电脑IP:3001`, not `http://localhost:3001`.
- Vercel should be updated after pushing this fix to `master`.

## 2026-07-22 Upstream Refresh to ece65a3

### Result

- Fetched upstream and found `upstream/master` advanced from `680659b` to `ece65a3`.
- Merged latest upstream into `codex/merge-upstream-20260721`.
- Git auto-merged cleanly with no conflict markers.
- Built successfully with `pnpm build`.

### Upstream Changes Integrated

- Spark request race fixes:
  - prevent duplicate refresh/comment/reply requests
  - avoid stale feed snapshots overwriting newer posts or comments
  - add `utils/socialFeedMerge.ts` and focused tests
- API call log ambient context snapshot:
  - request logging keeps the app context from request start instead of later navigation state
- Phone contact alias editing:
  - real contacts can have a manual remark name / relationship label
  - `identityManual` prevents later scans from overwriting a user-confirmed alias, including intentionally blank aliases

### Conflict / Risk Notes

- `context/OSContext.tsx` and `types.ts` were changed on both sides but auto-merged cleanly.
- No prompt files were edited.
- Custom fork areas for Workbench, QuickSync, music together, XHS phone channel, chat prompts, and assistant post-processing were not directly changed by this upstream refresh.
- Existing untracked `AGENTS.md` was left untouched.

### Follow-Up Checks

- Manual runtime check recommended for Spark feed refresh/comments and Check Phone contact detail alias editing.

## 2026-07-21 Workbench App

### Result

- Added a standalone `工作区` app for work conversations, isolated from the main chat history and Memory Palace.
- Added independent IndexedDB stores for workbench sessions, messages, and one-line summaries.
- Added an in-app `Code 设置` subpage with collapsible connection mode, local CLI / remote connection, CLI routing, work profile, endpoint key, and usage.
- Work mode sends messages to the configured Workbench API endpoint when the computer/local CLI service is online.
- The Workbench top bar has an iOS-style `一起工作` switch: off sends to the configured CLI endpoint, on lets the selected character work together temporarily.
- `一起工作` performs a one-turn character consultation and writes the reply only back into the workbench stream.
- Main character prompts can read only Code progress cards explicitly written into that same character's normal chat, not full workbench transcripts or other characters' Code notes.
- Full backup/restore and QuickSync delta sync now include workbench DB stores and workbench local settings.
- Workbench settings keep CLI routing and work profile separated; they intentionally do not duplicate system API Key/Base URL/main-chat model settings.
- Workbench UI uses a Codex-like soft warm-white / pale violet-blue gradient surface with a right-side task/project index rail.
- Workbench usage monitoring shows current session / weekly / monthly / lifetime token counts, using local estimates until the bridge supplies exact CLI usage metadata.
- `工作区` and `灵感区` are capability modes over one shared Code conversation list. Switching modes never switches or hides conversation history.
- When the CLI bridge is offline there is no Codex/Claude Code assistant: sending records the user's Code message only, while the lightning button can explicitly invite the selected character to reply. When online, chat mode routes to the CLI without computer writes and work mode enables bridge-enforced project execution.
- Workbench index conversation list now shows real per-space sessions only when they exist; session titles can be edited inline, first messages generate default titles, and the row-level SVG `X` deletes the whole session history.
- Code `一起工作` now reuses the normal chat request payload instead of adding a separate workbench role prompt: selected characters read their usual chat context plus the current Code conversation as temporary history, then the reply is written only to Code.
- Code chat bubbles render `[[SEND_EMOJI: name]]` as local sticker images while keeping heavier chat side-effect actions out of the Code surface.
- Code input now includes a local sticker picker; sending a sticker creates a Code-only user message and follows the same current-space reply route without writing to normal chat.
- Code `一起工作` now formats main-chat context as clean role messages instead of raw timestamped chat logs, avoiding log-prefix echoes without adding another prompt rule.
- Code assistant replies now reuse the chat bubble splitting path (`splitResponse` / `chunkText`) so character replies land as multiple natural Code messages instead of one large block.
- Code failures show the global red `SYSTEM ERROR` toast only and never create an error message inside the Code transcript.
- Code `一起工作` is now treated as a chat IF-line: the selected character receives normal main-chat history first, then Code's current user/selected-character messages as the newest temporary history. Code-only assistant/system messages are not converted into system log blocks for the character.
- Code progress cards are now manual-only: the top-bar card button runs the confirmed Codex progress-card prompt, writes the result to `workbench_summaries`, and renders it inside Code as a structured system card. If `一起工作` is enabled, the same card is also written as a `code_card` system message only to the selected character's normal chat. Automatic per-message workbench summaries are disabled.
- Code together-work context uses a three-layer priority: latest normal chat keeps character continuity, the current Code conversation owns technical details and execution decisions, and other Code conversations are visible only through progress cards in that character's normal chat.
- Pure Codex/AI Code chat also receives a compact task index built from other Code sessions' latest progress cards; the current session still owns all technical details and execution decisions.

### Isolation Rules

- Workbench messages must not be stored in the normal `messages` table.
- Workbench `一起工作` consultations must not create main chat messages.
- Workbench `一起工作` consultations must not run Memory Palace ingestion or write workbench transcripts into memories.
- Only manual `[Code 进度]` / `[Code 进度-角色名]` cards may cross from Code into normal chat, and only for the selected `一起工作` character.
- Workbench API config and participant state must stay covered by both local settings backup and QuickSync.
- Code backup coverage includes sessions, messages, progress summaries, Code Memory, and artifact metadata. Project file bodies remain on the bridge computer and are not copied into SullyOS backups.
- Code editable settings travel in `workbench_bridge_config_v1`, including bridge URL/Key, CLI route, selected model, work profile, custom instructions, Code avatar, usage limit, and selected together-work character.
- Remote and local CLI endpoints are stored separately inside `workbench_bridge_config_v1`: `remoteBridgeUrl` is the phone-to-computer address, while `cliBridgeUrl` is the current-computer address (default `http://localhost:3001`). Switching modes swaps the active URL without overwriting the other one; legacy single-URL configs migrate into the mode that was active when saved.
- QuickSync must treat local-setting removals as real delta deletes; clearing a Code setting on one device must clear it on the receiving device instead of reviving an older value.
- Deleting a Code conversation syncs removal of its transcript while preserving its progress-card, Code Memory, and artifact indexes by design.

### Follow-Up Checks

- Manual runtime check still recommended on phone and desktop:
  - workbench app opens from launcher
  - Code 设置 subpage saves/restores
  - work mode handles missing Workbench API gracefully
  - Sully mode replies without adding main chat messages
  - QuickSync pull brings workbench records/settings to the other device

## 2026-07-21 Local Settings Backup / QuickSync

### Result

- Added a shared localStorage settings backup layer for small configuration values.
- Full backup/export now includes `localStorageSettings`.
- Full restore/import now restores `localStorageSettings`.
- QuickSync delta upload now includes the same local settings snapshot.
- QuickSync delta pull now restores the local settings snapshot.
- QuickSync now also includes chat themes and whitelisted settings assets from the IndexedDB `assets` store.
- QuickSync now scans synced records/settings for `blobref:*` image references and includes the referenced `blob_assets` image bodies incrementally.
- Built successfully with `pnpm build`.

### Custom Features Preserved / Covered

- XHS Lite simple-mode cookie in `os_realtime_config.xhsMcpConfig.cookie`.
- XHS phone channel token/config in `os_realtime_config.xhsPhoneConfig`.
- WebDAV password and GitHub backup token in `os_cloud_backup_config`.
- MCP server tokens, Luckin/McD tokens, proxy worker URL, push/VAPID config, chat prompt settings, translation settings, and other small user preferences.
- Upstream loyal recruitment local state and custom base URL via `sullyos_*` keys.
- Upstream nostalgic appearance via `os_theme.desktopVariant`.
- Appearance presets, custom icons, widgets, decorations, custom fonts, room custom assets, social profile assets, bank custom furniture assets, and custom chat CSS presets via whitelisted `assets` records.
- Blob-backed wallpaper, lock wallpaper, avatars, room images, widgets, decorations, and other synced images referenced by `blobref:*`.

### Notes

- The snapshot is intentionally limited to known small settings and prefixes, not arbitrary large localStorage cache blobs.
- QuickSync asset coverage is intentionally limited to settings/customization assets and referenced image blobs, not runtime caches such as generated voice/music blobs.
- Referenced image blobs are tracked in the QuickSync manifest so the first sync after this change may upload needed image bodies, then later syncs only upload changed/new referenced blobs.
- Added `utils/localSettingsBackup.test.ts`.
- Added `utils/quickSync.test.ts`.
- Verified:
  - `pnpm vitest run utils/localSettingsBackup.test.ts utils/quickSync.test.ts utils/backupExport.test.ts utils/backupRoundtrip.test.ts`
  - `pnpm build`

## 2026-07-21 Upstream Refresh to ac7f739

### Result

- Fetched upstream and found `upstream/master` advanced from `98c6c1e` to `ac7f739`.
- Merged latest upstream into `codex/merge-upstream-20260721`.
- Resolved conflicts in:
  - `apps/Settings.tsx`
  - `context/OSContext.tsx`
- Built successfully with `pnpm build`.

### Upstream Changes Integrated

- Loyal user recruitment feature:
  - `components/LoyalUserRecruitmentEvent.tsx`
  - `utils/loyalUserEligibility.ts`
  - `utils/loyalUserRecruitment.ts`
  - `worker/loyal-recruitment/*`
- Nostalgic desktop appearance option.
- Chat module card avatar hiding fix.
- Backup import policy guard replacing the older CSY migration path.
- Worker build script update for loyal recruitment worker bundling.

### Conflict Notes

- `apps/Settings.tsx`: kept local `cloudRestoreProvider` state for WebDAV/GitHub restore source and upstream `showCommunityMigration` state for the loyal recruitment controller.
- `context/OSContext.tsx`: kept local music together / QuickSync / backup / XHS / proactive changes while adopting upstream nostalgia-preserving wallpaper migration logic.
- Removed old CSY migration references in favor of upstream `assertSupportedSullyBackup`.

### Follow-Up Checks

- `pnpm build` passed, including `loyal-recruitment` worker bundling.
- Manual runtime checks still recommended for Settings, Appearance, backup import/restore, QuickSync, music together, and XHS phone channel.

## 2026-07-21 Merge Baseline

### Result

- Merged upstream latest into the fork.
- Restored custom SullyOS features.
- Recovered upstream local-date fixes that were initially covered by local conflict resolution.
- Merged upstream appearance asset handling into the local OSContext without replacing custom features.
- Built successfully with `npm run build`.
- Pushed current HEAD to remote `master`.
- Vercel deployment succeeded.

### Key Commits

- `f2af6dc` - Merge upstream SullyOS updates
- `96853c4` - Restore local SullyOS custom features after upstream merge
- `ec47dcd` - Restore upstream local date fixes
- `c5155c7` - Merge upstream appearance asset handling

### Upstream Changes Integrated

- Launcher / Appearance refinements.
- Default paper-style wallpaper and appearance defaults.
- Custom icon outline handling.
- Blobref handling for wallpapers, lock wallpapers, custom icons, and appearance presets.
- Local date utilities for daily schedule and prompt date handling.
- Related daily schedule, life record, memory palace date fixes.

### Custom Features Preserved

- Music together / together listening:
  - invite, accept, reject, leave
  - wake scheduling
  - `MUSIC_WAKE_AFTER`
  - `MUSIC_ACTION: next_song | pick_song | set_mode | leave`
- Netease music page / lyric page together-listening entry points.
- WebDAV QuickSync:
  - fixed latest delta name
  - overwrite latest instead of timestamp pile-up
  - update manifest only after upload succeeds
  - cleanup old quick sync timestamp deltas
  - mobile batched restore/write safety
- WebDAV full backup cleanup:
  - only cleans `Sully_Backup_` zip files
  - does not delete quick sync deltas
- GitHub backup proxy:
  - default Cloudflare Worker proxy
  - old unstable proxy avoided
  - proxy toggle persists
- Mobile import batching:
  - normal data 200 per batch
  - `memory_links` 400 per batch
  - `memory_vectors` 30 per batch
  - `setTimeout(0)` yield between batches
- Device detection:
  - Android / iPhone / iPad / iPod / Mobile / Tablet
  - iPadOS desktop UA detection via `MacIntel + maxTouchPoints`
  - realtime context includes phone / tablet / computer
- Memory palace vector anomaly tools:
  - total memory count
  - vector success count
  - missing vector count
  - preview first 20 missing-vector memories
  - one-click delete missing-vector memories
- XHS Lite simple mode:
  - search
  - browse
  - detail
  - share card
  - like
  - profile
  - no post / favorite / comment / reply in simple mode
- XHS phone channel / Pixel MCP:
  - `pixel-agent-server.js`
  - `utils/xhsPhoneChannel.ts`
  - health/open/observe/browse/search/open detail/like/share/profile actions
  - settings panel for MCP URL, Pixel ADB address, token, and connection test

## Important Risk Points

### Backup / QuickSync Coverage Is Required

User requirement: anything that affects normal use, login state, customization, passwords/tokens/cookies, or user-facing settings must be included in both full backup/restore and QuickSync delta upload/pull.

This includes:

- XHS Lite simple-mode cookie and XHS phone channel token/config.
- WebDAV/GitHub backup passwords and tokens.
- API config, model presets, MCP servers/tokens, Luckin/McD tokens, worker/proxy URLs, push/VAPID settings.
- Appearance/theme choices, nostalgic desktop option, custom icons, appearance presets, widgets, decorations, custom fonts, room custom assets, custom chat CSS presets.
- Upstream-added user-facing options or local state, such as loyal recruitment state/base URL.

Intentional exclusions:

- Generated voice cache.
- Generated music cache.
- Runtime cache blobs that do not affect configuration or customization.

When upstream adds any new setting, toggle, localStorage key, IndexedDB config store, or `assets`-backed customization, check:

- `utils/localSettingsBackup.ts`
- `utils/quickSync.ts`
- `types.ts` `FullBackupData`
- `context/OSContext.tsx` export/import paths
- full backup tests and QuickSync tests

### OSContext Is High Risk

`context/OSContext.tsx` is the most collision-prone file. It now contains both:

- upstream appearance/blobref migration logic
- local backup/sync/XHS/music/device/proactive changes

Do not replace this file wholesale from upstream. Merge specific blocks only.

### Prompt Files Need Confirmation

Before editing prompts, show the full prompt and get confirmation.

Important prompt-related files:

- `utils/chatPrompts.ts`
- `utils/applyAssistantPostProcessing.ts`
- `utils/chatParser.ts`
- `utils/context.ts`

### XHS Modes Can Conflict

Avoid enabling multiple XHS operation paths at the same time unless intentionally testing:

- old/full XHS Lite
- XHS Lite simple mode
- XHS phone channel / Pixel MCP

If multiple modes expose similar tags, the model can choose the wrong channel.

### XHS Phone Channel Is Experimental

It depends on external runtime state:

- cloud Pixel Agent server online
- valid long-lived token
- Pixel online and unlocked
- Tailscale connected
- ADB state is `device`
- XHS app logged in and readable

Failure should be treated as channel/runtime failure first, not necessarily frontend code failure.

### Build Passing Is Not Full Regression

`pnpm build` confirms TypeScript/build integrity. It does not prove:

- WebDAV upload/pull works
- GitHub backup upload works
- XHS cookie is valid
- Pixel channel can control the phone
- music together wake timers fire
- imported backups restore correctly on mobile

## Daily Maintenance Flow

### Before Any Change

```bash
cd D:\SullyOS-fork
git status --short --branch
```

If dirty, understand what changed before editing. Do not reset user changes.

### Normal Local Development

```bash
pnpm build
```

For UI testing:

```bash
pnpm dev
```

### After Editing

1. Run build:

```bash
pnpm build
```

2. Check status:

```bash
git status --short --branch
```

3. Commit with a specific message:

```bash
git add <changed-files>
git commit -m "Short clear message"
```

4. Push only after build passes:

```bash
git push origin HEAD:master
```

### Upstream Merge Flow

1. Fetch upstream:

```bash
git fetch upstream
```

2. Create a safety branch:

```bash
git switch -c codex/merge-upstream-YYYYMMDD
```

3. Merge upstream:

```bash
git merge upstream/master
```

4. Resolve conflicts carefully. High-risk files:

- `context/OSContext.tsx`
- `utils/chatPrompts.ts`
- `utils/applyAssistantPostProcessing.ts`
- `apps/Chat.tsx`
- `context/MusicContext.tsx`
- `hooks/useChatAI.ts`
- `utils/chatRequestPayload.ts`

5. Build:

```bash
pnpm build
```

6. Push a review branch first:

```bash
git push -u origin codex/merge-upstream-YYYYMMDD
```

7. Only push to `master` after confirming:

```bash
git push origin HEAD:master
```

## Regression Checklist

Run this when a merge/deploy looks risky:

- Chat opens and sends a normal reply.
- Prompt/token monitor still renders.
- Settings page opens.
- XHS Lite simple mode UI exists and saves config.
- XHS Lite simple mode can search/browse/detail/share if cookie is valid.
- XHS phone channel config UI exists and test connection reports useful status.
- Together listening invite/accept/leave works.
- Music page and lyric page still have together-listening entry.
- WebDAV QuickSync upload/pull does not create timestamp piles.
- Full WebDAV backup cleanup does not delete quick sync deltas.
- GitHub backup proxy config persists.
- Memory palace vector anomaly management opens.
- Mobile restore/import does not freeze on large batches.
- Appearance presets still save/apply/import.
- Custom icon upload still works.
- Lock wallpaper behavior still works if used.
- Desktop wallpaper, lock wallpaper, custom icons, avatars, widgets, room images, and other blob-backed images survive QuickSync upload/pull.
- XHS Lite cookie, WebDAV/GitHub credentials, MCP tokens, and other user settings survive full backup restore.
- The same settings/customizations survive QuickSync upload/pull between phone and computer.
- Code opens with one shared conversation list; switching `工作区` / `灵感区` does not hide or fork history.
- With CLI offline, normal Code send records only the user message and never fabricates a Codex reply.
- Lightning produces exactly one selected-character reply and does not start an assistant/character reply loop.
- Code character replies understand the latest Code user/AI-assistant messages without leaking internal context labels.
- Code request failures show only the global `SYSTEM ERROR` toast and leave no error bubble/history row.
- Code quote, single delete, multi-select delete, sticker transparency, and system-gray user bubbles work on mobile and desktop.
- Creating a manual Code progress card updates the current task index; deleting the transcript preserves its progress/Memory/artifact indexes.
- Full backup and QuickSync restore Code sessions, messages, summaries, Code Memory, artifact metadata, Code avatar, custom instructions, route/model, and bridge settings.
- A fresh QuickSync from the complete-vector device reduces vector missing counts on the receiving device; vector deletions also propagate.
- Pixel Home layout changes and deletions propagate through QuickSync compound keys.

## Code Workspace Notes

- Code app message actions should mirror main chat basics: long press/right click opens quote, delete, and multi-select delete.
- Code quote/delete state is stored only in `workbench_messages`; deleting Code messages or sessions must not delete main chat messages, summaries, or Memory Palace entries.
- Together-work character replies in Code can read temporary Code/main-chat context, but replies are written back only to Code.
- Code together-work should behave like a temporary branch from normal chat: normal chat later sees only the selected character's manual Code progress cards, while Code calls can append the current Code branch onto normal chat history for that one reply.
- When a character returns to Code after normal chat, they should read the newest normal chat context plus the current Code session; other Code sessions may inspire through progress cards but must not override current-session technical details unless the user explicitly brings them up.
- Pure Codex/AI mode may reference other Code tasks by title/progress-card summary, but must not load or assume full details from other sessions.
- Code "工作区" and "灵感区" are capability modes, not separate conversation buckets. The conversation list should stay shared; switching modes should not hide existing Code conversations.
- The hidden Code device/capability system prompt is generated by SullyOS, not guessed by Codex. In inspiration mode, Code should only produce plans, drafts, small snippets, and thought summaries; it must not claim to read/write project files or output large project files. Only when work mode is available and execution mode is active may it read/write project files or run commands.
- Code Memory extraction runs only after the user manually creates a Code progress card. It uses a conservative prompt that stores only confirmed long-term user preferences and confirmed architecture/rule/workflow decisions, never code bodies, temporary todos, experiments, unconfirmed ideas, private chat, or model suggestions.
- A selected character's manual `code_card` remains visible to normal chat and Memory Palace retrieval, but emotion evaluation, relationship/impression extraction, and monthly/manual chat archiving must skip it so technical decisions do not flatten the character into an assistant voice.
- Code file output uses artifact cards. Project files remain on the bridged computer; SullyOS stores only file metadata, relative path, size, hash, and a small preview, and downloads the full file again from the bridge when requested. QuickSync/full backup include this metadata, not large project bytes. SullyOS-owned small artifacts may use blob-backed storage and travel in full backups.
- Chat-only Code mode and computer-execution mode share the same conversation history. The bridge must enforce permissions itself: read-only/plan in chat mode and workspace-scoped writes in execution mode. Prompt wording is only behavioral guidance and must never be the sole permission boundary.
- QuickSync should cover all full-backup user data stores except explicitly excluded music/audio/runtime caches. Memory Palace vectors are first-class delta data: vector upserts and deletes must sync across devices.
- QuickSync manifest keys must follow each IndexedDB store's real keyPath. `memory_vectors` uses `memoryId` rather than `id`; otherwise vector rows disappear from every delta manifest and processing on one device never reaches another.
- `pixel_home_layouts` uses the compound key `[charId, roomId]`. QuickSync encodes that key for manifests and restores the array key before IndexedDB deletion, so room/desktop layout changes and removals propagate incrementally.

## Current Deployment Note

Last recorded stable deployment was `ecc01ab` on remote `master` from 2026-07-21. The 2026-07-22 Code workspace / QuickSync work plus upstream refresh is merged through `9740321`, with the maintenance log updated for publishing to remote `master`. Vercel should auto-deploy from `master` after the push; verify the deployment dashboard before treating production as updated.

## 2026-07-22 Code Workspace And Sync Audit

### Final Product Rules

- `Code` is a standalone app and an IF-line from normal chat, not another normal-chat room. Its complete transcript stays in `workbench_messages` and is never written into the normal `messages` stream.
- The Code conversation list is shared. `工作区` and `灵感区` are capability modes for the current conversation, not independent history folders.
- CLI offline means there is no Codex/Claude Code assistant. Sending records the user's Code message only. The lightning button explicitly asks the selected character for one reply and never enables an automatic back-and-forth loop.
- Ordinary send always records the user's message without forcing an immediate reply, even while the CLI is online. The lightning button requests exactly one character turn; the adjacent non-code sparkle SVG requests exactly one connected AI-assistant turn. This lets the user send several short messages before deciding who should respond.
- CLI online chat mode may answer, plan, explain, and produce small snippets but must not modify project files or run write commands. Work mode enables project execution. The bridge must enforce this boundary; prompt text is not a security boundary.
- The assistant display name comes from the connected route/bridge identity, such as `Codex` or `Claude Code`; the UI must not pretend an offline generic model is Codex.
- Code assistant replies are one assistant turn. Character replies may be split into natural IM bubbles through the normal chat splitting/rendering path.
- Code errors use the global red `SYSTEM ERROR` toast only. They must not create error bubbles or persist error messages in the Code transcript.

### Character Context And Memory Isolation

- A character invited through `一起工作` receives the normal stable character/user/relationship context, a limited recent normal-chat background, volatile realtime context, then the current Code conversation as the newest and highest-priority task context.
- The current Code context includes messages from the user, the connected AI assistant, and the selected character. Internal labels used to distinguish assistant speakers are prompt-only and must never leak into visible bubbles.
- Other Code conversations are represented only by their manually generated progress-card index. Their full transcripts and code details are not injected unless a future explicit retrieval flow is added.
- Character replies are written only into the current Code conversation. They do not become normal-chat messages and do not directly enter Memory Palace.
- The Code character surface keeps personality, relationship, recent normal-chat background, IM style, stickers, quoting, and bilingual behavior. It excludes voice/action tags, transfer, scheduled-message, diary, search, LIFE, music actions, HTML, MCP/XHS/food-ordering, and other normal-chat side-effect tools.
- Hidden system context is required in Code, but visible normal-chat system logs are not copied wholesale. Relevant hidden context is limited to character continuity, current time/realtime state, Code capability/device state, the current Code thread, progress indexes, stickers, quote rules, and bilingual rules.
- Manual `[Code 进度]` cards may be copied to the selected character's normal chat as `code_card`. Normal chat can reference these summaries, while emotion evaluation, relationship/impression extraction, and monthly/manual chat archiving skip `code_card` so technical work does not turn the character into an assistant persona.
- Code Memory is extracted only when the user manually creates a progress card. It stores at most confirmed long-term preferences and confirmed architecture/rule/workflow decisions; code bodies, temporary todos, experiments, rejected ideas, private chat, and unconfirmed model suggestions are excluded. The settings page provides a visible editor/delete surface for these entries.

### Conversations, Progress Cards, And Files

- Code supports quote, single delete, and multi-select delete. Quote resolution follows the normal-chat matching behavior instead of relying only on the most recent message.
- Deleting a Code conversation removes its detailed transcript and leaves a session tombstone for cross-device deletion propagation. Existing progress cards, Code Memory, and artifact indexes are intentionally preserved.
- Manual progress cards are cumulative anchors for a long Code conversation. Codex/Claude receives the current thread's saved progress context plus recent messages, preventing early decisions from falling out of a long context window.
- Progress-card generation is manual only. The connected CLI assistant is preferred; if it fails and a character is selected, the role-specific fallback may summarize in that character's voice.
- The header progress icon opens a dedicated visual progress-card panel instead of immediately calling a model. The panel lists every manually generated card for the current Code conversation, renders task/status/decision/progress/todo/note as separate fields, and provides the explicit `生成新卡` command. A successful generation refreshes and opens the newest card; storage remains `workbench_summaries`, so existing backup and QuickSync coverage is unchanged.
- The progress-card panel has an adjacent SVG source selector. `Codex 优先` remains the default and preserves the existing fallback to the selected character when CLI summarization fails; `角色总结` directly uses the currently selected together-work character. Card persistence, Code Memory extraction, and normal-chat writeback remain identical after either source is chosen.
- In the Code conversation stream, progress summaries are rendered as standalone system cards. They have no speaker avatar, no `System · time` header, and no outer chat bubble around the existing card surface. Long-press selection/deletion remains attached to the standalone card.
- When a selected character is participating, normal-chat writeback is stored as that character's `assistant`-side `code_card` rather than a horizontal system log. The normal chat therefore renders the character avatar and its dedicated Code card UI. The card carries the originating Workbench session ID and summary ID, uses the same summary content as the Code-side card, and now renders the `备注` field as well.
- Large project files remain on the bridged computer. SullyOS stores an artifact card with name, path, size, hash, timestamps, and a short preview; downloading requests the real file from the bridge again. Large project bytes are not copied into IndexedDB, full backups, or QuickSync.
- Small SullyOS-owned files may use blob-backed artifact storage. Sticker messages render as transparent media without the user's text-bubble background; user text bubbles use the system gray style.
- Code message avatars follow the ordinary chat appearance settings for vertical alignment, Y offset, size, shape, and AI-avatar visibility. Workbench no longer applies a fixed top margin that leaves short bubbles visually misaligned.
- Code speaker avatars are isolated by message identity. AI-assistant replies store and render the configured Code avatar; character replies store the selected character ID and neural-link avatar. Neither path may fall back to the other speaker's avatar. The avatar snapshot lives in message metadata, so it is covered by the existing Code backup and QuickSync paths.
- Pending/thinking UI also tracks the explicit trigger source. Clicking the character lightning shows only that character's avatar; clicking the AI-assistant control shows only the configured Code avatar. It no longer infers the pending speaker from the global together-work switch, and the pending avatar follows ordinary chat appearance settings.
- Character-side Code context keeps all three speakers structurally separate: the user remains an API `user` message, the selected character remains `assistant`, and CLI/Codex is injected as external `system` context with its discovered agent name. This avoids treating CLI text as user text and avoids visible identity labels that a character may imitate. Any accidental legacy `[用户 ...]`, `[AI 助手 ...]`, or `[角色 ...]` marker is stripped before bubble storage.
- Browser-to-CLI serialization includes each message's resolved speaker name. The bridge formats recent history as `用户`, `角色 <name>`, `AI 助手 <name>`, or `系统` before invoking Codex/Claude Code, preventing a character's suggestion from being mistaken for a direct user instruction.
- The CLI bridge prompt begins with a confirmed dynamic `[AI 助手身份]` block. It names the active agent (`Codex`, `Claude Code`, or custom CLI), defines user/assistant/character as three independent participants, treats only `用户` lines as direct user speech, forbids impersonating or continuing character dialogue, and limits each trigger to one assistant reply. Existing device, capability, file-output, model-profile, custom-instruction, task-context, and user-request blocks remain unchanged after it.
- Character replies in Code reuse ordinary chat's prompt builder for character identity, relationship background, memories, and volatile state, while the structurally typed current Code thread is placed once at the very end of the API request. This ordering is intentional: normal chat supplies background, but cannot override the active Code topic through its recency tail. Code text is also supplied separately as the Memory Palace recall query without duplicating it in normal-chat history.

### Backup And QuickSync Coverage

- Full/text backup and restore include `workbench_sessions`, `workbench_messages`, `workbench_summaries`, `workbench_memories`, and `workbench_artifacts`.
- User/character records, character groups, persisted options, action receipts, chat cards, and Code messages inherit full-backup and QuickSync coverage from their owning IndexedDB row or portable local-storage setting. Additions, edits, and deletions are all part of the contract.
- QuickSync includes all five Code stores and `workbench_bridge_config_v1` / `workbench_mode_v1`. Bridge URL, Key, CLI route, selected model, profile, Codex-only custom instructions, Code avatar, usage limit, and selected participant travel across devices.
- Clearing an included setting creates a local-storage delta deletion. A removed value must be removed on the receiving device rather than revived from stale local data.
- Persistent Post Office identity/base URL, Signal authorship/reuse records, and desktop/mobile-game skin choices are included in QuickSync as well as full backup. The Post Office admin token and one-turn Signal whisper remain intentionally device-local.
- Wallpaper, lock wallpaper, user/character avatars, custom app icons, widgets, room images, card images, and other referenced images sync through asset rows plus `blob_assets`. QuickSync carries blob additions, replacements, and deletions; removing the last synced reference must remove the receiving device's orphaned blob. Code avatar is resized before local-storage persistence to remain inside the portable-settings size limit.
- Audio/music and runtime caches remain intentionally excluded. Project file bodies also remain excluded.
- Memory Palace vector rows use IndexedDB keyPath `memoryId`. QuickSync now uses `memoryId` for manifest hashes, upserts, and deletes. The previous generic `id/key/name` lookup silently omitted every vector row.
- Pixel Home layouts use compound keyPath `[charId, roomId]`. QuickSync now serializes compound keys for manifest comparison and restores the array key before IndexedDB deletion. This covers incremental room/layout changes and removals.
- Existing delta archives created before the vector-key fix do not retroactively contain vectors. After deployment, upload a fresh QuickSync delta from the device whose vectors are complete, then pull it on the other device. The first new upload treats the existing vectors/layouts as additions and self-heals the old empty manifest.

### Verification Completed

- QuickSync/local-settings focused tests: 8 passed.
- Full Vitest suite: 103 files, 1117 tests passed.
- Production build: passed with `pnpm build`.
- `git diff --check`: passed; only expected Windows LF/CRLF notices remain.
- Installed official `@openai/codex` CLI (`codex-cli 0.145.0`) and confirmed `Logged in using ChatGPT` on the development PC.
- Windows may resolve the Codex desktop-app alias before npm's CLI and return `spawn EPERM`. The bridge now automatically prefers npm's native `codex.exe` under the installed `@openai/codex-win32-x64` package, while `WORKBENCH_CODEX_BIN` remains available as an override.
- Real bridge smoke test passed: `/health` identified `Codex`, `/models` returned account-backed model metadata, and a chat-only `/message` request returned `连接成功` without artifacts.
- Fixed a settings-state split where `检测连接` could mark the bridge online while leaving the tested draft URL out of the active send config. A successful connection test now saves and activates that exact config immediately, so the next ordinary Code message reaches the connected CLI without requiring a second `保存` action.
- Bridge status now rechecks the active endpoint every 10 seconds and drives both the settings result text and the AI-assistant sparkle button. A stale manual `连接成功` label can no longer remain while the active endpoint is offline; successful manual tests also avoid a temporary disabled-button flicker during the immediate background recheck.

### Remaining Risks And Required Manual Checks

- Unit tests cannot prove a real phone/WebDAV/browser storage round trip. Before release, perform one phone-to-PC and one PC-to-phone QuickSync using real wallpaper/avatar assets, a deleted setting, Memory Palace vectors, a Pixel Home layout, and a Code conversation.
- Verify a real Codex bridge and a real Claude Code bridge separately: identity/model discovery, chat-only restrictions, execution permissions, artifact download, official usage reporting, reconnect behavior, and invalid-Key errors.
- Verify that CLI offline never creates an assistant message; ordinary send only records the user message, while lightning produces exactly one selected-character response.
- Verify that a character can answer about the newest Code user/assistant exchange, can still reflect recent normal-chat relationship context, and does not repeat internal markers such as `[当前 Code 对话 / 角色名]`.
- Verify that Code stickers from both user and character render as transparent media and that quote/delete/multi-select work on old as well as recent messages.
- Do not assume Vercel contains these fixes until the remote `master` push completes and the deployment dashboard reports success.

## 2026-07-22 Code Automatic Capability And Fallback API

- `工作区` and `灵感区` are no longer user-selected conversation categories. Code keeps one shared conversation list and derives the current capability automatically: an online computer bridge means computer execution; otherwise the app is chat-only.
- Code settings now include a separate OpenAI-compatible fallback chat API with its own base URL, Key, model ID, and display name. It reuses the existing Code conversation, progress index, device state, and Codex custom instructions without adding a separate fallback persona prompt.
- The AI sparkle button routes one turn at a time. An online CLI bridge always has priority; when it is offline, the configured fallback API answers; when neither is available, the button is disabled. Ordinary send still only records a message, and the lightning button still requests exactly one character reply.
- Fallback replies cannot create bridge artifacts and are always chat-only. They do not receive an execution route, workspace file transport, or command result channel.
- The fallback API fields live inside `workbench_bridge_config_v1`. Full settings export/import and QuickSync local-setting deltas therefore include additions, edits, and deletions for the fallback URL, Key, model, and display name.
- The fallback API model field can fetch an OpenAI-compatible `/models` list and switch to a selector when models are returned. Providers that do not expose a model list, or return an error, still support manually entering a model ID.
- A follow-up backup audit found that `workbench_artifacts` was exported and had an import section but was absent from the import writer's available-store whitelist, so full restore silently skipped file-card metadata. The whitelist now includes `workbench_artifacts`; QuickSync already covered it correctly.

### Fallback API Configuration Notes

- The fallback API uses the same OpenAI-compatible base-URL convention as the system API: the saved value is the provider base URL, while Code appends `/models` for discovery and `/chat/completions` for replies.
- The fallback panel provides `引用系统 API`, which copies the current system API URL, Key, and model into the Code settings draft. This is a one-time copy rather than a permanent binding; later edits remain isolated between system chat and Code fallback.
- The fallback URL, Key, model, and display name remain part of `workbench_bridge_config_v1`, so full/text backup, GitHub/WebDAV restore, and QuickSync setting upserts/deletions carry them between devices.
- Risk: not every OpenAI-compatible provider exposes `GET /models`. Failure or an empty list must leave manual model-ID entry available and must not erase the user's existing model value.
- Risk: copying the system API also copies its Key into Code's portable settings. This is intentional for the owner's cross-device workflow, but exports and cloud backups must still be treated as credential-bearing private data.

### Upstream Check Before Release

- Refreshed `upstream/master` before publishing on 2026-07-22. The latest upstream commit is `ece65a3` (PR #421, manual phone contact aliases), with PR #420's Spark request-race fixes included.
- The upstream changes were merged locally in `9740321` with no conflicts. Rebuild and focused tests passed after the merge; release requires remote `master` push plus Vercel deployment verification.

## 2026-07-25 Backup Policy Clarification

### Upstream Versus Fork Principle

- Upstream is primarily database-bound: durable IndexedDB stores are exported broadly, while `localStorage`, page runtime state, and rebuildable caches do not share one migration contract. Upstream does not provide this fork's QuickSync path.
- This fork is continuity-bound: durable user/character data, settings, action results, and user creations must be evaluated for both full backup and QuickSync. Create, update, and delete operations must follow the same migration semantics.
- User-created, non-rebuildable works and assets are archive data and should carry their real payload. Search/API/TTS results that can be fetched or generated again are caches and should not migrate.
- Code project file bodies remain on the bridge computer. SullyOS migrates the related conversations, summaries, memories, and file-card metadata.
- QuickSync is lightweight last-write-wins recovery, not real-time multi-device collaborative merging.

### Together-Listening Snapshot

- The participating character, current track, queue, queue index, and play mode form one short-lived scene snapshot and may migrate together.
- The snapshot must expire and validate referenced characters/tracks before restoration. Playback seconds and play/pause state remain transient.
- This section supersedes older entries that categorically described the active together-listening session, or all music/audio runtime data, as excluded from backup. Those entries remain above as historical records.
- Synthesized `voice_msg_*` and `tts_*` audio remains rebuildable cache. Character voice settings and message text are durable data. User-generated songs are creations rather than caches, so their audio payload belongs in the migration contract.

## 2026-07-25 Code Webpage Sharing

- Code now reuses the normal-chat webpage and video extraction pipeline for ordinary HTTP(S) links. User, character, and AI-assistant shares can render as clickable `webpage_card` previews with site, title, excerpt, and cover.
- Chat and Code render those previews through the same `components/chat/WebpageShareCard.tsx` component. Do not restore a separate Workbench webpage-card renderer during upstream merges; each surface owns only its message shell.
- Text around a shared URL remains a separate chat bubble, followed by the card. If extraction fails, the original text and URL remain visible instead of being replaced by a failed card.
- Character and AI-assistant text is persisted immediately; webpage cards are extracted and appended asynchronously in source URL order so slow sites do not delay the visible reply.
- Extracted webpage text is serialized into both character and bridge context, so later turns can discuss the shared page. This is independent from the connected Codex/Claude CLI's own browsing capability and does not grant new network permissions.
- XHS links continue through the dedicated XHS Lite/MCP card path and must not be intercepted by the generic webpage branch.
- Fork merge rule: preserve Code `webpage_card` rendering, click-through, context serialization, and the text-plus-card sequence when merging upstream Workbench changes.

## 2026-07-25 Progress Cards, Foreground Sync, And Full-Import Deletes

- Every progress card has an explicit delete command. Deletion removes the `workbench_summaries` row, its matching Code system card, and the selected character's normal-chat `code_card`; it intentionally does not delete separately managed Code Memory entries.
- Progress cards display `Memory · N` only when current `workbench_memories` rows reference that card's `summaryId`. Editing or deleting those Memory rows updates the displayed count.
- Code Memory remains isolated from Memory Palace. The selected character's normal chat can read the copied progress card, while Code assistants and Code character turns can use `workbench_memories`.
- QuickSync dispatches the changed store list after applying a delta. An already-open Workbench reloads its current conversation when any `workbench_*` store changed, so users no longer need to leave and re-enter Code.
- Modern full backups carry an explicit local-settings section even when it is empty. Full import replaces portable settings and removes allowed target keys absent from that section; legacy backups without the section remain non-destructive. QuickSync continues to use explicit setting upserts and deletes rather than replacement.
- Progress-card structured-output hardening remains proposed only. The current progress-card prompts and parser were not changed in this batch.

# 2026-08-03 Code Mobile Text File Upload

- Added a paperclip upload entry to the Code composer for iOS/iPadOS and desktop browsers.
- Supported input covers Markdown, plain text, configuration files, and common source-code extensions. Binary-looking files are rejected.
- Uploads are complete or rejected: 64 KB per file, up to 4 files and 128 KB per batch. No partial text is silently sent to a model.
- User-uploaded files use inline `workbench_artifacts` and `file` messages. The file card keeps name, MIME type, size, preview, and full text, and can be downloaded locally without the computer bridge.
- `workbenchContentForContext` serializes the full file body. The existing CLI bridge, fallback API, and character Code consultation paths all consume that same serializer, so the AI assistant and participating character see the same attachment.
- Inline text travels with the existing Workbench full-backup and QuickSync stores. This is intentionally different from large bridge/project artifacts, whose bodies remain on the computer.
- No static character or assistant prompt was changed.
- Verification passed:
  - `pnpm vitest run utils/workbenchFileUpload.test.ts utils/workbenchWebpageSharing.test.ts` (7 tests)
  - `pnpm vitest run utils/workbenchFileUpload.test.ts utils/workbenchWebpageSharing.test.ts utils/backupRoundtrip.test.ts utils/quickSync.test.ts` (26 tests)
  - all 16 `utils/workbench*.test.ts` files (45 tests)
  - `pnpm build`

# 2026-08-03 Backup Coverage Audit: Code Files And Active Message 2.0

- Re-audited full export/import and QuickSync against the fork continuity rule. QuickSync is a record-level delta: unchanged rows are omitted, while a changed row is transferred in full and deletions use explicit keys/tombstones. It is not a byte-level diff within one row.
- User-uploaded Code text files remain complete inline `workbench_messages` / `workbench_artifacts` data and therefore carry their full text through both backup paths. Bridge/project artifacts remain metadata-only; their large file bodies stay on the connected computer because they are processing inputs rather than SullyOS-owned memory or creations.
- Character-level Active Message 2.0 switches, schedules and secondary-model config already travel inside `characters`; delivered chat messages travel inside `messages`.
- Added a portable mirror for Active Message 2.0 global `workerUrl`, `serverToken`, `userId` and timestamps. Full backup and QuickSync now include additions, changes and deletion of this connection identity. Existing installs lazily seed the mirror from the legacy `ActiveMsg` IndexedDB record.
- A synced deletion is marked locally so an older stale IndexedDB value cannot revive a Worker URL or token that the source device explicitly removed.
- Browser `PushSubscription`, device push endpoint, inbox, outbound sessions, pending tool calls, reasoning buffers, wake/runtime queues and expired-notice bookkeeping remain intentionally device-local. They describe an in-flight browser/Worker session, not portable user data; a restored device must grant notification permission and register its own subscription.
- Focused backup verification: `pnpm vitest run utils/activeMsgStore.test.ts utils/localSettingsBackup.test.ts utils/quickSync.test.ts utils/backupRoundtrip.test.ts utils/workbenchFileUpload.test.ts` (52 tests passed).
- Active Message client/runtime regression verification: 7 files, 221 tests passed.
- Production build: `pnpm build` passed.

# 2026-08-03 Code Session Run Panel And Interrupt

- Replaced the current-session three-dot-only execution state with one collapsible system run panel inside the Code message stream. It is scoped to the active Workbench session and disappears after the assistant output and artifacts are persisted.
- The bridge job now exposes a compact phase, readable activity, optional command/file/tool detail, and `lastActivityAt`. Codex app-server `turn/started`, `item/started`, item completion, and agent-message deltas feed that state; raw command output and file bodies are not streamed into the panel.
- Existing approval requests moved into the same panel. Decisions are recorded for the lifetime of the current job, showing whether the user allowed once, allowed for the session, or declined and what operation the decision covered.
- Added `POST /jobs/:jobId/cancel`. Default Codex app-server jobs use the official `turn/interrupt` request for that exact thread/turn. Claude Code and custom CLI jobs terminate their own spawned process tree. Neither path stops the persistent bridge service.
- Cancellation has its own `cancelling` / `cancelled` lifecycle and is not reported as a failed task. The panel remains visible while cancellation is being acknowledged, then clears.
- The panel is non-modal. A running execution still blocks a second AI/character execution in the same session, while ordinary Code messages, images, emoji and mobile text-file uploads remain available.
- Verification completed:
  - `node --check scripts/workbench-cli-bridge.mjs`
  - `pnpm vitest run utils/workbenchBackgroundTasks.test.ts utils/workbenchForegroundUx.test.ts` (12 tests passed)
  - all 16 `utils/workbench*.test.ts` files (49 tests passed)
  - `pnpm build`
  - mobile viewport inspection at 390 x 844; Code header, conversation area, index handle, composer and attachment controls do not overlap.

# 2026-08-20 Upstream Maintenance: Translation, Browser Back, Story Compatibility, And Conversation Restraint

## Adopted / In Integration

- Added the per-character expanded bilingual display preference: when translation is enabled, the original and translation can be rendered together instead of toggling each bubble. The preference is included in full backup/import.
- Added a browser-history guard for non-native web sessions. An edge-back/browser-back action while an app is open is re-routed to Sully's existing layered `handleBack` behavior instead of immediately leaving the site. Deep-link cleanup preserves the current history state marker.
- Added an opt-in Story Theater compatibility switch, `omitSamplingParams`. Normal Story Theater requests retain the preset's `top_p`, `frequency_penalty`, and `presence_penalty`; only an explicitly enabled per-story switch omits them for providers that reject advanced sampling fields. Do not restore the old behavior of silently dropping default-valued sampling fields for every provider.
- Added the confirmed memory-prompt restraint wording:
  - Pinned notes are remembered context, not a per-turn task list. They should not cause repeated progress checks or scheduling on the user's behalf.
  - Windowsill anticipations affect emotional texture rather than forcing repeated mentions.
- Added the confirmed conversational time-framing wording. It is intended only where a user is actively talking to a character; time influences tone and state, but does not automatically end a late-night conversation. Background generators must not receive this line as if a user were present.

## Upstream Work Still To Finish Before Calling This Batch Fully Synced

- VR World per-character reading-preference UI and scheduler selection are not yet merged. The intended behavior is: selected novels are preferred for that character; no selection retains all-library rotation.
- Story network-failure diagnosis has not yet been brought over. It must scope the extra "story context / assistant prefill / sampling" explanation to `剧情见面生成` requests only; ordinary chat, memory, and other fetches must retain generic diagnosis.

## Verification And Publishing Rule

- A production `pnpm build` passed after the in-progress integration changes.
- Do not describe the whole batch as released until the remaining VR/diagnosis work is merged, task files are committed without unrelated Memory Palace worktree changes, `master` is pushed, and the Vercel deployment succeeds.

# 2026-08-20 AMSG 2.0 Instant Chat Integration

- Added an independent `instantChatEnabled` global setting. It controls only user-initiated cloud chat; it does not enable the character's scheduled AMSG proactive-message switch and does not replace the fork's local proactive wake scheduler.
- Added the client `/instant-chat` submission path, persistent pending receipt, explicit failure reporting, and cloud outbox recovery on startup / foreground resume.
- Kept legacy Instant Push as the priority route when it is still configured, preventing one user message from being submitted to both cloud channels. The settings UI requires users to turn old Instant Push off before enabling AMSG instant chat.
- Added the Worker `/instant-chat` wrapper and immediate task execution path. Instant tasks bypass only proactive-message gates (disabled scheduling, active-chat yield, music-wake yield, and conversation-expiry checks); ordinary scheduled proactive tasks retain all existing fork guards.
- Added a bounded per-character `chat_outbox` fallback so a generated reply can be recovered when Web Push is silently lost. No API key, Worker token, message body, or push endpoint is written to diagnostic logs.
- Updated the generated AMSG Worker bundle.
- Verification passed:
  - `pnpm vitest run utils/activeMsgClient.test.ts utils/activeMsgRuntime.test.ts utils/amsgFirePack.test.ts worker/amsg/src/index.test.ts` (371 tests)
  - `pnpm vitest run utils/amsgInstantChat.test.ts` (30 tests)
  - `pnpm build`
- This integration is local only at the time of writing; it has not been committed, pushed, or deployed.

# 2026-08-20 Unified Fast Reply In The AMSG Worker

- Mounted the maintained Instant `/instant`, `/continue`, `/version`, and `/blob/*` handlers inside the existing AMSG Worker bundle. Fast user-initiated replies keep the SSE + backup Web Push delivery contract and no longer pass through the minute-based `scheduled_messages` queue.
- Scheduled AMSG tasks and the fork's proactive-wake runtime remain separate. Enabling fast reply disables only the older `/instant-chat` takeover switch; it does not enable, disable, cancel, or duplicate proactive tasks.
- The Active Message 2.0 settings panel now configures the shared AMSG Worker URL as the fast-reply endpoint, reuses `AMSG_SERVER_TOKEN` as the client token, enables send-to-reply behavior, and uses multipart for oversized requests. A second Instant Worker and second D1 blob setup are no longer required.
- The chat lightning button uses the fast route whenever that route is ready; otherwise it retains the local foreground path.
- Updated the delivery-mailbox test to use a live timestamp instead of an already-expired fixed fixture date.
- Verification passed:
  - `pnpm vitest run worker/amsg/src/deliveryMailbox.test.ts worker/amsg/src/index.test.ts utils/instantPushClient.test.ts utils/amsgInstantChat.test.ts` (177 tests)
  - `pnpm build`
- This integration is local only at the time of writing; both the website and the AMSG Worker bundle must be published before the new switch works on the deployed app.

# 2026-08-20 Queue-Backed Full-Context Instant Reply

- Replaced the unified mode's long-lived browser SSE dependency with the existing encrypted AMSG `/instant-chat` submission plus a Cloudflare Queue consumer.
- The complete, untrimmed text context remains encrypted in the existing D1 `client_state` / `scheduled_messages` data. Queue messages contain only a task UUID, user ID and timestamp, so a 248 KB conversation is not copied into or limited by the queue payload.
- The HTTP request now finishes after durable state, task creation and queue admission. Locking an iPhone or freezing the PWA after the `202` response no longer owns the model-generation lifetime.
- Queue work acknowledges only after the scheduled worker execution completes. Failures retry after 60 seconds; queue admission failures retain the old immediate `waitUntil` attempt, and the existing once-per-minute cron remains the final recovery path.
- Unified fast reply remains manual: sending text does not start generation; the chat-header lightning button does. Scheduled proactive messages and the fork's local proactive wake scheduler keep independent switches.
- Enabling the new mode disables only a legacy Instant SSE configuration that points at the same AMSG Worker URL. A separately deployed legacy Instant Worker is left untouched.
- Deployment now requires one Cloudflare Queue named `sullyos-amsg-instant`; the fork-sync deployment guides document the one-time creation step.
- Verification passed:
  - `pnpm vitest run worker/amsg/src/instantChat.queue.test.ts utils/amsgInstantChat.test.ts worker/amsg/src/index.test.ts` (167 tests)
  - `pnpm build`
- This batch is local only at the time of writing; it has not been committed, pushed, or deployed.
