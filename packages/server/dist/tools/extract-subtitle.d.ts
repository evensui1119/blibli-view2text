/**
 * Bilibili 字幕提取 Tool
 * 作为 Deep Agent 的 tool 供 orchestrator 调用
 */
import { z } from "zod";
export declare const extractSubtitleTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    videoUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    videoUrl: string;
}, {
    videoUrl: string;
}>, {
    videoUrl: string;
}, {
    videoUrl: string;
}, string>;
//# sourceMappingURL=extract-subtitle.d.ts.map