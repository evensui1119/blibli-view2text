/**
 * Express 服务入口
 * Bilibili View2Text - 视频字幕转文章服务
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { apiRouter } from "./routes/api.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
// 检查必要的环境变量
if (!process.env.DASHSCOPE_API_KEY) {
    console.error("\n❌ 缺少必要的环境变量: DASHSCOPE_API_KEY");
    console.error("   请前往 https://bailian.console.aliyun.com/ 获取 API Key");
    console.error("   然后在 packages/server/.env 文件中配置\n");
    process.exit(1);
}
// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));
// API 路由
app.use("/api", apiRouter);
// 健康检查
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "blibli-view2text" });
});
// 生产环境：托管前端静态文件
const webDist = path.join(__dirname, "../../web/dist");
app.use(express.static(webDist));
app.get("*", (_req, res) => {
    res.sendFile(path.join(webDist, "index.html"));
});
// 启动服务
app.listen(PORT, () => {
    console.log(`🚀 Bilibili View2Text Server running at http://localhost:${PORT}`);
    console.log(`   - API: http://localhost:${PORT}/api`);
    console.log(`   - Health: http://localhost:${PORT}/health`);
    console.log("");
    console.log("📋 环境变量:");
    console.log(`   DASHSCOPE_API_KEY=✓ 已配置`);
    console.log(`   BILIBILI_COOKIE=${process.env.BILIBILI_COOKIE ? "✓ 已配置" : "✗ 未配置（可选）"}`);
});
//# sourceMappingURL=index.js.map