/**
 * API 路由
 * 提供 REST 和 SSE 端点
 */
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { extractSubtitle } from "../services/bilibili.js";
import { downloadBilibiliVideo } from "../services/bilibili-download.js";
import { ocrExtractSubtitle } from "../services/ocr-subtitle.js";
import { llmExtractSubtitle } from "../services/llm-subtitle.js";
import { contextStore } from "../services/context-store.js";
import { createModel, withTimeout } from "../services/model.js";
import { v4 as uuidv4 } from "uuid";
export const apiRouter = Router();
/**
 * POST /api/generate
 * 接收视频 URL 和生成要求，通过 SSE 流式返回生成的文章
 */
apiRouter.post("/generate", async (req, res) => {
    const { videoUrl, userRequirement, method, cookie } = req.body;
    if (!videoUrl) {
        res.status(400).json({ error: "请提供 Bilibili 视频链接" });
        return;
    }
    const extractMethod = ["ocr", "llm"].includes(method) ? method : "api";
    // 设置 SSE 响应头
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no");
    res.status(200);
    res.flushHeaders();
    // 禁用 TCP Nagle 算法 + 取消超时，确保每次 write 立即发送
    if (res.socket) {
        res.socket.setNoDelay(true);
        res.socket.setTimeout(0);
    }
    const sendEvent = (event, data) => {
        if (!res.writableEnded && !clientDisconnected) {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        }
    };
    // 让出事件循环，确保 TCP 缓冲区刷新到客户端
    const flush = () => new Promise(resolve => setImmediate(resolve));
    // 监听客户端断开（必须用 res.on("close") 而不是 req.on("close")，
    // 因为 req 的 close 在请求体读完后就会触发，不代表客户端断开）
    let clientDisconnected = false;
    res.on("close", () => {
        clientDisconnected = true;
    });
    // 心跳机制：每 10 秒发送 SSE 注释保持连接活跃
    const heartbeat = setInterval(() => {
        if (!res.writableEnded && !clientDisconnected) {
            res.write(": heartbeat\n\n");
        }
        else {
            clearInterval(heartbeat);
        }
    }, 10000);
    try {
        // Step 1: 提取字幕
        let subtitleText;
        let videoTitle;
        if (extractMethod === "ocr" || extractMethod === "llm") {
            // OCR / LLM 模式：下载视频 → 抽帧 → 识别
            const modeLabel = extractMethod === "llm" ? "大模型" : "OCR";
            sendEvent("status", { stage: "extracting", message: `正在下载视频（${modeLabel}模式）...` });
            await flush();
            let downloadResult;
            try {
                downloadResult = await downloadBilibiliVideo(videoUrl, cookie);
                videoTitle = downloadResult.title;
                sendEvent("status", { stage: "downloaded", message: `视频下载完成: ${videoTitle}` });
                await flush();
            }
            catch (error) {
                sendEvent("error", { message: `视频下载失败: ${error.message}` });
                clearInterval(heartbeat);
                res.end();
                return;
            }
            try {
                if (extractMethod === "llm") {
                    subtitleText = await llmExtractSubtitle(downloadResult.filePath, (progress) => {
                        sendEvent("status", { stage: progress.stage, message: progress.message });
                    });
                    sendEvent("status", { stage: "extracted", message: `大模型字幕提取成功: ${videoTitle}`, source: "llm" });
                }
                else {
                    subtitleText = await ocrExtractSubtitle(downloadResult.filePath, (progress) => {
                        sendEvent("status", { stage: progress.stage, message: progress.message });
                    });
                    sendEvent("status", { stage: "extracted", message: `OCR 字幕提取成功: ${videoTitle}`, source: "ocr" });
                }
            }
            catch (error) {
                sendEvent("error", { message: `${modeLabel}字幕提取失败: ${error.message}` });
                clearInterval(heartbeat);
                res.end();
                return;
            }
            finally {
                downloadResult.cleanup();
            }
        }
        else {
            // API 模式：直接调用 B站字幕接口
            sendEvent("status", { stage: "extracting", message: "正在通过 API 提取字幕..." });
            await flush();
            try {
                const effectiveCookie = cookie || process.env.BILIBILI_COOKIE;
                const result = await extractSubtitle(videoUrl, effectiveCookie);
                subtitleText = result.text;
                videoTitle = result.title;
                sendEvent("status", { stage: "extracted", message: `字幕提取成功: ${videoTitle}`, source: "bilibili_api" });
                await flush();
            }
            catch (error) {
                sendEvent("error", { message: `无法获取字幕内容: ${error.message}` });
                clearInterval(heartbeat);
                res.end();
                return;
            }
        }
        // Step 2: 保存字幕到本地文件（异步写入，不阻塞事件循环）
        try {
            const downloadsDir = path.resolve(process.cwd(), "downloads");
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }
            const safeName = (videoTitle || "untitled").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
            const subtitlePath = path.join(downloadsDir, `${safeName}.txt`);
            await fs.promises.writeFile(subtitlePath, subtitleText, "utf-8");
            console.log(`字幕已保存: ${subtitlePath}`);
        }
        catch (e) {
            console.warn("字幕保存失败:", e);
        }
        // Step 3: 流式展示字幕给前端
        sendEvent("subtitle_start", { title: videoTitle });
        await flush();
        const subtitleLines = subtitleText.split("\n");
        for (let i = 0; i < subtitleLines.length; i++) {
            sendEvent("subtitle_token", { content: subtitleLines[i] + "\n" });
            // 每 20 行让出事件循环一次，确保数据 flush 到网络
            if (i % 20 === 19)
                await flush();
        }
        sendEvent("subtitle_end", {});
        await flush();
        // Step 3: 生成文章（流式）
        sendEvent("status", { stage: "generating", message: "正在生成文章..." });
        await flush();
        const taskId = uuidv4();
        // 初始化上下文存储
        contextStore.set(taskId, {
            taskId,
            videoTitle,
            subtitleText,
            fullArticle: "",
            sections: [],
            createdAt: new Date(),
        });
        sendEvent("taskId", { taskId });
        await flush();
        // 构造 prompt
        let requirementSection = "";
        if (userRequirement) {
            requirementSection = `\n额外要求：${userRequirement}\n请在生成文章时充分考虑以上要求。`;
        }
        const prompt = `你是一位专业的视频内容编辑。请将以下视频字幕内容整理为一篇高质量的中文对话文章。

要求：
1. 文章需要有一个主标题（# 标题）
2. 内容按主题分为多个章节（## 章节标题），每个章节标题应简洁有力地概括该部分主题
3. 保留对话形式，标注说话人（如 **Jen:**、**Mark:**、**John:**）
4. 对原始字幕进行润色和整理，去除口语化的重复和停顿，但保持原意
5. 每个章节内容应连贯、完整
6. 使用 Markdown 格式输出
${requirementSection}

视频字幕内容：
${subtitleText}

请生成结构化的中文对话文章：`;
        // 使用千问流式输出
        const model = createModel({
            temperature: 0.7,
            maxOutputTokens: 8192,
            streaming: true,
        });
        let fullArticle = "";
        const stream = await withTimeout(model.stream(prompt), 60000, "文章生成请求超时，请检查网络连接或 DASHSCOPE_API_KEY 配置");
        for await (const chunk of stream) {
            const content = typeof chunk.content === "string"
                ? chunk.content
                : "";
            if (content) {
                fullArticle += content;
                sendEvent("token", { content });
            }
        }
        await flush();
        // 存储完整文章和解析章节
        contextStore.updateArticle(taskId, fullArticle);
        const ctx = contextStore.get(taskId);
        // 保存生成的文章到 downloads 目录
        try {
            const downloadsDir = path.resolve(process.cwd(), "downloads");
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }
            const safeName = (videoTitle || "untitled").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
            const articlePath = path.join(downloadsDir, `${safeName}_文章.md`);
            await fs.promises.writeFile(articlePath, fullArticle, "utf-8");
            console.log(`文章已保存: ${articlePath}`);
        }
        catch (e) {
            console.warn("文章保存失败:", e);
        }
        sendEvent("complete", {
            taskId,
            sections: ctx?.sections.map((s, i) => ({ index: i, title: s.title })) || [],
        });
        clearInterval(heartbeat);
        res.end();
    }
    catch (error) {
        sendEvent("error", { message: error.message || "生成失败" });
        clearInterval(heartbeat);
        res.end();
    }
});
/**
 * POST /api/5w1h
 * 为指定章节生成 5W1H 总结
 * 不需要前端重新提交全文，基于服务端存储的上下文
 */
