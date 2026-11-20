// checkup-brief — tests/core.test.js
// 零依赖测试：node --test tests/
// 只用脱敏示例数据或明显是编的数字。
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseReportText, extractRangeFromLine } = require('../src/parser.js');
const { buildBriefing } = require('../src/briefing.js');
const { recommendPackage } = require('../src/package-recommender.js');
const { buildClinicGuide } = require('../src/clinic-guide.js');
const { buildPlan30d } = require('../src/plan-30d.js');

const SAMPLE = fs.readFileSync(path.join(__dirname, '../examples/sample-report.txt'), 'utf8');
const pick = (items, id) => items.find((i) => i.id === id);

test('示例报告：19 项、总分 68、4 红 3 黄', () => {
  const items = parseReportText(SAMPLE);
  assert.equal(items.length, 19);
  const b = buildBriefing(items, { age: 32, sex: 'male' });
  assert.equal(b.score, 68);
  assert.equal(b.counts.abnormal, 4);
  assert.equal(b.counts.borderline, 3);
  assert.deepEqual(b.highlights, ['总胆固醇', '甘油三酯', '谷丙转氨酶', '尿酸']);
});

test('全角括号 + 缩写里的数字不会被当成结果', () => {
  const [i] = parseReportText('糖化血红蛋白（HbA1c） 5.6 % 4.0~6.0');
  assert.equal(i.id, 'hba1c');
  assert.equal(i.value, 5.6);
  assert.deepEqual([i.range.low, i.range.high, i.range.source], [4, 6, 'report']);
});

test('↑ / H 标记被识别，且不影响取数', () => {
  const [a] = parseReportText('谷丙转氨酶(ALT) 52 ↑ U/L 9-50');
  assert.equal(a.value, 52);
  assert.equal(a.unit, 'U/L');
  assert.equal(a.flag, 'up');
  const [b] = parseReportText('甘油三酯 2.48 H mmol/L 0.00--1.70');
  assert.equal(b.flag, 'up');
  assert.equal(b.range.high, 1.7);
  assert.equal(b.status, 'high');
});

test('U/L 里的 L 不会被误当成“偏低”标记', () => {
  const [a] = parseReportText('谷草转氨酶 31 U/L 15-40');
  assert.equal(a.flag, null);
});

test('参考范围的各种写法', () => {
  assert.deepEqual(extractRangeFromLine('3.9-6.1'), { low: 3.9, high: 6.1, source: 'report' });
  assert.deepEqual(extractRangeFromLine('208～428'), { low: 208, high: 428, source: 'report' });
  assert.deepEqual(extractRangeFromLine('≤5.20'), { low: null, high: 5.2, source: 'report' });
  assert.deepEqual(extractRangeFromLine('>1.0'), { low: 1, high: null, source: 'report' });
});

test('报告没印范围时用内置范围', () => {
  const [i] = parseReportText('尿酸 452 umol/L');
  assert.equal(i.range.source, 'builtin');
  assert.equal(i.status, 'high');
});

test('血压只扣一次分', () => {
  const items = parseReportText('血压 150/95 mmHg');
  assert.equal(items.length, 2);
  assert.equal(buildBriefing(items).score, 93);
});

test('英文模式输出英文', () => {
  const items = parseReportText(SAMPLE);
  const b = buildBriefing(items, { age: 32, sex: 'male' }, 'en');
  assert.equal(b.level, 'A few things to watch');
  assert.match(b.summary, /32-year-old male/);
  assert.match(buildClinicGuide(items, 'en')[0].department, /Cardiology/);
  assert.match(buildPlan30d(items, {}, 'en').headline, /30 days/);
});

test('套餐、挂号、30 天计划都有内容', () => {
  const items = parseReportText(SAMPLE);
  const pkg = recommendPackage({ profile: { age: 32, sex: 'male' }, items, budget: 1500 });
  assert.ok(pkg.add.length >= 4);
  assert.ok(pkg.add.some((x) => x.reason.includes('452')));
  const guides = buildClinicGuide(items);
  assert.equal(guides.filter((g) => g.indicator === '血压').length, 1);
  const plan = buildPlan30d(items, { age: 32, sex: 'male' });
  assert.equal(plan.weeks.length, 4);
  assert.equal(plan.checklist.length, 30);
  plan.weeks.forEach((w) => assert.equal(w.tasks.length, 3));
});

test('全部正常时 100 分', () => {
  const items = parseReportText('谷丙转氨酶 20 U/L 9-50\n尿酸 300 umol/L 208-428');
  assert.equal(buildBriefing(items).score, 100);
});

test('表格版：名字后面跟英文缩写列', () => {
  const [a] = parseReportText('12 糖化血红蛋白 HbA1c 5.6 % 4.0-6.0');
  assert.equal(a.value, 5.6);
  const [b] = parseReportText('3 谷丙转氨酶 ALT 52 ↑ U/L 9-50');
  assert.deepEqual([b.value, b.flag, b.range.high], [52, 'up', 50]);
});

test('OCR 拆开的汉字能合并', () => {
  const [a] = parseReportText('总 胆 固 醇  6.12  mmol/L  <5.20');
  assert.equal(a.id, 'tc');
  assert.equal(a.status, 'high');
});

test('PDF 里的康熙部首 / 兼容汉字能识别', () => {
  const items = parseReportText('⾎红蛋⽩  HGB  152  g/L  130--175\n天⻔冬氨酸氨基转移酶  AST  31  U/L  15--40\n⽢油三酯  TG  2.48  ↑  mmol/L  0.00--1.70');
  assert.deepEqual(items.map((i) => i.id), ['hb', 'ast', 'tg']);
});

test('OCR 模式：小数点丢失、↑ 认成 1、单位乱码', () => {
  const items = parseReportText('1  总胆固醇  TC  612 1  mmol/L  0.00--5.20\n2  白细胞计数  WBC  6.2  10A9儿  3.5--9.5\n3  尿酸  UA  452 人  hmol作  208--428', { ocr: true });
  const [tc, wbc, ua] = items;
  assert.equal(tc.value, 6.12);
  assert.deepEqual(tc.ocrFix, { from: 612, to: 6.12 });
  assert.equal(tc.flag, 'up');
  assert.equal(wbc.unit, '10^9/L');
  assert.equal(ua.value, 452);
  assert.equal(ua.ocrFix, undefined);
  assert.equal(ua.unit, 'umol/L');
});

test('非 OCR 模式不做任何纠错', () => {
  const [tc] = parseReportText('总胆固醇 612 mmol/L <5.2');
  assert.equal(tc.value, 612);
});
