// checkup-brief — src/briefing.js
// 纯函数：把解析后的指标数组变成“一页纸人话简报”。
//   buildBriefing(items, profile, lang) -> { score, level, color, summary, counts, items, highlights }
//   explainItem(item, lang) -> 一句人话讲解
//   lang: 'zh'（默认）或 'en'
//
// 计分规则（公开、可解释，不是医学评分）：
//   满分 100 起；偏高/偏低一项扣 7 分，正常偏高/偏低扣 2 分，
//   扣完下限 0 分。收缩压和舒张压只按血压计一次（取较差的那一项），
//   避免同一次血压被重复扣分。
//   本仓库示例：4 项偏高（总胆固醇、甘油三酯、尿酸、ALT）扣 28 分，
//   2 项正常偏高（空腹血糖、血压）扣 4 分，合计 100 - 32 = 68 分。
//   90–100 挺好 / 75–89 总体不错 / 60–74 有几项要注意 / 60 以下建议尽快找医生聊聊。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

const EXPLANATIONS = {
  zh: {
    tc: {
      high: '总胆固醇偏高。吃进去的油脂和身体自己合成的胆固醇都可能让它升高，长期偏高会增加血管负担。先看饮食和运动，复查时再看变化。',
      'borderline-high': '总胆固醇贴着上限，还没超，但已经是提醒：少吃肥肉、动物内脏和油炸食品。',
    },
    tg: {
      high: '甘油三酯偏高，和吃得油、喝酒、甜食多、运动少关系最直接。这一项对生活方式最敏感，也是最容易通过调整降下来的。',
      'borderline-high': '甘油三酯贴着上限，少喝酒、少吃甜食，很快就能看到变化。',
    },
    ldl: {
      high: '低密度脂蛋白偏高，常被叫作“坏胆固醇”。它和血管健康关系最直接，饮食调整后复查看趋势。',
    },
    hdl: {
      low: '高密度脂蛋白偏低，常被叫作“好胆固醇”。规律运动是最有效的提升办法。',
    },
    ua: {
      high: '尿酸偏高。海鲜、红肉、动物内脏、啤酒、含糖饮料吃得多时容易升高。长期偏高要注意痛风和肾脏负担，多喝水、少喝酒。',
      'borderline-high': '尿酸贴着上限，多喝水、少喝啤酒和含糖饮料，别等到关节疼才注意。',
    },
    fpg: {
      'borderline-high': '空腹血糖在正常范围里偏高，还没到异常，但值得留意。少吃精制主食、多动、控制体重，是现在就能做的事。',
      high: '空腹血糖偏高，需要复查确认。建议空腹再测一次，并和医生聊聊要不要查糖化血红蛋白。',
    },
    hba1c: {
      high: '糖化血红蛋白偏高，反映的是最近 2–3 个月的平均血糖，比单次血糖更稳，建议找内分泌科评估。',
    },
    alt: {
      high: '谷丙转氨酶轻度升高，提示肝细胞有点“累”。常见原因有脂肪肝、饮酒、熬夜、某些药物。先戒酒、规律作息，1–3 个月后复查。',
    },
    ast: {
      high: '谷草转氨酶偏高，常和谷丙转氨酶一起看。饮酒、剧烈运动后都可能升高，先休息、戒酒后复查。',
    },
    ggt: {
      high: '谷氨酰转肽酶偏高，和饮酒关系最密切，也可能是胆道或脂肪肝的信号。先戒酒再复查。',
    },
    sbp: {
      'borderline-high': '收缩压在正常范围里偏高，还没到高血压，但已经是提醒信号。少盐、减重、规律运动都有帮助。',
      high: '收缩压偏高，建议不同天多测几次，带上记录去找医生评估。',
    },
    dbp: {
      'borderline-high': '舒张压在正常范围里偏高，和收缩压一样，先从少盐、运动、睡眠上调整。',
      high: '舒张压偏高，建议不同天多测几次，带上记录去找医生评估。',
    },
    crea: {
      high: '肌酐偏高，可能和肾功能有关，也可能和肌肉量、脱水有关。先别自己下结论，带报告找医生看。',
    },
    egfr: {
      low: '肾小球滤过率偏低，是看肾功能的关键指标，建议带报告去肾内科评估。',
    },
    tsh: {
      high: '促甲状腺激素偏高，提示甲状腺功能可能偏低，需要结合游离 T3、T4 一起看。',
      low: '促甲状腺激素偏低，提示甲状腺功能可能偏高，需要结合游离 T3、T4 一起看。',
    },
    hb: {
      low: '血红蛋白偏低，可能有贫血。缺铁是最常见的原因，建议复查血常规并找医生看原因。',
    },
    wbc: {
      high: '白细胞偏高，感冒、炎症时很常见。没有不舒服的话，过几周复查一次血常规。',
      low: '白细胞偏低，偶尔一次意义不大，建议复查血常规。',
    },
    bmi: {
      high: '体重指数超出正常范围。腰围往往比体重更能说明问题，减重 5% 就能让血脂、血糖、血压一起改善。',
    },
  },
  en: {
    tc: {
      high: 'Total cholesterol is high. Both the fat you eat and the cholesterol your body makes can raise it, and staying high puts strain on blood vessels. Start with diet and exercise, then recheck the trend.',
      'borderline-high': 'Total cholesterol is right at the upper edge. Not over yet, but cut back on fatty meat, organ meat and fried food.',
    },
    tg: {
      high: 'Triglycerides are high — most directly linked to oily food, alcohol, sweets and too little exercise. This is the most lifestyle-sensitive marker, and the easiest to bring down.',
      'borderline-high': 'Triglycerides are near the upper edge. Less alcohol and sugar shows up here fast.',
    },
    ldl: { high: 'LDL — the "bad cholesterol" — is high. It is the lipid most tied to blood vessel health. Adjust diet, then recheck the trend.' },
    hdl: { low: 'HDL — the "good cholesterol" — is low. Regular exercise is the most effective way to raise it.' },
    ua: {
      high: 'Uric acid is high. Seafood, red meat, organ meat, beer and sugary drinks push it up. Staying high raises the risk of gout and kidney strain — drink more water, less alcohol.',
      'borderline-high': 'Uric acid is near the upper edge. More water, less beer and sugary drinks.',
    },
    fpg: {
      'borderline-high': 'Fasting glucose is on the high side of normal — not abnormal yet, but worth watching. Fewer refined carbs, more movement, steady weight.',
      high: 'Fasting glucose is high and needs a recheck. Test again fasting, and ask a doctor whether HbA1c is worth checking.',
    },
    hba1c: { high: 'HbA1c is high. It reflects your average blood sugar over 2–3 months, so it is steadier than a single glucose test. See an endocrinologist.' },
    alt: { high: 'ALT is mildly elevated, a sign the liver is a bit overworked. Common causes: fatty liver, alcohol, late nights, some medicines. Skip alcohol, sleep regularly, recheck in 1–3 months.' },
    ast: { high: 'AST is high. It is read together with ALT; alcohol and hard exercise can both raise it. Rest, skip alcohol, then recheck.' },
    ggt: { high: 'GGT is high. It is most closely tied to alcohol, and can also hint at bile duct issues or fatty liver. Stop drinking, then recheck.' },
    sbp: {
      'borderline-high': 'Systolic pressure is on the high side of normal — not hypertension, but a signal. Less salt, weight control and regular exercise all help.',
      high: 'Systolic pressure is high. Measure on several different days and bring the log to a doctor.',
    },
    dbp: {
      'borderline-high': 'Diastolic pressure is on the high side of normal. Same playbook as systolic: less salt, more exercise, better sleep.',
      high: 'Diastolic pressure is high. Measure on several different days and bring the log to a doctor.',
    },
    crea: { high: 'Creatinine is high. It can reflect kidney function, but also muscle mass or dehydration. Don\'t self-diagnose — take the report to a doctor.' },
    egfr: { low: 'eGFR is low. It is the key kidney function number — see a nephrologist with your report.' },
    tsh: {
      high: 'TSH is high, which may mean an underactive thyroid. Read it together with free T3 and T4.',
      low: 'TSH is low, which may mean an overactive thyroid. Read it together with free T3 and T4.',
    },
    hb: { low: 'Hemoglobin is low, which may mean anemia. Iron deficiency is the most common cause — recheck and ask a doctor why.' },
    wbc: {
      high: 'White blood cells are high — common with a cold or inflammation. If you feel fine, recheck in a few weeks.',
      low: 'White blood cells are low. A single low reading means little; recheck your blood count.',
    },
    bmi: { high: 'BMI is above the normal range. Waist size often says more than weight; losing 5% improves lipids, glucose and blood pressure together.' },
  },
};

