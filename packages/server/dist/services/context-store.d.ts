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
declare class ContextStore {
    private store;
    set(taskId: string, context: GenerationContext): void;
    get(taskId: string): GenerationContext | undefined;
    updateArticle(taskId: string, article: string): void;
    /**
     * 从 Markdown 文章中解析章节
     * 章节以 ## 标题 分隔
     */
    parseSections(article: string): Section[];
    private cleanup;
}
export declare const contextStore: ContextStore;
export {};
//# sourceMappingURL=context-store.d.ts.map