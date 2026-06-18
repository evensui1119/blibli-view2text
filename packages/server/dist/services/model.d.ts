/**
 * 模型工厂
 * 统一创建通义千问（DashScope）模型实例，通过 OpenAI 兼容接口调用
 */
import { ChatOpenAI } from "@langchain/openai";
interface ModelOptions {
    temperature?: number;
    maxOutputTokens?: number;
    streaming?: boolean;
    /** 模型名称，默认 qwen-plus */
    model?: string;
}
/**
 * 创建千问模型实例（文本生成）
 * 使用 DashScope OpenAI 兼容接口
 */
export declare function createModel(options?: ModelOptions): ChatOpenAI;
/**
 * 创建千问视觉模型实例（多模态/图片识别）
 * 使用 qwen-vl-max 模型
 */
export declare function createVisionModel(options?: ModelOptions): ChatOpenAI;
/**
 * 带超时的 Promise 包装器
 * 用于包装可能无限挂起的异步操作
 */
export declare function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T>;
export {};
//# sourceMappingURL=model.d.ts.map