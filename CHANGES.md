# 当前满意版本（2026-11-20）

线上地址：https://littlehuochai.github.io/deepseek-demo/
仓库：https://github.com/littlehuochai/deepseek-demo （tag `good-2026-11-20`，commit `3683c64`）

## 相对官方 chat-demo 的改动

源码在 `/root/workspace/chat-demo-mobile`，构建产物同步到 `/root/workspace/chat-demo-site`。

1. **公式定界符兼容**（`src/services/markdown/parse.ts`）
   - 解析前把 `\[...\]`、`\(...\)`、裸的 `\begin{aligned}` 统一成 `$$...$$` / `$...$`
   - 跳过代码块、行内代码和已有公式；保留列表缩进，不拆散列表

2. **思考过程默认收起**（`src/components/messages/ReplyArea.tsx`）
   - `useState(true)` → `useState(false)`，只留一行标题，点开才看过程

3. **窄屏防横向溢出**（`src/app/mobile.css`、`MessageList.module.css`）
   - 页面禁止被内容撑宽；消息列允许收缩
   - 表格、独立公式在各自框内左右滑动
   - 不改字号、间距，排版保持 demo 原样

4. **分式统一竖排**（`src/services/markdown/parse.ts`）
   - 公式里写成 `a/b` 的分式，渲染前自动转成 `\frac{a}{b}`
   - 支持上标与括号：`-1/x^2`、`x^2/y`、`e^{1/x}`、`1/(1+x^2)`、`(a+b)/2`
   - 只处理公式节点，已有的 `\frac` 和代码块不动

5. **系统提示词**
   - 保留身份句 `该助手为DeepSeek，由深度求索公司创造。`
   - 追加一条解题偏好：求极限优先洛必达，必要时先化 0/0、∞/∞ 型
   - 模型仍是 `deepseek-flash`（v4-pro 不支持工具与标题扩展，实测会被服务端拒绝）
   - `latest_reminder` 机制未动（日期,星期,地区,Web,语言）

## 重建与发布

```sh
cd /root/workspace/chat-demo-mobile
pnpm install      # 首次
pnpm build

cd /root/workspace/chat-demo-site
rm -rf static index.html && cp -r ../chat-demo-mobile/dist/. .
touch .nojekyll
git add -A && git commit -m "..." && git push origin main
```

GitHub Pages 约 1 分钟自动生效。

## 回退到这个版本

```sh
cd /root/workspace/chat-demo-site
git checkout good-2026-11-20 -- .
git commit -am "回退到 good-2026-11-20" && git push origin main
```

## 数据导入

导入器要求每个会话的图片紧跟在该会话之后（或统一放在索引之后按 ID 匹配），
否则会报 `backupIncomplete`。合并多份导出时按这个顺序写 ZIP：

```
manifest.json
chat_sessions/{id}.json
chat_sessions/{id}_files/...   ← 紧跟所属会话
chat_session_index.json
```

已完成：导入 244 个对话（旧 240 + 新 4），旧包里的图片未导入以控制体积。

6. **PWA（离线可用）**
   - `public/manifest.webmanifest`、`icon-192.png`、`icon-512.png`、`public/sw.js`
   - `rspack.config.ts` 用 CopyRspackPlugin 把 public 复制到 dist 根目录
   - `src/index.html` 挂 manifest / icon；`src/main.tsx` 在 https 下注册 Service Worker
   - 效果：加载过一次后，域名打不开也能离线进入页面（发消息仍需联网）

7. **本机兜底插件**
   - `$DSH_HOME/dsh-go/plugins/local-demo-server`（dsh-go 原生插件，`dsh plugin --profile web add` 安装）
   - 输入框上方胶囊「开本机演示」：检查 127.0.0.1:8090，没起就 detached 启动 `python3 -m http.server`，并把地址复制到剪贴板
   - 服务脚本：`/root/workspace/chat-demo-mobile/serve.sh`
   - 本机版与线上版是不同来源，数据不共享
