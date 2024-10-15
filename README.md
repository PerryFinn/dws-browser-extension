# 入门指南

首先，运行开发服务器：

```bash
pnpm dev
```

打开你的浏览器并加载相应的开发构建。例如，如果你正在为 Chrome 浏览器开发，使用 manifest v3，请使用：`build/chrome-mv3-dev`。

你可以通过修改 `popup.tsx` 开始编辑弹出窗口。你进行更改时，它应该会自动更新。要添加选项页面，只需在项目根目录下添加一个 `options.tsx` 文件，并默认导出一个 React 组件。同样地，要添加内容页面，在项目根目录下添加一个 `content.ts` 文件，导入一些模块并进行一些逻辑处理，然后在浏览器中重新加载扩展。

有关更多指导，请[访问我们的文档](https://docs.plasmo.com/)

## 添加新的公共组件

```shell
pnpm dlx shadcn@latest add dialog
```

更多指导，请参考：[shadcn/cli](https://ui.shadcn.com/docs/cli)

## 生成生产构建

运行以下命令：

```bash
pnpm build
```

这将为你的扩展创建一个生产包，准备好压缩并安装到谷歌浏览器中。
