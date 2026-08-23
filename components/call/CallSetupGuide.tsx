import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Check, Cube, FileZip, FolderOpen, Gear, ImageSquare, X } from '@phosphor-icons/react';
import type { UserCameraMode } from './UserCameraModePicker';
import type { CompanionAvatarSource } from '../../utils/companionAvatar';

export type CallSetupGuideStep = 'overview' | 'model' | 'performance' | 'camera';

interface CallSetupGuideProps {
  step: CallSetupGuideStep;
  characterName: string;
  modelName?: string;
  modelFormat?: 'live2d' | 'vrm';
  builtinModel?: boolean;
  avatarSource: CompanionAvatarSource;
  staticImageName?: string;
  hasDatePortraits: boolean;
  dateOutfitName?: string;
  cameraMode: UserCameraMode;
  hasFakeImage: boolean;
  accentColor: string;
  lightTheme?: boolean;
  settingsMode?: boolean;
  builtinQuality?: 'balanced' | 'hd';
  performanceQuality?: 'basic' | 'high';
  onStepChange: (step: CallSetupGuideStep) => void;
  onChooseModelFile: () => void;
  onChooseLive2DFolder: () => void;
  onChooseBuiltinModel: () => void;
  onChooseAvatarSource: (source: CompanionAvatarSource) => void;
  onChooseStaticImage: () => void;
  onManageDatePortraits: () => void;
  onConfigureLive2D?: () => void;
  onCameraModeChange: (mode: UserCameraMode) => void;
  onChooseFakeImage: () => void;
  onStart: () => void;
  onClose: () => void;
  onBuiltinQualityChange?: (quality: 'balanced' | 'hd') => void;
  onPerformanceQualityChange?: (quality: 'basic' | 'high') => void;
}

const CAMERA_OPTIONS: Array<{
  id: UserCameraMode;
  index: string;
  title: string;
  detail: string;
  data: string;
}> = [
  { id: 'off', index: '0', title: '不打开', detail: '默认与最私密的选择', data: '不采集 · 不注入' },
  { id: 'fake', index: '1', title: '静态机位', detail: '放一张图，只用于通话画面和截图', data: '图片不发送' },
  { id: 'emotion', index: '2', title: '本地情绪', detail: '本机识别表情，用文字轻量矫正回复', data: '仅注入情绪文字' },
  { id: 'snapshot', index: '3', title: '每轮快照', detail: '点击发送时截一帧；本地记录只保留最近 3 轮', data: '旧图显示 [图片]' },
];

