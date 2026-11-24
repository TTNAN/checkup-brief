// checkup-brief — tests/family.test.js
// 家庭档案的数据逻辑：迁移、成员、报告日期、去重、导出导入。只用编的数据。
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../src/family.js');

const Y = 2026;

test('旧版单人打卡迁进默认成员“我”', () => {
  const checks = F.emptyChecks();
  checks[0] = { eat: true, move: true, sleep: false };
  const { archive, migrated } = F.loadOrMigrate(null, { checks, start: 1700000000000 }, Y);
  assert.equal(migrated, true);
  assert.equal(archive.members.length, 1);
  const me = archive.members[0];
  assert.equal(me.name, null);
  assert.equal(archive.activeId, me.id);
  assert.deepEqual(me.checks[0], { eat: true, move: true, sleep: false });
  assert.equal(me.start, 1700000000000);
  assert.equal(F.memberAge(me, Y), 32);
});

test('新访客：默认成员、没有迁移', () => {
  const { archive, migrated } = F.loadOrMigrate(null, {}, Y);
  assert.equal(migrated, false);
  assert.equal(archive.members.length, 1);
  assert.deepEqual(F.memberProfile(archive.members[0], Y), { age: 32, sex: 'male', familyHistory: [] });
});

test('已有档案原样读回，坏数据被清洗', () => {
  const saved = { activeId: 'gone', members: [{ id: 'a', name: '爸爸', birthYear: 1960, sex: 'male', familyHistory: ['糖尿病', 'xx'], checks: [1, 2] }, null, { id: 'a' }] };
  const { archive } = F.loadOrMigrate(saved, { checks: F.emptyChecks() }, Y);
  assert.equal(archive.members.length, 1);
  assert.equal(archive.activeId, 'a');
  assert.deepEqual(archive.members[0].familyHistory, ['糖尿病']);
  assert.equal(archive.members[0].checks.length, 30);
});

test('出生年份或年龄都能填', () => {
  assert.equal(F.toBirthYear('1958', Y), 1958);
  assert.equal(F.toBirthYear(66, Y), 1960);
  assert.equal(F.toBirthYear('abc', Y), null);
  const mom = F.createMember({ name: '  妈妈  ', age: 63, sex: 'female' }, Y);
  assert.equal(mom.name, '妈妈');
  assert.deepEqual(F.memberProfile(mom, Y), { age: 63, sex: 'female', familyHistory: [] });
});

test('从报告文字里找体检日期，跳过出生日期', () => {
  assert.equal(F.parseReportDate('姓名 *** 出生日期 1960-03-02\n体检日期：2025年11月8日\n总胆固醇 6.1'), '2025-11-08');
  assert.equal(F.parseReportDate('出生日期 1960-03-02\n采样时间 2025/10/03 08:12'), '2025-10-03');
  assert.equal(F.parseReportDate('出生 1960-03-02\n2024.06.15 尿酸 452'), '2024-06-15');
  assert.equal(F.parseReportDate('总胆固醇 6.12 mmol/L 参考范围 <5.2'), null);
  assert.equal(F.parseReportDate('报告日期 2025-02-30'), null);
});

test('同一成员同一份报告只存一份，日期保留', () => {
  const b = { score: 68, color: 'yellow', counts: { abnormal: 4, borderline: 3, normal: 12 } };
  let r1 = F.upsertReport([], { memberId: 'm1', text: '尿酸 452\n体检日期 2025-11-08', briefing: b });
  assert.equal(r1.created, true);
  assert.equal(r1.report.date, '2025-11-08');
  r1.reports[0].date = '2025-11-09'; // 用户手动改过日期
  const r2 = F.upsertReport(r1.reports, { memberId: 'm1', text: '尿酸 452 \n体检日期 2025-11-08', briefing: { ...b, score: 70 } });
  assert.equal(r2.created, false);
  assert.equal(r2.reports.length, 1);
  assert.equal(r2.report.date, '2025-11-09');
  assert.equal(r2.report.score, 70);
  const r3 = F.upsertReport(r2.reports, { memberId: 'm2', text: '尿酸 452\n体检日期 2025-11-08', briefing: b });
  assert.equal(r3.created, true);
  assert.equal(r3.reports.length, 2);
  const noDate = F.makeReport({ memberId: 'm1', text: '尿酸 452', now: new Date(2026, 0, 5).getTime() });
  assert.equal(noDate.date, '2026-01-05');
});

test('导出 → 导入（替换）来回一致', () => {
  const dad = F.createMember({ id: 'dad', name: '爸爸', birthYear: 1960 }, Y);
  const archive = { members: [dad], activeId: 'dad' };
  const reports = [F.makeReport({ memberId: 'dad', text: '尿酸 452', date: '2025-11-08' })];
  const json = JSON.stringify(F.exportArchive(archive, reports));
  assert.ok(!/base64|data:image/.test(json));
  const back = F.normalizeImport(json, Y);
  assert.equal(back.archive.activeId, 'dad');
  assert.equal(back.archive.members[0].name, '爸爸');
  assert.equal(back.reports.length, 1);
  assert.equal(back.reports[0].date, '2025-11-08');
});

