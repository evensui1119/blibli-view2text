/**
 * 5W1H 章节总结组件
 * 点击按钮后请求并展示 Who/What/When/Where/Why/How 结构化总结
 */

import { useState } from "react";

interface Summary5W1H {
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
  how: string;
}

interface Section5W1HProps {
  taskId: string;
  sectionIndex: number;
  sectionTitle: string;
}

const API_BASE = "";

const LABELS: Record<keyof Summary5W1H, string> = {
  who: "Who",
  what: "What",
  when: "When",
  where: "Where",
  why: "Why",
  how: "How",
};

export function Section5W1H({ taskId, sectionIndex, sectionTitle }: Section5W1HProps) {
  const [summary, setSummary] = useState<Summary5W1H | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (summary) {
      setIsOpen(!isOpen);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch(`${API_BASE}/api/5w1h`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, sectionIndex }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || "请求失败");
      }

      setSummary(data.summary);
      setIsOpen(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="section-5w1h">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`btn-5w1h ${isOpen ? "active" : ""}`}
      >
        <span className="section-title">{sectionTitle}</span>
        <span className="badge">
          {isLoading ? "..." : isOpen ? "收起" : "[5W1H]"}
        </span>
      </button>

      {error && <p className="error-text">{error}</p>}

      {isOpen && summary && (
        <div className="summary-table">
          <table>
            <thead>
              <tr>
                <th>维度</th>
                <th>内容</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(LABELS) as Array<keyof Summary5W1H>).map((key) => (
                <tr key={key}>
                  <td className="label-cell">
                    <strong>{LABELS[key]}</strong>
                  </td>
                  <td>{summary[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
