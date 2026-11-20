// checkup-brief — web/app.js
// 静态演示页的交互逻辑：中/EN 切换、五个模块切换、解析器、打卡。
// 不用任何外部库，不上传任何数据。所有处理都在浏览器本地完成。
// 只做健康科普，不做诊断，不能替代医生。
'use strict';

/* ---------- 示例数据（与 examples/sample-report.txt 完全一致，已脱敏） ---------- */
const SAMPLE_TEXT = [
  '总胆固醇(TC) 6.12 mmol/L 参考范围 <5.2',
  '甘油三酯(TG) 2.48 mmol/L 参考范围 <1.7',
  '高密度脂蛋白胆固醇(HDL-C) 1.12 mmol/L 参考范围 >1.0',
  '空腹血糖(FPG) 5.9 mmol/L 参考范围 3.9-6.1',
  '糖化血红蛋白(HbA1c) 5.6 % 参考范围 4.0-6.0',
  '谷丙转氨酶(ALT) 52 U/L 参考范围 9-50',
  '谷草转氨酶(AST) 31 U/L 参考范围 15-40',
  '谷氨酰转肽酶(GGT) 38 U/L 参考范围 10-60',
  '总胆红素(TBIL) 14.2 umol/L 参考范围 0-23',
  '肌酐(CREA) 82 umol/L 参考范围 57-97',
  '尿素氮(BUN) 5.2 mmol/L 参考范围 3.1-8.0',
  '尿酸(UA) 452 umol/L 参考范围 208-428',
  '促甲状腺激素(TSH) 2.10 mIU/L 参考范围 0.27-4.2',
  '游离甲状腺素(FT4) 16.5 pmol/L 参考范围 12-22',
  '白细胞计数(WBC) 6.2 10^9/L 参考范围 3.5-9.5',
  '血红蛋白(HGB) 152 g/L 参考范围 130-175',
  '血小板计数(PLT) 238 10^9/L 参考范围 125-350',
  '血压 132/84 mmHg',
].join('\n');

const PROFILE = { age: 32, sex: 'male', familyHistory: [], budget: 1500 };

/* ---------- 中英文文案 ---------- */
const I18N = {
  zh: {
    tagline: '把体检报告，翻译成人话。',
    lede: '粘贴体检报告，得到一页纸人话简报：总分、红黄绿灯、每项异常讲清楚，下次查什么、挂什么科、30 天怎么改，都在同一页里。',
    disclaimer: '只做健康科普，不做诊断，不能替代医生。',
    tabs: ['一页纸简报', '解析器', '套餐推荐', '挂号清单', '30 天计划'],
    scoreLabel: '分',
    abnormal: '项超出范围',
    borderline: '项正常偏高',
    normal: '项正常',
    parseTitle: '解析器',
    parseHint: '粘贴体检报告文字，或点“载入示例”试试。解析只在你的浏览器里进行，不上传。',
    loadSample: '载入示例报告',
    runParse: '开始解析',
    packageTitle: '下次体检，建议这样选',
    clinicTitle: '挂号与问诊清单',
    planTitle: '30 天改善计划',
    planHeadline: '未来 30 天，重点关注：血脂、尿酸、肝脏、血糖、血压。每天只做 3 件小事。',
    shareTitle: '分享长图（示例）',
    shareHint: '下面这张卡片可以直接截图分享给家人。',
  },
  en: {
    tagline: 'Turn your checkup report into plain language.',
    lede: 'Paste a health checkup report and get a one-page briefing in plain language: an overall score, red / yellow / green lights, a clear explanation for every abnormal result, plus what to check next time, which department to visit, and a 30-day plan — all on one page.',
    disclaimer: 'For health education only. This is not a diagnosis and does not replace a doctor.',
    tabs: ['Briefing', 'Parser', 'Checkup Package', 'Clinic Guide', '30-Day Plan'],
    scoreLabel: 'points',
    abnormal: 'out of range',
    borderline: 'borderline high',
    normal: 'normal',
    parseTitle: 'Parser',
    parseHint: 'Paste your report text, or click “Load sample” to try it. Parsing runs entirely in your browser. Nothing is uploaded.',
    loadSample: 'Load sample report',
    runParse: 'Parse',
    packageTitle: 'What to check next time',
    clinicTitle: 'Clinic & consultation checklist',
    planTitle: '30-day improvement plan',
    planHeadline: 'For the next 30 days, focus on: lipids, uric acid, liver, blood sugar, and blood pressure. Just three small things a day.',
    shareTitle: 'Share card (sample)',
    shareHint: 'Screenshot the card below to share it with family.',
  },
};

