# 夜牌馆 · 中国扑克

线上扑克小游戏。打升级、斗地主，可开房间码联机，空位由电脑入座。虚拟积分纯娱乐，**不可提现、不可兑换、不碰现金**。

## 试玩

打开 GitHub Pages（推荐发给朋友的链接）：

**https://sutongwuyanzu.github.io/playing-cards/**

若 `github.io` 打不开，可用 jsDelivr：

**https://cdn.jsdelivr.net/gh/sutongwuyanzu/playing-cards@main/index.html**

本地：用浏览器打开 `index.html`，或任意静态服务器。

开发时建议在仓库根目录运行 `python -m http.server 8765`，再打开 `http://127.0.0.1:8765/`。安装 Playwright 后运行 `npm run test:smoke`（默认连接 8765 端口）。

| 页面 | 玩法 |
|---|---|
| `index.html` | 夜牌馆大厅（填房间码可加入） |
| `shengji.html` | 打升级。北京强制跟花；线下模式自觉跟花、抓牌点级牌亮主、桌上主花提醒 |
| `doudizhu.html` | 斗地主。房间码联机，电脑补位，叫分 / 记牌 / 纯积分 |

## 视觉

1930s 上海牌局气氛：红灯笼厅堂、绿呢圆桌、描金龙纹牌背。人物东哥 / 阿兰 / 老周为馆里常客（电脑）。

## 合规

虚拟积分仅游戏内计分，不可提现、不可兑换、不碰现金。

## 联机

创建房间后把 **6 位房间码** 或邀请链接发给朋友。房主权威同步牌局，走公网 MQTT + 同浏览器通道。房主需保持页面打开。

## 语音与皮肤

报牌和角色台词只播放 `assets/tts/{音色}/` 下的预录 MP3/WAV；浏览器首次播放需要点击或按键授权。报牌短句可用 `python scripts/gen_tts.py` 重录，角色台词可用 `python tools/qwen3_tts_generate.py` 重录（需要本机已配置对应模型）。皮肤图片在 `assets/skins/`，自定义 54 张牌面保存在浏览器 IndexedDB。

## 分支与发布

GitHub Pages 跟踪 `main`。功能分支完成并合入 `main`、推送后，线上页面才会更新。

## 规划中

- 掼蛋 / 炸金花 / 捉黑枪
- AI 调参
