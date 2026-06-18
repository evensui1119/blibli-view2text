/**
 * 模型工厂
 * 统一创建通义千问（DashScope）模型实例，通过 OpenAI 兼容接口调用
 */

import { ChatOpenAI } from "@langchain/openai";

const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

// ChatOpenAI 底层依赖 OPENAI_API_KEY 环境变量，
// 这里将 DASHSCOPE_API_KEY 桥接过去
if (process.env.DASHSCOPE_API_KEY && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.DASHSCOPE_API_KEY;
}

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
export function createModel(options: ModelOptions = {}): ChatOpenAI {
  return new ChatOpenAI({
    model: options.model || process.env.QWEN_MODEL || "qwen-plus",
    temperature: options.temperature ?? 0.7,
    maxTokens: options.maxOutputTokens ?? 8192,
    streaming: options.streaming,
    openAIApiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
      baseURL: process.env.MODEL_BASE_URL || DASHSCOPE_BASE_URL,
    },
  });
}

/**
 * 创建千问视觉模型实例（多模态/图片识别）
 * 使用 qwen-vl-max 模型
 */
export function createVisionModel(options: ModelOptions = {}): ChatOpenAI {
  return new ChatOpenAI({
    model: options.model || process.env.QWEN_VL_MODEL || "qwen-vl-max",
    temperature: options.temperature ?? 0,
    maxTokens: options.maxOutputTokens ?? 4096,
    openAIApiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
      baseURL: process.env.MODEL_BASE_URL || DASHSCOPE_BASE_URL,
    },
  });
}

/**
 * 带超时的 Promise 包装器
 * 用于包装可能无限挂起的异步操作
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message || `请求超时（${ms / 1000}秒），请检查网络连接或 API Key 配置`)), ms)
    ),
  ]);
}
