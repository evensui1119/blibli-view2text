/**
 * SSE Hook - 处理 Server-Sent Events 流式数据
 */

import { useState, useCallback, useRef } from "react";

interface Section {
  index: number;
  title: string;
}

interface UseSSEReturn {
  content: string;
  status: string;
  isLoading: boolean;
  taskId: string | null;
  sections: Section[];
  error: string | null;
  subtitleText: string | null;
  subtitleTitle: string | null;
  generate: (params: {
    videoUrl: string;
    method: "api" | "ocr" | "llm";
    cookie?: string;
    userRequirement?: string;
  }) => void;
  reset: () => void;
}

const API_BASE = (() => {
  // 开发模式下直连后端端口，绕过 Vite 代理（避免 SSE 长连接被代理层断开）
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  return '';
})();

export function useSSE(): UseSSEReturn {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subtitleText, setSubtitleText] = useState<string | null>(null);
  const [subtitleTitle, setSubtitleTitle] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setContent("");
    setStatus("");
    setIsLoading(false);
    setTaskId(null);
    setSections([]);
    setError(null);
    setSubtitleText(null);
    setSubtitleTitle(null);
  }, []);

  const generate = useCallback(
    async (params: {
      videoUrl: string;
      method: "api" | "ocr" | "llm";
      cookie?: string;
      userRequirement?: string;
    }) => {
      reset();
      setIsLoading(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`${API_BASE}/api/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: params.videoUrl,
            method: params.method,
            cookie: params.cookie,
            userRequirement: params.userRequirement,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let buffer = "";
        let eventType = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // 解析 SSE 事件
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              let data;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                // 服务端发送了非 JSON 数据，跳过
                continue;
              }

              switch (eventType) {
                case "status":
                  setStatus(data.message);
                  break;
                case "subtitle_start":
                  setSubtitleTitle(data.title);
                  setSubtitleText("");
                  break;
                case "subtitle_token":
                  setSubtitleText((prev) => (prev || "") + data.content);
                  break;
                case "subtitle_end":
                  // 字幕流式接收完成
                  break;
                case "subtitle":
                  // 兼容旧版一次性发送
                  setSubtitleText(data.text);
                  setSubtitleTitle(data.title);
                  break;
                case "taskId":
                  setTaskId(data.taskId);
                  break;
                case "token":
                  setContent((prev) => prev + data.content);
                  break;
                case "complete":
                  setSections(data.sections || []);
                  setIsLoading(false);
                  break;
                case "error":
                  setError(data.message);
                  setIsLoading(false);
                  break;
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "请求失败");
        }
        setIsLoading(false);
      }
    },
    [reset]
  );

  return {
    content,
    status,
    isLoading,
    taskId,
    sections,
    error,
    subtitleText,
    subtitleTitle,
    generate,
    reset,
  };
}
