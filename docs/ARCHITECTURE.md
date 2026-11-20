# 架构说明

> 只做健康科普，不做诊断，不能替代医生。

## 设计原则

1. **本地优先**：解析、计分、推荐全部是纯函数，在浏览器或 Node 本地跑，不依赖服务器、不调用任何外部 API。
2. **判定与讲解分离**：参考范围判定是确定性的（数值对照区间），大模型 / 人话讲解只负责“怎么说”，不负责“记范围”。这样即使换讲解方式，红黄绿的判定也不会变。
3. **可解释**：计分规则、参考范围、别名表全部公开写在代码里，任何人都能复算。
4. **零依赖、离线可用**：演示页不用外部字体、图片、CDN；所有动画都是 CSS + 原生 JS。
5. **中英同源**：每个模块都接受 `lang` 参数（`'zh'` / `'en'`），文案和逻辑在同一个文件里，不会两边对不上。

## 数据流

```
PDF / 照片 / 截图 / 文字
  → web/import.js       pdf.js 文字层 → 按坐标还原行；扫描件 / 图片 → tesseract.js 本地 OCR
体检报告文字
  → src/aliases.js      别名归一（ALT = 谷丙转氨酶）
  → src/parser.js       parseReportText(text)
  → 结构化指标数组 [{ id, name, value, unit, range, status }]
  → src/reference-ranges.js  对照参考范围（报告单优先，内置兜底）
  → ① src/briefing.js            buildBriefing() → 总分 + 人话讲解
  → ③ src/package-recommender.js recommendPackage() → 下次加查 / 可选 / 可省
  → ④ src/clinic-guide.js        buildClinicGuide() → 科室 / 带什么 / 问什么
  → ⑤ src/plan-30d.js            buildPlan30d() → 30 天吃 / 动 / 睡
  → web/index.html  五个模块展示（② 解析结果即上面的结构化数组）
  → src/markdown.js + bin/checkup-brief.js  命令行生成 examples/sample-brief.md
```

## 模块说明

| 文件 | 职责 | 是否纯函数 |
| --- | --- | --- |
| `src/reference-ranges.js` | 成人常见指标参考范围 | 数据表 |
| `src/aliases.js` | 30 个指标、120+ 种写法的别名归一表 | 数据表 |
| `src/parser.js` | 文本 → 结构化指标 + 红黄绿判定 | 是 |
| `src/briefing.js` | 计分 + 人话讲解 | 是 |
| `src/package-recommender.js` | 下次体检加查 / 可选 / 可省 | 是 |
| `src/clinic-guide.js` | 挂号科室 + 问诊清单 | 是 |
| `src/plan-30d.js` | 30 天改善计划 + 打卡表 | 是 |
| `src/markdown.js` | 拼出整份 Markdown 简报 | 是 |
| `bin/checkup-brief.js` | 命令行 | 否（读文件） |
| `web/import.js` | PDF / 图片 / 文本导入（本地，按需加载 vendor） | 否（浏览器） |
| `web/app.js` | 演示页交互、中 / EN、分享长图、打卡 | 否（DOM） |

## 计分规则

满分 100。偏高 / 偏低一项扣 7 分，正常偏高 / 偏低扣 2 分，血压（收缩压 + 舒张压）只计一次、取较差状态，下限 0 分。

示例：4 项偏高扣 28 分，2 项正常偏高（空腹血糖、血压）扣 4 分，合计 68 分。

## 不做的事

- 不做多年趋势热力图（已明确排除）。
- 不做诊断、不开药、不给具体剂量。
- 不上传、不存储真实报告，不做账号系统。
- 不接任何外部 AI API；讲解文案目前是写在代码里的模板，未来如需接大模型，应只把“已判好的异常指标”发过去，不发原始报告全文。
