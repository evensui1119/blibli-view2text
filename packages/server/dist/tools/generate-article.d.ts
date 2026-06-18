/**
 * 文章生成 Tool
 * 使用 Gemini 将字幕文本转换为结构化中文对话文章
 */
import { z } from "zod";
export declare const generateArticleTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    subtitleText: z.ZodString;
    videoTitle: z.ZodString;
    userRequirement: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    subtitleText: string;
    videoTitle: string;
    userRequirement?: string | undefined;
}, {
    subtitleText: string;
    videoTitle: string;
    userRequirement?: string | undefined;
}>, {
    subtitleText: string;
    videoTitle: string;
    userRequirement?: string;
}, {
    subtitleText: string;
    videoTitle: string;
    userRequirement?: string | undefined;
}, string>;
//# sourceMappingURL=generate-article.d.ts.map