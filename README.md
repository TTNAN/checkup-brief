# checkup-brief

> **只做健康科普，不做诊断，不能替代医生。**
>
> [English version → README_EN.md](README_EN.md)

把体检报告，变成一页能看懂的人话简报。

每年体检完，报告单上的数字大多数人都看不懂：总胆固醇 6.12 是什么意思？尿酸 452 要不要紧？该挂什么科？下次体检还要查什么？checkup-brief 就是为了解决这件事——把体检单发进来，得到一页纸人话简报：总分、红黄绿灯、每项异常讲清楚，下次查什么、挂什么科、30 天怎么改，都在同一页里。

## 痛点

- 体检报告全是术语和数字，看不懂，只能等医生一句话。
- 每家医院的指标名、单位、参考范围都不一样，ALT 又叫谷丙转氨酶，复制粘贴都对不上。
- 看完就扔抽屉，下次体检不知道该加什么、该省什么。
- 异常了不知道挂什么科，见了医生不知道问什么。
- 只告诉你“血脂高”，不告诉你接下来 30 天具体做什么。

## 功能

本仓库以 **1 为主，3 / 4 / 5 / 6 嵌在 1 里面**。不做多年趋势热力图。

### 1. 一页纸人话简报（主功能）

核心产物。一份体检报告对应一份简报：

- 总分（满分 100，公开计分规则：偏高一项扣 7 分，正常偏高扣 2 分，血压只计一次）
- 红黄绿灯：超出范围、正常偏高、正常
- 每项异常一句人话讲解，不说术语
- 可分享的长图卡片，截图就能发给家人

示例：32 岁男性，总分 **68 分**——4 项超出范围（总胆固醇、甘油三酯、谷丙转氨酶、尿酸），3 项正常偏高（空腹血糖、收缩压、舒张压）。见 [examples/sample-brief.md](examples/sample-brief.md)。

### 3. 中文体检解析器

- 粘贴体检报告文字即可解析，也支持 OCR / PDF 复制出来的文本
- 别名归一：ALT = 谷丙转氨酶，总胆固醇 = TC，甘油三酯 = TG，尿酸 = UA，空腹血糖 = FPG……共 30 个指标，见 [src/aliases.js](src/aliases.js)
- 优先用报告单上印的参考范围，报告没印才用内置范围（[src/reference-ranges.js](src/reference-ranges.js)，覆盖血常规、血糖、血脂、肝肾、尿酸、甲状腺、血压、BMI）
- 输出结构化指标数组，带红黄绿判定

### 4. 体检套餐选择器

根据年龄、性别、家族史、预算和本次报告的缺口，推荐下次体检：

- 建议加查：血脂复查、肝脏超声、尿酸复查 + 肾功能等
- 可选：甲状腺超声、肿瘤标志物筛查等
- 可以省掉：盲目加做全套肿瘤标志物、重复查已正常的项目

### 5. 挂号 + 问诊清单生成器

每个异常指标对应：

- 该挂什么科（例如尿酸高 → 风湿免疫科 / 肾内科）
- 去之前带什么资料
- 见医生时问哪几个问题

### 6. 30 天改善计划

根据异常生成 30 天可执行计划，只讲吃、动、睡，不给药、不给剂量：

- 每天只做 3 件小事
- 每周一个主题：第 1 周先记下来，第 2 周换掉最油的一顿，第 3 周把运动固定下来，第 4 周复盘
- 每日打卡（吃 / 动 / 睡），打卡数据只存在本地

## 快速开始

### 在线演示（不用安装）

双击打开 `web/index.html` 即可。纯静态页，不用服务器，不用联网，没有外部字体和图片，离线也能打开。

也可以用本地服务器打开，效果一样：

```bash
cd checkup-brief
python3 -m http.server 8000
# 打开 http://localhost:8000/web/index.html
```

演示页默认中文，顶部有 **中文 / EN** 切换按钮，点一下整页切成英文。

### 用代码跑解析

```js
const { parseReportText } = require('./src/parser.js');
const { buildBriefing } = require('./src/briefing.js');

const items = parseReportText('总胆固醇(TC) 6.12 mmol/L 参考范围 <5.2\n甘油三酯(TG) 2.48 mmol/L 参考范围 <1.7');
const briefing = buildBriefing(items, { age: 32, sex: 'male' });
console.log(briefing.score); // 68（用 examples/sample-report.txt 的完整数据）
```

完整示例见 [examples/sample-report.txt](examples/sample-report.txt)（输入）、[examples/sample-report.json](examples/sample-report.json)（解析结果）、[examples/sample-brief.md](examples/sample-brief.md)（简报）。

## 截图

截图位置说明（尚未生成正式截图，欢迎补充）：

- `docs/screenshots/briefing.png` —— 一页纸简报：总分、红黄绿灯、逐项讲解
- `docs/screenshots/parser.png` —— 解析器：粘贴文本 → 结构化表格
- `docs/screenshots/plan.png` —— 30 天计划：每周主题与每日打卡

请勿在截图里放任何真实体检报告，只用仓库里的脱敏示例数据。

## 隐私：默认本地处理

- 解析、计分、推荐全部在本地完成，不上传、不存储真实报告。
- 演示页不收集任何数据，没有统计、没有第三方请求。
- 请勿把真实体检报告提交到本仓库的 Issue 或 PR 里。
- 详见 [docs/PRIVACY.md](docs/PRIVACY.md)。

## 免责声明

本项目只做健康科普，不做诊断，不能替代医生和正规检查。指标受性别、年龄、试剂、医院区间影响，一切以你报告单上的参考范围和医生解释为准。涉及用药、停药、复查间隔的决定，请一定找医生。计分只是一个帮助理解的科普工具，不是医学评分。

## 仓库结构

```
checkup-brief/
├── README.md                  中文首页（本文件）
├── README_EN.md               英文版
├── LICENSE                    MIT
├── index.html                 根目录入口，跳转到 web/index.html
├── web/
│   ├── index.html             静态演示页
│   ├── styles.css             样式（克制、留白，无外部资源）
│   └── app.js                 交互：中/EN 切换、五个模块、打卡
├── src/
│   ├── reference-ranges.js    成人常见指标参考范围
│   ├── aliases.js             中文指标别名归一表（30 个）
│   ├── parser.js              parseReportText(text)
│   ├── briefing.js            buildBriefing(items, profile)
│   ├── package-recommender.js recommendPackage(...)
│   ├── clinic-guide.js        buildClinicGuide(items)
│   └── plan-30d.js            buildPlan30d(items, profile)
├── examples/
│   ├── sample-report.txt      示例体检报告原文（已脱敏）
│   ├── sample-report.json     解析后的结构化结果
│   └── sample-brief.md        示例一页纸简报
└── docs/
    ├── ARCHITECTURE.md
    ├── PRIVACY.md
    ├── ROADMAP.md
    └── CONTRIBUTING.md
```

## 路线图

见 [docs/ROADMAP.md](docs/ROADMAP.md)。当前明确不做的：多年趋势热力图。

## 贡献

见 [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)。欢迎补充指标别名、参考范围和医院报告格式，但请只用脱敏示例数据，不要提交真实体检报告。

## License

MIT License，作者 TTNAN，见 [LICENSE](LICENSE)。
