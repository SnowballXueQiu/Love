# 贴贴记录 (Couple Countdown)

一个采用孟菲斯设计风格 (Memphis Design) 的情侣互动记录页面。包含恋爱计时、照片墙、留言板和路人祝福功能。

🔗 **在线预览**: [https://love.qwq.my](https://love.qwq.my)

## ✨ 功能特性

1.  **恋爱计时器 (Countdown)**
    -   实时显示在一起的天数、小时、分钟和秒数。
    -   孟菲斯风格的时间卡片展示。

2.  **路人祝福 (Blessing Counter)**
    -   访客可以点击 "99 +1" 送上祝福。
    -   实时同步祝福总数 (Supabase Realtime)。
    -   点击时的爱心动画效果。

3.  **留言板 (Message Board)**
    -   情侣双方登录后可发送留言。
    -   **对话模式**: 未登录时，以对话形式展示 (Person 1 左侧, Person 2 右侧)。
    -   **用户模式**: 登录后，当前用户始终在右侧，对方在左侧。
    -   支持实时消息推送。

4.  **照片墙 (Photo Wall)**
    -   支持上传照片并添加描述。
    -   拍立得 (Polaroid) 风格的照片预览框。
    -   支持编辑和删除已发布的照片。

5.  **全局设置 (Settings)**
    -   管理员权限保护。
    -   可配置双方昵称、头像、专属密码和恋爱起始日期。

## 🛠 技术架构

本项目基于现代前端技术栈构建，注重性能和开发体验。

### 核心技术栈

-   **框架**: [Next.js 15](https://nextjs.org/) (App Router)
-   **语言**: [TypeScript](https://www.typescriptlang.org/)
-   **UI 库**: [React 19](https://react.dev/)
-   **样式**: [UnoCSS](https://unocss.dev/) (自定义 Memphis Preset)
-   **后端服务**: [Supabase](https://supabase.com/)
    -   **Database**: PostgreSQL (存储设置、消息、照片元数据、祝福数)
    -   **Storage**: 存储用户头像和上传的照片
    -   **Realtime**: 实现消息和祝福数的实时同步
-   **部署**: [Vercel](https://vercel.com/)

### 目录结构

```
.
├── scripts/                # 维护脚本 (数据清理、连接测试)
├── src/
│   ├── app/               # Next.js App Router 页面
│   ├── components/        # UI 组件 (Countdown, PhotoWall, etc.)
│   ├── lib/               # Supabase 客户端配置
│   ├── utils/             # 工具函数 (Cookie 管理等)
│   └── types.ts           # TypeScript 类型定义
├── uno.config.ts          # UnoCSS 配置文件 (主题、快捷方式)
└── ...
```

## 🚀 快速开始

### 1. 环境准备

确保已安装 Node.js (v18+) 和 pnpm。

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.local.example` (如果有) 或新建 `.env.local`，填入 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SETTINGS_PASSWORD=your_admin_password
NEXT_PUBLIC_SITE_TITLE=贴贴记录
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000` 查看效果。

## 🔧 维护脚本

项目内置了一些实用脚本，位于 `scripts/` 目录下：

-   **测试数据库连接**:
    ```bash
    pnpm script:test-connection
    ```
-   **清理测试数据** (慎用，会清空所有远程数据):
    ```bash
    pnpm script:delete-test-data
    ```

## 🎨 设计风格

本项目采用 **Memphis Design** 风格，特点包括：
-   高饱和度的配色 (Pink, Cyan, Yellow, Purple, Orange)
-   粗黑边框 (3px border)
-   几何图形装饰
-   硬阴影 (Hard Shadows)

---

Made with ❤️ by SnowballXueQiu
