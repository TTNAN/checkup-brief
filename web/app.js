// checkup-brief — web/app.js
// 演示页交互：粘贴 / 拖入报告 → 解析 → 五个模块；中 / EN 切换；分享长图；30 天打卡。
// 零依赖，不发任何网络请求。家庭档案（成员、打卡）存本机 localStorage，报告文字存本机 IndexedDB。
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
    footer2: '只做健康科普，不做诊断，不能替代医生。本页没有统计、没有第三方请求，你粘贴的内容不会离开这台设备；家庭档案和 30 天打卡只存在本机浏览器里。',
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
    noOpt: '按你的年龄、性别和家族史，暂无需额外加查的指引项目。',
    bring: '带上这些', ask: '问医生这几个问题', copyQ: '复制问题', noClinic: '这次没有需要专门挂号的指标，按常规每年体检即可。',
    weekN: (n) => `第 ${n} 周`, today3: '今天的 3 件小事', dayN: (n) => `第 ${n} 天`,
    checkin: '30 天打卡', streak: (n) => `连续 ${n} 天`, eat: '吃', move: '动', sleep: '睡',
    legend: '三个点都亮 = 当天全部完成', reset: '重置打卡',
    daily: { eat: '吃', move: '动', sleep: '睡' },
    copied: '已复制', savedImg: '图片已生成', empty: '没识别到指标，换个格式试试，或先载入示例看看效果。',
    shareTitle: '体检人话简报', shareFoot: '只做健康科普，不做诊断，不能替代医生',
    shareAbn: '需要留意', shareOk: (n) => `其余 ${n} 项正常`,
    // 家庭档案
    me: '我', aboutMe: '关于你', aboutWho: (n) => `关于${n}`, whoseReport: '给谁看报告',
    familyOpen: '家庭档案', familyTitle: '家庭档案', addMember: '添加成员',
    familyHint: '给爸妈也建一份：按成员分开存报告和 30 天打卡，年龄、性别、家族史自动带入。只存在这台设备的浏览器里，不上传。',
    membersN: (n) => `成员 · ${n}`, reportsOf: (who, n) => `${who}的报告 · ${n}`,
    ageN: (n) => `${n} 岁`, reportsN: (n) => `${n} 份报告`,
    namePh: '称呼，例如 爸爸', birthPh: '出生年份或年龄', add: '添加', cancel: '取消', rename: '改名', save2: '保存', del: '删除', open: '打开',
    noReports: '还没有报告。导入一份体检报告，生成简报后会自动存到这里。',
    archiveLine: (who, n) => (n ? `${who}的档案里有 ${n} 份报告` : `${who}的档案里还没有报告`), viewArchive: '打开档案',
    savedTo: (who) => `已存到「${who}」的档案`, reportDate: '报告日期', viewAll: '查看档案',
    sampleNoSave: '示例报告不会自动存档。', saveSample: (who) => `仍然存到「${who}」的档案`,
    switched: (who) => `已切换到「${who}」`, added: (who) => `已添加「${who}」`,
    confirmDelMember: (who, n) => `删除「${who}」${n ? `和 TA 的 ${n} 份报告` : ''}？删除后不能恢复。`,
    confirmDelReport: (d) => `删除 ${d} 这份报告？删除后不能恢复。`,
    lastMember: '至少要留一位成员。', needName: '先填一个称呼',
    ioTitle: '导出 / 导入', exportBtn: '导出全家档案', importBtn: '导入档案',
    ioHint: '导出的是一个 JSON 文件，只有识别出的文字、分数和打卡，不含原图和 PDF。发到爸妈手机上，打开本页导入即可。全程不联网。',
    importFound: (m, r) => `文件里有 ${m} 位成员、${r} 份报告。`, merge: '合并到现有档案', replace: '替换现有档案',
    confirmReplace: '替换会删除这台设备上现有的全部家庭档案和打卡，确定吗？',
    imported2: (m, r) => `已导入：新增 ${m} 位成员、${r} 份报告`, replaced: '已用导入的档案替换',
    importBad: '这不是 checkup-brief 导出的家庭档案文件。', exported: '已导出档案文件',
    countsShort: (a, b) => `${a} 项超出 · ${b} 项偏高`,
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
    footer2: 'Health education only, not a diagnosis. No analytics, no third-party requests; what you paste never leaves this device. The family archive and check-ins live only in this browser.',
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
    noOpt: 'No extra guideline items for your age, sex and family history.',
    bring: 'Bring', ask: 'Ask the doctor', copyQ: 'Copy questions', noClinic: 'Nothing needs a dedicated visit. A routine yearly checkup is enough.',
    weekN: (n) => `Week ${n}`, today3: 'Today\'s three small things', dayN: (n) => `Day ${n}`,
    checkin: '30-day check-in', streak: (n) => `${n}-day streak`, eat: 'Eat', move: 'Move', sleep: 'Sleep',
    legend: 'All three dots lit = day complete', reset: 'Reset',
    daily: { eat: 'Eat', move: 'Move', sleep: 'Sleep' },
    copied: 'Copied', savedImg: 'Image ready', empty: 'No indicators found. Try another format, or load the sample first.',
    shareTitle: 'Checkup, in plain words', shareFoot: 'Health education only · not a diagnosis',
    shareAbn: 'Worth attention', shareOk: (n) => `${n} others normal`,
    // Family archive
    me: 'Me', aboutMe: 'About you', aboutWho: (n) => `About ${n}`, whoseReport: 'Whose report',
    familyOpen: 'Family archive', familyTitle: 'Family archive', addMember: 'Add member',
    familyHint: 'Keep one for your parents too: reports and 30-day check-ins are stored per member, and age, sex and family history fill in automatically. Stays in this browser, never uploaded.',
    membersN: (n) => `Members · ${n}`, reportsOf: (p, n) => `${cap(p)} reports · ${n}`,
    ageN: (n) => `${n} y`, reportsN: (n) => `${n} report${n === 1 ? '' : 's'}`,
    namePh: 'Name, e.g. Dad', birthPh: 'Birth year or age', add: 'Add', cancel: 'Cancel', rename: 'Rename', save2: 'Save', del: 'Delete', open: 'Open',
    noReports: 'No reports yet. Import a checkup report; once the brief is built it is saved here automatically.',
    archiveLine: (p, n) => (n ? `${n} report${n === 1 ? '' : 's'} in ${p} archive` : `No reports in ${p} archive yet`), viewArchive: 'Open archive',
    savedTo: (p) => `Saved to ${p} archive`, reportDate: 'Report date', viewAll: 'View archive',
    sampleNoSave: 'Sample reports are not saved automatically.', saveSample: (p) => `Save to ${p} archive anyway`,
    switched: (who) => `Switched to ${who}`, added: (who) => `Added ${who}`,
    confirmDelMember: (who, n) => `Delete ${who}${n ? ` and ${n} report${n === 1 ? '' : 's'}` : ''}? This can't be undone.`,
    confirmDelReport: (d) => `Delete the report from ${d}? This can't be undone.`,
    lastMember: 'Keep at least one member.', needName: 'Enter a name first',
    ioTitle: 'Export / import', exportBtn: 'Export family archive', importBtn: 'Import archive',
    ioHint: 'Exports a JSON file with the recognised text, scores and check-ins only, no photos or PDFs. Send it to a parent\'s phone and import it on this page. Works offline.',
    importFound: (m, r) => `The file has ${m} member${m === 1 ? '' : 's'} and ${r} report${r === 1 ? '' : 's'}.`, merge: 'Merge into this archive', replace: 'Replace this archive',
    confirmReplace: 'Replacing deletes the whole family archive and check-ins on this device. Continue?',
    imported2: (m, r) => `Imported: ${m} new member${m === 1 ? '' : 's'}, ${r} new report${r === 1 ? '' : 's'}`, replaced: 'Archive replaced with the imported file',
    importBad: "This isn't a checkup-brief family archive file.", exported: 'Archive file exported',
    countsShort: (a, b) => `${a} out of range · ${b} borderline`,
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
  isSample: false,      // 示例报告不自动存档
  currentReport: null,  // 当前打开的、已存档的报告
};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const t = () => UI[state.lang];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
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
  $$('[data-i18n-title]').forEach((el) => { el.title = u[el.dataset.i18nTitle]; });
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
  const li = (x) => `<li><b>${esc(x.name)}</b><span>${esc(x.reason)}</span>${x.price ? `<br><em>${esc(x.price)}</em>` : ''}${x.source ? `<a class="cite" href="${esc(x.sourceUrl)}" target="_blank" rel="noopener" title="${esc(x.source)}">${esc(x.source)}</a>` : ''}</li>`;
  const max = Math.max(state.profile.budget, rec.estimate.high) * 1.05;
  $('#panel-package').innerHTML = `
    ${rec.add.length ? `<div class="card budget-bar">
      <div class="small">${u.estimate(rec.estimate.low, rec.estimate.high, state.profile.budget)}</div>
      <div class="track2"><span class="fill" data-w="${(rec.estimate.low / max) * 100}"></span><span class="range" style="left:${(rec.estimate.low / max) * 100}%;width:${((rec.estimate.high - rec.estimate.low) / max) * 100}%"></span>
      <span style="position:absolute;top:-2px;bottom:-2px;width:2px;background:var(--ink);left:${(state.profile.budget / max) * 100}%"></span></div>
      <div class="small muted">${esc(rec.note)}</div></div>` : ''}
    <div class="cols">
      <div class="card col"><h3><i class="red"></i>${u.pkgAdd}</h3><ul>${rec.add.map(li).join('') || `<li>${u.noAdd}</li>`}</ul></div>
      <div class="card col"><h3><i class="yellow"></i>${u.pkgOpt}</h3><ul>${rec.optional.map(li).join('') || `<li>${u.noOpt}</li>`}</ul></div>
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
function getChecks() { return activeMember().checks.map((c) => ({ ...c })); }
function currentDay() {
  const start = activeMember().start;
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
      const m = activeMember();
      if (!m.start) m.start = Date.now() - (today - 1) * 86400000;
      m.checks[today - 1][b.dataset.k] = !m.checks[today - 1][b.dataset.k];
      saveArchive();
      renderPlan();
    };
  });
  $('#resetChecks').onclick = () => { const m = activeMember(); m.checks = Family.emptyChecks(); m.start = null; saveArchive(); state.selectedDay = null; renderPlan(); };
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

/* ---------- 家庭档案：成员 + 每人的报告 ---------- */
// 成员资料和 30 天打卡很小，存 localStorage；报告文字存 IndexedDB（不可用时退回 localStorage）。
// 只存识别出的文字和分数摘要，不存原始照片 / PDF。全部留在本机，不上传。
const fam = (() => {
  const legacy = { checks: store.get('checks', null), start: store.get('start', null) };
  const { archive, migrated } = Family.loadOrMigrate(store.get('family', null), legacy);
  store.set('family', archive);
  if (migrated || legacy.checks || legacy.start) {
    // 旧版单人打卡已迁进默认成员“我”
    try { localStorage.removeItem('checkup-brief.checks'); localStorage.removeItem('checkup-brief.start'); } catch { /* 忽略 */ }
  }
  return { archive, reports: [] };
})();
function activeMember() { return fam.archive.members.find((m) => m.id === fam.archive.activeId) || fam.archive.members[0]; }
function saveArchive() { store.set('family', fam.archive); }
const memberName = (m) => (m && m.name) || t().me;
// 英文里的所有格：Dad's / your；中文直接用称呼（“爸爸的档案”“我的档案”）
const possOf = (m) => (state.lang === 'en' ? (m.name ? `${m.name}'s` : 'your') : memberName(m));
const memberInitial = (m) => [...memberName(m)][0].toUpperCase();
const reportsOf = (id) => Family.sortReports(fam.reports.filter((r) => r.memberId === id));

