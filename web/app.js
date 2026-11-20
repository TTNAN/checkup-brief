// checkup-brief — web/app.js
// 演示页交互：粘贴 / 拖入报告 → 解析 → 五个模块；中 / EN 切换；分享长图；30 天打卡。
// 零依赖，不发任何网络请求。打卡和语言偏好只存在本机 localStorage。
// 只做健康科普，不做诊断，不能替代医生。
'use strict';

/* ---------- 示例数据（与 examples/sample-report.txt 一致，已脱敏） ---------- */
const SAMPLE_FILES = { pdf: '../examples/demo-checkup.pdf', img: '../examples/demo-photo.jpg' };
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

/* ---------- 界面文案 ---------- */
const UI = {
  zh: {
    localBadge: '100% 本地处理 · 不上传',
    eyebrow: 'CHECKUP BRIEF · 一页纸人话简报',
    title: '体检单看不懂？<br><em>一页纸</em>，<span class="nw">翻译成人话。</span>',
    lede: '导入体检报告（PDF、照片或文字），几秒钟得到：总分和红黄绿灯、每项异常一句人话、下次该查什么、该挂哪个科、接下来 30 天怎么改。',
    ctaSample: '用示例报告试一下', ctaMine: '导入我的报告',
    point1: '30+ 指标别名自动识别', point2: '优先用报告单上的参考范围', point3: '零依赖，断网也能用',
    miniTc: '总胆固醇', miniUa: '尿酸', miniFpg: '空腹血糖', miniHb: '血红蛋白',
    disclaimer: '只做健康科普，不做诊断，不能替代医生。一切以报告单上的参考范围和医生解释为准。',
    dropTitle: '把 PDF、照片或截图拖到这里', dropHint: '或点击选择文件 · 支持 PDF / JPG / PNG / TXT，也可 Ctrl+V 粘贴截图',
    trySamples: '试试示例：', samplePdf: 'PDF', sampleImg: '照片', sampleText: '文字',
    stage: { load: '正在加载识别模型（首次约 10 MB，之后会快很多）', read: '正在读取 PDF', ocr: '正在识别文字' },
    imported: { text: (f, n) => `已读取 ${f}，共 ${n} 行。`, 'pdf-text': (f, n, p) => `已从 ${f} 读出 ${n} 行文字（${p} 页，文字版 PDF）。`, 'pdf-ocr': (f, n, p) => `${f} 是扫描件，已本地识别 ${p} 页、${n} 行。`, 'image-ocr': (f, n) => `已从照片 ${f} 识别出 ${n} 行。` },
    ocrWarn: '照片 / 扫描件识别可能有误，请对照原报告核对数值，标黄的是自动修正过的。',
    importFail: '这个文件没读出来。可以换一张更清晰的照片，或者把文字复制粘贴进来。',
    ocrFixed: (a, b) => `识别结果 ${a} 疑似漏了小数点，已按参考范围修正为 ${b}，请核对原报告。`,
    inputTitle: '导入你的体检报告',
    inputHint: 'PDF、手机拍的照片、截图都可以，全部在本机识别，不会上传。也可以直接粘贴文字。',
    placeholder: '例如：\n总胆固醇(TC) 6.12 mmol/L 参考范围 <5.2\n尿酸(UA) 452 umol/L 参考范围 208-428\n血压 132/84 mmHg',
    loadSample: '载入示例（已脱敏）', clear: '清空', lines: (n) => `${n} 行`,
    profileTitle: '关于你', profileHint: '用于套餐推荐和 30 天计划，只在本地使用。',
    age: '年龄', sex: '性别', male: '男', female: '女', family: '家族史',
    famDiabetes: '糖尿病', famCardio: '心血管病', famCancer: '肿瘤', budget: '下次体检预算',
    run: '生成我的简报',
    resultTitle: '你的一页纸简报',
    parsedMeta: (n, r) => `识别出 ${n} 项指标，其中 ${r} 项用的是报告单上印的参考范围。`,
    tab1: '一页纸简报', tab2: '解析结果', tab3: '下次查什么', tab4: '挂号清单', tab5: '30 天计划',
    footer1: 'checkup-brief · MIT License · 作者 TTNAN',
    footer2: '只做健康科普，不做诊断，不能替代医生。本页没有统计、没有第三方请求，你粘贴的内容不会离开这台设备；30 天打卡只存在本机浏览器里。',
    points: '分', outOfRange: '超出范围', borderline: '正常偏高', normal: '正常',
    status: { high: '偏高', low: '偏低', 'borderline-high': '正常偏高', 'borderline-low': '正常偏低', normal: '正常', unknown: '无法判定' },
    share: '生成分享长图', print: '打印 / 存 PDF', save: '保存图片', close: '关闭',
    rule: '计分规则公开：满分 100，超出范围一项扣 7 分，正常偏高 / 偏低扣 2 分，血压只算一次。只是帮助理解的科普工具，不是医学评分。',
    showNormal: (n) => `展开其余 ${n} 项正常指标`, hideNormal: '收起正常指标',
    colName: '指标', colValue: '结果', colRange: '参考范围', colSource: '范围来源', colStatus: '状态', colFlag: '报告标记',
    srcReport: '报告单', srcBuiltin: '内置',
    showJson: '查看 JSON', hideJson: '收起 JSON', copyJson: '复制 JSON',
    pkgAdd: '建议加查', pkgOpt: '可选', pkgSkip: '可以省掉',
    estimate: (lo, hi, b) => `建议加查的项目大约 ¥${lo}–${hi}，你的预算 ¥${b}`,
    noAdd: '本次没有需要针对性复查的项目。',
    bring: '带上这些', ask: '问医生这几个问题', copyQ: '复制问题', noClinic: '这次没有需要专门挂号的指标，按常规每年体检即可。',
    weekN: (n) => `第 ${n} 周`, today3: '今天的 3 件小事', dayN: (n) => `第 ${n} 天`,
    checkin: '30 天打卡', streak: (n) => `连续 ${n} 天`, eat: '吃', move: '动', sleep: '睡',
    legend: '三个点都亮 = 当天全部完成', reset: '重置打卡',
    daily: { eat: '吃', move: '动', sleep: '睡' },
    copied: '已复制', savedImg: '图片已生成', empty: '没识别到指标，换个格式试试，或先载入示例看看效果。',
    shareTitle: '体检人话简报', shareFoot: '只做健康科普，不做诊断，不能替代医生',
    shareAbn: '需要留意', shareOk: (n) => `其余 ${n} 项正常`,
  },
  en: {
    localBadge: '100% local · nothing uploaded',
    eyebrow: 'CHECKUP BRIEF · ONE-PAGE PLAIN-LANGUAGE BRIEF',
    title: 'Can\'t read your checkup?<br>Get it on <em>one page</em>, in plain words.',
    lede: 'Import your report (PDF, photo or text) and get, in seconds: a score and traffic lights, one plain sentence per abnormal result, what to check next time, which department to see, and a 30-day plan.',
    ctaSample: 'Try the sample report', ctaMine: 'Import my report',
    point1: '30+ indicator aliases', point2: 'Uses the ranges printed on your report', point3: 'Zero dependencies, works offline',
    miniTc: 'Cholesterol', miniUa: 'Uric acid', miniFpg: 'Glucose', miniHb: 'Hemoglobin',
    disclaimer: 'Health education only. Not a diagnosis, not a substitute for a doctor. Your report\'s reference ranges and your doctor\'s reading come first.',
    dropTitle: 'Drop a PDF, photo or screenshot here', dropHint: 'or click to choose · PDF / JPG / PNG / TXT, or Ctrl+V a screenshot',
    trySamples: 'Try a sample:', samplePdf: 'PDF', sampleImg: 'photo', sampleText: 'text',
    stage: { load: 'Loading the recognition model (≈10 MB the first time)', read: 'Reading the PDF', ocr: 'Recognising text' },
    imported: { text: (f, n) => `Read ${f}: ${n} lines.`, 'pdf-text': (f, n, p) => `Read ${n} lines from ${f} (${p} pages, text PDF).`, 'pdf-ocr': (f, n, p) => `${f} is a scan — recognised ${p} pages, ${n} lines on-device.`, 'image-ocr': (f, n) => `Recognised ${n} lines from ${f}.` },
    ocrWarn: 'Photo / scan recognition can make mistakes. Check the numbers against your report; auto-corrected ones are marked.',
    importFail: "Couldn't read this file. Try a sharper photo, or paste the text instead.",
    ocrFixed: (a, b) => `Read as ${a}, likely a missing decimal point — corrected to ${b}. Please check your report.`,
    inputTitle: 'Import your report',
    inputHint: 'PDFs, phone photos and screenshots all work, recognised on this device and never uploaded. You can also paste text.',
    placeholder: 'e.g.\n总胆固醇(TC) 6.12 mmol/L 参考范围 <5.2\n尿酸(UA) 452 umol/L 参考范围 208-428\n血压 132/84 mmHg',
    loadSample: 'Load sample (anonymised)', clear: 'Clear', lines: (n) => `${n} lines`,
    profileTitle: 'About you', profileHint: 'Used for the package and the 30-day plan. Stays on this device.',
    age: 'Age', sex: 'Sex', male: 'Male', female: 'Female', family: 'Family history',
    famDiabetes: 'Diabetes', famCardio: 'Heart disease', famCancer: 'Cancer', budget: 'Next checkup budget',
    run: 'Build my brief',
    resultTitle: 'Your one-page brief',
    parsedMeta: (n, r) => `Found ${n} indicators; ${r} use the reference range printed on your report.`,
    tab1: 'Brief', tab2: 'Parsed', tab3: 'Next checkup', tab4: 'Clinic guide', tab5: '30-day plan',
    footer1: 'checkup-brief · MIT License · by TTNAN',
    footer2: 'Health education only, not a diagnosis. No analytics, no third-party requests; what you paste never leaves this device. Check-ins live only in this browser.',
    points: 'pts', outOfRange: 'out of range', borderline: 'borderline', normal: 'normal',
    status: { high: 'High', low: 'Low', 'borderline-high': 'Borderline high', 'borderline-low': 'Borderline low', normal: 'Normal', unknown: 'Unknown' },
    share: 'Make share image', print: 'Print / PDF', save: 'Save image', close: 'Close',
    rule: 'Open scoring: start at 100, −7 per out-of-range result, −2 per borderline, blood pressure counted once. A learning aid, not a medical score.',
    showNormal: (n) => `Show the other ${n} normal results`, hideNormal: 'Hide normal results',
    colName: 'Indicator', colValue: 'Result', colRange: 'Reference', colSource: 'Range from', colStatus: 'Status', colFlag: 'Report flag',
    srcReport: 'Report', srcBuiltin: 'Built-in',
    showJson: 'Show JSON', hideJson: 'Hide JSON', copyJson: 'Copy JSON',
    pkgAdd: 'Add these', pkgOpt: 'Optional', pkgSkip: 'Skip these',
    estimate: (lo, hi, b) => `Recommended add-ons cost about ¥${lo}–${hi}; your budget is ¥${b}`,
    noAdd: 'Nothing needs a targeted recheck this time.',
    bring: 'Bring', ask: 'Ask the doctor', copyQ: 'Copy questions', noClinic: 'Nothing needs a dedicated visit. A routine yearly checkup is enough.',
    weekN: (n) => `Week ${n}`, today3: 'Today\'s three small things', dayN: (n) => `Day ${n}`,
    checkin: '30-day check-in', streak: (n) => `${n}-day streak`, eat: 'Eat', move: 'Move', sleep: 'Sleep',
    legend: 'All three dots lit = day complete', reset: 'Reset',
    daily: { eat: 'Eat', move: 'Move', sleep: 'Sleep' },
    copied: 'Copied', savedImg: 'Image ready', empty: 'No indicators found. Try another format, or load the sample first.',
    shareTitle: 'Checkup, in plain words', shareFoot: 'Health education only · not a diagnosis',
    shareAbn: 'Worth attention', shareOk: (n) => `${n} others normal`,
  },
};