function formatRange(range) {
  if (!range) return '—';
  if (range.low != null && range.high != null) return `${range.low}–${range.high}`;
  if (range.high != null) return `< ${range.high}`;
  if (range.low != null) return `> ${range.low}`;
  return '—';
}

function displayName(item, lang) {
  return lang === 'en' ? (item.en || item.name) : item.name;
}

function explainItem(item, lang = 'zh') {
  const table = EXPLANATIONS[lang] || EXPLANATIONS.zh;
  const byId = table[item.id];
  if (byId && byId[item.status]) return byId[item.status];
  const n = displayName(item, lang);
  const v = `${item.value} ${item.unit}`;
  const r = formatRange(item.range);
  if (lang === 'en') {
    if (item.status === 'high') return `${n} is high (${v}, reference ${r}). Recheck and talk to a doctor.`;
    if (item.status === 'low') return `${n} is low (${v}, reference ${r}). Recheck and talk to a doctor.`;
    if (item.status === 'borderline-high') return `${n} is on the high side of normal (${v}). Not abnormal yet, but worth watching.`;
    if (item.status === 'borderline-low') return `${n} is on the low side of normal (${v}). Not abnormal yet, but worth watching.`;
    if (item.status === 'unknown') return `${n} is ${v}. No reference range to compare against — go by your report.`;
    return `${n} is normal (${v}).`;
  }
  if (item.status === 'high') return `${n}偏高（${v}，参考范围 ${r}），建议复查并找医生聊聊。`;
  if (item.status === 'low') return `${n}偏低（${v}，参考范围 ${r}），建议复查并找医生聊聊。`;
  if (item.status === 'borderline-high') return `${n}在正常范围里偏高（${v}），还没到异常，但值得留意。`;
  if (item.status === 'borderline-low') return `${n}在正常范围里偏低（${v}），还没到异常，但值得留意。`;
  if (item.status === 'unknown') return `${n}是 ${v}，这次没有可对照的参考范围，以报告单上的区间为准。`;
  return `${n}在正常范围（${v}）。`;
}