const reportDB = (() => {
  let dbp = null;
  const lsAll = () => store.get('reports', []);
  const lsSet = (list) => store.set('reports', list);
  function open() {
    if (!dbp) {
      dbp = new Promise((resolve) => {
        try {
          const req = indexedDB.open('checkup-brief', 1);
          req.onupgradeneeded = () => { req.result.createObjectStore('reports', { keyPath: 'id' }); };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
          req.onblocked = () => resolve(null);
        } catch { resolve(null); }
      });
    }
    return dbp;
  }
  async function tx(fn) {
    const db = await open();
    if (!db) return false;
    return new Promise((resolve) => {
      const tr = db.transaction('reports', 'readwrite');
      fn(tr.objectStore('reports'));
      tr.oncomplete = () => resolve(true);
      tr.onerror = () => resolve(false);
    });
  }
  return {
    async all() {
      const db = await open();
      if (!db) return lsAll();
      return new Promise((resolve) => {
        const req = db.transaction('reports').objectStore('reports').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    },
    async put(r) { if (!(await tx((st) => st.put(r)))) lsSet([...lsAll().filter((x) => x.id !== r.id), r]); },
    async del(ids) { if (!(await tx((st) => ids.forEach((id) => st.delete(id))))) lsSet(lsAll().filter((x) => !ids.includes(x.id))); },
    async replaceAll(list) { if (!(await tx((st) => { st.clear(); list.forEach((r) => st.put(r)); }))) lsSet(list); },
  };
})();

async function loadReports() {
  fam.reports = await reportDB.all();
  renderFamily();
}

function applyMemberToInputs() {
  const m = activeMember();
  const p = Family.memberProfile(m);
  $('#age').value = p.age;
  $$('#sexSeg button').forEach((x) => x.classList.toggle('on', x.dataset.sex === p.sex));
  $$('#familyChips button').forEach((x) => x.classList.toggle('on', p.familyHistory.includes(x.dataset.fam)));
  Object.assign(state.profile, p);
}

function renderFamily() {
  const u = t();
  const m = activeMember();
  const name = memberName(m);
  $('#memberPillName').textContent = name;
  $('#profileTitle').textContent = m.name ? u.aboutWho(m.name) : u.aboutMe;
  $('#memberChips').innerHTML = fam.archive.members.map((x) => `<button type="button" data-member="${esc(x.id)}" class="${x.id === m.id ? 'on' : ''}">${esc(memberName(x))}</button>`).join('')
    + `<button type="button" class="add" id="chipAdd" aria-label="${esc(u.addMember)}">+ ${esc(u.addMember)}</button>`;
  $$('#memberChips [data-member]').forEach((b) => { b.onclick = () => setActiveMember(b.dataset.member); });
  $('#chipAdd').onclick = () => openFamily({ adding: true });
  const n = reportsOf(m.id).length;
  $('#archiveLine').innerHTML = `${esc(u.archiveLine(possOf(m), n))} · <button class="link" type="button" id="archiveOpen">${esc(u.viewArchive)}</button>`;
  $('#archiveOpen').onclick = () => openFamily();
  if (famUI.el) renderFamilyModal();
}

function setActiveMember(id, quiet) {
  if (id === fam.archive.activeId) return;
  fam.archive.activeId = id;
  saveArchive();
  applyMemberToInputs();
  state.selectedDay = null; state.week = null;
  if (state.currentReport) {
    // 屏幕上是上一位成员的报告：收起来，免得看混
    state.currentReport = null; state.items = [];
    $('#result').hidden = true; $('#reportText').value = ''; $('#importNote').hidden = true; updateLineCount();
  } else if (state.items.length) {
    renderAll(false); renderSavedBar();
  }
  renderFamily();
  if (!quiet) toast(t().switched(memberName(activeMember())));
}

async function saveCurrentReport() {
  const m = activeMember();
  const res = Family.upsertReport(fam.reports, { memberId: m.id, text: $('#reportText').value, ocr: state.ocr, briefing: state.briefing });
  fam.reports = res.reports;
  state.currentReport = res.report;
  renderSavedBar();
  renderFamily();
  await reportDB.put(res.report);
}

function renderSavedBar() {
  const u = t();
  const bar = $('#savedBar');
  const r = state.currentReport;
  const who = possOf(activeMember());
  if (r) {
    bar.className = 'saved-bar';
    bar.innerHTML = `<span>✓ ${esc(u.savedTo(who))}</span>
      <label>${esc(u.reportDate)} <input type="date" id="reportDate" value="${esc(r.date)}" max="${Family.todayISO()}"></label>
      <button class="link" type="button" id="savedView">${esc(u.viewAll)}</button>`;
    $('#reportDate').onchange = (e) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) return;
      r.date = e.target.value; r.updatedAt = Date.now();
      reportDB.put(r); renderFamily();
    };
    $('#savedView').onclick = () => openFamily();
  } else if (state.isSample && state.items.length) {
    bar.className = 'saved-bar sample';
    bar.innerHTML = `<span>${esc(u.sampleNoSave)}</span><button class="link" type="button" id="saveSample">${esc(u.saveSample(who))}</button>`;
    $('#saveSample').onclick = () => { state.isSample = false; saveCurrentReport(); };
  } else { bar.hidden = true; return; }
  bar.hidden = false;
}

