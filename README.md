# Breeze - 浏览器扩展

> Just breeze it.

基于 [WXT](https://wxt.dev/) 框架开发的浏览器扩展，面向团队日常提效。

## 功能概览

### Popup 弹窗

- **SWQA 接口提取** — 在 SWQA 接口详情页自动提取接口数据，生成结构化 JSON，支持一键复制 JSON 或 Prompt（创建/更新两种模板）
- **通用 API 文档提取** — 在任意网页通过 DOM 点选或文本选区采集 API 文档，调用大模型进行结构化提取

### 内容脚本

- **DWS 项目信息弹窗** — 在 DWS 页面展示项目名称、GIS 版本、最近 commit、播放器版本等，支持一键复制
- **GitLab 项目快捷访问** — 在 GitLab 页面展示常用项目列表（Overlay / Inline 两种模式），支持自定义别名
- **GitLab 搜索框优化** — 禁用搜索框自动填充

### Options 设置页

- 基础设置（DWS 信息弹窗开关、GitLab 展示模式）
- 版本检查设置（更新检查 URL、缓存时间）
- SWQA Prompt 模板编辑（创建/更新模板，支持占位符）
- 通用提取模型配置（API 地址、Model ID、API Key、连接测试）

### 后台能力

- Excel 导出/解析
- 代理 Fetch 请求与文件下载

## 开发

```bash
pnpm dev
```

打开浏览器并加载 `dist/chrome-mv3-dev` 目录。

### 添加公共组件

```bash
pnpm dlx shadcn@latest add dialog
```

更多指导请参考 [shadcn/cli](https://ui.shadcn.com/docs/cli)。

### 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm test` | 运行全部测试用例 |
| `pnpm lint` | Biome 检查与自动修复 |
| `pnpm check:types` | TypeScript 类型检查 |
| `pnpm verify` | 基础校验（lint + 类型检查 + 测试） |
| `pnpm build-zip` | 生成路由产物并输出 zip 包 |
| `pnpm package` | 打包扩展 |

## 生产构建

```bash
pnpm build
```

生成生产包，可压缩后安装到 Chrome 浏览器中。
