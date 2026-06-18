/**
 * 文章流式展示组件
 * 使用 react-markdown 渲染 Markdown 内容，支持章节级 5W1H 按钮
 */

import { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Section5W1H } from "./Section5W1H";

interface Section {
  index: number;
  title: string;
}

interface ArticleViewProps {
  content: string;
  status: string;
  isLoading: boolean;
  taskId: string | null;
  sections: Section[];
  error: string | null;
  subtitleText: string | null;
  subtitleTitle: string | null;
}

export function ArticleView({
  content,
  status,
  isLoading,
  taskId,
  sections,
  error,
  subtitleText,
  subtitleTitle,
}: ArticleViewProps) {
  if (error) {
    return (
      <div className="article-view">
        {subtitleText && (
          <div className="subtitle-preview">
            <h4 className="subtitle-header">提取到的字幕{subtitleTitle ? `（${subtitleTitle}）` : ""}</h4>
            <pre className="subtitle-text">{subtitleText}</pre>
          </div>
        )}
        <div className="article-error">
          <p>生成失败: {error}</p>
        </div>
      </div>
    );
  }

  if (!content && !isLoading && !status) {
    return (
      <div className="article-placeholder">
        <p>输入 Bilibili 视频链接</p>
      </div>
    );
  }

  return (
    <div className="article-view">
      {status && (
        <div className="status-bar">
          <span className={`status-dot ${isLoading ? "loading" : "done"}`} />
          <span>{status}</span>
        </div>
      )}

      {subtitleText !== null && (
        <div className="subtitle-preview">
          <h4 className="subtitle-header">提取到的字幕{subtitleTitle ? `（${subtitleTitle}）` : ""}</h4>
          <pre className="subtitle-text">{subtitleText}</pre>
        </div>
      )}

      {content && (
        <div className="article-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}

      {isLoading && content && (
        <div className="typing-indicator">
          <span />
          <span />
          <span />
        </div>
      )}

      {!isLoading && content && (
        <div className="download-section">
          <button className="btn-download" onClick={() => handleDownload(content, subtitleTitle)}>
            ⬇ 下载对话文章
          </button>
        </div>
      )}

      {!isLoading && sections.length > 0 && taskId && (
        <div className="sections-5w1h">
          <h3>章节 5W1H 总结</h3>
          <p className="sections-hint">点击章节按钮获取 Who/What/When/Where/Why/How 结构化总结</p>
          <div className="section-buttons">
            {sections.map((section) => (
              <Section5W1H
                key={section.index}
                taskId={taskId}
                sectionIndex={section.index}
                sectionTitle={section.title}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 触发浏览器下载 Markdown 文件 */
function handleDownload(content: string, title: string | null) {
  const fileName = title
    ? `${title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80)}_文章.md`
    : "文章.md";
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