/* ---------- 状态 ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('checkup-brief.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('checkup-brief.' + k, JSON.stringify(v)); } catch { /* 隐私模式下忽略 */ } },
};
const state = {
  ocr: false,
  lang: store.get('lang', (navigator.language || 'zh').startsWith('zh') ? 'zh' : 'en'),
  profile: { age: 32, sex: 'male', familyHistory: [], budget: 1500 },
  items: [],
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
const RING_COLORS = { green: 'var(--green)', yellow: 'var(--yellow)', red: 'var(--red)' };

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('on'), 1600);
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
  $$('.nav .seg button').forEach((b) => b.classList.toggle('on', b.dataset.lang === state.lang));
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
  return `<div class="gauge"><div class="rail"><span class="ok" style="left:${okL}%;width:${okR - okL}%"></span>${edge}</div>
    ${ticks}<span class="dot ${color(item.status)}" data-left="${pct(v)}"></span></div>`;
}

function animateGauges(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.dot[data-left]', root).forEach((d) => { d.style.left = d.dataset.left + '%'; });
  }));
}

function animateRing(bar, numEl, score, total = 597) {
  bar.style.strokeDashoffset = total;
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.strokeDashoffset = total * (1 - score / 100); }));
  if (!numEl) return;
  const t0 = performance.now();
  const dur = 1300;
  const step = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    numEl.textContent = Math.round(score * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- 1. 一页纸简报 ---------- */
function renderBrief(animate) {
  const u = t();
  const b = buildBriefing(state.items, state.profile, state.lang);
  state.briefing = b;
  const groups = globalThis.GROUPS;
  const flagged = b.items.filter((i) => i.status !== 'normal');
  const normal = b.items.filter((i) => i.status === 'normal');
  const order = { high: 0, low: 0, 'borderline-high': 1, 'borderline-low': 1, unknown: 2 };
  flagged.sort((a, c) => order[a.status] - order[c.status]);

  const row = (i, k) => `
    <div class="item ${color(i.status)}" style="animation-delay:${animate ? 0.25 + k * 0.07 : 0}s">
      <div class="name">${esc(nm(i))}<small>${esc(groups[i.group] ? groups[i.group][state.lang] : '')}</small></div>
      ${gaugeHTML(i)}
      <div><span class="val">${i.value}<small>${esc(i.unit)}</small></span> &nbsp;<span class="badge ${color(i.status)}">${u.status[i.status]}</span></div>
      ${i.status !== 'normal' ? `<p class="explain">${esc(i.explanation)}</p>` : ''}
      ${i.ocrFix ? `<p class="fix">${esc(u.ocrFixed(i.ocrFix.from, i.ocrFix.to))}</p>` : ''}
    </div>`;

  const normalBlock = normal.length ? `
    <div class="group-title">${u.normal} · ${normal.length}</div>
    <div class="items" id="normalItems" ${state.showNormal ? '' : 'hidden'}>${normal.map((i, k) => row(i, k)).join('')}</div>
    <button class="btn ghost small more" id="toggleNormal" type="button">${state.showNormal ? u.hideNormal : u.showNormal(normal.length)}</button>` : '';

  $('#panel-brief').innerHTML = `
    <div class="card overview">
      <div class="ring"><svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="95" class="track"/><circle cx="110" cy="110" r="95" class="bar" id="ringBar" style="stroke:${RING_COLORS[b.color]}"/></svg>
        <div class="num"><b id="scoreNum">${b.score}</b><span>/ 100 ${u.points}</span></div></div>
      <div>
        <span class="level ${b.color}">${esc(b.level)}</span>
        <p class="summary">${esc(b.summary)}</p>
        <div class="counts">
          <span class="count red"><b>${b.counts.abnormal}</b>${u.outOfRange}</span>
          <span class="count yellow"><b>${b.counts.borderline}</b>${u.borderline}</span>
          <span class="count green"><b>${b.counts.normal}</b>${u.normal}</span>
        </div>
        <div class="actions">
          <button class="btn primary small" id="shareBtn" type="button">${u.share}</button>
          <button class="btn ghost small" id="printBtn" type="button">${u.print}</button>
        </div>
        <p class="rule">${u.rule}</p>
      </div>
    </div>
    ${flagged.length ? `<div class="group-title">${u.outOfRange} / ${u.borderline} · ${flagged.length}</div><div class="items">${flagged.map((i, k) => row(i, k)).join('')}</div>` : ''}
    ${normalBlock}`;

  animateRing($('#ringBar'), animate ? $('#scoreNum') : null, b.score);
  animateGauges($('#panel-brief'));
  $('#shareBtn').onclick = openShare;
  $('#printBtn').onclick = () => { showTab('brief'); window.print(); };
  const tg = $('#toggleNormal');
  if (tg) tg.onclick = () => { state.showNormal = !state.showNormal; renderBrief(false); };
}

/* ---------- 2. 解析结果 ---------- */
function renderParser() {
  const u = t();
  const rows = state.items.map((i) => `<tr>
      <td><i class="sdot ${color(i.status)}"></i>${esc(nm(i))}</td>
      <td class="mono">${i.value} ${esc(i.unit)}${i.ocrFix ? ' *' : ''}</td>
      <td class="mono">${esc(formatRange(i.range))}</td>
      <td><span class="src ${i.range.source}">${i.range.source === 'report' ? u.srcReport : u.srcBuiltin}</span></td>
      <td>${i.flag === 'up' ? '↑' : i.flag === 'down' ? '↓' : '—'}</td>
      <td><span class="badge ${color(i.status)}">${u.status[i.status]}</span></td></tr>`).join('');
  $('#panel-parser').innerHTML = `
    <div class="table-wrap"><table>
      <thead><tr><th>${u.colName}</th><th>${u.colValue}</th><th>${u.colRange}</th><th>${u.colSource}</th><th>${u.colFlag}</th><th>${u.colStatus}</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <p style="margin-top:14px"><button class="link" id="jsonToggle" type="button">${u.showJson}</button> &nbsp; <button class="link" id="jsonCopy" type="button">${u.copyJson}</button></p>
    <pre class="json" id="jsonOut" hidden></pre>`;
  const json = JSON.stringify(state.items.map(({ note, ...rest }) => rest), null, 2);
  $('#jsonOut').textContent = json;
  $('#jsonToggle').onclick = (e) => { const p = $('#jsonOut'); p.hidden = !p.hidden; e.target.textContent = p.hidden ? u.showJson : u.hideJson; };
  $('#jsonCopy').onclick = () => copy(json);
}

/* ---------- 3. 下次查什么 ---------- */
function renderPackage() {
  const u = t();
  const rec = recommendPackage({ profile: state.profile, items: state.items, budget: state.profile.budget, lang: state.lang });
  const li = (x) => `<li><b>${esc(x.name)}</b><span>${esc(x.reason)}</span>${x.price ? `<br><em>${esc(x.price)}</em>` : ''}</li>`;
  const max = Math.max(state.profile.budget, rec.estimate.high) * 1.05;
  $('#panel-package').innerHTML = `
    ${rec.add.length ? `<div class="card budget-bar">
      <div class="small">${u.estimate(rec.estimate.low, rec.estimate.high, state.profile.budget)}</div>
      <div class="track2"><span class="fill" data-w="${(rec.estimate.low / max) * 100}"></span><span class="range" style="left:${(rec.estimate.low / max) * 100}%;width:${((rec.estimate.high - rec.estimate.low) / max) * 100}%"></span>
      <span style="position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--ink);left:${(state.profile.budget / max) * 100}%"></span></div>
      <div class="small muted">${esc(rec.note)}</div></div>` : ''}
    <div class="cols">
      <div class="card col"><h3><i class="red"></i>${u.pkgAdd}</h3><ul>${rec.add.map(li).join('') || `<li>${u.noAdd}</li>`}</ul></div>
      <div class="card col"><h3><i class="yellow"></i>${u.pkgOpt}</h3><ul>${rec.optional.map(li).join('')}</ul></div>
      <div class="card col skip"><h3><i class="green"></i>${u.pkgSkip}</h3><ul>${rec.skip.map(li).join('')}</ul></div>
    </div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { $$('.fill[data-w]').forEach((f) => { f.style.width = f.dataset.w + '%'; }); }));
}

/* ---------- 4. 挂号清单 ---------- */
function renderClinic() {
  const u = t();
  const guides = buildClinicGuide(state.items, state.lang);
  $('#panel-clinic').innerHTML = guides.length ? `<div class="clinic-grid">${guides.map((g, k) => `
    <div class="card clinic-card">
      <span class="tag badge ${color(g.status)}">${esc(g.indicator)} · ${esc(g.value)}</span>
      <p class="dept">${esc(g.department)}</p>
      <p class="why">${esc(g.reason)}</p>
      <h4>${u.bring}</h4><ul>${g.bring.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h4>${u.ask}</h4><ol>${g.questions.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      <button class="btn ghost small copy" type="button" data-k="${k}">${u.copyQ}</button>
    </div>`).join('')}</div>` : `<div class="card">${u.noClinic}</div>`;
  $$('#panel-clinic .copy').forEach((btn) => {
    btn.onclick = () => {
      const g = guides[btn.dataset.k];
      copy(`${g.department}（${g.indicator} ${g.value}）\n${g.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
    };
  });
}

