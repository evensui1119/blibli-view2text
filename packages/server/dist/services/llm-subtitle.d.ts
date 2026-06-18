/**
 * 大模型（Gemini Vision）字幕提取服务
 * 从视频帧图片中，利用 Gemini 多模态能力直接识别字幕文字
 * 比传统 OCR 准确率显著更高，支持上下文理解和纠错
 */
export interface LLMProgress {
    stage: string;
    message: string;
    current?: number;
    total?: number;
}
export type LLMProgressCallback = (progress: LLMProgress) => void;
/**
 * 完整大模型字幕提取流程
 * 视频文件 → ffmpeg 抽帧 → Gemini Vision 批量识别 → 去重拼接
 */
export declare function llmExtractSubtitle(videoPath: string, onProgress?: LLMProgressCallback): Promise<string>;
//# sourceMappingURL=llm-subtitle.d.ts.map