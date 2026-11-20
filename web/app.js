// checkup-brief — web/app.js
// 演示页交互：导入 PDF / 图片 / 文字 → 解析 → 五个模块；中 / EN；分享长图；30 天打卡。
// 零依赖，不发任何网络请求（PDF / OCR 库从本仓库 web/vendor/ 按需加载）。
// 打卡和语言偏好只存在本机 localStorage。
// 只做健康科普，不做诊断，不能替代医生。
'use strict';

/* ---------- 示例数据（与 examples/sample-report.txt 一致，已脱敏） ---------- */
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
const SAMPLE_FILES = { pdf: '../examples/demo-checkup.pdf', img: '../examples/demo-photo.jpg' };

/* ---------- 界面文案 ---------- */
const UI = {
  zh: {
    localBadge: '本地处理 · 不上传',
    eyebrow: '体检报告 · 一页纸人话简报',
    title: '体检单，<br>翻译成人话。',
    lede: '导入医院给的 PDF、拍一张照片，或者直接粘贴文字。几秒钟后，你会得到一页看得懂的简报，以及接下来该做什么。',
    ctaSample: '看一份示例简报', ctaMine: '导入我的报告',
    fact1: '文字版 PDF 直接读，扫描件和照片本地识别', fact2: '种指标写法自动对齐', fact3: '次上传。断网也能用',
    miniTitle: '体检人话简报', miniLevel: '有几项要注意',
    miniTc: '总胆固醇', miniUa: '尿酸', miniFpg: '空腹血糖', miniHb: '血红蛋白',
    disclaimer: '只做健康科普，不做诊断，不能替代医生。一切以报告单上的参考范围和医生解释为准。',
    inputTitle: '导入报告',
    inputHint: 'PDF、照片、截图、复制的文字都可以。所有识别都在这台设备上完成。',
    dropTitle: '把 PDF、照片或截图拖到这里', dropHint: '或点击选择文件 · 支持 PDF / JPG / PNG / TXT',
    trySamples: '没有报告在手边？试试：', samplePdf: '示例 PDF', sampleImg: '示例照片', sampleText: '示例文字',
    pasteTitle: '识别出的文字 / 直接粘贴',
    placeholder: '也可以直接粘贴报告文字，例如：\n总胆固醇(TC) 6.12 mmol/L 参考范围 <5.2\n尿酸(UA) 452 umol/L 参考范围 208-428\n血压 132/84 mmHg',
    clear: '清空', lines: (n) => `${n} 行`,
    stage: { load: '正在加载识别模型（首次约 10 MB，之后会快很多）', read: '正在读取 PDF', ocr: '正在识别文字' },
    imported: { text: (f, n) => `已读取 ${f}，共 ${n} 行。`, 'pdf-text': (f, n, p) => `已从 ${f} 读出 ${n} 行文字（${p} 页，文字版 PDF）。`, 'pdf-ocr': (f, n, p) => `${f} 是扫描件，已本地识别 ${p} 页、${n} 行。`, 'image-ocr': (f, n) => `已从照片 ${f} 识别出 ${n} 行。` },
    ocrWarn: '照片 / 扫描件识别可能有误，生成后请对照原报告核对数值，标黄的是自动修正过的。',
    importFail: '这个文件没读出来。可以换一张更清晰的照片，或者把文字复制粘贴进来。',
    profileTitle: '关于你', profileHint: '用于套餐推荐和 30 天计划，只在本地使用。',
    age: '年龄', sex: '性别', male: '男', female: '女', family: '家族史',
    famDiabetes: '糖尿病', famCardio: '心血管病', famCancer: '肿瘤', budget: '下次体检预算',
    run: '生成简报',
    resultTitle: '你的一页纸简报',
    parsedMeta: (n, r) => `识别出 ${n} 项指标，其中 ${r} 项使用报告单上印的参考范围。`,
    tab1: '一页纸简报', tab2: '解析结果', tab3: '下次查什么', tab4: '挂号清单', tab5: '30 天计划',
    footer1: 'checkup-brief',
    footer2: '只做健康科普，不做诊断，不能替代医生。本页没有统计、没有第三方请求，你导入的文件不会离开这台设备；30 天打卡只存在本机浏览器里。',
    points: '满分 100', outOfRange: '超出范围', borderline: '正常偏高', normal: '正常',
    status: { high: '偏高', low: '偏低', 'borderline-high': '正常偏高', 'borderline-low': '正常偏低', normal: '正常', unknown: '无法判定' },
    share: '生成分享长图', print: '打印 / 存 PDF', save: '保存图片', close: '关闭',
    rule: '计分规则公开：满分 100，超出范围一项扣 7 分，正常偏高 / 偏低扣 2 分，血压只算一次。这是帮助理解的科普工具，不是医学评分。',
    flaggedTitle: '需要留意', normalTitle: '正常',
    showNormal: (n) => `展开其余 ${n} 项正常指标`, hideNormal: '收起正常指标',
    ocrFixed: (a, b) => `识别结果 ${a} 疑似漏了小数点，已按参考范围修正为 ${b}，请核对原报告。`,
    colName: '指标', colValue: '结果', colRange: '参考范围', colSource: '范围来源', colStatus: '状态', colFlag: '报告标记',
    srcReport: '报告单', srcBuiltin: '内置',
    showJson: '查看 JSON', hideJson: '收起 JSON', copyJson: '复制 JSON',
    pkgAdd: '建议加查', pkgOpt: '可选', pkgSkip: '可以省掉',
    estLabel: '建议加查约', budgetCap: (b) => `预算 ¥${b}`,
    noAdd: '本次没有需要针对性复查的项目。',
    bring: '带上这些', ask: '问医生', copyQ: '复制问题', noClinic: '这次没有需要专门挂号的指标，按常规每年体检即可。',
    weekN: (n) => `第 ${n} 周`, weekTag: (n) => `WEEK ${n}`, today3: '这周每天的 3 件小事', dayN: (n) => `第 ${n} 天`,
    checkin: '30 天打卡', streak: '天连续', eat: '吃', move: '动', sleep: '睡',
    legendTxt: '完成度', reset: '重置',
    daily: { eat: '吃', move: '动', sleep: '睡' },
    copied: '已复制', savedImg: '长图已生成', empty: '没识别到指标。换个更清晰的文件，或先试试示例。',
    shareTitle: '体检人话简报', shareFoot: '只做健康科普，不做诊断，不能替代医生',
    shareAbn: '需要留意', shareOk: (n) => `其余 ${n} 项正常`,
  },
  en: {
    localBadge: 'Local only · nothing uploaded',
    eyebrow: 'Checkup report · one-page brief',
    title: 'Your checkup,<br>in plain words.',
    lede: 'Drop in the PDF your hospital sent, snap a photo, or paste the text. Seconds later you get one page you can actually read, and what to do next.',
    ctaSample: 'See a sample brief', ctaMine: 'Import my report',
    fact1: 'Text PDFs read directly; scans and photos recognised on-device', fact2: 'indicator spellings normalised', fact3: 'uploads. Works offline',
    miniTitle: 'Checkup brief', miniLevel: 'A few things to watch',
    miniTc: 'Cholesterol', miniUa: 'Uric acid', miniFpg: 'Glucose', miniHb: 'Hemoglobin',
    disclaimer: 'Health education only. Not a diagnosis, not a substitute for a doctor. Your report\'s reference ranges and your doctor\'s reading come first.',
    inputTitle: 'Import your report',
    inputHint: 'PDF, photo, screenshot or copied text. Everything is recognised on this device.',
    dropTitle: 'Drop a PDF, photo or screenshot here', dropHint: 'or click to choose · PDF / JPG / PNG / TXT',
    trySamples: 'No report at hand? Try:', samplePdf: 'sample PDF', sampleImg: 'sample photo', sampleText: 'sample text',
    pasteTitle: 'Recognised text / paste directly',
    placeholder: 'You can also paste report text, e.g.\n总胆固醇(TC) 6.12 mmol/L 参考范围 <5.2\n尿酸(UA) 452 umol/L 参考范围 208-428\n血压 132/84 mmHg',
    clear: 'Clear', lines: (n) => `${n} lines`,
    stage: { load: 'Loading the recognition model (≈10 MB the first time)', read: 'Reading the PDF', ocr: 'Recognising text' },
    imported: { text: (f, n) => `Read ${f}: ${n} lines.`, 'pdf-text': (f, n, p) => `Read ${n} lines from ${f} (${p} pages, text PDF).`, 'pdf-ocr': (f, n, p) => `${f} is a scan — recognised ${p} pages, ${n} lines on-device.`, 'image-ocr': (f, n) => `Recognised ${n} lines from ${f}.` },
    ocrWarn: 'Photo / scan recognition can make mistakes. Check the numbers against your report; auto-corrected ones are marked.',
    importFail: 'Couldn\'t read this file. Try a sharper photo, or paste the text instead.',
    profileTitle: 'About you', profileHint: 'Used for the package and the 30-day plan. Stays on this device.',
    age: 'Age', sex: 'Sex', male: 'Male', female: 'Female', family: 'Family history',
    famDiabetes: 'Diabetes', famCardio: 'Heart disease', famCancer: 'Cancer', budget: 'Next checkup budget',
    run: 'Build my brief',
    resultTitle: 'Your one-page brief',
    parsedMeta: (n, r) => `Found ${n} indicators; ${r} use the reference range printed on your report.`,
    tab1: 'Brief', tab2: 'Parsed', tab3: 'Next checkup', tab4: 'Clinic guide', tab5: '30-day plan',
    footer1: 'checkup-brief',
    footer2: 'Health education only, not a diagnosis. No analytics, no third-party requests; your files never leave this device. Check-ins live only in this browser.',
    points: 'OUT OF 100', outOfRange: 'out of range', borderline: 'borderline', normal: 'normal',
    status: { high: 'High', low: 'Low', 'borderline-high': 'Borderline', 'borderline-low': 'Borderline low', normal: 'Normal', unknown: 'Unknown' },
    share: 'Share image', print: 'Print / PDF', save: 'Save image', close: 'Close',
    rule: 'Open scoring: start at 100, −7 per out-of-range result, −2 per borderline, blood pressure counted once. A learning aid, not a medical score.',
    flaggedTitle: 'Worth attention', normalTitle: 'Normal',
    showNormal: (n) => `Show the other ${n} normal results`, hideNormal: 'Hide normal results',
    ocrFixed: (a, b) => `Read as ${a}, likely a missing decimal point — corrected to ${b}. Please check your report.`,
    colName: 'Indicator', colValue: 'Result', colRange: 'Reference', colSource: 'Range from', colStatus: 'Status', colFlag: 'Flag',
    srcReport: 'Report', srcBuiltin: 'Built-in',
    showJson: 'Show JSON', hideJson: 'Hide JSON', copyJson: 'Copy JSON',
    pkgAdd: 'Add', pkgOpt: 'Optional', pkgSkip: 'Skip',
    estLabel: 'Recommended add-ons', budgetCap: (b) => `budget ¥${b}`,
    noAdd: 'Nothing needs a targeted recheck this time.',
    bring: 'BRING', ask: 'ASK', copyQ: 'Copy questions', noClinic: 'Nothing needs a dedicated visit. A routine yearly checkup is enough.',
    weekN: (n) => `Week ${n}`, weekTag: (n) => `WEEK ${n}`, today3: 'Three small things a day, this week', dayN: (n) => `Day ${n}`,
    checkin: '30-day check-in', streak: 'day streak', eat: 'Eat', move: 'Move', sleep: 'Sleep',
    legendTxt: 'Done', reset: 'Reset',
    daily: { eat: 'Eat', move: 'Move', sleep: 'Sleep' },
    copied: 'Copied', savedImg: 'Image ready', empty: 'No indicators found. Try a sharper file, or a sample first.',
    shareTitle: 'Checkup, in plain words', shareFoot: 'Health education only · not a diagnosis',
    shareAbn: 'Worth attention', shareOk: (n) => `${n} others normal`,
  },
};