function openReport(r) {
  if (r.memberId !== fam.archive.activeId) setActiveMember(r.memberId, true);
  closeFamily();
  state.ocr = r.ocr; state.isSample = false;
  $('#importNote').hidden = true;
  $('#reportText').value = r.text;
  updateLineCount();
  run();
}

async function deleteReports(ids) {
  fam.reports = fam.reports.filter((r) => !ids.includes(r.id));
  if (state.currentReport && ids.includes(state.currentReport.id)) { state.currentReport = null; renderSavedBar(); }
  renderFamily();
  await reportDB.del(ids);
}

/* 家庭档案弹窗 */
const famUI = { el: null, adding: false, renaming: null, pending: null };
function openFamily(opts = {}) {
  famUI.adding = !!opts.adding; famUI.renaming = null; famUI.pending = null;
  if (!famUI.el) {
    famUI.el = document.createElement('div');
    famUI.el.className = 'share-modal fam-modal';
    famUI.el.setAttribute('role', 'dialog');
    famUI.el.setAttribute('aria-modal', 'true');
    famUI.el.onclick = (e) => { if (e.target === famUI.el) closeFamily(); };
    document.body.appendChild(famUI.el);
    document.addEventListener('keydown', famEsc);
  }
  renderFamilyModal();
  const first = famUI.adding ? $('#famName', famUI.el) : null;
  if (first) first.focus();
}
function famEsc(e) { if (e.key === 'Escape') closeFamily(); }
function closeFamily() {
  if (!famUI.el) return;
  famUI.el.remove(); famUI.el = null;
  document.removeEventListener('keydown', famEsc);
}

