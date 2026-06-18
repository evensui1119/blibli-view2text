/**
 * 大模型（Gemini Vision）字幕提取服务
 * 从视频帧图片中，利用 Gemini 多模态能力直接识别字幕文字
 * 比传统 OCR 准确率显著更高，支持上下文理解和纠错
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
// 使用系统安装的 ffmpeg（macOS: brew install ffmpeg，Linux: apt/apk install ffmpeg）
const ffmpegPath = "ffmpeg";
import { HumanMessage } from "@langchain/core/messages";
import { createVisionModel } from "./model.js";

// 设置 ffmpeg 路径
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface LLMProgress {
  stage: string;
  message: string;
  current?: number;
  total?: number;
}

export type LLMProgressCallback = (progress: LLMProgress) => void;

/**
 * 从视频中提取帧图片（裁剪底部字幕区域）
 */
function extractFrames(
  videoPath: string,
  outputDir: string,
  fps: number = 0.5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // 裁剪底部 20% 区域（字幕区域），降低帧率节省 API 调用
    const filter = `crop=iw:ih*0.20:0:ih*0.80,fps=${fps}`;

    ffmpeg(videoPath)
      .videoFilters(filter)
      .outputOptions(["-q:v", "2"])
      .output(path.join(outputDir, "frame_%05d.jpg"))
      .on("end", () => {
        const files = fs
          .readdirSync(outputDir)
          .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
          .sort()
          .map((f) => path.join(outputDir, f));
        resolve(files);
      })
      .on("error", (err) => {
        reject(new Error(`视频帧提取失败: ${err.message}`));
      })
      .run();
  });
}

/**
 * 将图片文件转为 base64 data URI
 */
function imageToBase64(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return data.toString("base64");
}

/**
 * 批量发送帧图片给千问 VL 识别字幕
 * 每次最多发送 BATCH_SIZE 张图片，减少 API 调用次数
 */
async function llmRecognizeFrames(
  framePaths: string[],
  onProgress?: LLMProgressCallback
): Promise<string[]> {
  const BATCH_SIZE = 10; // 每批处理帧数
  const results: string[] = [];

  const model = createVisionModel({
    temperature: 0,
    maxOutputTokens: 4096,
  });

  const totalBatches = Math.ceil(framePaths.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const start = batchIdx * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, framePaths.length);
    const batchPaths = framePaths.slice(start, end);

    if (onProgress) {
      onProgress({
        stage: "llm_ocr",
        message: `大模型识别中... (批次 ${batchIdx + 1}/${totalBatches}，帧 ${start + 1}-${end}/${framePaths.length})`,
        current: end,
        total: framePaths.length,
      });
    }

    // 构建多模态消息：多张图片 + 指令
    const imageContents = batchPaths.map((fp) => ({
      type: "image_url" as const,
      image_url: `data:image/jpeg;base64,${imageToBase64(fp)}`,
    }));

    const message = new HumanMessage({
      content: [
        ...imageContents,
        {
          type: "text" as const,
          text: `以上是一段视频连续帧的字幕区域截图（共 ${batchPaths.length} 张，按时间顺序排列）。
请识别每张图片中的中文字幕文字。

规则：
1. 每张图片识别一行字幕，按顺序输出
2. 如果某张图片没有可见字幕文字，输出空行
3. 连续多张图片的字幕内容相同时，只输出一次（去重）
4. 只输出纯字幕文字，不要添加任何编号、标记或解释
5. 每段字幕独占一行`,
        },
      ],
    });

    try {
      const response = await model.invoke([message]);
      const text =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // 按行拆分并过滤空行
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      results.push(...lines);
    } catch (error: any) {
      console.warn(`批次 ${batchIdx + 1} 识别失败: ${error.message}`);
      // 单批失败不终止整个流程
    }
  }

  return results;
}

/**
 * 去重连续相似文本
 */
function deduplicateTexts(texts: string[]): string[] {
  if (texts.length === 0) return [];
  const deduplicated: string[] = [texts[0]];
  for (let i = 1; i < texts.length; i++) {
    if (texts[i] !== deduplicated[deduplicated.length - 1]) {
      deduplicated.push(texts[i]);
    }
  }
  return deduplicated;
}

/**
 * 完整大模型字幕提取流程
 * 视频文件 → ffmpeg 抽帧 → Gemini Vision 批量识别 → 去重拼接
 */
export async function llmExtractSubtitle(
  videoPath: string,
  onProgress?: LLMProgressCallback
): Promise<string> {
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "bili-llm-frames-"));

  try {
    // Step 1: 抽帧（每 2 秒一帧，比 OCR 低频率即可因为 LLM 更聪明）
    if (onProgress) {
      onProgress({ stage: "frames", message: "正在提取视频帧..." });
    }
    const framePaths = await extractFrames(videoPath, framesDir, 0.5);

    if (framePaths.length === 0) {
      throw new Error("未能从视频中提取到任何帧");
    }

    if (onProgress) {
      onProgress({
        stage: "frames_done",
        message: `共提取 ${framePaths.length} 帧，准备大模型识别`,
      });
    }

    // Step 2: Gemini Vision 批量识别
    const rawTexts = await llmRecognizeFrames(framePaths, onProgress);

    if (rawTexts.length === 0) {
      throw new Error("大模型未识别到任何字幕内容");
    }

    // Step 3: 去重拼接
    const deduplicated = deduplicateTexts(rawTexts);
    const fullText = deduplicated.join("");

    if (onProgress) {
      onProgress({
        stage: "llm_done",
        message: `大模型识别完成，共 ${deduplicated.length} 段字幕`,
      });
    }

    return fullText;
  } finally {
    try {
      fs.rmSync(framesDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`清理帧目录失败: ${framesDir}`);
    }
  }
}