/* ---------- 状态 ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('checkup-brief.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('checkup-brief.' + k, JSON.stringify(v)); } catch { /* 隐私模式下忽略 */ } },
  del(k) { try { localStorage.removeItem('checkup-brief.' + k); } catch { /* ignore */ } },
};
const state = {
  lang: store.get('lang', (navigator.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en'),
  profile: { age: 32, sex: 'male', familyHistory: [], budget: 1500 },
  items: [],
  ocr: false,
  showNormal: false,
  week: null,
  selectedDay: null,
};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const t = () => UI[state.lang];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const color = (s) => (s === 'high' || s === 'low' ? 'red' : s === 'borderline-high' || s === 'borderline-low' ? 'yellow' : s === 'unknown' ? 'gray' : 'green');
const nm = (i) => (state.lang === 'en' ? i.en || i.name : i.name);
const CSSVAR = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('on'), 1800);
}
function copy(text) {
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(() => toast(t().copied)).catch(() => {});
}

/* ---------- 静态文案 ---------- */
function applyI18n() {
  const u = t();
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  $$('[data-i18n]').forEach((el) => { const v = u[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
  $$('[data-i18n-html]').forEach((el) => { el.innerHTML = u[el.dataset.i18nHtml]; });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = u[el.dataset.i18nPh]; });
  $$('.lang button').forEach((b) => b.classList.toggle('on', b.dataset.lang === state.lang));
  updateLineCount();
}

function updateLineCount() {
  const n = $('#reportText').value.split('\n').filter((l) => l.trim()).length;
  $('#lineCount').textContent = n ? t().lines(n) : '';
}

/* ---------- 参考范围条 ---------- */
function gaugeHTML(item) {
  const { low, high } = item.range || {};
  const v = item.value;
  if (low == null && high == null) return '<div class="gauge"></div>';
  let min; let max;
  if (low != null && high != null) {
    const span = high - low || 1;
    min = Math.max(low > 0 ? 0 : low, low - span * 0.4);
    max = high + span * 0.4;
  } else if (high != null) {
    min = 0; max = high * 1.5;
  } else {
    min = Math.max(0, low * 0.5); max = low * 2.2;
  }
  min = Math.min(min, v - (max - min) * 0.05);
  max = Math.max(max, v + (max - min) * 0.05);
  const pct = (x) => Math.max(0, Math.min(100, ((x - min) / (max - min)) * 100));
  const okL = pct(low != null ? low : min);
  const okR = pct(high != null ? high : max);
  let edge = '';
  if (high != null && low != null) {
    const start = item.id === 'sbp' ? 120 : item.id === 'dbp' ? 80 : high - (high - low) * 0.1;
    edge = `<span class="edge" style="left:${pct(start)}%;width:${pct(high) - pct(start)}%"></span>`;
  }
  const ticks = [low, high].filter((x) => x != null).map((x) => `<span class="tick" style="left:${pct(x)}%">${x}</span>`).join('');
  return `<div class="gauge"><div class="rail"><span class="ok" style="left:${okL}%;width:${okR - okL}%"></span>${edge}</div>${ticks}<span class="dot ${color(item.status)}" data-left="${pct(v)}"></span></div>`;
}

function animateGauges(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.dot[data-left]', root).forEach((d) => { d.style.left = d.dataset.left + '%'; });
  }));
}