test('导入校验：不是档案、成员缺失的报告被丢掉', () => {
  assert.throws(() => F.normalizeImport('{"foo":1}'), /not-archive/);
  assert.throws(() => F.normalizeImport({ type: F.ARCHIVE_TYPE, version: 99, members: [{}] }), /newer-version/);
  const r = F.normalizeImport({ type: F.ARCHIVE_TYPE, version: 1, members: [{ id: 'a' }], reports: [{ memberId: 'zzz', text: 'x' }, { memberId: 'a', text: '' }, { memberId: 'a', text: '尿酸 452', date: 'bad' }] }, Y);
  assert.equal(r.reports.length, 1);
  assert.match(r.reports[0].date, /^\d{4}-\d{2}-\d{2}$/);
});

test('合并：本机成员保留，新成员和新报告加进来，重复的不加', () => {
  const me = F.createMember({ id: 'me', start: 1700000000000 }, Y); // 打过卡，不是空白成员
  const dadLocal = F.createMember({ id: 'dad', name: '老爸', birthYear: 1959 }, Y);
  const local = { members: [me, dadLocal], activeId: 'me' };
  const localReports = [F.makeReport({ memberId: 'dad', text: '尿酸 452' })];
  const incoming = { members: [F.createMember({ id: 'dad', name: '爸爸', birthYear: 1960 }, Y), F.createMember({ id: 'mom', name: '妈妈' }, Y)], activeId: 'mom' };
  const incomingReports = [
    { ...localReports[0], id: 'other-id' }, // 同一份文字，换了 id
    F.makeReport({ memberId: 'mom', text: '血红蛋白 110' }),
  ];
  const res = F.mergeArchives(local, localReports, incoming, incomingReports);
  assert.deepEqual(res.archive.members.map((m) => m.id), ['me', 'dad', 'mom']);
  assert.equal(res.archive.members[1].name, '老爸');
  assert.equal(res.archive.activeId, 'me');
  assert.equal(res.reports.length, 2);
  assert.deepEqual(res.added, { members: 1, reports: 1 });
});

test('删除成员连同报告；最后一位不能删', () => {
  const a = F.createMember({ id: 'a' }, Y);
  const b = F.createMember({ id: 'b', name: '妈妈' }, Y);
  const reports = [F.makeReport({ memberId: 'b', text: 'x 1' }), F.makeReport({ memberId: 'a', text: 'y 2' })];
  const res = F.removeMember({ members: [a, b], activeId: 'b' }, reports, 'b');
  assert.equal(res.archive.activeId, 'a');
  assert.equal(res.reports.length, 1);
  const keep = F.removeMember(res.archive, res.reports, 'a');
  assert.equal(keep.archive.members.length, 1);
});

test('合并到一台新手机：空白的“我”不会出现两个', () => {
  const phone = F.loadOrMigrate(null, {}, Y).archive; // 爸妈手机上的空白“我”
  const me = F.createMember({ id: 'kid' }, Y);
  const dad = F.createMember({ id: 'dad', name: '爸爸', birthYear: 1960 }, Y);
  const reports = [F.makeReport({ memberId: 'dad', text: '尿酸 452' }), F.makeReport({ memberId: 'kid', text: '尿酸 400' })];
  const res = F.mergeArchives(phone, [], { members: [me, dad], activeId: 'dad' }, reports);
  assert.deepEqual(res.archive.members.map((m) => m.id), ['kid', 'dad']);
  assert.equal(res.archive.activeId, 'dad');
  assert.equal(res.reports.length, 2);
  // 导入方自己的空白“我”也不会加进来
  const blank = F.createMember({ id: 'blank' }, Y);
  const res2 = F.mergeArchives({ members: [dad], activeId: 'dad' }, [], { members: [blank], activeId: 'blank' }, []);
  assert.deepEqual(res2.archive.members.map((m) => m.id), ['dad']);
});

test('成员档案带入套餐推荐：按指引的年龄、性别、家族史出项目', () => {
  const { recommendPackage } = require('../src/package-recommender.js');
  const dad = F.createMember({ name: '爸爸', age: 66, sex: 'male', familyHistory: ['糖尿病'] }, Y);
  const p = recommendPackage({ profile: F.memberProfile(dad, Y), items: [] });
  const names = p.optional.map((x) => x.name);
  ['肺功能 + 骨密度', '口服葡萄糖耐量试验', 'PSA + 前列腺超声'].forEach((n) => assert.ok(names.includes(n), n));
  assert.ok(p.optional.every((x) => x.source && x.source.startsWith('依据：')));
});
