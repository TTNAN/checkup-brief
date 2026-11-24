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

const GUIDELINE_URL = 'https://www.nhc.gov.cn/yzygj/c100068/202511/4feaeb6de63e44cb9fd4ac8f579ca279.shtml';

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
  // 年龄 / 性别阈值对齐国家卫健委《成人健康体检项目推荐指引（2025 年版）》（国卫办医政函〔2025〕412 号）：
  //   附件 2 基本体检项目：甲功（TSH、游离甲状腺激素）人人都查；女性加子宫附件、乳腺超声及 HPV / 宫颈细胞学（有性生活史）；
  //     40 岁以上加肺功能、骨密度。
  //   附件 3 / 附件 5：慢性病风险人群的加查项目和判定条件（糖尿病 ≥35 岁或一级亲属有糖尿病 → OGTT；
  //     胃癌、食管癌 ≥45 岁且有危险因素 → 胃镜；结直肠癌评分 → 结肠镜；前列腺癌 男性 ≥60 岁 → PSA + 前列腺超声；
  //     认知障碍 ≥50 岁 → 认知量表筛查）。
  const age = profile.age || 0;
  const cite = (annex) => ({
    zh: `依据：国家卫健委《成人健康体检项目推荐指引（2025 年版）》${annex.zh}`,
    en: `Source: China NHC, Adult Health Checkup Item Guideline (2025), ${annex.en}`,
  });
  const BASIC = cite({ zh: '附件 2 基本体检项目', en: 'Annex 2: basic items' });
  const RISK = cite({ zh: '附件 3、5 慢性病风险筛查', en: 'Annexes 3 & 5: chronic-disease risk screening' });
  const opt = (zhName, enName, zhReason, enReason, low, high, src) => {
    push(optional, zhName, enName, zhReason, enReason, low, high);
    const x = optional[optional.length - 1];
    x.source = T(src.zh, src.en);
    x.sourceUrl = GUIDELINE_URL;
  };

  if (age >= 18 && !byId.tsh) {
    opt('甲状腺功能（TSH、游离甲状腺激素）', 'Thyroid function (TSH, free T4)', '指引把甲功列为成人基本体检项目，本次报告里没看到', 'The guideline lists thyroid function as a basic adult item; it isn\'t in this report', 60, 120, BASIC);
  }
  if (age >= 40) {
    opt('肺功能 + 骨密度', 'Lung function + bone density', '指引：40 岁以上在基本项目里增加肺功能检查和骨密度检测', 'Guideline: from 40, add a lung function test and a bone density scan to the basic items', 150, 300, BASIC);
  }
  if (age >= 35 || hasFamily('diabetes')) {
    opt('口服葡萄糖耐量试验', 'Oral glucose tolerance test', '年龄 ≥35 岁或一级亲属有糖尿病，属指引里的糖尿病风险人群，优先推荐 OGTT', 'Age 35+ or a parent / sibling with diabetes puts you in the guideline\'s diabetes-risk group; OGTT is the first-line add-on', 100, 150, RISK);
  }
  if (hasFamily('cardio')) {
    opt('超声心动图 + 颈动脉超声', 'Echocardiogram + carotid ultrasound', '心电图已是基本项目；有心血管家族史，可请医生评估 10 年心血管风险，属风险人群时优先加这两项', 'An ECG is already basic; with heart disease in the family, ask for a 10-year risk estimate — these two come first if you\'re at risk', 300, 500, RISK);
  }
  if (age >= 45) {
    opt('胃镜 / 结肠镜', 'Gastroscopy / colonoscopy', '45 岁起，如有吸烟、饮酒、高盐腌制饮食、幽门螺杆菌阳性或一级亲属胃癌 / 肠癌等，属指引里的胃癌、结直肠癌风险人群', 'From 45, smoking, drinking, salty / pickled food, H. pylori, or a parent / sibling with stomach or bowel cancer puts you in the guideline\'s risk group', 800, 1500, RISK);
  }
  if (age >= 50) {
    opt('认知功能筛查（量表）', 'Cognitive screening (questionnaire)', '指引推荐 50 岁以上开展脑认知健康筛查', 'The guideline recommends cognitive screening from 50', 0, 0, RISK);
  }
  if (profile.sex === 'male' && age >= 60) {
    opt('PSA + 前列腺超声', 'PSA + prostate ultrasound', '指引：60 岁以上男性属前列腺癌风险人群', 'Guideline: men 60+ are in the prostate-cancer risk group', 150, 300, RISK);
  }
  if (profile.sex === 'female') {
    opt('乳腺超声 + 子宫附件超声 + HPV / 宫颈细胞学', 'Breast + pelvic ultrasound, HPV / cervical cytology', '指引列为女性基本体检项目（HPV、宫颈细胞学限有性生活史）', 'Basic items for women in the guideline (HPV and cervical cytology if sexually active)', 300, 600, BASIC);
  }
  if (hasFamily('cancer')) {
    opt('按家族癌种做针对性筛查', 'Screening for the cancer that runs in the family', '指引按具体癌种定风险人群（如一级亲属肺癌、乳腺癌、肠癌），先问清是哪种癌，再做对应的影像或内镜；肿瘤标志物只作可选辅助', 'The guideline sets risk groups per cancer type; find out which cancer it was, then do the matching scan or scope — tumor markers are only an optional extra', 300, 1500, RISK);
  }

  // —— 可以省掉的 ——
  if (!hasFamily('cancer')) {
    push(skip, '盲目加做全套肿瘤标志物', 'A full tumor-marker panel "just in case"', '指引里肿瘤标志物只是特定癌症风险人群的可选项；没有家族史、没有异常指向时，单独查意义有限，还容易引起不必要的焦虑', 'In the guideline, tumor markers are only optional extras for specific cancer-risk groups; without family history or a lead they add little and often add anxiety');
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
  module.exports = { recommendPackage, GUIDELINE_URL };
}
if (typeof globalThis !== 'undefined') {
  globalThis.recommendPackage = recommendPackage;
}
