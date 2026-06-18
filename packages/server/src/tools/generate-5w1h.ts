/**
 * 5W1H 总结 Tool
 * 基于服务端存储的上下文，为指定章节生成结构化 5W1H 总结
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { contextStore } from "../services/context-store.js";
import { createModel } from "../services/model.js";

const SUMMARY_PROMPT = `你是一位专业的内容分析师。请对以下章节内容进行 5W1H 分析总结。

分析时需要结合整篇文章的上下文来理解当前章节的含义。

整篇文章概要：
{fullArticleContext}

当前章节标题：{sectionTitle}
当前章节内容：
{sectionContent}

请严格按以下 JSON 格式返回 5W1H 总结，不要添加任何 markdown 格式标记：
{
  "who": "相关人物或角色",
  "what": "核心事件或主题",
  "when": "时间背景",
  "where": "地点或领域背景",
  "why": "原因或动机",
  "how": "方式或方法"
}

每个维度的内容应简洁但信息丰富，一两句话即可。`;

export const generate5W1HTool = tool(
  async ({
    taskId,
    sectionIndex,
  }: {
    taskId: string;
    sectionIndex: number;
  }) => {
    const ctx = contextStore.get(taskId);
    if (!ctx) {
      return JSON.stringify({
        success: false,
        error: "找不到对应的生成上下文，请先生成文章",
      });
    }

    if (sectionIndex < 0 || sectionIndex >= ctx.sections.length) {
      return JSON.stringify({
        success: false,
        error: `章节索引超出范围，共 ${ctx.sections.length} 个章节（索引 0-${ctx.sections.length - 1}）`,
      });
    }

    const section = ctx.sections[sectionIndex];

    // 生成整篇文章摘要（避免发送全文但保留上下文）
    const articleSummary = ctx.sections
      .map((s, i) => `${i + 1}. ${s.title}`)
      .join("\n");

    const prompt = SUMMARY_PROMPT
      .replace("{fullArticleContext}", `文章标题：${ctx.videoTitle}\n章节目录：\n${articleSummary}\n\n完整内容：\n${ctx.fullArticle}`)
      .replace("{sectionTitle}", section.title)
      .replace("{sectionContent}", section.content);

    const model = createModel({
      temperature: 0.3,
      maxOutputTokens: 1024,
    });

    const response = await model.invoke(prompt);
    const content = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    // 解析 JSON 响应
    try {
      // 清理可能的 markdown 代码块标记
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const summary = JSON.parse(cleaned);
      return JSON.stringify({
        success: true,
        sectionTitle: section.title,
        summary,
      });
    } catch {
      return JSON.stringify({
        success: true,
        sectionTitle: section.title,
        summary: { raw: content },
        warning: "5W1H 响应未能完美解析为 JSON",
      });
    }
  },
  {
    name: "generate_5w1h",
    description:
      "为文章的指定章节生成 5W1H（Who/What/When/Where/Why/How）结构化总结。需要先通过 generate_article 生成文章后才能使用。",
    schema: z.object({
      taskId: z.string().describe("文章生成任务的 ID"),
      sectionIndex: z.number().describe("章节索引，从 0 开始"),
    }),
  }
);
