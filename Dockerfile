# ===== Stage 1: Build =====
FROM node:20-alpine AS builder

WORKDIR /app

# 拷贝 workspace 根配置
COPY package.json package-lock.json* ./
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/

# 安装所有依赖（含 devDependencies，构建需要）
RUN npm install --legacy-peer-deps

# 拷贝源码
COPY packages/web/ packages/web/
COPY packages/server/ packages/server/

# 构建前端
RUN npm run build --workspace=packages/web

# 编译后端
RUN npm run build --workspace=packages/server

# ===== Stage 2: Production =====
FROM node:20-alpine AS production

WORKDIR /app

# 仅拷贝后端生产依赖所需的 package.json
COPY package.json package-lock.json* ./
COPY packages/server/package.json packages/server/

# 仅安装生产依赖
RUN npm install --workspace=packages/server --omit=dev --legacy-peer-deps

# 拷贝后端编译产物
COPY --from=builder /app/packages/server/dist packages/server/dist

# 拷贝前端构建产物
COPY --from=builder /app/packages/web/dist packages/web/dist

# 拷贝 .env 文件（密钥已写死）
COPY packages/server/.env packages/server/.env

# 工作目录切到 server
WORKDIR /app/packages/server

# 暴露端口
EXPOSE 3001

# 启动
CMD ["node", "dist/index.js"]
