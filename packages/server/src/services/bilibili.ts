/**
 * Bilibili 字幕提取服务
 * 支持从 B站视频链接提取 AI 自动生成字幕或手动上传字幕
 */

export interface SubtitleItem {
  from: number;
  to: number;
  sid: number;
  content: string;
}

export interface SubtitleResult {
  title: string;
  bvid: string;
  subtitles: SubtitleItem[];
  text: string; // 拼接后的纯文本
}

/**
 * 从 URL 中解析 BV 号
 */
export function parseBvid(url: string): string | null {
  // 支持格式:
  // https://www.bilibili.com/video/BV1Rs421u7C4
  // https://b23.tv/xxx (短链接需要额外处理)
  const match = url.match(/BV[a-zA-Z0-9]+/);
  return match ? match[0] : null;
}

/**
 * 获取视频基本信息（aid, cid, title）
 */
export async function getVideoInfo(bvid: string): Promise<{ aid: number; cid: number; title: string }> {
  const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Referer": "https://www.bilibili.com",
    },
    signal: AbortSignal.timeout(15000),
  });
  const json = await resp.json();

  if (json.code !== 0) {
    throw new Error(`获取视频信息失败: ${json.message}`);
  }

  return {
    aid: json.data.aid,
    cid: json.data.cid,
    title: json.data.title,
  };
}

/**
 * 获取字幕列表
 */
export async function getSubtitleList(
  aid: number,
  cid: number,
  cookie?: string
): Promise<Array<{ lan: string; lan_doc: string; subtitle_url: string }>> {
  const url = `https://api.bilibili.com/x/player/wbi/v2?aid=${aid}&cid=${cid}`;
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Referer": "https://www.bilibili.com",
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }

  const resp = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  const json = await resp.json();

  if (json.code !== 0) {
    throw new Error(`获取字幕列表失败: ${json.message}`);
  }

  const subtitles = json.data?.subtitle?.subtitles || [];
  return subtitles.map((s: any) => ({
    lan: s.lan,
    lan_doc: s.lan_doc,
    subtitle_url: s.subtitle_url.startsWith("//") ? `https:${s.subtitle_url}` : s.subtitle_url,
  }));
}

/**
 * 下载并解析字幕 JSON
 */
export async function downloadSubtitle(subtitleUrl: string): Promise<SubtitleItem[]> {
  const resp = await fetch(subtitleUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });
  const json = await resp.json();
  return json.body.map((item: any) => ({
    from: item.from,
    to: item.to,
    sid: item.sid,
    content: item.content,
  }));
}

/**
 * 将字幕数组转为纯文本
 */
export function subtitlesToText(subtitles: SubtitleItem[]): string {
  return subtitles.map((s) => s.content).join("");
}

/**
 * 完整流程：从 Bilibili URL 提取字幕
 */
export async function extractSubtitle(videoUrl: string, cookie?: string): Promise<SubtitleResult> {
  const bvid = parseBvid(videoUrl);
  if (!bvid) {
    throw new Error(`无法从 URL 解析 BV 号: ${videoUrl}`);
  }

  const { aid, cid, title } = await getVideoInfo(bvid);
  const subtitleList = await getSubtitleList(aid, cid, cookie);

  if (subtitleList.length === 0) {
    throw new Error("该视频没有可用的字幕（可能需要登录 Cookie）");
  }

  // 优先选择 ai-zh 或 zh
  const preferred = subtitleList.find((s) => s.lan === "ai-zh") ||
    subtitleList.find((s) => s.lan === "zh") ||
    subtitleList[0];

  const subtitles = await downloadSubtitle(preferred.subtitle_url);
  const text = subtitlesToText(subtitles);

  return { title, bvid, subtitles, text };
}