function animateRing(bar, numEl, score) {
  const total = parseFloat(getComputedStyle(bar).strokeDasharray) || 339.3;
  bar.style.strokeDashoffset = total;
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.strokeDashoffset = total * (1 - score / 100); }));
  if (!numEl) return;
  const t0 = performance.now();
  const dur = 1500;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    numEl.textContent = Math.round(score * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- ① 一页纸简报 ---------- */
function renderBrief(animate) {
  const u = t();
  const b = buildBriefing(state.items, state.profile, state.lang);
  state.briefing = b;
  const groups = globalThis.GROUPS;
  const order = { high: 0, low: 0, 'borderline-high': 1, 'borderline-low': 1, unknown: 2 };
  const flagged = b.items.filter((i) => i.status !== 'normal').sort((a, c) => order[a.status] - order[c.status]);
  const normal = b.items.filter((i) => i.status === 'normal');

  const row = (i, k) => `
    <div class="item" style="animation-delay:${animate ? 0.35 + k * 0.06 : 0}s">
      <div class="name">${esc(nm(i))}<small>${esc(groups[i.group] ? groups[i.group][state.lang] : '')}</small></div>
      ${gaugeHTML(i)}
      <div class="res"><span class="val">${i.value}<small>${esc(i.unit)}</small></span><span class="status ${color(i.status)}"><i class="dot ${color(i.status)}"></i>${u.status[i.status]}</span></div>
      ${i.ocrFix ? `<p class="fix">${esc(u.ocrFixed(i.ocrFix.from, i.ocrFix.to))}</p>` : ''}
      ${i.status !== 'normal' ? `<p class="explain">${esc(i.explanation)}</p>` : ''}
    </div>`;

  $('#panel-brief').innerHTML = `
    <div class="overview">
      <div class="ring"><svg viewBox="0 0 240 240"><circle cx="120" cy="120" r="108" class="track"/><circle cx="120" cy="120" r="108" class="bar" id="ringBar" style="stroke:var(--${b.color})"/></svg>
        <div class="num"><b id="scoreNum">${b.score}</b><span>${u.points}</span></div></div>
      <div>
        <p class="level"><i class="dot ${b.color}"></i>${esc(b.level)}</p>
        <p class="summary">${esc(b.summary)}</p>
        <div class="counts">
          <span class="count"><i class="dot red"></i><b>${b.counts.abnormal}</b>${u.outOfRange}</span>
          <span class="count"><i class="dot yellow"></i><b>${b.counts.borderline}</b>${u.borderline}</span>
          <span class="count"><i class="dot green"></i><b>${b.counts.normal}</b>${u.normal}</span>
        </div>
        <div class="actions">
          <button class="btn primary small" id="shareBtn" type="button">${u.share}</button>
          <button class="btn ghost small" id="printBtn" type="button">${u.print}</button>
        </div>
        <p class="rule">${u.rule}</p>
      </div>
    </div>
    ${flagged.length ? `<div class="group-title"><h3>${u.flaggedTitle}</h3><span>${flagged.length}</span></div><div class="items">${flagged.map((i, k) => row(i, k)).join('')}</div>` : ''}
    ${normal.length ? `<div class="group-title"><h3>${u.normalTitle}</h3><span>${normal.length}</span></div>
      <div class="items" ${state.showNormal ? '' : 'hidden'}>${normal.map((i, k) => row(i, k)).join('')}</div>
      <button class="btn ghost small more" id="toggleNormal" type="button">${state.showNormal ? u.hideNormal : u.showNormal(normal.length)}</button>` : ''}`;

  animateRing($('#ringBar'), animate ? $('#scoreNum') : null, b.score);
  animateGauges($('#panel-brief'));
  $('#shareBtn').onclick = openShare;
  $('#printBtn').onclick = () => { showTab('brief'); window.print(); };
  const tg = $('#toggleNormal');
  if (tg) tg.onclick = () => { state.showNormal = !state.showNormal; renderBrief(false); };
}

/* ---------- ② 解析结果 ---------- */
function renderParser() {
  const u = t();
  const rows = state.items.map((i) => `<tr>
      <td><i class="dot ${color(i.status)}"></i>${esc(nm(i))}</td>
      <td class="mono">${i.value} ${esc(i.unit)}${i.ocrFix ? ' *' : ''}</td>
      <td class="mono">${esc(formatRange(i.range))}</td>
      <td><span class="src ${i.range.source}">${i.range.source === 'report' ? u.srcReport : u.srcBuiltin}</span></td>
      <td class="mono">${i.flag === 'up' ? '↑' : i.flag === 'down' ? '↓' : '—'}</td>
      <td><span class="status ${color(i.status)}">${u.status[i.status]}</span></td></tr>`).join('');
  $('#panel-parser').innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>${u.colName}</th><th>${u.colValue}</th><th>${u.colRange}</th><th>${u.colSource}</th><th>${u.colFlag}</th><th>${u.colStatus}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <div class="json-bar"><button class="link" id="jsonToggle" type="button">${u.showJson}</button><button class="link" id="jsonCopy" type="button">${u.copyJson}</button></div>
    <pre class="json" id="jsonOut" hidden></pre>`;
  const json = JSON.stringify(state.items.map(({ note, ...rest }) => rest), null, 2);
  $('#jsonOut').textContent = json;
  $('#jsonToggle').onclick = (e) => { const p = $('#jsonOut'); p.hidden = !p.hidden; e.target.textContent = p.hidden ? u.showJson : u.hideJson; };
  $('#jsonCopy').onclick = () => copy(json);
}

/* ---------- ③ 下次查什么 ---------- */
function renderPackage() {
  const u = t();
  const budget = state.profile.budget;
  const rec = recommendPackage({ profile: state.profile, items: state.items, budget, lang: state.lang });
  const li = (x) => `<li><b><span>${esc(x.name)}</span>${x.price ? `<em>${esc(x.price)}</em>` : ''}</b>${esc(x.reason)}</li>`;
  const max = Math.max(budget, rec.estimate.high) * 1.08;
  const P = (x) => (x / max) * 100;
  $('#panel-package').innerHTML = `
    ${rec.add.length ? `<div class="budget">
      <div class="big">¥${rec.estimate.low}–${rec.estimate.high}<small>${u.estLabel}</small></div>
      <div><div class="track2"><span class="fill" data-w="${P(rec.estimate.low)}"></span><span class="range" style="left:${P(rec.estimate.low)}%;width:${P(rec.estimate.high - rec.estimate.low)}%"></span><span class="cap" style="left:${P(budget)}%"><span>${u.budgetCap(budget)}</span></span></div></div>
      <p>${esc(rec.note)}</p></div>` : ''}
    <div class="cols">
      <div class="col"><h3><i class="dot red"></i>${u.pkgAdd}</h3><ul>${rec.add.map(li).join('') || `<li>${u.noAdd}</li>`}</ul></div>
      <div class="col"><h3><i class="dot yellow"></i>${u.pkgOpt}</h3><ul>${rec.optional.map(li).join('')}</ul></div>
      <div class="col skip"><h3><i class="dot green"></i>${u.pkgSkip}</h3><ul>${rec.skip.map(li).join('')}</ul></div>
    </div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { $$('.fill[data-w]').forEach((f) => { f.style.width = f.dataset.w + '%'; }); }));
}