function scoreItems(items) {
  let score = 100;
  const bp = items.filter((i) => i.id === 'sbp' || i.id === 'dbp');
  const worstBp = bp.some((i) => i.status === 'high' || i.status === 'low')
    ? 'high'
    : bp.some((i) => i.status === 'borderline-high' || i.status === 'borderline-low')
      ? 'borderline'
      : 'normal';
  for (const item of items) {
    if (item.id === 'sbp' || item.id === 'dbp') continue;
    if (item.status === 'high' || item.status === 'low') score -= 7;
    else if (item.status === 'borderline-high' || item.status === 'borderline-low') score -= 2;
  }
  if (worstBp === 'high') score -= 7;
  else if (worstBp === 'borderline') score -= 2;
  return Math.max(0, score);
}

const LEVELS = {
  zh: ['挺好', '总体不错', '有几项要注意', '建议尽快找医生聊聊'],
  en: ['Looking good', 'Mostly good', 'A few things to watch', 'Talk to a doctor soon'],
};

function levelForScore(score, lang = 'zh') {
  const L = LEVELS[lang] || LEVELS.zh;
  if (score >= 90) return { level: L[0], color: 'green' };
  if (score >= 75) return { level: L[1], color: 'green' };
  if (score >= 60) return { level: L[2], color: 'yellow' };
  return { level: L[3], color: 'red' };
}

const isAbnormal = (i) => i.status === 'high' || i.status === 'low';
const isBorderline = (i) => i.status === 'borderline-high' || i.status === 'borderline-low';

function buildSummary(abnormal, borderline, profile, lang) {
  if (lang === 'en') {
    const sex = profile && profile.sex === 'male' ? 'male' : profile && profile.sex === 'female' ? 'female' : '';
    const who = profile && profile.age ? `${profile.age}-year-old${sex ? ' ' + sex : ''}. ` : '';
    if (!abnormal.length && !borderline.length) return `${who}Everything checked is within range. Keep it up.`;
    if (!abnormal.length) return `${who}Nothing out of range, but ${borderline.length} result${borderline.length > 1 ? 's sit' : ' sits'} near the edge. Start with lifestyle and watch the trend next time.`;
    const names = abnormal.map((i) => i.en || i.name).join(', ');
    return `${who}${abnormal.length} result${abnormal.length > 1 ? 's' : ''} out of range (${names})${borderline.length ? `, plus ${borderline.length} near the edge` : ''}. Don\'t panic — most of these track diet, exercise, sleep and alcohol. Recheck the trend and bring the report to a doctor.`;
  }
  const sex = profile && profile.sex === 'male' ? '男' : profile && profile.sex === 'female' ? '女' : '';
  const who = profile && profile.age ? `${profile.age} 岁${sex ? sex + '性' : ''}，` : '';
  if (!abnormal.length && !borderline.length) return `${who}这次查的指标都在正常范围，继续保持就好。`;
  if (!abnormal.length) return `${who}没有超出范围的指标，但有 ${borderline.length} 项在正常范围里偏高，值得留意，先从生活方式上调整，下次复查看趋势。`;
  const names = abnormal.map((i) => i.name).join('、');
  return `${who}有 ${abnormal.length} 项超出参考范围（${names}），${borderline.length ? `另有 ${borderline.length} 项在正常范围里偏高。` : ''}先别紧张，多数和饮食、运动、睡眠、饮酒有关，重点是复查确认趋势，并带报告找医生聊聊。`;
}

function buildBriefing(items, profile, lang = 'zh') {
  const score = scoreItems(items);
  const { level, color } = levelForScore(score, lang);
  const abnormal = items.filter(isAbnormal);
  const borderline = items.filter(isBorderline);
  const normal = items.filter((i) => i.status === 'normal');

  return {
    score,
    level,
    color,
    summary: buildSummary(abnormal, borderline, profile, lang),
    counts: { total: items.length, abnormal: abnormal.length, borderline: borderline.length, normal: normal.length },
    items: items.map((item) => ({ ...item, explanation: explainItem(item, lang) })),
    highlights: abnormal.map((i) => displayName(i, lang)),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildBriefing, explainItem, scoreItems, levelForScore, formatRange, displayName };
}
if (typeof globalThis !== 'undefined') {
  Object.assign(globalThis, { buildBriefing, explainItem, formatRange, displayName });
}
