// checkup-brief — src/parser.js
// 纯函数：把体检报告原文解析成结构化指标数组。
// 输入：报告文本（粘贴的文字、OCR 结果、PDF 复制出来的文本都行）。
// 输出：[{ id, name, value, unit, range, status, note }]
//   status: 'high' 偏高 / 'low' 偏低 / 'borderline-high' 正常偏高 /
//           'borderline-low' 正常偏低 / 'normal' 正常 / 'unknown' 无法判定
//
// 解析思路（刻意做得保守、可解释）：
//   1. 用别名表把指标名归一到 id；
//   2. 在同一行里找数值 + 单位（支持 6.12、6.12 mmol/L、132/84 这种血压写法）；
//   3. 优先用报告单上印的参考范围，报告没印才用内置参考范围；
//   4. 判定只做“是否超出范围”这一层，不做诊断、不推疾病。
// 只做健康科普，不做诊断，不能替代医生。
// 数据只在本地处理，不上传。

'use strict';

// 在浏览器里直接用 <script> 引入时，这两个全局变量由
// reference-ranges.js / aliases.js 先定义；
// 在 Node 里用 require 时则从同目录加载。
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

// 从一行文本里抠出参考范围，例如 "3.9-6.1"、"<5.2"、"208-428"。
function extractRangeFromLine(line) {
  const m = line.match(/(\d+(?:\.\d+)?)\s*[-~～]\s*(\d+(?:\.\d+)?)/);
  if (m) return { low: parseFloat(m[1]), high: parseFloat(m[2]), source: 'report' };
  const lt = line.match(/<\s*(\d+(?:\.\d+)?)/);
  if (lt) return { low: null, high: parseFloat(lt[1]), source: 'report' };
  const gt = line.match(/>\s*(\d+(?:\.\d+)?)/);
  if (gt) return { low: parseFloat(gt[1]), high: null, source: 'report' };
  return null;
}

// 判定：value 对照 low/high，返回状态。
// 接近边界的判定：落在区间内、但离上限不到区间宽度的 10%，算正常偏高；
// 同理离下限不到 10% 算正常偏低。没有明确区间的指标不做“偏高”细分。
// 例外：血压按临床常用分界——收缩压 120–139、舒张压 80–89 为正常高值，
// 直接判为 borderline-high，不走 10% 规则。
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
    if (value <= low + width * 0.1) return 'borderline-low';
  }
  return 'normal';
}

function parseReportText(text) {
  const { REFERENCE_RANGES, SORTED_NAMES, NAME_TO_ID } = loadDeps();
  const byId = Object.fromEntries(REFERENCE_RANGES.map((r) => [r.id, r]));
  const results = [];
  const seen = new Set();
  if (!text || !String(text).trim()) return results;

  const lines = String(text).split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 血压是 “132/84 mmHg” 这种双数值，单独处理。
    const bp = line.match(/(血压|收缩压|舒张压)[^\d]*(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (bp) {
      const sbpRange = byId.sbp;
      const dbpRange = byId.dbp;
      const sbp = parseInt(bp[2], 10);
      const dbp = parseInt(bp[3], 10);
      if (!seen.has('sbp')) {
        seen.add('sbp');
        results.push({ id: 'sbp', name: sbpRange.name, value: sbp, unit: 'mmHg', range: { low: sbpRange.low, high: sbpRange.high, source: 'builtin' }, status: judge(sbp, sbpRange, 'sbp'), note: sbpRange.note });
      }
      if (!seen.has('dbp')) {
        seen.add('dbp');
        results.push({ id: 'dbp', name: dbpRange.name, value: dbp, unit: 'mmHg', range: { low: dbpRange.low, high: dbpRange.high, source: 'builtin' }, status: judge(dbp, dbpRange, 'dbp'), note: dbpRange.note });
      }
      continue;
    }

    // 逐个指标名匹配：找到名字后，在名字后面找第一个数值。
    for (const name of SORTED_NAMES) {
      const idx = line.indexOf(name);
      if (idx === -1) continue;
      const id = NAME_TO_ID.get(name);
      if (!id || seen.has(id)) continue;
      const range = byId[id];
      if (!range) continue;

      const after = line.slice(idx + name.length);
      // 跳过括号里的英文缩写，例如 “谷丙转氨酶(ALT) 52 U/L”。
      const numMatch = after.match(/\)?\s*(\d+(?:\.\d+)?)/);
      if (!numMatch) continue;
      const value = parseFloat(numMatch[1]);

      // 单位：数值后面第一个字母组合，例如 mmol/L、umol/L、U/L、mmHg、%。
      const unitMatch = after.slice(numMatch.index + numMatch[0].length).match(/([a-zA-Z%²^/]+(?:\/[a-zA-Z]+)?)/);
      const unit = unitMatch ? unitMatch[1].replace('^', '') : range.unit;

      // 报告上印的参考范围优先于内置范围。
      const reportRange = extractRangeFromLine(line);
      const effective = reportRange
        ? { low: reportRange.low, high: reportRange.high, source: 'report' }
        : { low: range.low, high: range.high, source: 'builtin' };

      seen.add(id);
      results.push({
        id,
        name: range.name,
        value,
        unit: unit || range.unit,
        range: effective,
        status: judge(value, effective, id),
        note: range.note,
      });
      break; // 一行只认一个指标，避免重复匹配。
    }
  }
  return results;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseReportText, judge, extractRangeFromLine };
}
