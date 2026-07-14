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
| `pnpm check` | 检查 Astro、TypeScript 和内容类型 |
| `pnpm preview` | 在本地预览生产环境构建效果 |
| `pnpm astro [command]` | 执行 Astro 命令行工具 |

## 二次开发

常用定制入口如下：

- `src/consts.ts`：站点标题、描述、分类、导航、图标和分类颜色。
- `src/styles/global.css`：亮色与暗色主题 Token、字体和公共组件样式。
- `src/pages/about.astro`：关于页面内容。
- `src/content/blog/`：示例文章和用户文章。
- `public/`：favicon 等无需 Astro 处理的静态资源。

新增博客分类时，只需在 `QUADRANTS_CONFIG.quadrants` 中添加配置并使用已有图标名称。分类页面、导航颜色和内容校验会读取同一份配置。

文章文件必须使用以下路径格式：

```text
src/content/blog/[category]/[YYYY]-[MM]-[DD]-[slug].md
```

文件目录、文件名日期以及 frontmatter 中的 `category`、`pubDate` 必须保持一致，构建时会自动校验。

## GitHub Pages

仓库内置 GitHub Pages 工作流。工作流会根据仓库名称自动区分用户站点和项目站点：

- `username.github.io` 部署到 `/`。
- 其他仓库部署到 `/<repository>/`。

如果使用自定义域名，在 GitHub 仓库的 Actions Variables 中设置 `SITE_URL`，例如 `https://blog.example.com`；站点部署在域名根路径时，同时将 `BASE_PATH` 设置为 `/`。本地模拟生产地址时也可以直接传入环境变量：

```bash
SITE_URL=https://blog.example.com BASE_PATH=/ pnpm build
```

所有站内链接都通过 Astro 的 `BASE_URL` 生成，因此 Theme 可以部署在域名根路径或 GitHub Pages 子路径。
