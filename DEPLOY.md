# Beauty AI Assistant - 部署指南

## 为什么不能用静态部署？

**静态部署（如 GitHub Pages、Vercel Static）是错误的**，原因如下：

1. **API密钥暴露**：静态站点的所有代码都会发送到用户浏览器，任何人都可以查看源代码获取你的API密钥
2. **安全风险**：API密钥一旦泄露，可能被恶意使用，导致费用损失
3. **无法保护敏感信息**：环境变量在构建时会被打包进静态文件

## 正确的架构：服务端代理

本项目采用 **Express.js 后端 + Vue.js 前端** 的架构：

```
用户浏览器 → 前端 (Vue.js)
                ↓
            调用 /api/* 接口
                ↓
            后端 (Express.js)
                ↓
            使用 API Key 调用大模型
```

**API密钥只保存在服务端的环境变量中**，前端无法直接访问。

---

## 本地开发部署

### 1. 安装依赖

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ..
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cd server
cp .env.example .env

# 编辑 .env 文件，填入你的API密钥
```

**server/.env 文件内容：**

```env
# 大模型API配置（支持多Key轮询）
API_KEY_1=ak_your_first_api_key
API_KEY_2=ak_your_second_api_key
API_KEY_3=ak_your_third_api_key

# API配置
API_URL=https://longcat.chat/api/v1/chat/completions
MODEL=THUDM/GLM-4-9B-0414

# 服务端口号
PORT=3000
```

### 3. 启动服务

**方式一：同时启动前后端（推荐）**

```bash
# 在项目根目录
npm run dev:all
```

**方式二：分别启动**

```bash
# 终端1：启动后端
cd server
npm start

# 终端2：启动前端（在项目根目录）
npm run dev
```

### 4. 访问应用

- 前端：http://localhost:5173
- 后端API：http://localhost:3000

---

## 生产环境部署

### 方案一：Vercel（推荐，免费）

Vercel 支持 Serverless Functions，可以部署后端API。

#### 1. 准备代码

确保项目结构如下：

```
beauty-ai-assistant/
├── api/                    # Vercel Serverless Functions
│   └── index.js           # 后端API入口
├── dist/                  # 构建后的前端文件
├── src/                   # 前端源码
├── package.json
└── vercel.json
```

#### 2. 创建 vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ]
}
```

#### 3. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 配置环境变量（在Vercel Dashboard中设置）
# 或者使用CLI
vercel env add API_KEY_1
vercel env add API_KEY_2
vercel env add API_KEY_3
```

#### 4. 配置环境变量

在 Vercel Dashboard → Project Settings → Environment Variables 中添加：
- `API_KEY_1`
- `API_KEY_2`
- `API_KEY_3`
- `API_URL`
- `MODEL`

---

### 方案二：Railway / Render（推荐，有免费额度）

这些平台支持部署完整的 Node.js 应用。

#### Railway 部署步骤：

1. 在 [Railway](https://railway.app) 注册账号
2. 创建新项目，连接 GitHub 仓库
3. 添加环境变量（在 Variables 标签页）
4. 自动部署完成

#### Render 部署步骤：

1. 在 [Render](https://render.com) 注册账号
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 配置：
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
5. 添加环境变量
6. 部署

---

### 方案三：自己的服务器（VPS/云服务器）

#### 1. 准备服务器

需要一台有公网IP的服务器（阿里云、腾讯云、AWS等）

#### 2. 上传代码

```bash
# 在服务器上
git clone https://github.com/yourusername/beauty-ai-assistant.git
cd beauty-ai-assistant
```

#### 3. 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证
node -v
npm -v
```

#### 4. 安装依赖并构建

```bash
# 安装前端依赖
npm install

# 构建前端
npm run build

# 安装后端依赖
cd server
npm install

# 配置环境变量
cp .env.example .env
nano .env  # 编辑环境变量
```

#### 5. 使用 PM2 启动服务

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动后端服务
cd server
pm2 start server.js --name beauty-ai-backend

# 保存PM2配置
pm2 save
pm2 startup
```

#### 6. 配置 Nginx（可选，用于域名和HTTPS）

```bash
sudo apt install nginx

# 配置站点
sudo nano /etc/nginx/sites-available/beauty-ai
```

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/beauty-ai-assistant/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/beauty-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. 配置 HTTPS（使用 Certbot）

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 方案四：Docker 部署

### 1. 创建 Dockerfile

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 复制后端代码
COPY server/package*.json ./server/
RUN cd server && npm install --production
COPY server ./server

# 复制前端构建文件
COPY --from=builder /app/dist ./dist

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/server.js"]
```

### 2. 构建并运行

```bash
# 构建镜像
docker build -t beauty-ai-assistant .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e API_KEY_1=your_key_1 \
  -e API_KEY_2=your_key_2 \
  -e API_KEY_3=your_key_3 \
  -e API_URL=https://longcat.chat/api/v1/chat/completions \
  -e MODEL=THUDM/GLM-4-9B-0414 \
  --name beauty-ai \
  beauty-ai-assistant
```

---

## 让其他人体验你的部署

部署完成后，你可以通过以下方式让其他人体验：

### 1. 分享链接

直接分享你的部署链接：
- Vercel: `https://your-project.vercel.app`
- Railway: `https://your-project.up.railway.app`
- Render: `https://your-project.onrender.com`
- 自有域名: `https://your-domain.com`

### 2. 生成二维码

使用二维码生成器，将链接转换为二维码，方便手机扫码访问。

### 3. 演示注意事项

- **提前测试**：确保所有功能正常工作
- **准备备用API Key**：防止额度用完
- **网络环境**：确保演示现场网络通畅
- **设备兼容**：在手机和电脑上都要测试

---

## 常见问题

### Q: 为什么辩论加载很慢？

A: 大模型API调用需要时间，特别是三个博主并行调用时。可以考虑：
- 使用更快的模型
- 优化Prompt减少token数
- 添加加载动画提升体验

### Q: 如何更换大模型？

A: 修改 `server/.env` 中的 `API_URL` 和 `MODEL`：

```env
# 使用 OpenAI
API_URL=https://api.openai.com/v1/chat/completions
MODEL=gpt-3.5-turbo

# 使用 Claude
API_URL=https://api.anthropic.com/v1/messages
MODEL=claude-3-haiku-20240307
```

同时需要修改 `server/server.js` 中的请求格式以适配不同的API。

### Q: 如何添加更多博主？

A: 编辑 `src/agent/bloggers.js`，按照现有格式添加新的博主对象。

### Q: 如何修改商品数据？

A: 编辑 `server/data/products.js`，添加或修改商品信息。

---

## 安全建议

1. **定期更换API Key**：防止密钥泄露
2. **限制API调用频率**：在服务端添加限流
3. **监控API使用**：关注API调用量和费用
4. **使用HTTPS**：生产环境必须使用HTTPS
5. **不要提交.env文件**：确保 `.env` 在 `.gitignore` 中

---

## 技术支持

如有问题，可以：
1. 查看浏览器控制台（F12）的错误信息
2. 查看服务端日志：`pm2 logs beauty-ai-backend`
3. 检查网络请求的响应状态
