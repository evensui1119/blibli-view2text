/**
 * Bilibili 视频下载服务
 * 通过 playurl API 获取视频流，下载到本地临时文件供 OCR 使用
 */

import fs from "node:fs";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { parseBvid, getVideoInfo } from "./bilibili.js";

export interface DownloadResult {
  filePath: string;
  title: string;
  bvid: string;
  /** 保存到本地 downloads 目录的路径 */
  savedPath: string | null;
  cleanup: () => void;
}

/**
 * 获取视频播放地址（durl 格式，单文件 mp4/flv）
 * qn=16: 360P，OCR 识别字幕足够
 */
async function getPlayUrl(
  bvid: string,
  cid: number,
  cookie?: string
): Promise<string> {
  // fnval=1 强制返回 durl 格式（单文件直链）
  const url = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=16&fnval=1&fourk=0`;
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    Referer: "https://www.bilibili.com",
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  const resp = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const json = await resp.json();

  if (json.code !== 0) {
    throw new Error(`获取视频播放地址失败: ${json.message}`);
  }

  const durl = json.data?.durl;
  if (!durl || durl.length === 0) {
    throw new Error("视频无可用播放地址（可能需要登录或为大会员视频）");
  }

  // durl 是分段数组，取第一段
  return durl[0].url;
}

/**
 * 下载视频流到临时文件
 */
async function downloadStream(url: string, filePath: string): Promise<void> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Referer: "https://www.bilibili.com",
    },
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`视频下载失败: HTTP ${resp.status}`);
  }

  const fileStream = fs.createWriteStream(filePath);
  // @ts-ignore: ReadableStream → Node Readable
  await pipeline(Readable.fromWeb(resp.body), fileStream);
}

/**
 * 获取视频保存目录（项目根目录下的 downloads/）
 */
function getDownloadsDir(): string {
  const dir = path.resolve(process.cwd(), "downloads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 将视频复制到 downloads 目录永久保存（异步，不阻塞事件循环）
 */
async function saveVideo(tmpPath: string, title: string, bvid: string): Promise<string> {
  const downloadsDir = getDownloadsDir();
  const safeName = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  const fileName = `${safeName}_${bvid}.mp4`;
  const destPath = path.join(downloadsDir, fileName);
  await copyFile(tmpPath, destPath);
  return destPath;
}

/**
 * 完整流程：下载 B站视频到本地临时文件，并保存到 downloads 目录
 */
export async function downloadBilibiliVideo(
  videoUrl: string,
  cookie?: string
): Promise<DownloadResult> {
  const bvid = parseBvid(videoUrl);
  if (!bvid) {
    throw new Error(`无法从 URL 解析 BV 号: ${videoUrl}`);
  }

  const { cid, title } = await getVideoInfo(bvid);
  const playUrl = await getPlayUrl(bvid, cid, cookie);

  // 创建临时目录
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `bili-${bvid}-`));
  const filePath = path.join(tmpDir, "video.mp4");

  await downloadStream(playUrl, filePath);

  // 保存到 downloads 目录（异步复制，不阻塞事件循环）
  let savedPath: string | null = null;
  try {
    savedPath = await saveVideo(filePath, title, bvid);
    console.log(`视频已保存: ${savedPath}`);
  } catch (e) {
    console.warn(`视频保存失败:`, e);
  }

  return {
    filePath,
    title,
    bvid,
    savedPath,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        console.warn(`清理临时目录失败: ${tmpDir}`, e);
      }
    },
  };
}