/* ---------- 5. 30 天计划 + 打卡 ---------- */
function getChecks() { return store.get('checks', Array.from({ length: 30 }, () => ({ eat: false, move: false, sleep: false }))); }
function currentDay() {
  let start = store.get('start', null);
  if (!start) return 1;
  const d = Math.floor((Date.now() - start) / 86400000) + 1;
  return Math.max(1, Math.min(30, d));
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
    const full = x.eat && x.move && x.sleep;
    return `<button type="button" class="day ${full ? 'full' : ''}" data-day="${i + 1}" style="${i + 1 === today ? 'outline:2px solid var(--brand);outline-offset:1px' : ''}">
      ${i + 1}<span class="dots"><i class="${x.eat ? 'on' : ''}"></i><i class="${x.move ? 'on' : ''}"></i><i class="${x.sleep ? 'on' : ''}"></i></span></button>`;
  }).join('');
  $('#panel-plan').innerHTML = `
    <p style="font-size:17px;margin:0">${esc(plan.headline)}</p>
    <div class="focus">${plan.focus.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
    <div class="weeks">${plan.weeks.map((w) => `<button type="button" class="week ${w.week === state.week ? 'on' : ''}" data-week="${w.week}"><small>${u.weekN(w.week)}</small><b>${esc(w.theme)}</b><span>${esc(w.goal)}</span></button>`).join('')}</div>
    <div class="plan-grid">
      <div class="card today">
        <h3>${u.today3} · ${u.weekN(week.week)}</h3>
        <ul>${week.tasks.map((x, i) => `<li><i>${i + 1}</i><span>${esc(x)}</span></li>`).join('')}</ul>
        ${plan.extras.length ? `<div class="extras">${plan.extras.map((x) => `<p>${esc(x)}</p>`).join('')}</div>` : ''}
      </div>
      <div class="card">
        <div class="cal-head"><h3>${u.checkin} · <span class="muted">${u.dayN(today)}</span></h3><span class="streak">${u.streak(streakOf(checks, today))}</span></div>
        <div class="check3">
          <button type="button" data-k="eat" class="${c.eat ? 'on' : ''}">${u.eat}</button>
          <button type="button" data-k="move" class="${c.move ? 'on' : ''}">${u.move}</button>
          <button type="button" data-k="sleep" class="${c.sleep ? 'on' : ''}">${u.sleep}</button>
        </div>
        <div class="cal">${cal}</div>
        <div class="legend"><span>${u.legend}</span><button class="link" id="resetChecks" type="button" style="margin-left:auto;font-size:12px">${u.reset}</button></div>
      </div>
    </div>
    <div class="daily3">${['eat', 'move', 'sleep'].map((k) => `<div class="card"><h3>${u.daily[k]}</h3><ul>${plan.daily[k].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
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
  $('#resetChecks').onclick = () => { localStorage.removeItem('checkup-brief.checks'); localStorage.removeItem('checkup-brief.start'); state.selectedDay = null; renderPlan(); };
}

