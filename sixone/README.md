# 六个一 · 语文素材本（本地网页版）

双击「index.html」即可使用（推荐 Chrome / Edge）。用于记录高考语文“六个一”作文素材：①格言名句 ②一首好诗 ③一节美文 ④素材积累，支持自定义字数、一键导出 TXT / Word（.docx）。

## 快速开始

1. 双击「sixone/index.html」打开。
2. 四张卡片对应四类内容：勾选卡片头部复选框 → 展开选择具体条目（也可编辑文本框内容）。
3. 底部“成稿预览”实时显示排版效果；右上角/预览区可一键导出 TXT、Word，或复制全文、打印（可另存 PDF）。
4. 所有勾选与编辑自动保存在本机浏览器（localStorage 键 sixone.v1），下次打开不丢失。

## 字数自定义

| 位置 | 自定义项 | 默认 |
| --- | --- | --- |
| 格言 | 目标条数 | 5 条 |
| 好诗 | AI 体裁（诗/词）、全诗字数上限、解析字数 | 词 / 80 字 / 150 字 |
| 美文 | 目标字数（实时显示实际字数） | 200 字 |
| 素材 | 标题字数范围、分析字数 | 10~20 字 / 75 字 |

绿色徽章=达标，橙色=与目标差距较大。

## AI 补充功能（格言 / 好诗 / 美文）

四类内容都支持 AI 补充（需 API Key，在 ⚙ 设置里填入）：

- **格言**：输入主题（如：奋斗/坚持/家国）→「🔍 AI 补充格言」，AI 按目标条数给出**课外著名**名句（过滤小学/初中/高中课内与高考必背篇目），请核对出处后使用。
- **好诗**：输入关键词（主题/作者/篇名）→「🔍 AI 补充诗词」。**AI 只检索真实存在且课外（非课纲必背）的名家诗词，绝不创作**；每首诗旁「✍️解析」可让 AI 按你设的解析字数生成解析。
- **美文**：输入主题 →「🔍 AI 补充美文」，AI 给出**完整段落**（约目标字数）；若为 AI 整理版会在【来源】注明，请核对后使用。
- **素材**：见下方“每周更新素材”。

所有 AI 补充结果都可直接编辑、删除，并自动保存到本机。

## DeepSeek API（可选）

### 申请 API Key

1. 打开 platform.deepseek.com，手机号注册并实名。
2. 左侧“API Keys”→“创建 API Key”，复制 sk-...（只显示一次）。
3. 充值 5~10 元即可用很久（deepseek-chat 一次生成约几百 token，成本不足 1 分钱）；建议在“用量”页面设置余额提醒。

### 在程序里使用

- 点右上角 ⚙ 设置 → 粘贴 Key → 保存 → 测试连接。
- 用途一：好诗卡片“AI 生成一首”（输入主题，按你设的字数上限/解析字数生成）。
- 用途二：素材卡片“获取近期热点”→ 点条目自动填入 → “AI 写分析”（AI 只基于你粘贴的新闻写标题+梗概+议论分析，不编造事实）。
- 用途三：素材卡片“🔄 一键更新素材”——网页自己拉当天热点并按你的字数要求生成素材，全程无需找我。
- 美文不提供 AI 生成（按你的要求，只收录真实满分作文段落）。

### 安全说明（重要）

- Key 只保存在本机浏览器 localStorage，不写入任何文件、不上传任何第三方服务器；把整个文件夹发给别人也不会泄露 Key。
- 程序直连 DeepSeek 官方接口（https://api.deepseek.com）。
- 设置面板可一键“清空 Key”；离开公共电脑前请清空；勿截图外发 Key。
- 浏览器直连若被跨域（CORS）拦截，可改用下面的本地代理方案，或纯离线使用。

### 可选：本地代理（规避 CORS）

新建 proxy.py（需本机安装 Python），运行后浏览器接口地址填 http://127.0.0.1:8000：

    import http.server, json, urllib.request
    API_KEY = 'sk-你的key'  # 只存在这个文件里
    class H(http.server.BaseHTTPRequestHandler):
        def do_POST(self):
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n))
            req = urllib.request.Request('https://api.deepseek.com/chat/completions',
                  data=json.dumps(body).encode(),
                  headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY})
            data = urllib.request.urlopen(req).read()
            self.send_response(200); self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
            self.wfile.write(data)
        def do_OPTIONS(self):
            self.send_response(200); self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Headers', '*'); self.end_headers()
        def log_message(self, *a): pass
    http.server.HTTPServer(('127.0.0.1', 8000), H).serve_forever()

