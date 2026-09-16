# 小小星球

一个移动端优先的中文个人生活工作台，包含首页、存钱、倒计时、月度目标、追星、生活记录、扩展与心愿清单。

## 数据说明

- 数据默认保存在当前浏览器的 IndexedDB 中，不会上传到 GitHub。
- 更换浏览器、设备或网站域名时，请先导出加密备份，再在新环境中导入。
- 图片会在浏览器端压缩后保存。

## 本地开发

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build:github
npx tsc --noEmit
npm run lint
```

## GitHub Pages

推送到 `main` 分支后，`.github/workflows/deploy-pages.yml` 会自动构建并发布到：

<https://xxuiii1207-sy.github.io/small-planet-life/>

GitHub Pages 使用 `/small-planet-life/` 作为资源前缀，构建产物位于 `dist-github/`，无需提交构建产物。
