// checkup-brief — src/family.js
// 纯函数：家庭档案的数据模型。存储（localStorage / IndexedDB）在 web/app.js 里做，这里只管数据。
//   createArchive(legacy)            -> 新档案；顺手把旧版单人打卡（checks / start）迁进默认成员“我”
//   createMember(fields, year)       -> 新成员（出生年份 / 年龄都可以填）
//   memberProfile(member, year)      -> { age, sex, familyHistory }，给套餐推荐和 30 天计划用
//   parseReportDate(text)            -> 'YYYY-MM-DD' | null，从报告文字里找体检日期
//   makeReport(...) / upsertReport   -> 一份报告只存解析用的文字和分数摘要，不存原图 / 原 PDF
//   exportArchive / normalizeImport / mergeArchives -> 导出 JSON、导入时校验、合并或替换
// 全部离线，不发任何网络请求。只做健康科普，不做诊断，不能替代医生。

'use strict';

const ARCHIVE_TYPE = 'checkup-brief/family-archive';
const ARCHIVE_VERSION = 1;
const FAMILY_VALUES = ['糖尿病', '心血管', '肿瘤'];

function newId(prefix) {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix || 'id'}-${Date.now().toString(36)}-${rnd}`;
}

function emptyChecks() {
  return Array.from({ length: 30 }, () => ({ eat: false, move: false, sleep: false }));
}

function cleanChecks(c) {
  if (!Array.isArray(c) || c.length !== 30) return emptyChecks();
  return c.map((d) => ({ eat: !!(d && d.eat), move: !!(d && d.move), sleep: !!(d && d.sleep) }));
}

// "1958" / "66" / 66 都行：大于 1900 当出生年份，否则当年龄。
function toBirthYear(v, year) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return null;
  if (n > 1900 && n <= year) return n;
  if (n >= 0 && n <= 120) return year - n;
  return null;
}

function createMember(fields, year) {
  const f = fields || {};
  const y = year || new Date().getFullYear();
  const name = typeof f.name === 'string' ? f.name.trim().slice(0, 20) : '';
  return {
    id: f.id || newId('m'),
    name: name || null, // null = 默认成员，界面显示“我 / Me”
    birthYear: toBirthYear(f.birthYear != null ? f.birthYear : f.age, y) || y - 32,
    sex: f.sex === 'female' ? 'female' : 'male',
    familyHistory: (Array.isArray(f.familyHistory) ? f.familyHistory : []).filter((x) => FAMILY_VALUES.includes(x)),
    checks: cleanChecks(f.checks),
    start: Number.isFinite(f.start) ? f.start : null,
    createdAt: Number.isFinite(f.createdAt) ? f.createdAt : Date.now(),
  };
}

function memberAge(member, year) {
  const y = year || new Date().getFullYear();
  return Math.max(0, y - (member.birthYear || y - 32));
}

function memberProfile(member, year) {
  return { age: memberAge(member, year), sex: member.sex, familyHistory: [...(member.familyHistory || [])] };
}

// 旧版只有一个人：localStorage 里的 checkup-brief.checks / checkup-brief.start 迁进默认成员。
function createArchive(legacy, year) {
  const l = legacy || {};
  const me = createMember({ checks: l.checks, start: l.start }, year);
  return { members: [me], activeId: me.id };
}

function isArchive(a) {
  return !!(a && Array.isArray(a.members) && a.members.length);
}

// 打开页面时：有家庭档案就清洗后用；没有就新建，并把旧版单人打卡迁进“我”。
function loadOrMigrate(saved, legacy, year) {
  if (isArchive(saved)) {
    const seen = new Set();
    const members = saved.members.filter((m) => m && typeof m === 'object').map((m) => createMember(m, year))
      .filter((m) => (seen.has(m.id) ? false : seen.add(m.id)));
    if (members.length) {
      return { archive: { members, activeId: seen.has(saved.activeId) ? saved.activeId : members[0].id }, migrated: false };
    }
  }
  const l = legacy || {};
  const hasLegacy = Array.isArray(l.checks) || Number.isFinite(l.start);
  return { archive: createArchive(l, year), migrated: hasLegacy };
}

/* ---------- 报告 ---------- */
function pad(n) { return String(n).padStart(2, '0'); }
function validDate(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return y >= 1990 && y <= 2100 && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function todayISO(now) {
  const d = now ? new Date(now) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DATE_RE = /((?:19|20)\d{2})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?/;
const DATE_KEYS = /(体检|检查|检验|报告|采样|采集|送检|登记|审核)\s*(日期|时间)|Date/i;

// 先找“体检日期 / 报告日期 …”后面的日期，找不到再取全文第一个像日期的。
function parseReportDate(text) {
  const lines = String(text || '').split('\n');
  const tryLine = (line) => {
    const m = line.match(DATE_RE);
    if (!m) return null;
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return validDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  };
  for (const line of lines) {
    const k = line.search(DATE_KEYS);
    if (k >= 0) { const r = tryLine(line.slice(k)); if (r) return r; }
  }
  for (const line of lines) {
    if (/出生|生日|birth|DOB/i.test(line)) continue; // 出生日期不是体检日期
    const r = tryLine(line); if (r) return r;
  }
  return null;
}

// 简单稳定的字符串哈希，用来判断“同一个人、同一份报告”避免重复存。
function hashText(s) {
  let h = 2166136261;
  const str = String(s).replace(/\s+/g, ' ').trim();
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function makeReport({ memberId, text, ocr, briefing, date, now }) {
  const b = briefing || {};
  return {
    id: newId('r'),
    memberId,
    key: hashText(text),
    date: date || parseReportDate(text) || todayISO(now),
    text: String(text),
    ocr: !!ocr,
    score: Number.isFinite(b.score) ? b.score : null,
    color: b.color || null,
    counts: b.counts ? { abnormal: b.counts.abnormal | 0, borderline: b.counts.borderline | 0, normal: b.counts.normal | 0 } : null,
    createdAt: now || Date.now(),
    updatedAt: now || Date.now(),
  };
}

// 同一成员、同一份文字：更新分数摘要，保留原来的 id 和日期；否则新建。
function upsertReport(reports, input) {
  const key = hashText(input.text);
  const found = reports.find((r) => r.memberId === input.memberId && r.key === key);
  if (found) {
    const fresh = makeReport({ ...input, date: found.date });
    const updated = { ...found, ocr: fresh.ocr, score: fresh.score, color: fresh.color, counts: fresh.counts, updatedAt: fresh.updatedAt };
    return { report: updated, created: false, reports: reports.map((r) => (r.id === found.id ? updated : r)) };
  }
  const report = makeReport(input);
  return { report, created: true, reports: [...reports, report] };
}

function sortReports(reports) {
  return [...reports].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt);
}

function cleanReport(r, memberIds) {
  if (!r || typeof r.text !== 'string' || !r.text.trim() || !memberIds.has(r.memberId)) return null;
  const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : todayISO(r.createdAt);
  return {
    id: typeof r.id === 'string' && r.id ? r.id : newId('r'),
    memberId: r.memberId,
    key: hashText(r.text),
    date,
    text: r.text.slice(0, 200000),
    ocr: !!r.ocr,
    score: Number.isFinite(r.score) ? r.score : null,
    color: ['green', 'yellow', 'red'].includes(r.color) ? r.color : null,
    counts: r.counts && typeof r.counts === 'object' ? { abnormal: r.counts.abnormal | 0, borderline: r.counts.borderline | 0, normal: r.counts.normal | 0 } : null,
    createdAt: Number.isFinite(r.createdAt) ? r.createdAt : Date.now(),
    updatedAt: Number.isFinite(r.updatedAt) ? r.updatedAt : Date.now(),
  };
}

/* ---------- 导出 / 导入 ---------- */
function exportArchive(archive, reports, now) {
  return {
    type: ARCHIVE_TYPE,
    version: ARCHIVE_VERSION,
    exportedAt: new Date(now || Date.now()).toISOString(),
    note: 'checkup-brief 家庭档案 · 只在本机生成，不含原始图片 / PDF。只做健康科普，不做诊断。',
    activeId: archive.activeId,
    members: archive.members.map((m) => ({ ...m })),
    reports: reports.map((r) => ({ ...r })),
  };
}

// 校验导入文件；不认识的字段丢掉。返回 { archive, reports } 或抛错。
function normalizeImport(data, year) {
  const obj = typeof data === 'string' ? JSON.parse(data) : data;
  if (!obj || obj.type !== ARCHIVE_TYPE || !Array.isArray(obj.members)) throw new Error('not-archive');
  if ((obj.version | 0) > ARCHIVE_VERSION) throw new Error('newer-version');
  const seen = new Set();
  const members = [];
  for (const raw of obj.members) {
    if (!raw || typeof raw !== 'object') continue;
    const m = createMember(raw, year);
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    members.push(m);
  }
  if (!members.length) throw new Error('empty');
  const reports = (Array.isArray(obj.reports) ? obj.reports : []).map((r) => cleanReport(r, seen)).filter(Boolean);
  const activeId = seen.has(obj.activeId) ? obj.activeId : members[0].id;
  return { archive: { members, activeId }, reports };
}

// 合并：成员按 id 合并（本机已有的保留本机的资料和打卡），报告按 id 去重，
// 同一成员同一份文字也只留一份。
// 没改过名、没报告、没打卡的默认成员“我”算空白：合并时不让两个空白的“我”并排出现。
function isPristine(m, reports) {
  return !m.name && !m.start && !m.checks.some((c) => c.eat || c.move || c.sleep) && !reports.some((r) => r.memberId === m.id);
}

function mergeArchives(local, localReports, incoming, incomingReports) {
  const inc = incoming.members.filter((m) => !isPristine(m, incomingReports));
  let base = local.members;
  if (inc.length) base = local.members.filter((m) => !isPristine(m, localReports) || inc.some((x) => x.id === m.id));
  const ids = new Set(base.map((m) => m.id));
  let members = [...base, ...inc.filter((m) => !ids.has(m.id))];
  if (!members.length) members = local.members;
  const keptIds = new Set(members.map((m) => m.id));
  const activeId = keptIds.has(local.activeId) ? local.activeId : keptIds.has(incoming.activeId) ? incoming.activeId : members[0].id;
  const addedMembers = members.filter((m) => !local.members.some((x) => x.id === m.id)).length;
  const reportIds = new Set(localReports.map((r) => r.id));
  const keys = new Set(localReports.map((r) => r.memberId + '|' + r.key));
  const added = [];
  for (const r of incomingReports) {
    const k = r.memberId + '|' + r.key;
    if (reportIds.has(r.id) || keys.has(k)) continue;
    reportIds.add(r.id); keys.add(k);
    added.push(r);
  }
  return {
    archive: { members, activeId },
    reports: [...localReports, ...added].filter((r) => keptIds.has(r.memberId)),
    added: { members: addedMembers, reports: added.length },
  };
}

function removeMember(archive, reports, id) {
  if (archive.members.length <= 1) return { archive, reports };
  const members = archive.members.filter((m) => m.id !== id);
  const activeId = archive.activeId === id ? members[0].id : archive.activeId;
  return { archive: { members, activeId }, reports: reports.filter((r) => r.memberId !== id) };
}

const Family = {
  ARCHIVE_TYPE, ARCHIVE_VERSION, FAMILY_VALUES,
  newId, emptyChecks, toBirthYear, createMember, memberAge, memberProfile, createArchive, isArchive, loadOrMigrate,
  parseReportDate, todayISO, hashText, makeReport, upsertReport, sortReports,
  exportArchive, normalizeImport, mergeArchives, isPristine, removeMember,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Family;
}
if (typeof globalThis !== 'undefined') {
  globalThis.Family = Family;
}
