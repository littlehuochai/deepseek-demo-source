# DeepSeek 演示（手机优化版 + APK）

基于 DeepSeek 官方开源的 [chat-demo](https://github.com/deepseek-ai/chat-demo)（MIT）修改，
修了一批手机上用着别扭的地方，并打包成了可以安装的 Android 应用。

- **在线版**：https://littlehuochai.github.io/deepseek-demo/
- **APK 下载**：[Releases](../../releases)（当前 v1.7「大肥鱼」）（当前 v1.7「大肥鱼」）
- **用前需要**：你自己的 DeepSeek API Key（在页面「设置」里填一次，存在本机）

## 相对原版的改动

1. **公式定界符兼容**：模型有时写 `\[ ... \]`、`\( ... \)` 或裸的 `\begin{aligned}`，
   原版会当成普通文字显示。现在解析前统一成 `$$` / `$`，代码块和已有公式不受影响。
2. **分式统一竖排**：写成 `a/b` 的分式（含 `-1/x^2`、`e^{1/x}`、`1/(1+x^2)`）自动转成 `\frac`，
   不再出现横向的斜杠分数。
3. **思考过程默认收起**：只留一行「已思考（用时 N 秒）」，点开才看推理过程。
4. **窄屏不再横向溢出**：长公式、宽表格收进自己的滚动框，页面不会被撑得比屏幕宽。
5. **PWA**：加 manifest + Service Worker，可装到桌面、离线打开。
6. **作答风格**：以简洁易懂为先，用最短步骤得出结论，能用简单方法就不用复杂方法。
7. **Android APK**：WebView 壳 + 资源全部内置，点开必定有界面，不依赖任何域名；支持图片/文件上传、语音输入录音。

## 在线版

```sh
pnpm install
pnpm build          # 产物在 dist/
```

把 `dist/` 推到任意静态托管即可（现用 GitHub Pages）。

## 打包 APK

```sh
./apk/build.sh      # 默认取 ../../chat-demo-mobile/dist 之类，见脚本第 1 个参数
```

依赖：JDK 17、Android build-tools（aapt2/d8/zipalign/apksigner）、android.jar。
在 arm64 机器上要注意 build-tools 是 x86_64 的，需要 `qemu-x86_64-static` 运行 aapt2 和 zipalign，
脚本里已处理。签名用 `apk/dsh.keystore`，同签名覆盖安装可保留数据。

## 说明

- 模型固定 `deepseek-flash`：`deepseek-v4-pro` 不支持本页依赖的联网搜索、读链接与自动起标题扩展。
- 对话和 Key 都存在浏览器/App 本地，清除应用数据或换设备会丢失，记得用「设置 → 数据管理 → 导出」备份。
- 原版说明见 [README-upstream.zh-CN.md](./README-upstream.zh-CN.md)。

## 许可

MIT，见 [LICENSE](./LICENSE)。原项目版权归 DeepSeek。