/* ---------- ④ 挂号清单 ---------- */
function renderClinic() {
  const u = t();
  const guides = buildClinicGuide(state.items, state.lang);
  $('#panel-clinic').innerHTML = guides.length ? `<div class="clinic-grid">${guides.map((g, k) => `
    <article class="clinic-card">
      <div class="tag"><i class="dot ${color(g.status)}"></i>${esc(g.indicator)} · ${esc(g.value)}</div>
      <h3 class="dept">${esc(g.department)}</h3>
      <p class="why">${esc(g.reason)}</p>
      <h4>${u.bring}</h4><ul>${g.bring.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>${u.ask}</h4><ol>${g.questions.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <button class="link copy" type="button" data-k="${k}">${u.copyQ}</button>
    </article>`).join('')}</div>` : `<p class="empty">${u.noClinic}</p>`;
  $$('#panel-clinic .copy').forEach((btn) => {
    btn.onclick = () => {
      const g = guides[btn.dataset.k];
      copy(`${g.department}（${g.indicator} ${g.value}）\n${g.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
    };
  });
}

/* ---------- ⑤ 30 天计划 + 打卡 ---------- */
const blankChecks = () => Array.from({ length: 30 }, () => ({ eat: false, move: false, sleep: false }));
function getChecks() { const c = store.get('checks', null); return Array.isArray(c) && c.length === 30 ? c : blankChecks(); }
function currentDay() {
  const start = store.get('start', null);
  if (!start) return 1;
  return Math.max(1, Math.min(30, Math.floor((Date.now() - start) / 86400000) + 1));
}
function streakOf(checks, upto) {
  let n = 0;
  for (let d = upto; d >= 1; d--) {
    const c = checks[d - 1];
    if (c.eat && c.move && c.sleep) n++;
    else if (d !== upto) break;
  }
  return n;
}

function renderPlan() {
  const u = t();
  const plan = buildPlan30d(state.items, state.profile, state.lang);
  const checks = getChecks();
  const today = state.selectedDay || currentDay();
  if (!state.week) state.week = Math.min(4, Math.floor((today - 1) / 7) + 1);
  const week = plan.weeks[state.week - 1];
  const c = checks[today - 1];
  const cal = checks.map((x, i) => {
    const n = (x.eat ? 1 : 0) + (x.move ? 1 : 0) + (x.sleep ? 1 : 0);
    const cls = n === 3 ? 'full' : n === 2 ? 'p2' : n === 1 ? 'p1' : '';
    return `<button type="button" class="day ${cls} ${i + 1 === today ? 'sel' : ''}" data-day="${i + 1}" title="${u.dayN(i + 1)}">${i + 1}</button>`;
  }).join('');
  $('#panel-plan').innerHTML = `
    <p class="plan-head">${esc(plan.headline)}</p>
    <div class="focus">${plan.focus.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
    <div class="weeks">${plan.weeks.map((w) => `<button type="button" class="week ${w.week === state.week ? 'on' : ''}" data-week="${w.week}"><small>${u.weekTag(w.week)}</small><b>${esc(w.theme)}</b><span>${esc(w.goal)}</span></button>`).join('')}</div>
    <div class="plan-grid">
      <div class="today">
        <h3>${u.today3}</h3>
        <ol>${week.tasks.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ol>
        ${plan.extras.length ? `<div class="extras">${plan.extras.map((x) => `<p>${esc(x)}</p>`).join('')}</div>` : ''}
      </div>
      <div>
        <div class="cal-head"><h3>${u.checkin} · <span class="mono" style="font-size:13px;color:var(--muted)">${u.dayN(today)}</span></h3><span class="streak"><b>${streakOf(checks, today)}</b>${u.streak}</span></div>
        <div class="check3">
          <button type="button" data-k="eat" class="${c.eat ? 'on' : ''}">${u.eat}</button>
          <button type="button" data-k="move" class="${c.move ? 'on' : ''}">${u.move}</button>
          <button type="button" data-k="sleep" class="${c.sleep ? 'on' : ''}">${u.sleep}</button>
        </div>
        <div class="cal">${cal}</div>
        <div class="legend">${u.legendTxt}<i></i><i class="p1"></i><i class="p2"></i><i class="full"></i><button class="link" id="resetChecks" type="button">${u.reset}</button></div>
      </div>
    </div>
    <div class="daily3">${['eat', 'move', 'sleep'].map((k) => `<div><h4>${u.daily[k]}</h4><ul>${plan.daily[k].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
    <p class="note">${esc(plan.note)}</p>`;

  $$('#panel-plan .week').forEach((b) => { b.onclick = () => { state.week = +b.dataset.week; renderPlan(); }; });
  $$('#panel-plan .day').forEach((b) => { b.onclick = () => { state.selectedDay = +b.dataset.day; state.week = Math.min(4, Math.floor((state.selectedDay - 1) / 7) + 1); renderPlan(); }; });
  $$('#panel-plan .check3 button').forEach((b) => {
    b.onclick = () => {
      if (!store.get('start', null)) store.set('start', Date.now() - (today - 1) * 86400000);
      const all = getChecks();
      all[today - 1][b.dataset.k] = !all[today - 1][b.dataset.k];
      store.set('checks', all);
      renderPlan();
    };
  });
  $('#resetChecks').onclick = () => { store.del('checks'); store.del('start'); state.selectedDay = null; state.week = null; renderPlan(); };
}

/* ---------- 分享长图（canvas 本地绘制，不上传） ---------- */
function wrapText(ctx, text, maxW) {
  const out = []; let line = '';
  const tokens = state.lang === 'en' ? text.split(/(\s+)/) : [...text];
  for (const ch of tokens) {
    if (ctx.measureText(line + ch).width > maxW && line) { out.push(line.trim()); line = ch.trimStart(); } else line += ch;
  }
  if (line.trim()) out.push(line.trim());
  return out;
}
function drawShare() {
  const u = t();
  const b = state.briefing;
  const SERIF = '"CB Serif", "Songti SC", serif';
  const SANS = getComputedStyle(document.body).fontFamily;
  const W = 1080; const P = 90;
  const C = { bg: '#fbfaf7', ink: '#111412', ink2: '#3b403d', muted: '#858a86', line: '#e6e3dc', red: '#c4453d', yellow: '#b7790f', green: '#2f7a59' };
  const rank = { high: 0, low: 0, 'borderline-high': 1, 'borderline-low': 1, unknown: 2 };
  const flagged = b.items.filter((i) => i.status !== 'normal').sort((a, c) => rank[a.status] - rank[c.status]);
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `36px ${SERIF}`;
  const lines = wrapText(ctx, b.summary, W - P * 2);
  const H = 900 + lines.length * 60 + flagged.length * 92 + 230;
  cv.width = W; cv.height = H;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // 页眉
  ctx.fillStyle = C.muted; ctx.font = `24px ${SANS}`; ctx.textBaseline = 'alphabetic';
  ctx.fillText(u.shareTitle.toUpperCase(), P, 110);
  ctx.textAlign = 'right'; ctx.fillText('checkup-brief', W - P, 110); ctx.textAlign = 'left';
  ctx.fillStyle = C.ink; ctx.fillRect(P, 136, W - P * 2, 2);
  // 分数
  const cx = W / 2; const cy = 390; const R = 170;
  ctx.lineWidth = 3; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = C[b.color];
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.score / 100); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `600 150px ${SERIF}`; ctx.fillText(String(b.score), cx, cy + 52);
  ctx.font = `22px ${SANS}`; ctx.fillStyle = C.muted; ctx.fillText(u.points.toUpperCase(), cx, cy + 100);
  ctx.fillStyle = C[b.color]; ctx.beginPath(); ctx.arc(cx - ctx.measureText(b.level).width / 2 - 26, cy + R + 82, 8, 0, Math.PI * 2);
  ctx.font = `30px ${SANS}`; ctx.fill(); ctx.fillStyle = C.ink2; ctx.fillText(b.level, cx, cy + R + 92);
  // 总结
  ctx.textAlign = 'left'; ctx.font = `36px ${SERIF}`; ctx.fillStyle = C.ink;
  let y = cy + R + 180;
  lines.forEach((l) => { ctx.fillText(l, P, y); y += 60; });
  // 列表
  y += 40;
  ctx.font = `600 30px ${SERIF}`; ctx.fillText(u.shareAbn, P, y);
  ctx.textAlign = 'right'; ctx.font = `24px ${SANS}`; ctx.fillStyle = C.muted; ctx.fillText(String(flagged.length), W - P, y); ctx.textAlign = 'left';
  y += 24; ctx.fillStyle = C.ink; ctx.fillRect(P, y, W - P * 2, 2); y += 2;
  flagged.forEach((i) => {
    const col = C[color(i.status)];
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(P + 8, y + 46, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = `600 34px ${SERIF}`; ctx.fillText(nm(i), P + 36, y + 58);
    ctx.textAlign = 'right';
    ctx.font = `600 34px ui-monospace, Menlo, monospace`; ctx.fillText(String(i.value), W - P - 190, y + 58);
    ctx.font = `26px ${SANS}`; ctx.fillStyle = col; ctx.fillText(u.status[i.status], W - P, y + 57);
    ctx.textAlign = 'left';
    y += 92; ctx.fillStyle = C.line; ctx.fillRect(P, y - 1, W - P * 2, 1);
  });
  ctx.font = `26px ${SANS}`; ctx.fillStyle = C.muted; ctx.fillText(u.shareOk(b.counts.normal), P, y + 56);
  ctx.textAlign = 'center'; ctx.font = `22px ${SANS}`;
  ctx.fillText(`${u.shareFoot} · github.com/TTNAN/checkup-brief`, W / 2, H - 70);
  return cv.toDataURL('image/png');
}
function openShare() {
  const u = t();
  const url = drawShare();
  const m = document.createElement('div');
  m.className = 'share-modal';
  m.innerHTML = `<div class="box"><img alt="share" src="${url}"><a class="btn primary small" download="checkup-brief.png" href="${url}">${u.save}</a> <button class="btn ghost small" type="button">${u.close}</button></div>`;
  m.onclick = (e) => { if (e.target === m || e.target.tagName === 'BUTTON') m.remove(); };
  document.body.appendChild(m);
  toast(u.savedImg);
}

/* ---------- 导入 ---------- */
function setProgress(stage, p) {
  const u = t();
  $('#progress').hidden = false;
  $('#progressText').textContent = u.stage[stage] || '';
  $('#progressPct').textContent = p != null ? Math.round(p * 100) + '%' : '';
  $('#progressBar').style.width = Math.round((p || 0) * 100) + '%';
}
function showNote(html, warn) {
  const n = $('#importNote');
  n.hidden = false;
  n.className = 'import-note' + (warn ? ' warn' : '');
  n.innerHTML = html;
}

async function handleFile(file) {
  const u = t();
  $('#importNote').hidden = true;
  setProgress('load', 0);
  try {
    const r = await importReportFile(file, ({ stage, progress }) => setProgress(stage, progress));
    $('#progress').hidden = true;
    const text = r.text.replace(/\n{3,}/g, '\n\n').trim();
    $('#reportText').value = text;
    updateLineCount();
    state.ocr = r.method.includes('ocr');
    const n = text.split('\n').filter((l) => l.trim()).length;
    showNote(esc(u.imported[r.method](file.name, n, r.pages)) + (state.ocr ? '<br>' + esc(u.ocrWarn) : ''), state.ocr);
    run();
  } catch (err) {
    console.error(err);
    $('#progress').hidden = true;
    showNote(esc(u.importFail), true);
  }
}

async function loadSampleFile(kind) {
  const url = SAMPLE_FILES[kind];
  const res = await fetch(url);
  const blob = await res.blob();
  handleFile(new File([blob], url.split('/').pop(), { type: blob.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg') }));
}

/* ---------- 主流程 ---------- */
function readProfile() {
  state.profile.age = parseInt($('#age').value, 10) || 32;
  state.profile.sex = $('#sexSeg .on').dataset.sex;
  state.profile.familyHistory = $$('#familyChips .on').map((b) => b.dataset.fam);
  state.profile.budget = parseInt($('#budget').value, 10);
}

function renderAll(animate) {
  if (!state.items.length) return;
  const u = t();
  const fromReport = state.items.filter((i) => i.range.source === 'report').length;
  $('#parsedMeta').textContent = u.parsedMeta(state.items.length, fromReport);
  renderBrief(animate);
  renderParser();
  renderPackage();
  renderClinic();
  renderPlan();
}

function run(scroll = true) {
  readProfile();
  const btn = $('#runBtn');
  btn.classList.add('busy');
  setTimeout(() => {
    state.items = parseReportText($('#reportText').value, { ocr: state.ocr });
    btn.classList.remove('busy');
    if (!state.items.length) { toast(t().empty); $('#pasteBox').open = true; return; }
    $('#result').hidden = false;
    showTab('brief');
    renderAll(true);
    if (scroll) $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 380);
}

function showTab(name) {
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $$('.panel').forEach((p) => p.classList.toggle('on', p.id === 'panel-' + name));
  if (name === 'brief' && state.briefing) animateGauges($('#panel-brief'));
  // 切换标签时，如果已经滚过了标签栏，就把视图拉回到内容开头。
  const head = $('.block-head', $('#result'));
  const y = head.getBoundingClientRect().bottom + window.scrollY + 36 - 60;
  if (window.scrollY > y + 1) window.scrollTo({ top: y, behavior: 'smooth' });
}

/* ---------- 事件 ---------- */
$$('.lang button').forEach((b) => {
  b.onclick = () => { state.lang = b.dataset.lang; store.set('lang', state.lang); applyI18n(); renderAll(false); };
});
$$('#sexSeg button').forEach((b) => { b.onclick = () => { $$('#sexSeg button').forEach((x) => x.classList.toggle('on', x === b)); if (state.items.length) { readProfile(); renderAll(false); } }; });
$$('#familyChips button').forEach((b) => { b.onclick = () => { b.classList.toggle('on'); if (state.items.length) { readProfile(); renderAll(false); } }; });
$('#budget').oninput = (e) => { $('#budgetVal').textContent = '¥' + e.target.value; if (state.items.length) { readProfile(); renderPackage(); } };
$('#age').onchange = () => { if (state.items.length) { readProfile(); renderAll(false); } };
$('#reportText').oninput = () => { state.ocr = false; updateLineCount(); };
$('#loadSample').onclick = () => { state.ocr = false; $('#reportText').value = SAMPLE_TEXT; $('#pasteBox').open = true; updateLineCount(); $('#importNote').hidden = true; };
$('#clearText').onclick = () => { $('#reportText').value = ''; updateLineCount(); };
$('#runBtn').onclick = () => run();
$('#ctaSample').onclick = () => { state.ocr = false; $('#reportText').value = SAMPLE_TEXT; updateLineCount(); run(); };
$$('#tabs button').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });
$$('[data-sample]').forEach((b) => {
  b.onclick = () => loadSampleFile(b.dataset.sample);
  b.onmouseenter = () => window.warmUpImport && window.warmUpImport(b.dataset.sample === 'pdf' ? 'pdf' : 'ocr');
});
$('#fileInput').onchange = (e) => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; };

const dz = $('#dropZone');
['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); });
dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileInput').click(); } });
// 也支持直接 Ctrl+V 粘贴截图
document.addEventListener('paste', (e) => {
  if (e.target === $('#reportText')) return;
  const f = [...(e.clipboardData ? e.clipboardData.files : [])][0];
  if (f) { e.preventDefault(); handleFile(f); }
});

window.addEventListener('scroll', () => { $('.nav').classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

/* Hero 样张的分数环 */
animateRing($('#heroRingBar'), $('#heroScore'), 68);

applyI18n();
// 链接里带 #demo 时直接载入示例，方便分享演示。
if (location.hash === '#demo') { $('#reportText').value = SAMPLE_TEXT; updateLineCount(); run(false); }
