/**
 * 文章生成 Tool
 * 使用 Gemini 将字幕文本转换为结构化中文对话文章
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { contextStore } from "../services/context-store.js";
import { createModel } from "../services/model.js";
import { v4 as uuidv4 } from "uuid";

const ARTICLE_PROMPT = `你是一位专业的视频内容编辑。请将以下视频字幕内容整理为一篇高质量的中文对话文章。

要求：
1. 文章需要有一个主标题（# 标题）
2. 内容按主题分为多个章节（## 章节标题），每个章节标题应简洁有力地概括该部分主题
3. 保留对话形式，标注说话人（如 Jen:, Mark:, John:）
4. 对原始字幕进行润色和整理，去除口语化的重复和停顿，但保持原意
5. 每个章节内容应连贯、完整
6. 使用 Markdown 格式输出

{userRequirement}

视频字幕内容：
{subtitleText}

请生成结构化的中文对话文章：`;

export const generateArticleTool = tool(
  async ({
    subtitleText,
    videoTitle,
    userRequirement,
  }: {
    subtitleText: string;
    videoTitle: string;
    userRequirement?: string;
  }) => {
    const taskId = uuidv4();

    // 初始化上下文存储
    contextStore.set(taskId, {
      taskId,
      videoTitle,
      subtitleText,
      fullArticle: "",
      sections: [],
      createdAt: new Date(),
    });

    // 构造 prompt
    let requirementSection = "";
    if (userRequirement) {
      requirementSection = `\n额外要求：${userRequirement}\n请在生成文章时充分考虑以上要求。`;
    }

    const prompt = ARTICLE_PROMPT
      .replace("{userRequirement}", requirementSection)
      .replace("{subtitleText}", subtitleText);

    // 调用 Gemini 生成文章
    const model = createModel({
      temperature: 0.7,
      maxOutputTokens: 8192,
    });

    const response = await model.invoke(prompt);
    const article = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // 更新上下文存储
    contextStore.updateArticle(taskId, article);

    return JSON.stringify({
      success: true,
      taskId,
      article,
      sectionCount: contextStore.get(taskId)?.sections.length || 0,
    });
  },
  {
    name: "generate_article",
    description: "基于视频字幕生成结构化中文对话文章，使用 Gemini AI 进行内容生成",
    schema: z.object({
      subtitleText: z.string().describe("视频字幕的纯文本内容"),
      videoTitle: z.string().describe("视频标题"),
      userRequirement: z
        .string()
        .optional()
        .describe("用户的自然语言生成要求，如风格、受众等"),
    }),
  }
);