function renderFamilyModal() {
  const u = t();
  const el = famUI.el;
  const active = activeMember();
  const year = new Date().getFullYear();
  const members = fam.archive.members.map((m) => {
    const n = reportsOf(m.id).length;
    const meta = `${u.ageN(Family.memberAge(m, year))} · ${m.sex === 'female' ? u.female : u.male} · ${u.reportsN(n)}`;
    const nameCell = famUI.renaming === m.id
      ? `<form class="fam-rename" data-id="${esc(m.id)}"><input type="text" maxlength="20" value="${esc(m.name || '')}" placeholder="${esc(memberName(m))}" aria-label="${esc(u.rename)}"><button class="btn primary small" type="submit">${esc(u.save2)}</button></form>`
      : `<button type="button" class="fam-pick" data-id="${esc(m.id)}"><i class="avatar">${esc(memberInitial(m))}</i><span><b>${esc(memberName(m))}</b><small>${esc(meta)}</small></span></button>`;
    return `<div class="fam-member ${m.id === active.id ? 'on' : ''}">${nameCell}
      ${famUI.renaming === m.id ? '' : `<span class="fam-ops"><button class="link" type="button" data-rename="${esc(m.id)}">${esc(u.rename)}</button><button class="link danger" type="button" data-delmember="${esc(m.id)}">${esc(u.del)}</button></span>`}</div>`;
  }).join('');
  const addForm = famUI.adding ? `
    <form class="fam-add" id="famAdd">
      <input type="text" id="famName" maxlength="20" placeholder="${esc(u.namePh)}" aria-label="${esc(u.namePh)}">
      <input type="number" id="famBirth" min="0" max="${year}" placeholder="${esc(u.birthPh)}" aria-label="${esc(u.birthPh)}">
      <div class="seg wide" id="famSex"><button type="button" data-sex="male" class="on">${esc(u.male)}</button><button type="button" data-sex="female">${esc(u.female)}</button></div>
      <span class="fam-add-btns"><button class="btn primary small" type="submit">${esc(u.add)}</button><button class="btn ghost small" type="button" id="famAddCancel">${esc(u.cancel)}</button></span>
    </form>` : `<button class="btn ghost small fam-add-open" type="button" id="famAddOpen">+ ${esc(u.addMember)}</button>`;
  const reps = reportsOf(active.id);
  const repRows = reps.length ? reps.map((r) => `
    <div class="fam-report">
      <span class="fam-date">${esc(r.date)}</span>
      ${r.score != null ? `<span class="badge ${r.color || 'gray'}">${r.score} ${esc(u.points)}</span>` : ''}
      <span class="muted small fam-counts">${r.counts ? esc(u.countsShort(r.counts.abnormal, r.counts.borderline)) : ''}</span>
      <span class="fam-ops"><button class="link" type="button" data-open="${esc(r.id)}">${esc(u.open)}</button><button class="link danger" type="button" data-delreport="${esc(r.id)}">${esc(u.del)}</button></span>
    </div>`).join('') : `<p class="muted small fam-empty">${esc(u.noReports)}</p>`;
  const pending = famUI.pending ? `
    <div class="fam-confirm">
      <p>${esc(u.importFound(famUI.pending.archive.members.length, famUI.pending.reports.length))}</p>
      <span><button class="btn primary small" type="button" id="famMerge">${esc(u.merge)}</button>
      <button class="btn ghost small" type="button" id="famReplace">${esc(u.replace)}</button>
      <button class="link" type="button" id="famPendingCancel">${esc(u.cancel)}</button></span>
    </div>` : '';

  el.innerHTML = `<div class="box fam-box">
    <div class="fam-head"><h3>${esc(u.familyTitle)}</h3><button class="fam-x" type="button" id="famClose" aria-label="${esc(u.close)}">×</button></div>
    <p class="muted small fam-hint">${esc(u.familyHint)}</p>
    <div class="group-title">${esc(u.membersN(fam.archive.members.length))}</div>
    <div class="fam-members">${members}</div>
    ${addForm}
    <div class="group-title">${esc(u.reportsOf(possOf(active), reps.length))}</div>
    <div class="fam-reports">${repRows}</div>
    <div class="group-title">${esc(u.ioTitle)}</div>
    <div class="fam-io">
      <button class="btn ghost small" type="button" id="famExport">${esc(u.exportBtn)}</button>
      <button class="btn ghost small" type="button" id="famImport">${esc(u.importBtn)}</button>
      <input type="file" id="famImportFile" accept=".json,application/json" hidden>
    </div>
    ${pending}
    <p class="muted small fam-hint">${esc(u.ioHint)}</p>
  </div>`;

  $('#famClose', el).onclick = closeFamily;
  $$('.fam-pick', el).forEach((b) => { b.onclick = () => setActiveMember(b.dataset.id); });
  $$('[data-rename]', el).forEach((b) => { b.onclick = () => { famUI.renaming = b.dataset.rename; renderFamilyModal(); const i = $('.fam-rename input', el); if (i) { i.focus(); i.select(); } }; });
  $$('.fam-rename', el).forEach((f) => {
    f.onsubmit = (e) => {
      e.preventDefault();
      const m = fam.archive.members.find((x) => x.id === f.dataset.id);
      const v = $('input', f).value.trim().slice(0, 20);
      if (m) { m.name = v || null; saveArchive(); }
      famUI.renaming = null; renderFamily(); renderSavedBar();
    };
  });
  $$('[data-delmember]', el).forEach((b) => {
    b.onclick = async () => {
      if (fam.archive.members.length <= 1) { toast(u.lastMember); return; }
      const m = fam.archive.members.find((x) => x.id === b.dataset.delmember);
      const ids = reportsOf(m.id).map((r) => r.id);
      if (!confirm(u.confirmDelMember(memberName(m), ids.length))) return;
      const wasActive = m.id === fam.archive.activeId;
      const res = Family.removeMember(fam.archive, fam.reports, m.id);
      fam.archive.members = res.archive.members;
      if (wasActive) { fam.archive.activeId = null; setActiveMember(res.archive.activeId, true); }
      saveArchive();
      await deleteReports(ids);
    };
  });
  const addOpen = $('#famAddOpen', el);
  if (addOpen) addOpen.onclick = () => { famUI.adding = true; renderFamilyModal(); $('#famName', el).focus(); };
  const add = $('#famAdd', el);
  if (add) {
    $$('#famSex button', el).forEach((b) => { b.onclick = () => $$('#famSex button', el).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#famAddCancel', el).onclick = () => { famUI.adding = false; renderFamilyModal(); };
    add.onsubmit = (e) => {
      e.preventDefault();
      const name = $('#famName', el).value.trim();
      if (!name) { toast(u.needName); $('#famName', el).focus(); return; }
      const m = Family.createMember({ name, birthYear: $('#famBirth', el).value, sex: $('#famSex .on', el).dataset.sex });
      fam.archive.members.push(m);
      saveArchive();
      famUI.adding = false;
      setActiveMember(m.id, true);
      renderFamily();
      toast(u.added(memberName(m)));
    };
  }
  $$('[data-open]', el).forEach((b) => { b.onclick = () => openReport(fam.reports.find((r) => r.id === b.dataset.open)); });
  $$('[data-delreport]', el).forEach((b) => {
    b.onclick = () => {
      const r = fam.reports.find((x) => x.id === b.dataset.delreport);
      if (r && confirm(u.confirmDelReport(r.date))) deleteReports([r.id]);
    };
  });
  $('#famExport', el).onclick = exportFamily;
  $('#famImport', el).onclick = () => $('#famImportFile', el).click();
  $('#famImportFile', el).onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      famUI.pending = Family.normalizeImport(await f.text());
      renderFamilyModal();
    } catch (err) {
      console.warn('import failed', err);
      toast(u.importBad);
    }
  };
  if (famUI.pending) {
    $('#famMerge', el).onclick = () => applyImport('merge');
    $('#famReplace', el).onclick = () => { if (confirm(u.confirmReplace)) applyImport('replace'); };
    $('#famPendingCancel', el).onclick = () => { famUI.pending = null; renderFamilyModal(); };
  }
}

