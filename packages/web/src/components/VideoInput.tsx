/**
 * 视频输入表单组件
 */

import { useState } from "react";

export type ExtractMethod = "api" | "ocr" | "llm";

interface VideoInputProps {
  onSubmit: (params: {
    videoUrl: string;
    method: ExtractMethod;
    cookie?: string;
    userRequirement?: string;
  }) => void;
  isLoading: boolean;
}

export function VideoInput({ onSubmit, isLoading }: VideoInputProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [userRequirement, setUserRequirement] = useState("");
  const [showRequirement, setShowRequirement] = useState(false);
  const [method, setMethod] = useState<ExtractMethod>("api");
  const [cookie, setCookie] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    onSubmit({
      videoUrl: videoUrl.trim(),
      method,
      cookie: cookie.trim() || undefined,
      userRequirement: userRequirement.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="video-input">
      {/* 提取方式选择 */}
      <div className="method-selector">
        <label className={`method-option ${method === "api" ? "active" : ""}`}>
          <input
            type="radio"
            name="method"
            value="api"
            checked={method === "api"}
            onChange={() => setMethod("api")}
            disabled={isLoading}
          />
          <div className="method-content">
            <div className="method-title">API 提取</div>
            <div className="method-desc">
              直接调用 B站字幕接口，速度快。部分视频需要登录 Cookie。
            </div>
          </div>
        </label>
        <label className={`method-option ${method === "ocr" ? "active" : ""}`}>
          <input
            type="radio"
            name="method"
            value="ocr"
            checked={method === "ocr"}
            onChange={() => setMethod("ocr")}
            disabled={isLoading}
          />
          <div className="method-content">
            <div className="method-title">OCR 提取</div>
            <div className="method-desc">
              下载视频后通过 OCR 识别画面字幕，适合无 AI 字幕的视频。耗时较长。
            </div>
          </div>
        </label>
        <label className={`method-option ${method === "llm" ? "active" : ""}`}>
          <input
            type="radio"
            name="method"
            value="llm"
            checked={method === "llm"}
            onChange={() => setMethod("llm")}
            disabled={isLoading}
          />
          <div className="method-content">
            <div className="method-title">大模型提取</div>
            <div className="method-desc">
              下载视频后通过通义千问 VL 识别字幕，准确率最高。消耗 API 额度。
            </div>
          </div>
        </label>
      </div>

      {/* Cookie 输入（所有模式均可选，API 模式获取字幕需要，OCR/LLM 模式下载受限视频需要） */}
      <div className="cookie-input-wrap">
        <label className="cookie-label">
          B站登录 Cookie（可选，{method === "api" ? "部分视频获取字幕需要" : "下载受限视频需要"}）
        </label>
        <input
          type="text"
          value={cookie}
          onChange={(e) => setCookie(e.target.value)}
          placeholder="如 SESSDATA=xxxxx; bili_jct=xxxxx; ..."
          disabled={isLoading}
          className="cookie-input"
        />
      </div>

      {/* 视频 URL 与提交 */}
      <div className="input-group">
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="输入 Bilibili 视频链接，如 https://www.bilibili.com/video/BVxxxxx"
          disabled={isLoading}
          className="url-input"
        />
        <button
          type="submit"
          disabled={isLoading || !videoUrl.trim()}
          className="btn-primary"
        >
          {isLoading ? "生成中..." : "生成文章"}
        </button>
      </div>

      <div className="requirement-toggle">
        <button
          type="button"
          onClick={() => setShowRequirement(!showRequirement)}
          className="btn-toggle"
        >
          {showRequirement ? "收起" : "自定义生成要求（可选）"}
        </button>
      </div>

      {showRequirement && (
        <textarea
          value={userRequirement}
          onChange={(e) => setUserRequirement(e.target.value)}
          placeholder="输入自然语言生成要求，如：面向技术从业者，使用专业但易懂的语言风格，重点关注商业模式分析"
          disabled={isLoading}
          className="requirement-input"
          rows={3}
        />
      )}
    </form>
  );
}
