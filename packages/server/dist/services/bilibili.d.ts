/**
 * Bilibili 字幕提取服务
 * 支持从 B站视频链接提取 AI 自动生成字幕或手动上传字幕
 */
export interface SubtitleItem {
    from: number;
    to: number;
    sid: number;
    content: string;
}
export interface SubtitleResult {
    title: string;
    bvid: string;
    subtitles: SubtitleItem[];
    text: string;
}
/**
 * 从 URL 中解析 BV 号
 */
export declare function parseBvid(url: string): string | null;
/**
 * 获取视频基本信息（aid, cid, title）
 */
export declare function getVideoInfo(bvid: string): Promise<{
    aid: number;
    cid: number;
    title: string;
}>;
/**
 * 获取字幕列表
 */
export declare function getSubtitleList(aid: number, cid: number, cookie?: string): Promise<Array<{
    lan: string;
    lan_doc: string;
    subtitle_url: string;
}>>;
/**
 * 下载并解析字幕 JSON
 */
export declare function downloadSubtitle(subtitleUrl: string): Promise<SubtitleItem[]>;
/**
 * 将字幕数组转为纯文本
 */
export declare function subtitlesToText(subtitles: SubtitleItem[]): string;
/**
 * 完整流程：从 Bilibili URL 提取字幕
 */
export declare function extractSubtitle(videoUrl: string, cookie?: string): Promise<SubtitleResult>;
//# sourceMappingURL=bilibili.d.ts.map