apiRouter.post("/5w1h", async (req, res) => {
    const { taskId, sectionIndex } = req.body;
    if (!taskId || sectionIndex === undefined) {
        res.status(400).json({ error: "请提供 taskId 和 sectionIndex" });
        return;
    }
    const ctx = contextStore.get(taskId);
    if (!ctx) {
        res.status(404).json({ error: "找不到对应的生成上下文，请先生成文章" });
        return;
    }
    if (sectionIndex < 0 || sectionIndex >= ctx.sections.length) {
        res.status(400).json({
            error: `章节索引超出范围，共 ${ctx.sections.length} 个章节`,
        });
        return;
    }
    try {
        const section = ctx.sections[sectionIndex];
        const prompt = `你是一位专业的内容分析师。请对以下章节内容进行 5W1H 分析总结。

分析时需要结合整篇文章的上下文来理解当前章节的含义。

整篇文章内容：
${ctx.fullArticle}

当前章节标题：${section.title}
当前章节内容：
${section.content}

请严格按以下 JSON 格式返回 5W1H 总结，不要添加任何 markdown 格式标记：
{
  "who": "相关人物或角色",
  "what": "核心事件或主题",
  "when": "时间背景",
  "where": "地点或领域背景",
  "why": "原因或动机",
  "how": "方式或方法"
}

每个维度的内容应简洁但信息丰富，一两句话即可。`;
        const model = createModel({
            temperature: 0.3,
            maxOutputTokens: 1024,
        });
        const response = await withTimeout(model.invoke(prompt), 60000, "5W1H 分析请求超时，请检查网络连接");
        const content = typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);
        // 解析 JSON
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const summary = JSON.parse(cleaned);
        res.json({
            success: true,
            sectionTitle: section.title,
            sectionIndex,
            summary,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message || "5W1H 总结生成失败" });
    }
});
/**
 * GET /api/sections/:taskId
 * 获取任务的章节列表
 */
apiRouter.get("/sections/:taskId", (req, res) => {
    const taskId = req.params.taskId;
    const ctx = contextStore.get(taskId);
    if (!ctx) {
        res.status(404).json({ error: "找不到对应的生成上下文" });
        return;
    }
    res.json({
        taskId: ctx.taskId,
        videoTitle: ctx.videoTitle,
        sections: ctx.sections.map((s, i) => ({ index: i, title: s.title })),
    });
});
//# sourceMappingURL=api.js.map