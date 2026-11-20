// checkup-brief — src/package-recommender.js
// 纯函数：体检套餐选择器。
//   recommendPackage({ profile, items, budget }) -> { add, optional, skip, note }
// 输入：年龄、性别、家族史、预算（元）、本次解析出的指标。
// 输出：下次体检建议加查的项目、可选项目、可以省掉的项目。
// 原则：只推荐“有依据的加查”，不推销、不制造焦虑；
//   有异常才建议针对性复查，没有异常不建议盲目加项。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

function recommendPackage(input) {
  const profile = input.profile || {};
  const items = input.items || [];
  const budget = input.budget || 0;
  const family = profile.familyHistory || [];
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const isHigh = (id) => byId[id] && (byId[id].status === 'high' || byId[id].status === 'borderline-high');
  const isLow = (id) => byId[id] && byId[id].status === 'low';

  const add = [];
  const optional = [];
  const skip = [];

  // —— 按本次异常，推荐针对性复查 ——
  if (isHigh('tc') || isHigh('tg') || isHigh('ldl')) {
    add.push({ name: '血脂四项复查', reason: '总胆固醇、甘油三酯偏高，复查确认趋势', price: '约 60–100 元' });
    add.push({ name: '颈动脉超声', reason: '血脂偏高且合并血压偏高，看血管有没有早期变化', price: '约 150–250 元' });
  }
  if (isHigh('ua')) {
    add.push({ name: '尿酸复查 + 肾功能', reason: '尿酸 452，复查并看肾功能是否受影响', price: '约 80–120 元' });
  }
  if (isHigh('alt')) {
    add.push({ name: '肝脏超声', reason: '谷丙转氨酶轻度升高，排查脂肪肝', price: '约 120–200 元' });
    add.push({ name: '肝功能复查', reason: '1–3 个月后复查，看转氨酶是否回落', price: '约 60–100 元' });
  }
  if (isHigh('fpg') || (byId.hba1c && byId.hba1c.status !== 'normal')) {
    add.push({ name: '糖化血红蛋白', reason: '空腹血糖正常偏高，看近 2–3 个月平均血糖', price: '约 60–90 元' });
  }
  if (isHigh('sbp') || isHigh('dbp')) {
    add.push({ name: '动态血压监测', reason: '血压正常偏高，不同天多测几次更准', price: '约 100–200 元' });
  }

  // —— 按年龄、性别、家族史，推荐基础加查 ——
  if (profile.age >= 30) {
    optional.push({ name: '甲状腺超声 + 甲功', reason: '30 岁后甲状腺问题渐多，基础筛查', price: '约 200–300 元' });
  }
  if (profile.age >= 40 || family.includes('肿瘤')) {
    optional.push({ name: '肿瘤标志物筛查', reason: '40 岁后或有家族史，可作辅助参考，不能单独确诊', price: '约 300–600 元' });
  }
  if (family.includes('糖尿病')) {
    optional.push({ name: '口服葡萄糖耐量试验', reason: '有糖尿病家族史，空腹血糖正常偏高时值得做', price: '约 100–150 元' });
  }
  if (family.includes('心血管')) {
    optional.push({ name: '心电图 + 心脏超声', reason: '有心血管家族史，基础心脏筛查', price: '约 200–400 元' });
  }
  if (profile.sex === 'female') {
    optional.push({ name: '乳腺超声 + 妇科超声', reason: '女性常规筛查项目', price: '约 300–500 元' });
  }

  // —— 可以省掉的 ——
  if (add.length === 0) {
    skip.push({ name: '盲目加做全套肿瘤标志物', reason: '没有异常指向时，单独查意义有限，还容易引起不必要的焦虑' });
  }
  skip.push({ name: '重复查已正常的项目', reason: '上次正常且没有新症状的项目，下次不必每年都加' });
  if (budget && budget < 1000) {
    skip.push({ name: '高端影像套餐（PET-CT 等）', reason: `预算 ${budget} 元内优先保证血脂、肝脏、血压复查，高端影像留给医生判断后再做` });
  }

  const note = add.length > 0
    ? '建议优先做“加查”里的复查项目，1–3 个月后复查一次，看趋势比看单次数值更重要。'
    : '本次没有超出范围的指标，下次按常规套餐复查即可，重点是和上次对比趋势。';

  return { add, optional, skip, note };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { recommendPackage };
}