let lang = 'zh';
let items = parseReportText(SAMPLE_TEXT);
let briefing = buildBriefing(items, PROFILE);

/* 英文人话讲解（仅演示页内使用；完整英文简报见 README_EN.md）。 */
const EN_EXPLANATIONS = {
  tc: { high: 'Total cholesterol is high. Both dietary fat and cholesterol made by the body can raise it, and a persistently high level adds strain on blood vessels. Start with diet and exercise, then recheck the trend.' },
  tg: { high: 'Triglycerides are high, most directly linked to oily food, alcohol, sugary food, and too little exercise. This is the most lifestyle-sensitive marker — and the easiest to bring down.' },
  ua: { high: 'Uric acid is high. Seafood, red meat, organ meat, beer, and sugary drinks can raise it. A persistently high level deserves attention for gout and kidney strain. Drink more water and less alcohol.' },
  fpg: { 'borderline-high': 'Fasting glucose is on the high side of normal — not abnormal yet, but worth watching. Eat fewer refined carbs, move more, and keep weight in check.' },
  alt: { high: 'ALT is mildly elevated, suggesting the liver is under some strain. Common causes include fatty liver, alcohol, late nights, and some medicines. Avoid alcohol, keep a regular sleep schedule, and recheck in 1–3 months.' },
  sbp: { 'borderline-high': 'Systolic pressure is on the high side of normal — not hypertension yet, but already a signal. Less salt, weight control, and regular exercise all help.' },
  dbp: { 'borderline-high': 'Diastolic pressure is on the high side of normal. Like systolic pressure, start with less salt, exercise, and sleep.' },
};
function enExplanation(item) {
  if (EN_EXPLANATIONS[item.id] && EN_EXPLANATIONS[item.id][item.status]) return EN_EXPLANATIONS[item.id][item.status];
  if (item.status === 'high') return `${item.name} is high (${item.value} ${item.unit}). Please recheck and talk to a doctor.`;
  if (item.status === 'borderline-high') return `${item.name} is on the high side of normal (${item.value} ${item.unit}). Not abnormal yet, but worth watching.`;
  return `${item.name} is normal (${item.value} ${item.unit}).`;
}
function enSummary() {
  const abnormal = briefing.items.filter((i) => i.status === 'high' || i.status === 'low');
  const names = abnormal.map((i) => i.name).join(', ');
  return `32-year-old male. ${abnormal.length} result${abnormal.length > 1 ? 's' : ''} out of range (${names}), and ${briefing.counts.borderline} borderline high. Don't panic — most of these relate to diet, exercise, sleep, and alcohol. Focus on rechecking the trend and bringing the report to a doctor.`;
}

const STATUS_LABEL = {
  zh: { high: '偏高', low: '偏低', 'borderline-high': '正常偏高', 'borderline-low': '正常偏低', normal: '正常', unknown: '无法判定' },
  en: { high: 'High', low: 'Low', 'borderline-high': 'Borderline high', 'borderline-low': 'Borderline low', normal: 'Normal', unknown: 'Unknown' },
};

