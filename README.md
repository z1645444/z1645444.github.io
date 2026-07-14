# Chromatic

Chromatic 是一个基于 Astro 构建的玩具盒 (Toy-Box) 风格个人博客，具有生动、可触感的交互界面设计。

## 项目特点

- 基于 Astro 构建，具有优秀的加载性能与 SEO 体验。
- 采用模块化的玩具盒式四象限导航设计（建造、探索、观察、关于）。
- 原生支持 Markdown 与 MDX 文章。
- 自动生成 RSS 订阅源与站点地图。

## 目录结构

- `src/pages/` - 页面与路由
- `src/content/` - 博客文章与配置定义
- `src/components/` - UI 组件
- `src/layouts/` - 页面模版
- `src/styles/` - 全局样式与主题配置

## 常用命令

项目使用 pnpm 进行包管理。

| 命令 | 描述 |
| :--- | :--- |
| `pnpm install` | 安装项目依赖 |
| `pnpm dev` | 启动本地开发服务器，默认端口 4321 |
| `pnpm build` | 编译生成用于生产环境的静态站点 |
| `pnpm preview` | 在本地预览生产环境构建效果 |
| `pnpm astro [command]` | 执行 Astro 命令行工具 |