## 每周更新素材（时效性）

内置 5 条素材均为 2026-08-10 ~ 08-17 的事件。**网页本身就能更新素材，不必找助手**：

1. **一键更新（推荐，需 API Key）**：素材卡片点「🔄 一键更新素材」→ 程序自动拉取当天新闻热点（60s 新闻 / vvhan 热榜，免费接口）→ DeepSeek 按你设的标题/分析字数生成含**梗概（约30字，六要素：时间/地点/人物/起因/经过/结果）**的素材 → 自动存入本机并勾选。以后每周点一下即可，热点即“今天”，天然满足一周内时效。
2. **手动半自动**：点「🌐 获取近期热点」选条目 → 「AI 写分析」；或直接粘贴新闻标题让 AI 写分析（生成标题/梗概/分析）。
4. **批量挑选**：素材卡片提供「☑ 全选 / ☐ 全不选 / ⇄ 反选」，一次勾选多条素材；
5. **不满意重新生成**：每条美文/素材下方有**修改要求输入框**＋「🔄不满意」按钮——先填写想改什么（如：换个角度、更贴合××主题、更有文采），再点击，AI 按你的要求重新生成。
3. **找助手更新（可选）**：对“六个一”项目助手说“更新素材”，助手联网检索并重写 data/sucai.js。

### 更新后如何永久保存 / 换电脑

一键更新结果存在本机浏览器（localStorage）。要带到别的电脑或永久化：点「⬇ 导出素材包(.js)」，用下载的 sucai_日期.js 替换 sixone/data/sucai.js 即可（程序会自动并入新条目，不覆盖你的勾选与编辑）。

### 说明

- 一键更新需要 DeepSeek API Key（单次成本不足 1 分钱）；没 Key 时用第 2 种方式或纯手动编辑。
- AI 生成的标题/分析基于当天热点标题，不会编造标题外的细节；正式使用前请自己过目。
- 热榜接口在 file:// 下若被浏览器跨域拦截，会自动提示改用手动粘贴。

## 文件结构

    sixone/
    ├─ index.html          主程序（双击打开）
    ├─ css/style.css       样式
    ├─ js/main.js          交互逻辑
    ├─ js/docx.js          内置 .docx 生成器（无需第三方库）
    └─ data/
       ├─ geyan.js  格言（30 条，考纲必背篇目范围）
       ├─ shici.js  好诗（苏轼《定风波》、王维《山居秋暝》+解析）
       ├─ meiwen.js 美文（2026 全国Ⅰ卷=广东卷 满分作文真实片段+来源链接）
       └─ sucai.js  素材（近一周 5 条：科技/经济/文化/社会）

## 已知限制（如实说明）

- 美文：内置为**完整段落**（首句取自公开转载的原文，其余为 AI 整理扩展，已明确标注“AI整理版”），附来源链接供核对；AI 补充的美文同样会注明来源性质，不会冒充考场原文。
- 热榜接口：file:// 打开时，浏览器可能拦截对免费热榜 API 的跨域请求；此时请改用“手动粘贴新闻 + AI 写分析”。
- AI 生成内容：诗句为 AI 拟作、素材分析基于你提供的新闻，均需自己审定后再用。
- 数据文件用 .js 而非 .json：双击打开（file://）时浏览器禁止读取本地 json，但允许加载本地脚本。

## 常见问题

- 导出 Word 打不开？用 Word/WPS 打开 .docx 均可；如异常，先试试 TXT 导出。
- 改了内容关掉后丢了？请用 Chrome/Edge 打开（部分浏览器 file:// 下 localStorage 受限，但 Chrome/Edge 正常）。
- 不想用 AI？完全不影响：内置内容 + 手动编辑即可，设置里不填 Key 就行。
- 换了电脑？把整个 sixone/ 文件夹拷走即可；本机记录（勾选/编辑）在浏览器里，可用“导出”保存成果。

祝语文作文素材越来越厚！✍️