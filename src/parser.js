// checkup-brief — src/parser.js
// 纯函数：把体检报告原文解析成结构化指标数组。
// 输入：报告文本（粘贴的文字、OCR 结果、PDF 复制出来的文本都行）。
// 输出：[{ id, group, name, en, value, unit, range, status, flag, note }]
//   status: 'high' 偏高 / 'low' 偏低 / 'borderline-high' 正常偏高 /
//           'borderline-low' 正常偏低 / 'normal' 正常 / 'unknown' 无法判定
//   flag:   报告单上自带的 ↑ / ↓ / H / L 标记（没有则为 null），只作参考。
//
// 解析思路（刻意做得保守、可解释）：
//   0. 先做文本清洗：全角转半角（（）＜＞～－．：）、统一各种破折号；
//   1. 用别名表把指标名归一到 id（最长写法优先，避免“胆固醇”抢走“总胆固醇”）；
//   2. 跳过指标名后面的括号缩写，再找第一个数值，避免把 HbA1c 里的 1 当成结果；
//   3. 参考范围只在数值后面找，支持 3.9-6.1 / 3.9~6.1 / 0.00--1.70 / <5.2 / ≤5.2 / >1.0；
//   4. 优先用报告单上印的参考范围，报告没印才用内置参考范围；
//   5. 判定只做“是否超出范围”这一层，不做诊断、不推疾病。
// 只做健康科普，不做诊断，不能替代医生。
// 数据只在本地处理，不上传。

'use strict';

function loadDeps() {
  if (typeof module !== 'undefined' && module.exports) {
    const ranges = require('./reference-ranges.js');
    const aliases = require('./aliases.js');
    return { REFERENCE_RANGES: ranges.REFERENCE_RANGES, SORTED_NAMES: aliases.SORTED_NAMES, NAME_TO_ID: aliases.NAME_TO_ID };
  }
  return {
    REFERENCE_RANGES: globalThis.REFERENCE_RANGES,
    SORTED_NAMES: globalThis.SORTED_NAMES,
    NAME_TO_ID: globalThis.NAME_TO_ID,
  };
}

// 全角 → 半角，统一破折号和比较符号。
function normalizeText(text) {
  return String(text)
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .replace(/[–—―−‐]/g, '-')
    .replace(/[〜～]/g, '~')
    .replace(/≤/g, '<')
    .replace(/≥/g, '>');
}

const NUM = '(\\d+(?:\\.\\d+)?)';

// 从数值后面的文本里抠出参考范围。
function extractRangeFromLine(text) {
  const s = normalizeText(text);
  const m = s.match(new RegExp(`${NUM}\\s*(?:-{1,2}|~|至)\\s*${NUM}`));
  if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]), source: 'report' };
  const lt = s.match(new RegExp(`<\\s*=?\\s*${NUM}`));
  if (lt) return { low: null, high: parseFloat(lt[1]), source: 'report' };
  const gt = s.match(new RegExp(`>\\s*=?\\s*${NUM}`));
  if (gt) return { low: parseFloat(gt[1]), high: null, source: 'report' };
  return null;
}

// 判定：value 对照 low/high，返回状态。
// 落在区间内、但离上限不到区间宽度的 10%，算正常偏高；离下限不到 10% 算正常偏低。
// 例外：血压按临床常用分界——收缩压 120–139、舒张压 80–89 为正常高值。
function judge(value, range, id) {
  if (!range || value == null || Number.isNaN(value)) return 'unknown';
  const { low, high } = range;
  if (high != null && value > high) return 'high';
  if (low != null && value < low) return 'low';
  if (id === 'sbp' && value >= 120) return 'borderline-high';
  if (id === 'dbp' && value >= 80) return 'borderline-high';
  if (low != null && high != null) {
    const width = high - low;
    if (value >= high - width * 0.1) return 'borderline-high';
    if (low > 0 && value <= low + width * 0.1) return 'borderline-low';
  }
  return 'normal';
}