function statusClass(status) {
  if (status === 'high' || status === 'low') return 'red';
  if (status === 'borderline-high' || status === 'borderline-low') return 'yellow';
  return 'green';
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function renderBriefing() {
  const t = I18N[lang];
  const el = document.getElementById('briefing');
  const rows = briefing.items.map((item) => {
    const cls = statusClass(item.status);
    const range = item.range.low != null && item.range.high != null
      ? `${item.range.low}–${item.range.high}`
      : item.range.high != null ? `< ${item.range.high}` : `> ${item.range.low}`;
    return `<tr class="${cls === 'red' ? 'row-red' : cls === 'yellow' ? 'row-yellow' : ''}">
      <td><span class="dot ${cls}"></span>${esc(item.name)}</td>
      <td>${item.value} ${esc(item.unit)}</td>
      <td>${range}</td>
      <td class="status-${cls}">${STATUS_LABEL[lang][item.status] || item.status}</td>
      <td>${esc(lang === 'en' ? enExplanation(item) : item.explanation)}</td>
    </tr>`;
  }).join('');
  const summaryText = lang === 'en' ? enSummary() : briefing.summary;
  const levelText = lang === 'en'
    ? (briefing.score >= 90 ? 'Looking good' : briefing.score >= 75 ? 'Mostly good' : briefing.score >= 60 ? 'A few things to watch' : 'Please talk to a doctor soon')
    : briefing.level;
  el.innerHTML = `
    <div class="score"><b>${briefing.score}</b><span>${t.scoreLabel} · ${esc(levelText)}</span></div>
    <p class="counts">${briefing.counts.abnormal} ${t.abnormal} · ${briefing.counts.borderline} ${t.borderline} · ${briefing.counts.normal} ${t.normal}</p>
    <p>${esc(summaryText)}</p>
    <table><thead><tr><th>${lang === 'zh' ? '指标' : 'Indicator'}</th><th>${lang === 'zh' ? '结果' : 'Result'}</th><th>${lang === 'zh' ? '参考范围' : 'Reference'}</th><th>${lang === 'zh' ? '状态' : 'Status'}</th><th>${lang === 'zh' ? '人话讲解' : 'In plain language'}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="share-card">
      <h2>${t.shareTitle}</h2>
      <p class="muted">${t.shareHint}</p>
      <div class="big">${briefing.score} ${t.scoreLabel}</div>
      <p>${esc(summaryText)}</p>
      <p class="muted">${t.disclaimer}</p>
    </div>`;
}

function renderParser() {
  const t = I18N[lang];
  const el = document.getElementById('parser');
  const rows = items.map((item) => {
    const cls = statusClass(item.status);
    return `<tr><td>${esc(item.name)}</td><td>${item.value} ${esc(item.unit)}</td><td class="status-${cls}">${STATUS_LABEL[lang][item.status] || item.status}</td><td>${item.range.source === 'report' ? (lang === 'zh' ? '报告单' : 'Report') : (lang === 'zh' ? '内置' : 'Built-in')}</td></tr>`;
  }).join('');
  el.innerHTML = `
    <h2>${t.parseTitle}</h2>
    <p class="muted">${t.parseHint}</p>
    <label>${lang === 'zh' ? '体检报告文字' : 'Report text'}</label>
    <textarea id="reportText">${esc(SAMPLE_TEXT)}</textarea>
    <div>
      <button class="primary" id="runParse">${t.runParse}</button>
      <button class="ghost" id="loadSample">${t.loadSample}</button>
    </div>
    <div id="parseResult"><table><thead><tr><th>${lang === 'zh' ? '指标' : 'Indicator'}</th><th>${lang === 'zh' ? '结果' : 'Result'}</th><th>${lang === 'zh' ? '状态' : 'Status'}</th><th>${lang === 'zh' ? '范围来源' : 'Range source'}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  document.getElementById('runParse').addEventListener('click', () => {
    const text = document.getElementById('reportText').value;
    items = parseReportText(text);
    briefing = buildBriefing(items, PROFILE);
    renderAll();
  });
  document.getElementById('loadSample').addEventListener('click', () => {
    document.getElementById('reportText').value = SAMPLE_TEXT;
    items = parseReportText(SAMPLE_TEXT);
    briefing = buildBriefing(items, PROFILE);
    renderAll();
  });
}

function renderPackage() {
  const t = I18N[lang];
  const rec = recommendPackage({ profile: PROFILE, items, budget: PROFILE.budget });
  const list = (arr) => arr.map((x) => `<li><strong>${esc(x.name)}</strong> — ${esc(x.reason)}（${esc(x.price || '')}）</li>`).join('');
  document.getElementById('package').innerHTML = `
    <h2>${t.packageTitle}</h2>
    <p>${esc(rec.note)}</p>
    <div class="card"><h3>${lang === 'zh' ? '建议加查' : 'Recommended add-ons'}</h3><ul>${list(rec.add)}</ul></div>
    <div class="card"><h3>${lang === 'zh' ? '可选' : 'Optional'}</h3><ul>${list(rec.optional)}</ul></div>
    <div class="card"><h3>${lang === 'zh' ? '可以省掉' : 'You can skip'}</h3><ul>${list(rec.skip)}</ul></div>`;
}

function renderClinic() {
  const t = I18N[lang];
  const guides = buildClinicGuide(items);
  const cards = guides.map((g) => `
    <div class="card">
      <h3>${esc(g.department)} — ${esc(g.indicator)} ${esc(g.value)}</h3>
      <p class="muted">${esc(g.reason)}</p>
      <p><strong>${lang === 'zh' ? '带什么' : 'Bring'}</strong></p>
      <ul>${g.bring.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
      <p><strong>${lang === 'zh' ? '问医生什么' : 'Ask the doctor'}</strong></p>
      <ol>${g.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
    </div>`).join('');
  document.getElementById('clinic').innerHTML = `<h2>${t.clinicTitle}</h2>${cards || `<p class="muted">${lang === 'zh' ? '本次没有需要挂号的异常指标。' : 'No abnormal results need a clinic visit this time.'}</p>`}`;
}

function renderPlan() {
  const t = I18N[lang];
  const plan = buildPlan30d(items, PROFILE);
  const weeks = plan.weeks.map((w) => `
    <div class="card"><h3>${lang === 'zh' ? `第 ${w.week} 周：${w.theme}` : `Week ${w.week}: ${w.theme}`}</h3>
    <p>${esc(w.goal)}</p><ul>${w.tasks.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
  document.getElementById('plan').innerHTML = `
    <h2>${t.planTitle}</h2>
    <p>${lang === 'zh' ? plan.headline : t.planHeadline}</p>
    <div class="card"><h3>${lang === 'zh' ? '吃' : 'Eat'}</h3><ul>${plan.daily.eat.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="card"><h3>${lang === 'zh' ? '动' : 'Move'}</h3><ul>${plan.daily.move.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="card"><h3>${lang === 'zh' ? '睡' : 'Sleep'}</h3><ul>${plan.daily.sleep.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    ${weeks}
    <div class="card"><h3>${lang === 'zh' ? '今日打卡' : 'Today'}</h3>
      <div class="check">
        <label><input type="checkbox"> ${lang === 'zh' ? '吃了' : 'Ate well'}</label>
        <label><input type="checkbox"> ${lang === 'zh' ? '动了' : 'Moved'}</label>
        <label><input type="checkbox"> ${lang === 'zh' ? '睡好了' : 'Slept well'}</label>
      </div>
      <p class="muted">${esc(plan.note)}</p>
    </div>`;
}

function renderStaticText() {
  const t = I18N[lang];
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.getElementById('tagline').textContent = t.tagline;
  document.getElementById('lede').textContent = t.lede;
  document.getElementById('disclaimer').innerHTML = `<strong>${t.disclaimer}</strong>`;
  document.querySelectorAll('.tabs button').forEach((b, i) => { b.textContent = t.tabs[i]; });
  document.querySelectorAll('.lang button').forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
}

function renderAll() {
  renderStaticText();
  renderBriefing();
  renderParser();
  renderPackage();
  renderClinic();
  renderPlan();
}

document.querySelectorAll('.tabs button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.panel).classList.add('active');
  });
});

document.querySelectorAll('.lang button').forEach((btn) => {
  btn.addEventListener('click', () => {
    lang = btn.dataset.lang;
    renderAll();
  });
});

renderAll();
