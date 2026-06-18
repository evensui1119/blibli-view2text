/**
 * OCR 字幕提取服务
 * 从视频文件中抽帧 → 裁剪字幕区域 → OCR 识别 → 去重拼接
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
// 使用系统安装的 ffmpeg（macOS: brew install ffmpeg，Linux: apt/apk install ffmpeg）
const ffmpegPath = "ffmpeg";
import Tesseract from "tesseract.js";

// 设置 ffmpeg 路径
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export interface OCRProgress {
  stage: string;
  message: string;
  current?: number;
  total?: number;
}

export type ProgressCallback = (progress: OCRProgress) => void;

/**
 * 从视频中提取帧图片（裁剪底部字幕区域）
 * @param videoPath 视频文件路径
 * @param outputDir 输出帧图片的目录
 * @param fps 每秒提取帧数，默认 1
 * @returns 帧图片文件路径数组
 */
function extractFrames(
  videoPath: string,
  outputDir: string,
  fps: number = 1
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // crop=iw:ih*0.18:0:ih*0.82 → 裁剪底部 18% 区域（字幕通常在此）
    const filter = `crop=iw:ih*0.18:0:ih*0.82,fps=${fps}`;

    ffmpeg(videoPath)
      .videoFilters(filter)
      .outputOptions(["-q:v", "2"]) // 高质量 JPEG
      .output(path.join(outputDir, "frame_%05d.jpg"))
      .on("end", () => {
        // 读取生成的帧文件
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
 * 计算文本相似度（简单的 Jaccard 系数）
 */
function textSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = new Set(a.split(""));
  const setB = new Set(b.split(""));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * 对帧图片进行 OCR 识别
 */
async function ocrFrames(
  framePaths: string[],
  onProgress?: ProgressCallback
): Promise<string[]> {
  const results: string[] = [];

  // 创建 worker（支持简体中文）
  const worker = await Tesseract.createWorker("chi_sim", undefined, {
    // 静默模式
    logger: () => {},
  });

  for (let i = 0; i < framePaths.length; i++) {
    if (onProgress) {
      onProgress({
        stage: "ocr",
        message: `正在 OCR 识别... (${i + 1}/${framePaths.length})`,
        current: i + 1,
        total: framePaths.length,
      });
    }

    try {
      const {
        data: { text },
      } = await worker.recognize(framePaths[i]);
      const cleaned = text.trim().replace(/\s+/g, "");
      if (cleaned.length > 0) {
        results.push(cleaned);
      }
    } catch (e) {
      // 单帧 OCR 失败，跳过
      console.warn(`帧 ${i + 1} OCR 失败，跳过`);
    }
  }

  await worker.terminate();
  return results;
}

/**
 * 去重连续相似文本（字幕通常连续多帧重复）
 */
function deduplicateTexts(texts: string[]): string[] {
  if (texts.length === 0) return [];

  const deduplicated: string[] = [texts[0]];

  for (let i = 1; i < texts.length; i++) {
    const prev = deduplicated[deduplicated.length - 1];
    const curr = texts[i];

    // 相似度 < 0.7 才视为新内容
    if (textSimilarity(prev, curr) < 0.7) {
      deduplicated.push(curr);
    }
  }

  return deduplicated;
}

/**
 * 完整 OCR 字幕提取流程
 * 视频文件 → 抽帧 → OCR → 去重 → 拼接文本
 */
export async function ocrExtractSubtitle(
  videoPath: string,
  onProgress?: ProgressCallback
): Promise<string> {
  // 创建临时帧目录
  const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), "bili-frames-"));

  try {
    // Step 1: 抽帧
    if (onProgress) {
      onProgress({ stage: "frames", message: "正在提取视频帧..." });
    }
    const framePaths = await extractFrames(videoPath, framesDir, 1);

    if (framePaths.length === 0) {
      throw new Error("未能从视频中提取到任何帧");
    }

    if (onProgress) {
      onProgress({
        stage: "frames_done",
        message: `共提取 ${framePaths.length} 帧`,
      });
    }

    // Step 2: OCR 识别
    const rawTexts = await ocrFrames(framePaths, onProgress);

    if (rawTexts.length === 0) {
      throw new Error("OCR 未识别到任何文字内容");
    }

    // Step 3: 去重
    const deduplicated = deduplicateTexts(rawTexts);

    // Step 4: 拼接
    const fullText = deduplicated.join("");

    if (onProgress) {
      onProgress({
        stage: "ocr_done",
        message: `OCR 完成，识别 ${deduplicated.length} 段文字`,
      });
    }

    return fullText;
  } finally {
    // 清理临时帧目录
    try {
      fs.rmSync(framesDir, { recursive: true, force: true });
    } catch (e) {
      console.warn(`清理帧目录失败: ${framesDir}`);
    }
  }
}