function makeItem(meta, value, unit, range, flag) {
  return {
    id: meta.id,
    group: meta.group,
    name: meta.name,
    en: meta.en,
    value,
    unit,
    range,
    status: judge(value, range, meta.id),
    flag: flag || null,
    note: meta.note,
  };
}

function parseReportText(text) {
  const { REFERENCE_RANGES, SORTED_NAMES, NAME_TO_ID } = loadDeps();
  const byId = Object.fromEntries(REFERENCE_RANGES.map((r) => [r.id, r]));
  const results = [];
  const seen = new Set();
  if (!text || !String(text).trim()) return results;

  const lines = normalizeText(text).split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 血压是 “132/84 mmHg” 这种双数值，单独处理。
    const bp = line.match(/(血压|BP)[^\d]*(\d{2,3})\s*\/\s*(\d{2,3})/i);
    if (bp) {
      const pairs = [['sbp', parseInt(bp[2], 10)], ['dbp', parseInt(bp[3], 10)]];
      for (const [id, v] of pairs) {
        if (seen.has(id)) continue;
        seen.add(id);
        const meta = byId[id];
        results.push(makeItem(meta, v, 'mmHg', { low: meta.low, high: meta.high, source: 'builtin' }));
      }
      continue;
    }

    for (const name of SORTED_NAMES) {
      const idx = line.indexOf(name);
      if (idx === -1) continue;
      // 英文缩写要求前后不是字母，避免 “ALT” 命中 “SALT”、“TP” 命中 “TPO”。
      if (/^[A-Za-z]/.test(name)) {
        const before = line[idx - 1];
        const after = line[idx + name.length];
        if ((before && /[A-Za-z]/.test(before)) || (after && /[A-Za-z0-9]/.test(after) && !/^\d/.test(line.slice(idx + name.length).trim()))) continue;
      }
      const id = NAME_TO_ID.get(name);
      if (!id || seen.has(id)) continue;
      const meta = byId[id];
      if (!meta) continue;

      // 跳过紧跟在名字后的括号缩写，例如 “糖化血红蛋白(HbA1c) 5.6”。
      let rest = line.slice(idx + name.length).replace(/^\s*\([^)]*\)/, '');
      const numMatch = rest.match(/(-?\d+(?:\.\d+)?)/);
      if (!numMatch) continue;
      const value = parseFloat(numMatch[1]);
      let afterValue = rest.slice(numMatch.index + numMatch[0].length);

      // 记录报告单自带的 ↑↓ / H L 标记（数值前后都可能出现），然后去掉，避免干扰取单位。
      let flag = null;
      const pre = rest.slice(0, numMatch.index).match(/[↑↓]/);
      const post = afterValue.match(/^\s*([↑↓]|[HL](?=\s|$))/);
      const mark = (post && post[1]) || (pre && pre[0]);
      if (mark) flag = /[↑H]/.test(mark) ? 'up' : 'down';
      if (post) afterValue = afterValue.slice(post[0].length);

      // 单位：数值后面第一个字母组合，例如 mmol/L、umol/L、10^9/L、%。
      const unitMatch = afterValue.match(/^\s*((?:10\^?\d+\/[A-Za-z]+)|[a-zA-Zμµ%²][a-zA-Zμµ%²/.0-9]*)/);
      let unit = unitMatch ? unitMatch[1].replace(/^10(\d)/, '10^$1').replace(/[μµ]/g, 'u') : meta.unit;
      const unitEnd = unitMatch ? unitMatch[0].length : 0;

      const reportRange = extractRangeFromLine(afterValue.slice(unitEnd));
      const effective = reportRange
        ? { low: reportRange.low, high: reportRange.high, source: 'report' }
        : { low: meta.low, high: meta.high, source: 'builtin' };

      seen.add(id);
      results.push(makeItem(meta, value, unit || meta.unit, effective, flag));
      break; // 一行只认一个指标，避免重复匹配。
    }
  }
  return results;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseReportText, judge, extractRangeFromLine, normalizeText };
}
if (typeof globalThis !== 'undefined') {
  globalThis.parseReportText = parseReportText;
}
