/**
 * OCR 字幕提取服务
 * 从视频文件中抽帧 → 裁剪字幕区域 → OCR 识别 → 去重拼接
 */
export interface OCRProgress {
    stage: string;
    message: string;
    current?: number;
    total?: number;
}
export type ProgressCallback = (progress: OCRProgress) => void;
/**
 * 完整 OCR 字幕提取流程
 * 视频文件 → 抽帧 → OCR → 去重 → 拼接文本
 */
export declare function ocrExtractSubtitle(videoPath: string, onProgress?: ProgressCallback): Promise<string>;
//# sourceMappingURL=ocr-subtitle.d.ts.map