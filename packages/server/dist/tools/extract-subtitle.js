/**
 * Bilibili 字幕提取 Tool
 * 作为 Deep Agent 的 tool 供 orchestrator 调用
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { extractSubtitle } from "../services/bilibili.js";
export const extractSubtitleTool = tool(async ({ videoUrl }) => {
    try {
        const result = await extractSubtitle(videoUrl);
        return JSON.stringify({
            success: true,
            title: result.title,
            bvid: result.bvid,
            text: result.text,
            source: "bilibili_api",
        });
    }
    catch (error) {
        return JSON.stringify({
            success: false,
            error: `无法获取字幕内容: ${error.message}`,
        });
    }
}, {
    name: "extract_bilibili_subtitle",
    description: "从 Bilibili 视频链接提取字幕文本。",
    schema: z.object({
        videoUrl: z.string().describe("Bilibili 视频链接，如 https://www.bilibili.com/video/BVxxxxx"),
    }),
});
//# sourceMappingURL=extract-subtitle.js.map