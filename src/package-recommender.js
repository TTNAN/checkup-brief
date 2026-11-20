// checkup-brief — src/package-recommender.js
// 纯函数：体检套餐选择器。
//   recommendPackage({ profile, items, budget, lang }) -> { add, optional, skip, note, estimate }
// 输入：年龄、性别、家族史（'糖尿病' / '心血管' / '肿瘤'，也认 diabetes / cardio / cancer）、
//       预算（元）、本次解析出的指标。
// 输出：下次体检建议加查的项目、可选项目、可以省掉的项目，以及加查部分的大致花费。
// 原则：只推荐“有依据的加查”，不推销、不制造焦虑；
//   有异常才建议针对性复查，没有异常不建议盲目加项。
// 价格为国内公立医院 / 体检机构的大致区间，仅供参考。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

const FAMILY_KEYS = {
  diabetes: ['糖尿病', 'diabetes'],
  cardio: ['心血管', 'cardio', 'heart'],
  cancer: ['肿瘤', 'cancer'],
};

function recommendPackage(input) {
  const profile = input.profile || {};
  const items = input.items || [];
  const budget = input.budget != null ? input.budget : profile.budget || 0;
  const lang = input.lang === 'en' ? 'en' : 'zh';
  const T = (zh, en) => (lang === 'en' ? en : zh);
  const family = (profile.familyHistory || []).map(String);
  const hasFamily = (k) => family.some((f) => FAMILY_KEYS[k].includes(f));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const isHigh = (id) => byId[id] && (byId[id].status === 'high' || byId[id].status === 'borderline-high');
  const v = (id) => (byId[id] ? `${byId[id].value}` : '');

  const add = [];
  const optional = [];
  const skip = [];
  const push = (list, zhName, enName, zhReason, enReason, low, high) => list.push({
    name: T(zhName, enName),
    reason: T(zhReason, enReason),
    price: high ? T(`约 ${low}–${high} 元`, `≈ ¥${low}–${high}`) : '',
    low: low || 0,
    high: high || 0,
  });

  // —— 按本次异常，推荐针对性复查 ——
  const lipidHigh = ['tc', 'tg', 'ldl'].filter(isHigh);
  if (lipidHigh.length) {
    const names = lipidHigh.map((id) => (lang === 'en' ? byId[id].en : byId[id].name)).join(T('、', ', '));
    push(add, '血脂四项复查', 'Lipid panel recheck', `${names}偏高，复查确认趋势`, `${names} high — recheck the trend`, 60, 100);
    if (isHigh('sbp') || isHigh('dbp') || (profile.age || 0) >= 40) {
      push(add, '颈动脉超声', 'Carotid ultrasound', '血脂偏高且合并血压偏高，看血管有没有早期变化', 'High lipids plus high-ish blood pressure — check arteries for early changes', 150, 250);
    }
  }
  if (isHigh('ua')) {
    push(add, '尿酸复查 + 肾功能', 'Uric acid + kidney recheck', `尿酸 ${v('ua')}，复查并看肾功能是否受影响`, `Uric acid ${v('ua')} — recheck it and kidney function`, 80, 120);
  }
  if (isHigh('alt') || isHigh('ast') || isHigh('ggt')) {
    push(add, '肝脏超声', 'Liver ultrasound', '转氨酶升高，排查脂肪肝', 'Liver enzymes up — rule out fatty liver', 120, 200);
    push(add, '肝功能复查', 'Liver function recheck', '1–3 个月后复查，看转氨酶是否回落', 'Recheck in 1–3 months to see if enzymes come down', 60, 100);
  }
  if (isHigh('fpg') || (byId.hba1c && byId.hba1c.status !== 'normal')) {
    push(add, '糖化血红蛋白', 'HbA1c', `空腹血糖 ${v('fpg')} 偏高，看近 2–3 个月平均血糖`, `Fasting glucose ${v('fpg')} on the high side — check the 2–3 month average`, 60, 90);
  }
  if (isHigh('sbp') || isHigh('dbp')) {
    push(add, '动态血压监测', '24h blood pressure monitoring', `血压 ${v('sbp')}/${v('dbp')} 偏高，不同时段多测更准`, `BP ${v('sbp')}/${v('dbp')} on the high side — multiple readings are more reliable`, 100, 200);
  }

  // —— 按年龄、性别、家族史，推荐基础加查 ——
  if ((profile.age || 0) >= 30) {
    push(optional, '甲状腺超声 + 甲功', 'Thyroid ultrasound + function', '30 岁后甲状腺问题渐多，基础筛查', 'Thyroid issues become more common after 30', 200, 300);
  }
  if ((profile.age || 0) >= 40 || hasFamily('cancer')) {
    push(optional, '肿瘤标志物筛查', 'Tumor marker screening', '40 岁后或有家族史，可作辅助参考，不能单独确诊', 'After 40 or with family history; supportive only, never diagnostic alone', 300, 600);
  }
  if ((profile.age || 0) >= 45) {
    push(optional, '胃肠镜', 'Endoscopy / colonoscopy', '45 岁后建议做一次基线检查', 'A baseline check is advised after 45', 800, 1500);
  }
  if (hasFamily('diabetes')) {
    push(optional, '口服葡萄糖耐量试验', 'Oral glucose tolerance test', '有糖尿病家族史，空腹血糖偏高时值得做', 'Family history of diabetes — worth it when fasting glucose runs high', 100, 150);
  }
  if (hasFamily('cardio')) {
    push(optional, '心电图 + 心脏超声', 'ECG + echocardiogram', '有心血管家族史，基础心脏筛查', 'Family history of heart disease — baseline screening', 200, 400);
  }
  if (profile.sex === 'female') {
    push(optional, '乳腺超声 + 妇科超声', 'Breast + pelvic ultrasound', '女性常规筛查项目', 'Routine screening for women', 300, 500);
  }

  // —— 可以省掉的 ——
  if (!hasFamily('cancer') && (profile.age || 0) < 40) {
    push(skip, '盲目加做全套肿瘤标志物', 'A full tumor-marker panel "just in case"', '没有家族史、没有异常指向时，单独查意义有限，还容易引起不必要的焦虑', 'Without family history or a lead, it adds little and often adds anxiety');
  }
  push(skip, '重复查已正常的项目', 'Repeating tests that were normal', '上次正常且没有新症状的项目，不必每年都加', 'If it was normal and nothing changed, no need to repeat every year');
  if (budget && budget < 2000) {
    push(skip, '高端影像套餐（PET-CT 等）', 'Premium imaging (PET-CT etc.)', `预算 ${budget} 元内优先保证针对性复查，高端影像留给医生判断后再做`, `On a ¥${budget} budget, prioritise targeted rechecks; leave premium imaging to a doctor\'s call`);
  }

  const estLow = add.reduce((s, x) => s + x.low, 0);
  const estHigh = add.reduce((s, x) => s + x.high, 0);
  const note = add.length > 0
    ? T('建议优先做“加查”里的复查项目，1–3 个月后复查一次，看趋势比看单次数值更重要。', 'Do the recommended rechecks first, in 1–3 months. The trend matters more than any single number.')
    : T('本次没有超出范围的指标，下次按常规套餐复查即可，重点是和上次对比趋势。', 'Nothing out of range this time. A routine package next year is enough — compare against this one.');

  return {
    add,
    optional,
    skip,
    note,
    estimate: { low: estLow, high: estHigh, withinBudget: !budget || estHigh <= budget },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { recommendPackage };
}
if (typeof globalThis !== 'undefined') {
  globalThis.recommendPackage = recommendPackage;
}
