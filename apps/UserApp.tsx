
import React, { useRef, useState } from 'react';
import TokenImg from '../components/os/TokenImg';
import { useOS } from '../context/OSContext';
import { processImage } from '../utils/file';
import LifeRecordPanel from '../components/lifeRecord/LifeRecordPanel';
import PerCharAvatarPicker from '../components/user/PerCharAvatarPicker';
import { EARS_LITE_BASELINE_TARGET, getEarsLiteBaselineStatus } from '../utils/earsLite';
import { deleteTencentSpeaker, enrollTencentSpeaker, prepareVoiceCloudAudio, profileVoiceWithXfyun, verifyTencentSpeaker } from '../utils/voiceCloud';
import { trackEvent } from '../utils/analytics';

const UserApp: React.FC = () => {
    const { closeApp, userProfile, updateUserProfile, addToast, apiConfig, updateApiConfig } = useOS();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [tab, setTab] = useState<'profile' | 'life'>('profile');
    const [enrollBusy, setEnrollBusy] = useState(false);
    const [profileBusy, setProfileBusy] = useState(false);
    const [verifyBusy, setVerifyBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [enrollStatus, setEnrollStatus] = useState('');
    const [profileStatus, setProfileStatus] = useState('');
    const [verifyStatus, setVerifyStatus] = useState('');
    const [deleteStatus, setDeleteStatus] = useState('');
    const baselineStatus = getEarsLiteBaselineStatus();

    const recordVoiceProfileClip = async (durationMs = 6500): Promise<Blob> => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            throw new Error('当前浏览器不支持录音');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        try {
            const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
            const mimeType = mimeCandidates.find(type => {
                try { return MediaRecorder.isTypeSupported(type); } catch { return false; }
            }) || '';
            return await new Promise<Blob>((resolve, reject) => {
                const chunks: BlobPart[] = [];
                let recorder: MediaRecorder;
                try {
                    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
                } catch (err) {
                    reject(err);
                    return;
                }
                const timer = window.setTimeout(() => {
                    try { if (recorder.state !== 'inactive') recorder.stop(); } catch {}
                }, durationMs);
                recorder.ondataavailable = event => {
                    if (event.data && event.data.size > 0) chunks.push(event.data);
                };
                recorder.onerror = () => {
                    window.clearTimeout(timer);
                    reject(new Error('录音失败'));
                };
                recorder.onstop = () => {
                    window.clearTimeout(timer);
                    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
                    if (blob.size < 500) reject(new Error('录音太短或没有声音，请靠近麦克风再试'));
                    else resolve(blob);
                };
                recorder.start();
            });
        } finally {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const voiceProfileSummary = (profile?: typeof userProfile.voiceProfile) => {
        if (!profile?.summary) return '暂无';
        return profile.summary;
    };

    const buildVoiceProfileSummary = (result: any) => {
        const gender = result.gender === 'female' ? '偏女声' : result.gender === 'male' ? '偏男声' : '';
        const age = result.age === 'child' ? '少年/儿童听感' : result.age === 'middle' ? '中青年听感' : result.age === 'old' ? '年长听感' : '';
        return [gender, age].filter(Boolean).join('，') || '声音画像已记录';
    };

    const handleBuildVoiceProfile = async () => {
        if (profileBusy) return;
        if (!apiConfig.ears?.xfyunAppId) {
            addToast('请先到设置 → 语音识别 / Ears Lite 填讯飞 APPID，并在 Worker 配好 XFYUN_API_KEY / XFYUN_API_SECRET', 'error');
            return;
        }
        setProfileBusy(true);
        setProfileStatus('正在录制声音画像样本...');
        try {
            const blob = await recordVoiceProfileClip();
            setProfileStatus('正在分析声音画像...');
            const prepared = await prepareVoiceCloudAudio(blob);
            const result = await profileVoiceWithXfyun(prepared, apiConfig.ears.xfyunAppId);
            const summary = buildVoiceProfileSummary(result);
            updateUserProfile({
                voiceProfile: {
                    ...(userProfile.voiceProfile || {}),
                    updatedAt: Date.now(),
                    baselineCount: baselineStatus.count,
                    summary,
                    gender: result.gender,
                    age: result.age,
                    genderScores: result.genderScores,
                    ageScores: result.ageScores,
                },
            });
            setProfileStatus('声音画像已更新');
            addToast('声音画像已更新', 'success');
        } catch (err: any) {
            setProfileStatus(err?.message || '声音画像建立失败');
            addToast(err?.message || '声音画像建立失败', 'error');
        } finally {
            setProfileBusy(false);
        }
    };

    const handleVerifyVoiceIdentity = async () => {
        if (verifyBusy) return;
        if (!apiConfig.ears?.tencentVoicePrintId) {
            addToast('请先到设置 → 语音识别 / Ears Lite 填机主 VoicePrintId，并在 Worker 配好腾讯云 Secret', 'error');
            return;
        }
        setVerifyBusy(true);
        setVerifyStatus('正在录制身份验证样本...');
        try {
            const blob = await recordVoiceProfileClip(4200);
            setVerifyStatus('正在验证是不是机主...');
            const prepared = await prepareVoiceCloudAudio(blob);
            const result = await verifyTencentSpeaker(prepared, apiConfig.ears.tencentVoicePrintId);
            updateUserProfile({
                voiceProfile: {
                    ...(userProfile.voiceProfile || {}),
                    baselineCount: baselineStatus.count,
                    lastIdentityStatus: result.status,
                    lastIdentityScore: result.score,
                    lastIdentityAt: Date.now(),
                },
            });
            const label = result.status === 'matched' ? '像机主本人' : result.status === 'unmatched' ? '不像机主本人' : '无法确定';
            setVerifyStatus(`身份验证：${label}`);
            addToast(`身份验证：${label}`, result.status === 'matched' ? 'success' : 'error');
        } catch (err: any) {
            setVerifyStatus(err?.message || '身份验证失败');
            addToast(err?.message || '身份验证失败', 'error');
        } finally {
            setVerifyBusy(false);
        }
    };

    const handleEnrollVoiceIdentity = async () => {
        if (enrollBusy) return;
        setEnrollBusy(true);
        setEnrollStatus('正在录制声纹注册样本...');
        try {
            const blob = await recordVoiceProfileClip(6500);
            setEnrollStatus('正在注册腾讯云声纹...');
            const prepared = await prepareVoiceCloudAudio(blob);
            const result = await enrollTencentSpeaker(prepared, userProfile.name || 'SullyOS User');
            if (!result.voicePrintId) throw new Error('腾讯云没有返回 VoicePrintId，请换一段更清晰的声音再试');
            updateApiConfig({
                ears: {
                    ...(apiConfig.ears || {}),
                    tencentVoicePrintId: result.voicePrintId,
                },
            });
            setEnrollStatus(`声纹已注册：${result.voicePrintId}`);
            addToast('声纹已注册，VoicePrintId 已自动保存', 'success');
        } catch (err: any) {
            setEnrollStatus(err?.message || '声纹注册失败');
            addToast(err?.message || '声纹注册失败', 'error');
        } finally {
            setEnrollBusy(false);
        }
    };

    const handleDeleteVoiceIdentity = async () => {
        if (deleteBusy) return;
        const voicePrintId = apiConfig.ears?.tencentVoicePrintId;
        if (!voicePrintId) {
            addToast('当前没有可删除的 VoicePrintId', 'error');
            return;
        }
        if (!window.confirm('确定删除腾讯云里的声纹 ID 吗？删除后需要重新注册声纹才能验证身份。')) return;
        setDeleteBusy(true);
        setDeleteStatus('正在删除腾讯云声纹...');
        try {
            await deleteTencentSpeaker(voicePrintId);
            updateApiConfig({
                ears: {
                    ...(apiConfig.ears || {}),
                    tencentVoicePrintId: undefined,
                },
            });
            const { lastIdentityStatus, lastIdentityScore, lastIdentityAt, ...voiceProfileRest } = userProfile.voiceProfile || {};
            updateUserProfile({
                voiceProfile: {
                    ...voiceProfileRest,
                    baselineCount: baselineStatus.count,
                },
            });
            setDeleteStatus('');
            setVerifyStatus('');
            addToast('声纹已删除，本地 VoicePrintId 已清空', 'success');
        } catch (err: any) {
            setDeleteStatus(err?.message || '声纹删除失败');
            addToast(err?.message || '声纹删除失败', 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await processImage(file);
                updateUserProfile({ avatar: base64 });
                addToast('头像已更新', 'success');
            } catch (err: any) {
                addToast(err.message, 'error');
            }
        }
    };

    return (
        <div className="h-full w-full bg-slate-50 flex flex-col animate-fade-in">
            {/* Header */}
            <div className="bg-white/70 backdrop-blur-md border-b border-slate-100 shrink-0 sticky top-0 z-10" style={{ paddingTop: 'var(--safe-top)' }}>
                <div className="flex items-center px-4 py-3 gap-2">
                    <button onClick={closeApp} className="p-2 -ml-2 rounded-full hover:bg-black/5 active:scale-90 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-6 h-6 text-slate-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-bold text-slate-700 tracking-wide">个人档案</h1>
                </div>
                {/* Tab：我的档案 / 生活记录 */}
                <div className="flex gap-1.5 px-4 pb-2.5">
                    {([['profile', '我的档案'], ['life', '生活记录']] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => { setTab(key); trackEvent('切换个人档案标签页', { tab: key }); }}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                tab === key ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-400'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-10 pt-5 space-y-5">
                {tab === 'life' && <LifeRecordPanel />}
                {tab === 'profile' && <>

                {/* Profile name card */}
                <div className="bg-white rounded-[1.75rem] shadow-[0_10px_30px_-12px_rgba(80,70,120,0.25)] border border-slate-100 overflow-hidden">
                    {/* Cover banner */}
                    <div className="relative h-24" style={{ background: 'linear-gradient(135deg, hsl(var(--primary-hue),var(--primary-sat),72%) 0%, hsl(var(--primary-hue),var(--primary-sat),60%) 100%)' }}>
                        {/* soft decorative blobs */}
                        <div className="absolute -top-6 -right-4 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }} />
                        <div className="absolute top-6 left-6 w-16 h-16 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
                    </div>

                    {/* Avatar overlapping the banner */}
                    <div className="px-6 pb-6 -mt-12">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-24 h-24 rounded-full cursor-pointer group mx-auto"
                        >
                            <div className="w-full h-full rounded-full ring-4 ring-white bg-slate-100 overflow-hidden shadow-md">
                                <TokenImg value={userProfile.avatar} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                            </div>
                            {/* camera badge */}
                            <div className="absolute bottom-0.5 right-0.5 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center ring-2 ring-white shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                                </svg>
                            </div>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        <p className="mt-2 text-center text-[10px] text-slate-400">整体头像：所有聊天的默认。想在某个角色那儿换一副面孔？下面「分角色聊天头像」里设。</p>

                        {/* Name field */}
                        <div className="mt-4">
                            <label className="text-[11px] font-bold text-slate-400 tracking-widest block text-center mb-1">你的名字</label>
                            <div className="relative">
                                <input
                                    value={userProfile.name}
                                    onChange={(e) => updateUserProfile({ name: e.target.value })}
                                    placeholder="点击输入名字"
                                    className="w-full bg-slate-50 focus:bg-white border border-transparent focus:border-primary/30 rounded-2xl px-4 py-3 text-xl font-bold text-slate-800 text-center outline-none transition-all placeholder:text-slate-300 placeholder:font-normal"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 分角色聊天头像：上面的整体头像是宏观默认，这里可给每个角色的私聊单独换「你」的头像 */}
                <PerCharAvatarPicker />

                {/* About / setting card */}
                <div className="bg-white rounded-[1.75rem] shadow-[0_10px_30px_-12px_rgba(80,70,120,0.18)] border border-slate-100 p-5">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                        </span>
                        <h2 className="text-sm font-bold text-slate-700">关于我 / 设定</h2>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">这些信息会发送给 AI，以便它更好地了解你（例如：大学生、喜欢吃辣、性格内向）。</p>
                    <textarea
                        value={userProfile.bio}
                        onChange={(e) => updateUserProfile({ bio: e.target.value })}
                        className="w-full h-52 bg-slate-50 focus:bg-white border border-slate-100 focus:border-primary/30 rounded-2xl px-4 py-3 text-sm text-slate-700 leading-relaxed resize-none outline-none transition-all placeholder:text-slate-300"
                        placeholder="描述你自己..."
                    />
                </div>

                <div className="bg-white rounded-[1.75rem] shadow-[0_10px_30px_-12px_rgba(80,70,120,0.18)] border border-slate-100 p-5">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center overflow-visible">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4 overflow-visible">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5.25a3 3 0 0 0-3 3v4.25a3 3 0 0 0 6 0V8.25a3 3 0 0 0-3-3Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 11.75a5.25 5.25 0 0 0 10.5 0M12 17v2.25M9.75 19.25h4.5" />
                                </svg>
                            </span>
                            <div>
                                <h2 className="text-sm font-bold text-slate-700">声音档案</h2>
                                <p className="text-[10px] text-slate-400">给角色认识你的长期声音画像</p>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${baselineStatus.ready ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>
                            基线 {Math.min(baselineStatus.count, EARS_LITE_BASELINE_TARGET)}/{EARS_LITE_BASELINE_TARGET}
                        </span>
                    </div>

                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">声音画像</span>
                            {userProfile.voiceProfile?.updatedAt && (
                                <span className="text-[10px] text-slate-400">{new Date(userProfile.voiceProfile.updatedAt).toLocaleDateString()}</span>
                            )}
                        </div>
                        <p className={`text-sm leading-relaxed ${userProfile.voiceProfile?.summary ? 'text-slate-700' : 'text-slate-300'}`}>
                            {voiceProfileSummary(userProfile.voiceProfile)}
                        </p>
                        {userProfile.voiceProfile?.lastIdentityStatus && (
                            <p className="text-[11px] text-slate-500">
                                最近身份验证：{userProfile.voiceProfile.lastIdentityStatus === 'matched' ? '像机主本人' : userProfile.voiceProfile.lastIdentityStatus === 'unmatched' ? '不像机主本人' : '无法确定'}
                                {typeof userProfile.voiceProfile.lastIdentityScore === 'number' ? ` · ${Math.round(userProfile.voiceProfile.lastIdentityScore * 10) / 10}` : ''}
                            </p>
                        )}
                        {apiConfig.ears?.tencentVoicePrintId && (
                            <p className="text-[10px] text-slate-400 font-mono break-all">
                                VoicePrintId: {apiConfig.ears.tencentVoicePrintId}
                            </p>
                        )}
                    </div>

                    {(enrollStatus || profileStatus || verifyStatus || deleteStatus) && (
                        <div className="mt-2 space-y-1">
                            {enrollStatus && <p className="text-[11px] text-indigo-600 leading-relaxed">{enrollStatus}</p>}
                            {profileStatus && <p className="text-[11px] text-sky-600 leading-relaxed">{profileStatus}</p>}
                            {verifyStatus && <p className="text-[11px] text-slate-500 leading-relaxed">{verifyStatus}</p>}
                            {deleteStatus && <p className="text-[11px] text-rose-500 leading-relaxed">{deleteStatus}</p>}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mt-3">
                        <button
                            type="button"
                            onClick={handleEnrollVoiceIdentity}
                            disabled={enrollBusy}
                            className="py-2.5 rounded-2xl bg-indigo-500 text-white text-xs font-bold active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-all"
                        >
                            {enrollBusy ? '处理中...' : apiConfig.ears?.tencentVoicePrintId ? '重新注册声纹' : '注册声纹'}
                        </button>
                        <button
                            type="button"
                            onClick={handleBuildVoiceProfile}
                            disabled={profileBusy}
                            className="py-2.5 rounded-2xl bg-sky-500 text-white text-xs font-bold active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-all"
                        >
                            {profileBusy ? '处理中...' : '建立声音画像'}
                        </button>
                        <button
                            type="button"
                            onClick={handleVerifyVoiceIdentity}
                            disabled={verifyBusy}
                            className="py-2.5 rounded-2xl bg-white text-sky-600 border border-sky-100 text-xs font-bold active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-all"
                        >
                            {verifyBusy ? '处理中...' : '验证身份'}
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteVoiceIdentity}
                            disabled={deleteBusy || !apiConfig.ears?.tencentVoicePrintId}
                            className="py-2.5 rounded-2xl bg-white text-rose-500 border border-rose-100 text-xs font-bold active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
                        >
                            {deleteBusy ? '处理中...' : '删除声纹'}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-3">
                        声音画像走讯飞抽样；身份验证走腾讯云声纹。密钥放在 Worker 环境变量里，前端只保存画像摘要和验证结果。
                    </p>
                </div>
                </>}
            </div>
        </div>
    );
};

export default UserApp;
