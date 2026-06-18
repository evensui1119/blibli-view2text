/**
 * Deep Agent 编排器
 * 使用 LangChain Deep Agents 框架，编排字幕提取、文章生成和 5W1H 总结
 */
import { createDeepAgent } from "deepagents";
import { extractSubtitleTool } from "../tools/extract-subtitle.js";
import { generateArticleTool } from "../tools/generate-article.js";
import { generate5W1HTool } from "../tools/generate-5w1h.js";
const SYSTEM_PROMPT = `你是一个专业的视频内容分析和文章生成专家。你的任务是将视频字幕转换为高质量的中文对话文章。

你有以下工具可用：

## extract_bilibili_subtitle
从 Bilibili 视频链接提取字幕文本。输入视频 URL，返回字幕纯文本内容。

## generate_article  
基于字幕文本生成结构化中文对话文章。文章需按章节组织，使用 Markdown 格式。

## generate_5w1h
为文章的某个章节生成 5W1H（Who/What/When/Where/Why/How）结构化总结。

工作流程：
1. 用户提供 Bilibili 视频链接后，首先使用 extract_bilibili_subtitle 提取字幕
2. 获得字幕后，使用 generate_article 生成结构化文章
3. 当用户请求某章节的 5W1H 总结时，使用 generate_5w1h 工具

注意事项：
- 生成的文章必须按章节（## 标题）组织
- 对话内容需保留说话人标识
- 文章语言为中文`;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createOrchestrator() {
    const agent = createDeepAgent({
        model: "google-genai:gemini-2.5-flash",
        tools: [extractSubtitleTool, generateArticleTool, generate5W1HTool],
        systemPrompt: SYSTEM_PROMPT,
    });
    return agent;
}
//# sourceMappingURL=orchestrator.js.map