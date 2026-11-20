// checkup-brief — src/briefing.js
// 纯函数：把解析后的指标数组变成“一页纸人话简报”。
//   buildBriefing(items, profile) -> { score, level, summary, items, highlights }
//   explainItem(item) -> 一句人话讲解
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
  tc: {
    high: '总胆固醇偏高。吃进去的油脂和身体自己合成的胆固醇都可能让它升高，长期偏高会增加血管负担。先看饮食和运动，复查时再看变化。',
    normal: '总胆固醇在正常范围。',
  },
  tg: {
    high: '甘油三酯偏高，和吃得油、喝酒、甜食多、运动少关系最直接。这一项对生活方式最敏感，也是最容易通过调整降下来的。',
    normal: '甘油三酯在正常范围。',
  },
  ua: {
    high: '尿酸偏高。海鲜、红肉、动物内脏、啤酒、含糖饮料吃得多时容易升高。长期偏高要注意痛风和肾脏负担，多喝水、少喝酒。',
    normal: '尿酸在正常范围。',
  },
  fpg: {
    'borderline-high': '空腹血糖在正常范围里偏高，还没到异常，但值得留意。少吃精制主食、多动、控制体重，是现在就能做的事。',
    high: '空腹血糖偏高，需要复查确认。建议空腹再测一次，并和医生聊聊要不要查糖化血红蛋白。',
    normal: '空腹血糖在正常范围。',
  },
  alt: {
    high: '谷丙转氨酶轻度升高，提示肝细胞有点“累”。常见原因有脂肪肝、饮酒、熬夜、某些药物。先戒酒、规律作息，1–3 个月后复查。',
    normal: '谷丙转氨酶在正常范围。',
  },
  sbp: {
    'borderline-high': '收缩压在正常范围里偏高，还没到高血压，但已经是提醒信号。少盐、减重、规律运动都有帮助。',
    high: '收缩压偏高，建议不同天多测几次，带上记录去找医生评估。',
    normal: '收缩压在正常范围。',
  },
  dbp: {
    'borderline-high': '舒张压在正常范围里偏高，和收缩压一样，先从少盐、运动、睡眠上调整。',
    high: '舒张压偏高，建议不同天多测几次，带上记录去找医生评估。',
    normal: '舒张压在正常范围。',
  },
  ldl: {
    high: '低密度脂蛋白偏高，常被叫作“坏胆固醇”。它和血管健康关系最直接，饮食调整后复查看趋势。',
    normal: '低密度脂蛋白在正常范围。',
  },
  hdl: {
    low: '高密度脂蛋白偏低，常被叫作“好胆固醇”。运动是最有效的提升办法。',
    normal: '高密度脂蛋白在正常范围。',
  },
  crea: {
    high: '肌酐偏高，可能和肾功能有关，也可能和肌肉量、脱水有关。先别自己下结论，带报告找医生看。',
    normal: '肌酐在正常范围。',
  },
  tsh: {
    high: '促甲状腺激素偏高，提示甲状腺功能可能偏低，需要结合游离 T3、T4 一起看。',
    low: '促甲状腺激素偏低，提示甲状腺功能可能偏高，需要结合游离 T3、T4 一起看。',
    normal: '促甲状腺激素在正常范围。',
  },
};

function explainItem(item) {
  const byId = EXPLANATIONS[item.id];
  if (byId && byId[item.status]) return byId[item.status];
  if (item.status === 'high') return `${item.name}偏高（${item.value} ${item.unit}，参考范围 ${formatRange(item.range)}），建议复查并找医生聊聊。`;
  if (item.status === 'low') return `${item.name}偏低（${item.value} ${item.unit}，参考范围 ${formatRange(item.range)}），建议复查并找医生聊聊。`;
  if (item.status === 'borderline-high') return `${item.name}在正常范围里偏高（${item.value} ${item.unit}），还没到异常，但值得留意。`;
  if (item.status === 'borderline-low') return `${item.name}在正常范围里偏低（${item.value} ${item.unit}），还没到异常，但值得留意。`;
  if (item.status === 'unknown') return `${item.name}是 ${item.value} ${item.unit}，这次没有可对照的参考范围，建议以报告单上的区间为准。`;
  return `${item.name}在正常范围（${item.value} ${item.unit}）。`;
}

function formatRange(range) {
  if (!range) return '—';
  if (range.low != null && range.high != null) return `${range.low}–${range.high}`;
  if (range.high != null) return `< ${range.high}`;
  if (range.low != null) return `> ${range.low}`;
  return '—';
}

function scoreItems(items) {
  let score = 100;
  // 血压只计一次：收缩压和舒张压取较差的状态。
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

function levelForScore(score) {
  if (score >= 90) return { level: '挺好', color: 'green' };
  if (score >= 75) return { level: '总体不错', color: 'green' };
  if (score >= 60) return { level: '有几项要注意', color: 'yellow' };
  return { level: '建议尽快找医生聊聊', color: 'red' };
}

function buildBriefing(items, profile) {
  const score = scoreItems(items);
  const { level, color } = levelForScore(score);
  const abnormal = items.filter((i) => i.status === 'high' || i.status === 'low');
  const borderline = items.filter((i) => i.status === 'borderline-high' || i.status === 'borderline-low');
  const normal = items.filter((i) => i.status === 'normal');

  const who = profile ? `${profile.age} 岁${profile.sex === 'male' ? '男' : profile.sex === 'female' ? '女' : ''}性` : '';
  let summary;
  if (abnormal.length === 0 && borderline.length === 0) {
    summary = `${who ? who + '，' : ''}这次查的指标都在正常范围，继续保持就好。`;
  } else if (abnormal.length === 0) {
    summary = `${who ? who + '，' : ''}没有超出范围的指标，但有 ${borderline.length} 项在正常范围里偏高，值得留意，先从生活方式上调整，下次复查看趋势。`;
  } else {
    const names = abnormal.map((i) => i.name).join('、');
    summary = `${who ? who + '，' : ''}有 ${abnormal.length} 项超出参考范围（${names}），${borderline.length ? `另有 ${borderline.length} 项在正常范围里偏高。` : ''}先别紧张，多数和饮食、运动、睡眠、饮酒有关，重点是复查确认趋势，并带报告找医生聊聊。`;
  }

  return {
    score,
    level,
    color,
    summary,
    counts: { total: items.length, abnormal: abnormal.length, borderline: borderline.length, normal: normal.length },
    items: items.map((item) => ({
      ...item,
      explanation: explainItem(item),
    })),
    highlights: abnormal.map((i) => i.name),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildBriefing, explainItem, scoreItems, levelForScore, formatRange };
}
