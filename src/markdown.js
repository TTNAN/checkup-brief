// checkup-brief — src/markdown.js
// 纯函数：把五个模块的结果拼成一份 Markdown 一页纸简报（命令行和示例文件都用它）。
//   renderMarkdown(text, profile, lang) -> string
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

const { parseReportText } = require('./parser.js');
const { buildBriefing, formatRange, displayName } = require('./briefing.js');
const { recommendPackage } = require('./package-recommender.js');
const { buildClinicGuide } = require('./clinic-guide.js');
const { buildPlan30d } = require('./plan-30d.js');

const L = {
  zh: {
    title: '体检人话简报（一页纸）', disclaimer: '只做健康科普，不做诊断，不能替代医生。',
    score: (s, l) => `## 总分：${s} 分 · ${l}`,
    counts: (c) => `共识别 ${c.total} 项：🔴 ${c.abnormal} 项超出范围 · 🟡 ${c.borderline} 项正常偏高 · 🟢 ${c.normal} 项正常。`,
    red: '## 🔴 超出参考范围', yellow: '## 🟡 正常范围里偏高', green: '## 🟢 正常',
    th: '| 指标 | 结果 | 参考范围 | 人话讲解 |', allNormal: '都在正常范围。',
    pkg: '## 下次体检怎么选', add: '建议加查', opt: '可选', skip: '可以省掉',
    clinic: '## 挂号与问诊清单', bring: '带', ask: '问',
    plan: '## 30 天改善计划', weekN: (n) => `第 ${n} 周`,
  },
  en: {
    title: 'Checkup brief (one page)', disclaimer: 'Health education only. Not a diagnosis, not a substitute for a doctor.',
    score: (s, l) => `## Score: ${s} · ${l}`,
    counts: (c) => `${c.total} indicators: 🔴 ${c.abnormal} out of range · 🟡 ${c.borderline} borderline · 🟢 ${c.normal} normal.`,
    red: '## 🔴 Out of range', yellow: '## 🟡 Borderline', green: '## 🟢 Normal',
    th: '| Indicator | Result | Reference | In plain words |', allNormal: 'all within range.',
    pkg: '## Next checkup', add: 'Add', opt: 'Optional', skip: 'Skip',
    clinic: '## Clinic guide', bring: 'Bring', ask: 'Ask',
    plan: '## 30-day plan', weekN: (n) => `Week ${n}`,
  },
};

function renderMarkdown(text, profile = {}, lang = 'zh') {
  const t = L[lang] || L.zh;
  const items = parseReportText(text);
  const b = buildBriefing(items, profile, lang);
  const pkg = recommendPackage({ profile, items, budget: profile.budget, lang });
  const guides = buildClinicGuide(items, lang);
  const plan = buildPlan30d(items, profile, lang);
  const out = [];
  const table = (rows) => [t.th, '| --- | --- | --- | --- |', ...rows.map((i) => `| ${displayName(i, lang)} | ${i.value} ${i.unit} | ${formatRange(i.range)} | ${i.explanation} |`)].join('\n');
  const red = b.items.filter((i) => i.status === 'high' || i.status === 'low');
  const yellow = b.items.filter((i) => i.status === 'borderline-high' || i.status === 'borderline-low');
  const green = b.items.filter((i) => i.status === 'normal');

  out.push(`# ${t.title}`, '', `> ${t.disclaimer}`, '', t.score(b.score, b.level), '', t.counts(b.counts), '', b.summary, '');
  if (red.length) out.push(t.red, '', table(red), '');
  if (yellow.length) out.push(t.yellow, '', table(yellow), '');
  if (green.length) out.push(t.green, '', `${green.map((i) => `${displayName(i, lang)} ${i.value}`).join(lang === 'en' ? ', ' : '、')} — ${t.allNormal}`, '');

  out.push(t.pkg, '');
  for (const [label, list] of [[t.add, pkg.add], [t.opt, pkg.optional], [t.skip, pkg.skip]]) {
    if (!list.length) continue;
    out.push(`**${label}**`, '', ...list.map((x) => `- ${x.name}：${x.reason}${x.price ? `（${x.price}）` : ''}`.replace(/：/, lang === 'en' ? ': ' : '：').replace(/（(.*)）$/, lang === 'en' ? ' ($1)' : '（$1）') + (x.source ? `\n  - [${x.source}](${x.sourceUrl})` : '')), '');
  }
  out.push(pkg.note, '');

  if (guides.length) {
    out.push(t.clinic, '');
    for (const g of guides) {
      out.push(`- **${g.department}**（${g.indicator} ${g.value}）`, `  - ${t.bring}：${g.bring.join(lang === 'en' ? '; ' : '；')}`, `  - ${t.ask}：${g.questions.join(' ')}`);
    }
    out.push('');
  }

  out.push(t.plan, '', plan.headline, '');
  plan.weeks.forEach((w) => out.push(`- **${t.weekN(w.week)} · ${w.theme}**：${w.tasks.join(lang === 'en' ? '; ' : '；')}`));
  if (plan.extras.length) out.push('', ...plan.extras.map((x) => `> ${x}`));
  out.push('', plan.note, '');
  return out.join('\n');
}

module.exports = { renderMarkdown };
