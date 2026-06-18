/**
 * 环境变量预加载
 * 必须在所有其他模块之前导入，确保 .env 文件被正确读取
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// ChatOpenAI 底层强制依赖 OPENAI_API_KEY 环境变量
// 将 DASHSCOPE_API_KEY 桥接过去
if (process.env.DASHSCOPE_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.DASHSCOPE_API_KEY;
}