/* ---------- 分享长图（canvas 本地绘制，不上传） ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
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
  const font = getComputedStyle(document.body).fontFamily;
  const W = 1080; const P = 72;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = `34px ${font}`;
  const rank = { high: 0, low: 0, 'borderline-high': 1, 'borderline-low': 1, unknown: 2 };
  const flagged = b.items.filter((i) => i.status !== 'normal').sort((a, c) => rank[a.status] - rank[c.status]);
  const summaryLines = wrapText(ctx, b.summary, W - P * 2 - 60);
  const H = 800 + summaryLines.length * 52 + flagged.length * 96 + 200;
  cv.width = W; cv.height = H;
  const C = { paper: '#f6f4ee', card: '#ffffff', ink: '#17201f', muted: '#6c7572', line: '#e3dfd4', brand: '#0f3d3e', red: '#e0484d', yellow: '#e59a0b', green: '#2f9e6b' };
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  // 顶部条
  ctx.fillStyle = C.brand; ctx.fillRect(0, 0, W, 150);
  ctx.strokeStyle = C.paper; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(P, 80); ctx.lineTo(P + 26, 80); ctx.lineTo(P + 38, 52); ctx.lineTo(P + 58, 106); ctx.lineTo(P + 72, 72); ctx.lineTo(P + 100, 72); ctx.stroke();
  ctx.fillStyle = C.paper; ctx.font = `bold 40px ${font}`; ctx.fillText(u.shareTitle, P + 128, 92);
  // 分数卡
  roundRect(ctx, P, 200, W - P * 2, 460 + summaryLines.length * 52, 36); ctx.fillStyle = C.card; ctx.fill();
  const cx = W / 2; const cy = 380; const R = 120;
  ctx.lineWidth = 26; ctx.strokeStyle = '#efece3'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = C[b.color]; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * b.score / 100); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.font = `800 110px ${font}`; ctx.fillText(String(b.score), cx, cy + 38);
  ctx.font = `bold 36px ${font}`; ctx.fillStyle = C[b.color]; ctx.fillText(b.level, cx, cy + R + 76);
  ctx.textAlign = 'left'; ctx.font = `34px ${font}`; ctx.fillStyle = C.muted;
  summaryLines.forEach((l, i) => ctx.fillText(l, P + 30, cy + R + 150 + i * 52));
  // 异常列表
  let y = 200 + 460 + summaryLines.length * 52 + 70;
  ctx.font = `bold 30px ${font}`; ctx.fillStyle = C.muted; ctx.fillText(`${u.shareAbn} · ${flagged.length}`, P, y);
  y += 30;
  flagged.forEach((i) => {
    roundRect(ctx, P, y, W - P * 2, 80, 20); ctx.fillStyle = C.card; ctx.fill();
    ctx.fillStyle = C[color(i.status)]; ctx.beginPath(); ctx.arc(P + 40, y + 40, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = `600 34px ${font}`; ctx.fillText(nm(i), P + 70, y + 52);
    ctx.textAlign = 'right'; ctx.font = `bold 34px ui-monospace, Menlo, monospace`;
    ctx.fillText(`${i.value}`, W - P - 220, y + 52);
    ctx.font = `600 28px ${font}`; ctx.fillStyle = C[color(i.status)]; ctx.fillText(u.status[i.status], W - P - 30, y + 52);
    ctx.textAlign = 'left';
    y += 96;
  });
  ctx.font = `30px ${font}`; ctx.fillStyle = C.muted; ctx.fillText(u.shareOk(b.counts.normal), P, y + 30);
  ctx.textAlign = 'center'; ctx.font = `26px ${font}`;
  ctx.fillText(`${u.shareFoot} · github.com/TTNAN/checkup-brief`, W / 2, H - 60);
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

/* ---------- 导入 PDF / 照片 ---------- */
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