function exportFamily() {
  const data = Family.exportArchive(fam.archive, fam.reports);
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `checkup-brief-family-${Family.todayISO().replace(/-/g, '')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(t().exported);
}

async function applyImport(mode) {
  const u = t();
  const inc = famUI.pending;
  famUI.pending = null;
  const prevActive = fam.archive.activeId;
  if (mode === 'replace') {
    fam.archive = inc.archive;
    fam.reports = inc.reports;
    await reportDB.replaceAll(fam.reports);
    toast(u.replaced);
  } else {
    const res = Family.mergeArchives(fam.archive, fam.reports, inc.archive, inc.reports);
    fam.archive = res.archive;
    const before = new Set(fam.reports.map((r) => r.id));
    fam.reports = res.reports;
    for (const r of fam.reports) if (!before.has(r.id)) await reportDB.put(r);
    toast(u.imported2(res.added.members, res.added.reports));
  }
  saveArchive();
  if (fam.archive.activeId !== prevActive || mode === 'replace') {
    const id = fam.archive.activeId;
    fam.archive.activeId = null;
    setActiveMember(id, true);
  }
  renderFamily();
}

/* ---------- 主流程 ---------- */
function readProfile() {
  state.profile.age = parseInt($('#age').value, 10) || 32;
  state.profile.sex = $('#sexSeg .on').dataset.sex;
  state.profile.familyHistory = $$('#familyChips .on').map((b) => b.dataset.fam);
  state.profile.budget = parseInt($('#budget').value, 10);
  // 年龄 / 性别 / 家族史跟着当前成员走
  const m = activeMember();
  const year = new Date().getFullYear();
  const birthYear = year - state.profile.age;
  const fh = state.profile.familyHistory.join('|');
  if (m.birthYear !== birthYear || m.sex !== state.profile.sex || m.familyHistory.join('|') !== fh) {
    m.birthYear = birthYear; m.sex = state.profile.sex; m.familyHistory = [...state.profile.familyHistory];
    saveArchive();
    renderFamily();
  }
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
async function handleFile(file, isSample = false) {
  const u = t();
  state.isSample = isSample;
  $('#importNote').hidden = true;
  setProgress('load', 0);
  try {
    const r = await importReportFile(file, ({ stage, progress }) => setProgress(stage, progress));
    $('#progress').hidden = true;
    const text = r.text.replace(/\n{3,}/g, '\n\n').trim();
    $('#reportText').value = text;
    updateLineCount();
    state.ocr = r.method.includes('ocr');
    state.isSample = isSample;
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
  handleFile(new File([blob], url.split('/').pop(), { type: blob.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg') }), true);
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
    if (!state.isSample) saveCurrentReport();
    else { state.currentReport = null; renderSavedBar(); }
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
  b.onclick = () => { state.lang = b.dataset.lang; store.set('lang', state.lang); applyI18n(); renderFamily(); renderSavedBar(); renderAll(false); };
});
$$('#sexSeg button').forEach((b) => { b.onclick = () => { $$('#sexSeg button').forEach((x) => x.classList.toggle('on', x === b)); readProfile(); if (state.items.length) renderAll(false); }; });
$$('#familyChips button').forEach((b) => { b.onclick = () => { b.classList.toggle('on'); readProfile(); if (state.items.length) renderAll(false); }; });
$('#budget').oninput = (e) => { $('#budgetVal').textContent = '¥' + e.target.value; if (state.items.length) { readProfile(); renderPackage(); } };
$('#age').onchange = () => { readProfile(); if (state.items.length) renderAll(false); };
$('#reportText').oninput = () => { state.ocr = false; state.isSample = false; updateLineCount(); };
$('#loadSample').onclick = () => { state.ocr = false; state.isSample = true; $('#importNote').hidden = true; $('#reportText').value = SAMPLE_TEXT; updateLineCount(); };
$('#clearText').onclick = () => { state.ocr = false; state.isSample = false; $('#importNote').hidden = true; $('#reportText').value = ''; updateLineCount(); };
$('#runBtn').onclick = () => run();
$('#ctaSample').onclick = () => { state.ocr = false; state.isSample = true; $('#reportText').value = SAMPLE_TEXT; updateLineCount(); run(); };
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

$('#memberPill').onclick = () => openFamily();

/* Hero 小卡片的分数环 */
animateRing($('#heroRingBar'), $('#heroScore'), 68, 314.16);

applyI18n();
applyMemberToInputs();
renderFamily();
loadReports();
// 链接里带 #demo 时直接载入示例，方便分享演示。
if (location.hash === '#demo') { state.isSample = true; $('#reportText').value = SAMPLE_TEXT; updateLineCount(); run(false); }
