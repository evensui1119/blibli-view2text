/**
 * 5W1H 总结 Tool
 * 基于服务端存储的上下文，为指定章节生成结构化 5W1H 总结
 */
import { z } from "zod";
export declare const generate5W1HTool: import("@langchain/core/tools").DynamicStructuredTool<z.ZodObject<{
    taskId: z.ZodString;
    sectionIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    taskId: string;
    sectionIndex: number;
}, {
    taskId: string;
    sectionIndex: number;
}>, {
    taskId: string;
    sectionIndex: number;
}, {
    taskId: string;
    sectionIndex: number;
}, string>;
//# sourceMappingURL=generate-5w1h.d.ts.map