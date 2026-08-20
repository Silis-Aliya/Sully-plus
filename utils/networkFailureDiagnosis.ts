export interface StoryRequestDiagnosisInput {
    url: string;
    method?: string;
    durationMs: number;
    error: unknown;
    messageCount: number;
    bodyChars: number;
}

/** 只描述剧情续写请求，不把鉴权头、正文或其它 App 的请求混进诊断。 */
export const diagnoseStoryRequestFailure = (input: StoryRequestDiagnosisInput): string => {
    const message = String((input.error as any)?.message || input.error || '未知网络错误');
    const host = (() => { try { return new URL(input.url).host; } catch { return input.url; } })();
    const lines = [
        `剧情请求诊断：${(input.method || 'POST').toUpperCase()} ${host}，等待 ${Math.max(0, Math.round(input.durationMs))}ms 后失败。`,
        `请求规模：${input.messageCount} 条上下文，序列化正文约 ${input.bodyChars.toLocaleString()} 字符。`,
    ];
    if (/failed to fetch|load failed|networkerror|network request failed/i.test(message)) {
        lines.push('浏览器没有拿到可读取的 HTTP 响应。常见于上游超时/断流、错误响应缺少 CORS 头，或当前剧情上下文超过中转限制。');
    } else if (/abort|timeout/i.test(message)) {
        lines.push('请求被中止或超时；优先检查中转超时限制与剧情上下文长度。');
    } else if (/API Error 4(?:00|13|22)/i.test(message)) {
        lines.push('上游拒绝了剧情请求格式或体积；可尝试兼容模式、关闭采样参数，或缩短剧情上下文。');
    } else if (/API Error 429/i.test(message)) {
        lines.push('上游正在限流；稍后重试或切换 API。');
    } else if (/API Error 5\d\d/i.test(message)) {
        lines.push('上游服务或中转返回服务器错误；请求已经发出，通常不是本地数据库问题。');
    } else {
        lines.push(`原始错误：${message}`);
    }
    return lines.join('\n');
};
