/**
 * Bilibili 视频下载服务
 * 通过 playurl API 获取视频流，下载到本地临时文件供 OCR 使用
 */
export interface DownloadResult {
    filePath: string;
    title: string;
    bvid: string;
    /** 保存到本地 downloads 目录的路径 */
    savedPath: string | null;
    cleanup: () => void;
}
/**
 * 完整流程：下载 B站视频到本地临时文件，并保存到 downloads 目录
 */
export declare function downloadBilibiliVideo(videoUrl: string, cookie?: string): Promise<DownloadResult>;
//# sourceMappingURL=bilibili-download.d.ts.map