function run(scroll = true) {
  readProfile();
  const btn = $('#runBtn');
  btn.classList.add('busy');
  setTimeout(() => {
    state.items = parseReportText($('#reportText').value, { ocr: state.ocr });
    btn.classList.remove('busy');
    if (!state.items.length) { toast(t().empty); return; }
    $('#result').hidden = false;
    showTab('brief');
    renderAll(true);
    if (scroll) $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 450);
}

function showTab(name) {
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  $$('.panel').forEach((p) => p.classList.toggle('on', p.id === 'panel-' + name));
  if (name === 'brief' && state.briefing) animateGauges($('#panel-brief'));
}

/* ---------- 事件 ---------- */
$$('.nav .seg button').forEach((b) => {
  b.onclick = () => { state.lang = b.dataset.lang; store.set('lang', state.lang); applyI18n(); renderAll(false); };
});
$$('#sexSeg button').forEach((b) => { b.onclick = () => { $$('#sexSeg button').forEach((x) => x.classList.toggle('on', x === b)); if (state.items.length) { readProfile(); renderAll(false); } }; });
$$('#familyChips button').forEach((b) => { b.onclick = () => { b.classList.toggle('on'); if (state.items.length) { readProfile(); renderAll(false); } }; });
$('#budget').oninput = (e) => { $('#budgetVal').textContent = '¥' + e.target.value; if (state.items.length) { readProfile(); renderPackage(); } };
$('#age').onchange = () => { if (state.items.length) { readProfile(); renderAll(false); } };
$('#reportText').oninput = () => { state.ocr = false; updateLineCount(); };
$('#loadSample').onclick = () => { state.ocr = false; $('#importNote').hidden = true; $('#reportText').value = SAMPLE_TEXT; updateLineCount(); };
$('#clearText').onclick = () => { state.ocr = false; $('#importNote').hidden = true; $('#reportText').value = ''; updateLineCount(); };
$('#runBtn').onclick = () => run();
$('#ctaSample').onclick = () => { state.ocr = false; $('#reportText').value = SAMPLE_TEXT; updateLineCount(); run(); };
$$('#tabs button').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });

const dz = $('#dropZone');
['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', (e) => { const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); });
$('#dropLabel').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileInput').click(); } });
$('#fileInput').onchange = (e) => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ''; };
$$('[data-sample]').forEach((b) => {
  b.onclick = () => loadSampleFile(b.dataset.sample);
  b.onmouseenter = () => window.warmUpImport && window.warmUpImport(b.dataset.sample === 'pdf' ? 'pdf' : 'ocr');
});
// 也支持直接 Ctrl+V 粘贴截图
document.addEventListener('paste', (e) => {
  if (e.target === $('#reportText')) return;
  const f = [...(e.clipboardData ? e.clipboardData.files : [])][0];
  if (f) { e.preventDefault(); handleFile(f); }
});

/* Hero 小卡片的分数环 */
animateRing($('#heroRingBar'), $('#heroScore'), 68, 314.16);

applyI18n();
// 链接里带 #demo 时直接载入示例，方便分享演示。
if (location.hash === '#demo') { $('#reportText').value = SAMPLE_TEXT; updateLineCount(); run(false); }
