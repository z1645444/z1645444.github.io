# Chromatic

基于 [Astro](https://astro.build/) 构建的个人博客，支持 Markdown/MDX、文章分类、深浅色主题、RSS 和 Sitemap。

访问站点：[z1645444.github.io](https://z1645444.github.io/)

## 本地开发

需要 Node.js 22.12 或更高版本，以及 pnpm 10。

```bash
pnpm install
pnpm dev
```

常用命令：

| 命令                | 用途                              |
| ------------------- | --------------------------------- |
| `pnpm check`        | 检查 Astro、TypeScript 和内容类型 |
| `pnpm test`         | 运行 graph 布局和物理单元测试     |
| `pnpm test:e2e`     | 运行 Playwright 浏览器测试        |
| `pnpm format`       | 格式化项目文件                    |
| `pnpm format:check` | 检查项目文件格式                  |
| `pnpm build`        | 构建生产版本到 `dist/`            |
| `pnpm preview`      | 本地预览生产构建                  |

首次运行浏览器测试前，需要安装 Playwright Chromium：

```bash
pnpm test:e2e:install
pnpm test:e2e
```

E2E 测试会在独立的 `4325` 端口启动后台 Astro server，并在测试结束后自动停止。

## 写作

文章存放在 `src/content/blog/`，支持 `.md` 和 `.mdx`。文件路径格式为：

```text
src/content/blog/[category]/[YYYY]-[MM]-[DD]-[slug].md
```

Frontmatter 示例：

```yaml
---
title: '文章标题'
description: '文章摘要'
pubDate: '2026-07-15'
updatedDate: '2026-07-16' # 可选
heroImage: '../../../assets/example.jpg' # 可选
category: 'build'
tags: ['Astro', 'Blog']
---
```

目录名称、文件名日期必须分别与 `category`、`pubDate` 保持一致，否则内容检查和构建会失败。可用分类定义在 `src/consts.ts` 的 `QUADRANTS_CONFIG` 中。

## 站点配置

- `src/consts.ts`：站点标题、描述、语言、分类和导航。
- `src/pages/about.astro`：关于页面。
- `src/styles/global.css`：全局样式及深浅色主题。
- `public/`：favicon 等无需 Astro 处理的静态资源。

## 部署

推送到 `pages` 分支会触发 `.github/workflows/deploy.yml`，检查并构建站点后部署到 GitHub Pages。

使用自定义域名时，在仓库的 Actions Variables 中配置：

- `SITE_URL`：完整站点地址，例如 `https://blog.example.com`。
- `BASE_PATH`：站点部署在域名根路径时设置为 `/`。

本地可复制 `.env.example` 配置相同的构建环境：

```bash
cp .env.example .env
pnpm build
```