const CallSetupGuide: React.FC<CallSetupGuideProps> = ({
  step,
  characterName,
  modelName,
  modelFormat,
  builtinModel = false,
  avatarSource,
  staticImageName,
  hasDatePortraits,
  dateOutfitName,
  cameraMode,
  hasFakeImage,
  accentColor,
  lightTheme = false,
  settingsMode = false,
  builtinQuality = 'balanced',
  performanceQuality = 'basic',
  onStepChange,
  onChooseModelFile,
  onChooseLive2DFolder,
  onChooseBuiltinModel,
  onChooseAvatarSource,
  onChooseStaticImage,
  onManageDatePortraits,
  onConfigureLive2D,
  onCameraModeChange,
  onChooseFakeImage,
  onStart,
  onClose,
  onBuiltinQualityChange,
  onPerformanceQualityChange,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const ink = lightTheme ? '#1e293b' : '#f8f6ff';
  const muted = lightTheme ? 'rgba(100,116,139,.78)' : 'rgba(248,246,255,.48)';
  const line = lightTheme ? '#dbe3ee' : 'rgba(255,255,255,.11)';
  const panel = lightTheme ? '#f0f3f8' : '#100b19';
  const closeCurrentPage = () => {
    if (settingsMode && step !== 'overview') onStepChange('overview');
    else onClose();
  };

  useEffect(() => {
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCurrentPage();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, settingsMode, step]);

  const fakeImageMissing = cameraMode === 'fake' && !hasFakeImage;
  const visualAvailable = avatarSource === 'model' ? Boolean(modelName) : avatarSource === 'upload' ? Boolean(staticImageName) : hasDatePortraits;
  const visualName = avatarSource === 'upload'
    ? staticImageName || '尚未导入静态图片'
    : avatarSource === 'date'
      ? dateOutfitName || '尚未准备见面立绘'
      : modelName || '尚未绑定动态模型';
  const visualDetail = avatarSource === 'upload'
    ? 'PNG / GIF · 单图保持原样'
    : avatarSource === 'date'
      ? '见面立绘 · 按通话情绪切换同套表情'
      : modelFormat === 'live2d'
        ? 'Live2D · 可校准构图、动作与衣橱'
        : modelFormat === 'vrm' ? 'VRM · 测试支持' : '支持 Live2D ZIP / 文件夹与 VRM';

  return (
    <div className="absolute inset-0 z-[80] flex items-end bg-[#08050f]/72 backdrop-blur-sm" data-testid="call-setup-guide">
      <button type="button" aria-label="关闭通话准备引导" className="absolute inset-0" onClick={closeCurrentPage} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-setup-guide-title"
        tabIndex={-1}
        className="relative max-h-[88%] w-full overflow-hidden rounded-t-[2.25rem] border-t outline-none"
        style={{ color: ink, background: panel, borderColor: line, paddingBottom: 'max(1rem, var(--safe-bottom))' }}
        onClick={event => event.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-current opacity-15" />

        <header className="px-5 pb-4 pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[9px] font-semibold tracking-[0.28em]" style={{ color: muted }}>{step === 'performance' ? 'SETTINGS & REHEARSAL' : step === 'model' ? 'CHARACTER AVATAR' : 'VIDEO LINK / PREPARATION'}</div>
              <h2 id="call-setup-guide-title" className="mt-1.5 text-[23px] font-semibold leading-none">
                {step === 'overview' ? `${characterName} · 连线设置` : step === 'model' ? '选择对方形象' : step === 'performance' ? '模型画质、导入与动作排练' : '你要怎样入镜？'}
              </h2>
              {step !== 'performance' && <p className="mt-2 text-[11px] leading-5" style={{ color: muted }}>
                {step === 'overview'
                  ? '分别调整对方形象、模型表现和本次通话的镜头方式。'
                  : step === 'model'
                  ? '为当前联系人配置视频通话时的 2D 互动模型或静态立绘。'
                  : step === 'performance'
                    ? '画质与动作排练按角色保存；模型导入沿用现有安全流程。'
                  : '选择只对本次通话生效；下次打开仍从关闭开始。'}
              </p>}
            </div>
            <button type="button" onClick={closeCurrentPage} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border active:scale-90" style={{ borderColor: line }} aria-label={settingsMode && step !== 'overview' ? '返回连线设置' : '关闭'}>
              <X size={15} weight="bold" />
            </button>
          </div>

          {!settingsMode && step !== 'overview' && step !== 'performance' && <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[9px] font-medium tracking-[0.12em]" style={{ color: muted }}>
            <button type="button" onClick={() => onStepChange('model')} className="flex items-center gap-2 text-left" style={{ color: step === 'model' ? accentColor : undefined }}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: step === 'model' ? accentColor : line }}>01</span> 对方形象
            </button>
            <span className="h-px w-10" style={{ background: line }} />
            <button type="button" onClick={() => onStepChange('camera')} className="flex items-center justify-end gap-2 text-right" style={{ color: step === 'camera' ? accentColor : undefined }}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: step === 'camera' ? accentColor : line }}>02</span> 我的镜头
            </button>
          </div>}
        </header>

        <div className="max-h-[56vh] overflow-y-auto border-y no-scrollbar" style={{ borderColor: line }}>
          {step === 'overview' ? (
            <section className="space-y-2.5 px-5 py-5">
              {[
                { id: 'model' as const, label: '对方形象', value: visualName },
                { id: 'performance' as const, label: '模型画质、导入与动作排练', value: `${builtinQuality === 'hd' ? '高清 4K' : '轻量 2K'} · ${performanceQuality === 'high' ? '高质量版' : '基础版'}` },
                { id: 'camera' as const, label: '我的镜头', value: CAMERA_OPTIONS.find(option => option.id === cameraMode)?.title || '不打开' },
              ].map(item => (
                <button key={item.id} type="button" onClick={() => onStepChange(item.id)} className="flex w-full items-center justify-between gap-4 rounded-[18px] border bg-white px-4 py-4 text-left outline-none active:scale-[.99]" style={{ borderColor: line }}>
                  <span className="text-[13px] font-bold text-[#1e293b]">{item.label}</span>
                  <span className="flex min-w-0 items-center gap-2 text-[12px] text-[#64748b]"><span className="truncate">{item.value}</span><ArrowRight size={14} /></span>
                </button>
              ))}
            </section>
          ) : step === 'performance' ? (
            <section className="space-y-3 px-5 py-5">
              <div className="rounded-[18px] border bg-[#f8fafc] p-4" style={{ borderColor: line }}>
                <div className="mb-3 flex items-center justify-between gap-3"><span className="text-[13px] font-bold text-[#1e293b]">内置模型画质</span><span className="text-[10px] text-[#64748b]">默认 2K · 省约 48 MB 显存</span></div>
                <div className="grid grid-cols-2 gap-2">
                  {([['balanced', '轻量 2K', '推荐'], ['hd', '高清 4K', '高性能设备']] as const).map(([value, label, detail]) => (
                    <button key={value} type="button" disabled={!onBuiltinQualityChange} onClick={() => onBuiltinQualityChange?.(value)} className="rounded-[14px] border bg-white p-3 text-left outline-none disabled:opacity-45" style={{ borderColor: builtinQuality === value ? accentColor : line, background: builtinQuality === value ? '#eff6ff' : '#fff', borderWidth: builtinQuality === value ? 2 : 1 }}>
                      <span className="block text-[13px] font-bold">{label}</span><span className="mt-1 block text-[10px]" style={{ color: muted }}>{detail}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={onChooseModelFile} className="flex items-center justify-center gap-2 rounded-[12px] border bg-white px-3 py-3 text-[12px] font-semibold" style={{ borderColor: line }}><FileZip size={17} /> VRM / L2D ZIP</button>
                  <button type="button" onClick={onChooseLive2DFolder} className="flex items-center justify-center gap-2 rounded-[12px] border bg-white px-3 py-3 text-[12px] font-semibold" style={{ borderColor: line }}><FolderOpen size={17} /> L2D 文件夹</button>
                </div>
                <p className="mt-3 text-[10px] leading-4 text-[#64748b]">L2D 文件夹：选择包含 *.model3.json 的整个文件夹；ZIP：把这个模型文件夹整体压缩后选择 ZIP。</p>
              </div>
              <div className="rounded-[16px] border bg-[#f8fafc]" style={{ borderColor: line }}>
                <button type="button" onClick={() => setAdvancedOpen(value => !value)} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[13px] font-bold"><span>Live2D 高级工具</span><span className={`text-[#64748b] transition ${advancedOpen ? 'rotate-180' : ''}`}>⌄</span></button>
                {advancedOpen && <div className="border-t p-3" style={{ borderColor: line }}>
                  {modelFormat === 'live2d' && onConfigureLive2D ? <button type="button" onClick={onConfigureLive2D} className="flex w-full items-center justify-between rounded-[12px] border bg-white px-3 py-3 text-left text-[12px]" style={{ borderColor: line }}><span className="flex items-center gap-2"><Gear size={17} style={{ color: accentColor }} />动作权限与参数实验台</span><ArrowRight size={14} /></button> : <p className="text-[10px] text-[#64748b]">导入 Live2D 后可使用动作权限与参数实验台。</p>}
                </div>}
              </div>
              <div className="rounded-[18px] border bg-[#f8fafc] p-4" style={{ borderColor: line }}>
                <div className="mb-3 flex items-start justify-between"><div><div className="text-[13px] font-bold text-[#1e293b]">动作排练</div><div className="mt-0.5 text-[10px] text-[#64748b]">每个角色单独保存</div></div><span className="text-[10px] font-bold text-[#64748b]">{performanceQuality === 'high' ? 'DIRECTOR' : 'BASIC'}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  {([['basic', '基础版', '零额外请求'], ['high', '高质量版', '副 API 排练']] as const).map(([value, label, detail]) => (
                    <button key={value} type="button" onClick={() => onPerformanceQualityChange?.(value)} className="rounded-[14px] border bg-white p-3 text-left outline-none" style={{ borderColor: performanceQuality === value ? accentColor : line, background: performanceQuality === value ? '#eff6ff' : '#fff', borderWidth: performanceQuality === value ? 2 : 1 }}>
                      <span className="block text-[13px] font-bold">{label}</span><span className="mt-1 block text-[10px]" style={{ color: muted }}>{detail}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-4 text-[#64748b]">高质量版只把本轮定稿台词和角色性格交给情绪 Buff 的 API，不读取聊天上下文；未单独配置副 API 时回退主 API。</p>
              </div>
            </section>
          ) : step === 'model' ? (
            <section className="space-y-3 px-5 py-5">
              {([
                {
                  id: 'builtin', index: '1', title: 'Sully · 默认内置模型', detail: '自带全套物理与表情反馈', tag: '内置',
                  active: avatarSource === 'model' && builtinModel,
                  action: onChooseBuiltinModel,
                },
                {
                  id: 'custom', index: '2', title: '自定义 Live2D 文件夹', detail: '使用用户已导入的专属模型', tag: '模型',
                  active: avatarSource === 'model' && Boolean(modelName) && !builtinModel,
                  action: () => avatarSource === 'model' && modelName && !builtinModel ? onChooseAvatarSource('model') : onChooseLive2DFolder(),
                },
                {
                  id: 'static', index: '3', title: '静态高清立绘模式', detail: '仅展示精美立绘，不加载骨骼动作', tag: '省显存',
                  active: avatarSource === 'upload' || avatarSource === 'date',
                  action: () => avatarSource === 'date' ? onChooseAvatarSource('date') : onChooseAvatarSource('upload'),
                },
              ] as const).map(option => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={option.active}
                  onClick={option.action}
                  className="flex w-full items-center justify-between gap-3 rounded-[18px] border bg-[#f8fafc] px-4 py-4 text-left outline-none transition active:scale-[.99]"
                  style={{ borderColor: option.active ? accentColor : line, borderWidth: option.active ? 2 : 1, background: option.active ? '#eff6ff' : '#f8fafc' }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold" style={{ borderColor: option.active ? accentColor : '#cbd5e1', color: option.active ? '#fff' : ink, background: option.active ? accentColor : 'transparent' }}>{option.index}</span>
                    <span className="min-w-0"><span className="block text-[13px] font-bold text-[#1e293b]">{option.title}</span><span className="mt-0.5 block text-[10px] leading-4 text-[#64748b]">{option.detail}</span></span>
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-[#64748b]">{option.tag}</span>
                </button>
              ))}
              <p className="rounded-[14px] border bg-[#f8fafc] px-4 py-3 text-[10px] leading-5 text-[#64748b]" style={{ borderColor: line }}>
                切换形象会即时重新加载对应渲染节点，视频连线时将基于选中的模型进行同步展示。
              </p>
            </section>
          ) : (
            <section className="space-y-3 px-5 py-5">
              {CAMERA_OPTIONS.map(option => {
                const active = cameraMode === option.id;
                const needsImage = option.id === 'fake' && !hasFakeImage;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onCameraModeChange(option.id);
                      if (needsImage) onChooseFakeImage();
                    }}
                    className="grid w-full grid-cols-[2.7rem_1fr_auto] items-center gap-3 rounded-[18px] border bg-[#f8fafc] px-4 py-4 text-left outline-none transition active:scale-[.99]"
                    style={{ borderColor: active ? accentColor : line, borderWidth: active ? 2 : 1, background: active ? '#eff6ff' : '#f8fafc' }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-semibold" style={{ borderColor: active ? accentColor : '#cbd5e1', color: active ? '#fff' : ink, background: active ? accentColor : 'transparent' }}>{option.index}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-[#1e293b]">{option.title}</span>
                      <span className="mt-0.5 block text-[10px] leading-4 text-[#64748b]">{option.detail}</span>
                    </span>
                    <span className="text-right text-[9px] font-medium tracking-[.04em] text-[#64748b]">{needsImage ? '选图片' : option.data}</span>
                  </button>
                );
              })}
              <p className="rounded-[14px] border bg-[#f8fafc] px-4 py-3 text-[10px] leading-5 text-[#64748b]" style={{ borderColor: line }}>
                本地情绪只注入“识别到的情绪”文字，不上传摄像头画面；每轮快照会在点击发送时截取一帧，并仅在本机记录保留最近 3 轮。静态机位永远不随消息发送。
              </p>
            </section>
          )}
        </div>

        {step === 'overview' ? (
          <footer className="px-5 pt-4">
            <button type="button" onClick={onClose} className="min-h-12 w-full rounded-2xl bg-[#3b82f6] px-4 text-[13px] font-semibold text-white active:scale-[.98]">完成</button>
          </footer>
        ) : settingsMode ? null : <footer className="grid grid-cols-[auto_1fr] gap-2.5 px-5 pt-4">
          {settingsMode ? (
            <button type="button" onClick={() => onStepChange('overview')} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-4 text-[12px] font-medium active:scale-[.98]" style={{ borderColor: line, color: muted }}>
              <ArrowLeft size={14} /> 设置
            </button>
          ) : step === 'camera' ? (
            <button type="button" onClick={() => onStepChange('model')} className="flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-4 text-[12px] font-medium active:scale-[.98]" style={{ borderColor: line, color: muted }}>
              <ArrowLeft size={14} /> 模型
            </button>
          ) : (
            <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border px-4 text-[12px] font-medium active:scale-[.98]" style={{ borderColor: line, color: muted }}>稍后</button>
          )}
          <button
            type="button"
            disabled={fakeImageMissing}
            onClick={() => settingsMode ? onStepChange('overview') : step === 'model' ? onStepChange('camera') : onStart()}
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[13px] font-semibold text-white transition active:scale-[.98] disabled:opacity-40"
            style={{ background: `linear-gradient(100deg, ${accentColor}c8, ${accentColor})`, boxShadow: `0 10px 28px ${accentColor}2f` }}
          >
            {settingsMode ? '保存并返回' : step === 'model' ? '下一步：设置我的镜头' : fakeImageMissing ? '先选择静态图片' : '按这个方案接通'} <ArrowRight size={15} weight="bold" />
          </button>
        </footer>}
      </div>
    </div>
  );
};

export default CallSetupGuide;
