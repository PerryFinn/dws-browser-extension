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
- **GitLab 绝对时间** — 在已适配的 GitLab 站点默认将带完整时间戳的时间显示为 `YYYY-MM-DD HH:mm:ss`，使用浏览器本地时区；翻页、筛选和动态刷新后仍生效。可在“基本配置 → 页面功能”中开关，自动保存并立即作用于已打开的 GitLab 页面，关闭后恢复 GitLab 最近写入的时间文字，后续原生更新仍正常生效。转换和恢复时保留原文本节点、包装元素及交互，保留原始时间戳和悬浮提示。只转换能唯一定位时间文字的内容；只有日期的分组标题、缺少有效时间戳或含多段非空文字的复杂内容保持原样

### Options 设置页

- 基础设置（DWS 信息弹窗开关、GitLab 展示模式、GitLab 绝对时间开关；绝对时间开关旁的问号支持悬停或键盘聚焦，展示转换示例、时区和关闭行为）
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

| 命令               | 说明                               |
| ------------------ | ---------------------------------- |
| `pnpm dev`         | 启动开发服务器                     |
| `pnpm test`        | 运行全部测试用例                   |
| `pnpm lint`        | Biome 检查与自动修复               |
| `pnpm check:types` | TypeScript 类型检查                |
| `pnpm verify`      | 基础校验（lint + 类型检查 + 测试） |
| `pnpm build-zip`   | 生成路由产物并输出 zip 包          |
| `pnpm package`     | 打包扩展                           |

### 状态与生命周期

应用的状态边界如下。需要同时管理加载、结果与错误的页面请求复用 `src/hooks/use-async-task.ts` 统一表达 `idle → pending → success/error`；结果与错误随状态一起更新，只接收最近一次请求的完成结果。重置和卸载使旧回调失效，不会中止已经发往 background 的模型请求。

| 流程                      | 状态与归属                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 当前标签页与 popup 模式   | `popup/index.tsx` 加载标签页后派生 SWQA/Generic；手动模式切换独立保存，SWQA 页面身份变化时重建提取面板                                                                                                    |
| SWQA 提取                 | `popup/swqa/panel.tsx` 使用请求状态；重试期间保留上次清洗结果，成功后整体替换                                                                                                                             |
| 书签搜索                  | `options/routes/bookmarks/index.tsx` 使用请求状态；新搜索清空旧结果，成功的空数组才显示空状态，失败显示错误，搜索中可发起新查询                                                                           |
| 通用采集与提取            | `generic-api-doc/session.ts` 是持久化状态的唯一规则来源：`idle → picking → picked → extracting → done/error`；`done/error` 可重新提取，`picked/done/error` 可重新采集，reset 生成新的 attempt             |
| popup 内的采集操作        | `popup/generic/panel.tsx` 的 `idle/capturing/extracting` 只表示当前窗口操作，按钮同时受持久化 session 限制                                                                                                |
| 页面点选                  | `contents/generic-api-doc-picker.tsx` 由监听器和 cleanup 管理未启用、点选中、提交/取消；popup 关闭后由页面完成采集并写入 session                                                                          |
| 设置草稿                  | `options/use-drafted-storage.ts` 管理 `hydrating/ready/saving`，脏状态由草稿与已保存值比较得出；外部更新只覆盖未编辑的草稿，保存失败保留输入                                                              |
| 模型连接测试、样例自检    | 两种设置组件中各自独立的请求；连接测试使用当前草稿，样例自检使用已保存配置；连接结果为 `untested/success/failed`                                                                                          |
| 未保存修改离开确认        | `options/use-unsaved-changes-guard.ts` 将脏状态交给 TanStack Router 的 blocker 和 beforeunload；确认离开时放行，取消时阻止导航                                                                            |
| 版本检查                  | `components/update-notice.tsx` 管理 UI 请求；`background/messages/checkVersion.ts` 合并进行中的检查，缓存按配置判断有效性，成功与失败使用不同 TTL                                                         |
| 扩展 storage              | `lib/extension-storage-hook.ts` 管理加载、已就绪和订阅更新；加载期间已收到的订阅更新优先于初始读取，存储键与默认值维持原有协议                                                                            |
| GitLab 项目列表与别名编辑 | Inline/Overlay 按展示模式加载列表；Overlay 的查询、键盘选中和别名草稿属于独立交互，保存失败保留编辑态                                                                                                     |
| DWS 项目信息              | `contents/dws-config-inline.tsx` 加载标签页和项目配置，成功且开关启用时展示                                                                                                                               |
| 页面增强与注入            | GitLab 时间增强负责启用、转换、恢复和清理；Shadow UI 负责等待锚点、挂载和卸载，监听器、observer、timer 随所属生命周期释放                                                                                 |
| 复制反馈                  | `components/copy-btn.tsx` 在复制中、成功反馈和可重试之间切换                                                                                                                                              |
| 共享 UI、路由与动画       | Sidebar、FamilyButton、Expandable 使用开关/受控展开；LinkPreview、Tooltip 使用悬停状态；碰撞、粒子和文字效果由动画周期驱动；组件库的焦点、弹窗、选择与 Router 的 loading/error/retry 状态继续由对应库管理 |

Generic session 的初始化、清空、采集和提取回写统一由 background 调用 `storages/generic-capture-session.ts` 串行处理；popup 和页面脚本通过 `genericCaptureSession` 消息提交动作，不直接写 session。队列只覆盖读取、校验和写入，模型调用在队列外执行。

设置草稿的订阅生命周期只随 storage、key 和默认值变化；`isEqual` 使用当前比较策略，函数引用变化不重新加载或覆盖草稿。

后台还包含两类由平台驱动的生命周期：`background/index.ts` 处理 startup/install/update/suspend；`lib/extension-messaging.ts` 保证每条后台消息只应答一次。Fetch、XHR、下载与 Excel 处理使用 Promise 的 pending/fulfilled/rejected 状态，协议和第三方库内部实现保持原样。

维护这些流程时，以所属模块的状态和转换函数为入口；不要另外保存可以从状态派生出的 loading、成功、空结果等标记。计数器、单个开关和互相独立的设置值无需包装成多阶段状态机。

## 生产构建

```bash
pnpm build
```

构建 zip 并上传到 CDN，仅在确认发布目标后使用。只需本地安装包时，运行 `pnpm build-zip`，产物输出到 `build/`。
