# AI Interviewer AIIC

面向计算机专业保研同学的 AI 模拟面试训练平台。支持保研项目面试模拟和专业课快问快答两种模式，提供多维度评估报告，帮助学生高效备战夏令营与推免复试。

## 功能特性

- **保研面试模拟**：AI 扮演面试官，基于上传的简历/项目材料进行深度追问，模拟真实面试场景
- **专业课快问模式**：覆盖数据结构、计算机组成原理、编译原理等科目，支持难度选择
- **文件上传与解析**：支持 PDF、DOCX、TXT、MD、CSV 文件上传，AI 自动解析内容并据此提问
- **面试评估报告**：五维雷达图（内容深度、逻辑结构、表达清晰度、项目理解、应变能力）+ 总体评价 + 改进建议
- **面试官设置**：可调节面试压力（温和/正常/严格）、专业方向、英语面试模式、重点考察领域
- **面试记录管理**：自动保存面试对话与评估报告，支持回看历史记录
- **账号系统**：注册登录后数据云端同步，未登录也可正常使用
- **明暗主题**：支持浅色/深色主题切换，跟随系统偏好
- **备用 API**：主 API 失败后自动切换备用线路，保障面试连续性

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 前端 | React 19, TypeScript, Lucide Icons |
| 后端 | Next.js API Routes, Better-SQLite3 |
| 认证 | JWT (jose) + bcryptjs |
| 文件解析 | pdf-parse, mammoth |
| Markdown | react-markdown + remark-gfm |
| 部署 | Alibaba Cloud ECS, Nginx, PM2 |

## 本地运行

```bash
# 安装依赖
npm install

# 创建环境变量（参考 .env.example）
cp .env.example .env.local
```

在 `.env.local` 中填入 API 配置：

```env
MODEL_BASE_URL=your_api_base_url
MODEL_API_KEY=your_api_key
MODEL_NAME=your_model_name
```

```bash
# 开发模式
npm run dev

# 生产构建 + 启动
npm run build
npm run start
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `MODEL_BASE_URL` | OpenAI 兼容 API 地址 |
| `MODEL_API_KEY` | API 密钥（仅服务端使用） |
| `MODEL_NAME` | 模型标识 |

> 请勿将 API 密钥暴露在前端代码中或提交 `.env.local` 文件。

## 部署

当前部署环境：

- **服务器**：阿里云 ECS (Ubuntu 22.04)
- **反向代理**：Nginx (80 → 3000)
- **进程管理**：PM2 (`aiicproject`)

```bash
pm2 status
pm2 logs aiicproject
pm2 restart aiicproject
systemctl reload nginx
```

## 项目文档

| 文件 | 说明 |
|------|------|
| `ProductMemo.md` | 产品备忘录（功能说明、设计决策、迭代历程） |
| `MarketResearch.md` | 市场调研与定价策略 |
| `plans.md` | 早期产品规划笔记 |
| `docs/user-painpoint-research.md` | 用户痛点调研 |

## AI 工具使用声明

本项目在开发全过程中使用了 AI 辅助：

- **Windsurf Cascade (Claude Opus 4.6 & ChatGPT 5.5)**：代码编写、架构设计、调试、部署
- **ChatGPT 5.5 API**：作为产品核心面试官推理引擎
- **ChatGPT image2**：生成产品图标与背景图
