/**
 * 生成上下文存储
 * 在服务端保存每次生成的完整文章和章节信息，供 5W1H 总结使用
 */

export interface Section {
  title: string;
  content: string;
}

export interface GenerationContext {
  taskId: string;
  videoTitle: string;
  subtitleText: string;
  fullArticle: string;
  sections: Section[];
  createdAt: Date;
}

class ContextStore {
  private store = new Map<string, GenerationContext>();

  set(taskId: string, context: GenerationContext): void {
    this.store.set(taskId, context);
    // 自动清理 1 小时前的条目
    this.cleanup();
  }

  get(taskId: string): GenerationContext | undefined {
    return this.store.get(taskId);
  }

  updateArticle(taskId: string, article: string): void {
    const ctx = this.store.get(taskId);
    if (ctx) {
      ctx.fullArticle = article;
      ctx.sections = this.parseSections(article);
    }
  }

  /**
   * 从 Markdown 文章中解析章节
   * 章节以 ## 标题 分隔
   */
  parseSections(article: string): Section[] {
    const sections: Section[] = [];
    const lines = article.split("\n");
    let currentTitle = "";
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (currentTitle) {
          sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
        }
        currentTitle = line.replace("## ", "").trim();
        currentContent = [];
      } else if (currentTitle) {
        currentContent.push(line);
      }
    }

    // 最后一个章节
    if (currentTitle) {
      sections.push({ title: currentTitle, content: currentContent.join("\n").trim() });
    }

    return sections;
  }

  private cleanup(): void {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, ctx] of this.store.entries()) {
      if (ctx.createdAt < oneHourAgo) {
        this.store.delete(id);
      }
    }
  }
}

export const contextStore = new ContextStore();
