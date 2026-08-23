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

  useEffect(() => {
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
      <button type="button" aria-label="关闭通话准备引导" className="absolute inset-0" onClick={onClose} />
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
              <div className="text-[9px] font-semibold tracking-[0.28em]" style={{ color: muted }}>{step === 'performance' ? 'SETTINGS & REHEARSAL' : 'VIDEO LINK / PREPARATION'}</div>
              <h2 id="call-setup-guide-title" className="mt-1.5 text-[23px] font-semibold leading-none">
                {step === 'overview' ? `${characterName} · 连线设置` : step === 'model' ? '选择对方的视频形象。' : step === 'performance' ? '模型画质、导入与动作排练' : '你要怎样入镜？'}
              </h2>
              {step !== 'performance' && <p className="mt-2 text-[11px] leading-5" style={{ color: muted }}>
                {step === 'overview'
                  ? '分别调整对方形象、模型表现和本次通话的镜头方式。'
                  : step === 'model'
                  ? `动态模型、静态图片和见面立绘都在这里切换，桌面与视频通话共用同一选择。`
                  : step === 'performance'
                    ? '画质与动作排练按角色保存；模型导入沿用现有安全流程。'
                  : '选择只对本次通话生效；下次打开仍从关闭开始。'}
              </p>}
            </div>
            <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border active:scale-90" style={{ borderColor: line }} aria-label="关闭">
              <X size={15} weight="bold" />
            </button>
          </div>

          {step !== 'overview' && step !== 'performance' && <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[9px] font-medium tracking-[0.12em]" style={{ color: muted }}>
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
            <>
              <section className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: `${accentColor}66`, color: accentColor, background: `${accentColor}12` }}>
                    <Cube size={20} weight="fill" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-semibold tracking-[0.2em]" style={{ color: muted }}>CURRENT CAST</div>
                    <div className="mt-1 truncate text-[14px] font-medium">{visualName}</div>
                    <div className="mt-0.5 text-[10px]" style={{ color: muted }}>{visualDetail}</div>
                  </div>
                  {visualAvailable && <Check size={17} weight="bold" style={{ color: accentColor }} />}
                </div>
              </section>

              <section className="border-t" style={{ borderColor: line }}>
                <div className="grid grid-cols-3 gap-1.5 border-b p-2" style={{ borderColor: line }}>
                  {([
                    ['model', '动态模型'],
                    ['upload', '静态图片'],
                    ['date', '见面立绘'],
                  ] as const).map(([source, label]) => {
                    const active = avatarSource === source;
                    return (
                      <button
                        key={source}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChooseAvatarSource(source)}
                        className="rounded-xl border px-2 py-2 text-[10px] font-medium transition active:scale-[.98]"
                        style={{ borderColor: active ? `${accentColor}88` : line, color: active ? accentColor : muted, background: active ? `${accentColor}12` : undefined }}
                      >
                        {active && <Check size={10} weight="bold" className="mr-1 inline" />}{label}
                      </button>
                    );
                  })}
                </div>

                {avatarSource === 'model' ? (
                  <>
                    <button type="button" onClick={onChooseModelFile} className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b px-5 py-3.5 text-left active:bg-current/[.035]" style={{ borderColor: line }}>
                      <FileZip size={18} style={{ color: accentColor }} />
                      <span><span className="block text-[13px] font-medium">模型文件</span><span className="mt-0.5 block text-[10px]" style={{ color: muted }}>Live2D ZIP 或 VRM；.vroid 会提示先导出</span></span>
                      <ArrowRight size={14} style={{ color: muted }} />
                    </button>
                    <button type="button" onClick={onChooseLive2DFolder} className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b px-5 py-3.5 text-left active:bg-current/[.035]" style={{ borderColor: line }}>
                      <FolderOpen size={18} style={{ color: accentColor }} />
                      <span><span className="block text-[13px] font-medium">Live2D 完整文件夹</span><span className="mt-0.5 block text-[10px]" style={{ color: muted }}>选择包含 model3.json 的整个目录</span></span>
                      <ArrowRight size={14} style={{ color: muted }} />
                    </button>
                    {modelFormat === 'live2d' && onConfigureLive2D && (
                      <button type="button" onClick={onConfigureLive2D} className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3.5 text-left active:bg-current/[.035]">
                        <Gear size={18} style={{ color: accentColor }} />
                        <span><span className="block text-[13px] font-medium">校准构图、动作与真·衣橱</span><span className="mt-0.5 block text-[10px]" style={{ color: muted }}>预览保持常驻，动作与参数在悬浮设置窗里调整</span></span>
                        <ArrowRight size={14} style={{ color: muted }} />
                      </button>
                    )}
                  </>
                ) : avatarSource === 'upload' ? (
                  <button type="button" onClick={onChooseStaticImage} className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-4 text-left active:bg-current/[.035]">
                    <ImageSquare size={18} style={{ color: accentColor }} />
                    <span><span className="block text-[13px] font-medium">{staticImageName ? '更换 PNG / GIF' : '导入 PNG / GIF'}</span><span className="mt-0.5 block text-[10px]" style={{ color: muted }}>同一张图会同时用于陪伴桌面与视频通话</span></span>
                    <ArrowRight size={14} style={{ color: muted }} />
                  </button>
                ) : (
                  <button type="button" onClick={onManageDatePortraits} className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-4 text-left active:bg-current/[.035]">
                    <ImageSquare size={18} style={{ color: accentColor }} />
                    <span><span className="block text-[13px] font-medium">{hasDatePortraits ? '管理见面立绘表情' : '添加见面立绘'}</span><span className="mt-0.5 block text-[10px]" style={{ color: muted }}>沿用见面模式的服装与表情；AI 只按通话情绪切同套表情</span></span>
                    <ArrowRight size={14} style={{ color: muted }} />
                  </button>
                )}
              </section>

              <p className="border-t px-5 py-3 text-[10px] leading-5" style={{ borderColor: line, color: muted }}>
                {avatarSource === 'model'
                  ? '导入 Live2D 后会自动进入动作与衣橱设置。衣橱动作强制仅手动；VRM 目前仍是测试功能。'
                  : avatarSource === 'date'
                    ? '见面立绘使用静态表情管线，不会调用 Live2D 动作；服装仍由你手动选择。'
                    : '单张 PNG / GIF 不切换表情；需要情绪表情时可选择见面立绘。'}
              </p>
            </>
          ) : (
            <section>
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
                    className="grid w-full grid-cols-[2.7rem_1fr_auto] items-center gap-3 border-b px-5 py-3.5 text-left transition last:border-b-0 active:bg-current/[.035]"
                    style={{ borderColor: line, background: active ? `${accentColor}0e` : undefined }}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-semibold" style={{ borderColor: active ? accentColor : line, color: active ? accentColor : muted }}>{option.index}</span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium">{option.title}</span>
                      <span className="mt-0.5 block text-[10px] leading-4" style={{ color: muted }}>{option.detail}</span>
                    </span>
                    <span className="text-right text-[9px] font-medium tracking-[.08em]" style={{ color: active ? accentColor : muted }}>{needsImage ? '选图片' : option.data}</span>
                  </button>
                );
              })}
              <p className="border-t px-5 py-3 text-[10px] leading-5" style={{ borderColor: line, color: muted }}>
                本地情绪只注入“识别到的情绪”文字，不上传摄像头画面；每轮快照会在点击发送时截取一帧，并仅在本机记录保留最近 3 轮。静态机位永远不随消息发送。
              </p>
            </section>
          )}
        </div>

        {step === 'overview' ? (
          <footer className="px-5 pt-4">
            <button type="button" onClick={onClose} className="min-h-12 w-full rounded-2xl bg-[#3b82f6] px-4 text-[13px] font-semibold text-white active:scale-[.98]">完成</button>
          </footer>
        ) : <footer className="grid grid-cols-[auto_1fr] gap-2.5 px-5 pt-4">
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
