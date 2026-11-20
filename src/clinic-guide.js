// checkup-brief — src/clinic-guide.js
// 纯函数：挂号 + 问诊清单生成器。
//   buildClinicGuide(items) -> [{ department, reason, bring, questions }]
// 每个异常指标对应一个科室、要带的资料、见医生时要问的问题。
// 只给“去哪、带什么、问什么”的行动清单，不给诊断、不开药。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

const GUIDES = {
  tc: {
    department: '心内科 / 全科',
    reason: '总胆固醇偏高，评估心血管风险',
    bring: ['本次体检报告', '既往血脂结果（如有）', '正在吃的药、保健品清单'],
    questions: ['我的血脂需要吃药吗，还是先调整生活方式？', '多久复查一次血脂？', '低密度脂蛋白的目标值应该是多少？'],
  },
  tg: {
    department: '心内科 / 内分泌科',
    reason: '甘油三酯偏高，和饮食、代谢关系密切',
    bring: ['本次体检报告', '最近一周的饮食记录（简单记就行）', '饮酒情况'],
    questions: ['甘油三酯这么高，需要吃药吗？', '饮食上最需要改的是哪一点？', '多久复查能看到变化？'],
  },
  ldl: {
    department: '心内科',
    reason: '低密度脂蛋白偏高，评估心血管风险',
    bring: ['本次体检报告', '血压、血糖结果', '家族心血管病史'],
    questions: ['我的低密度脂蛋白目标值是多少？', '需要用药吗？', '复查周期是多久？'],
  },
  ua: {
    department: '风湿免疫科 / 肾内科',
    reason: '尿酸偏高，评估痛风和肾脏风险',
    bring: ['本次体检报告', '有没有关节疼、肿的记录', '肾功能结果'],
    questions: ['尿酸 452 需要吃药吗，还是先调整饮食？', '平时饮食上最需要忌什么？', '多久复查一次尿酸和肾功能？'],
  },
  alt: {
    department: '消化内科 / 肝病科',
    reason: '谷丙转氨酶轻度升高，排查肝脏原因',
    bring: ['本次体检报告', '肝脏超声结果（如有）', '饮酒史、正在吃的药'],
    questions: ['转氨酶升高最可能的原因是什么？', '需要做肝脏超声吗？', '多久复查一次肝功能？'],
  },
  fpg: {
    department: '内分泌科',
    reason: '空腹血糖正常偏高，评估血糖趋势',
    bring: ['本次体检报告', '糖化血红蛋白结果（如有）', '家族糖尿病史'],
    questions: ['我现在算糖尿病前期吗？', '需要做糖耐量试验吗？', '饮食和运动上怎么调整？'],
  },
  sbp: {
    department: '心内科 / 全科',
    reason: '血压正常偏高，评估是否需要干预',
    bring: ['本次体检报告', '不同天测的血压记录（至少 3 天）', '正在吃的药'],
    questions: ['我的血压需要吃药吗？', '在家测血压的正确方法是什么？', '多久复查一次？'],
  },
  dbp: {
    department: '心内科 / 全科',
    reason: '舒张压正常偏高，评估是否需要干预',
    bring: ['本次体检报告', '不同天测的血压记录（至少 3 天）', '正在吃的药'],
    questions: ['我的血压需要吃药吗？', '在家测血压的正确方法是什么？', '多久复查一次？'],
  },
  crea: {
    department: '肾内科',
    reason: '肌酐偏高，评估肾功能',
    bring: ['本次体检报告', '尿常规结果', '既往肾功能结果'],
    questions: ['肌酐升高是肾的问题，还是肌肉、脱水的影响？', '需要进一步检查吗？', '平时饮食上要注意什么？'],
  },
  tsh: {
    department: '内分泌科',
    reason: '促甲状腺激素异常，评估甲状腺功能',
    bring: ['本次体检报告', '游离 T3、T4 结果', '甲状腺超声结果（如有）'],
    questions: ['我的甲状腺功能现在是什么情况？', '需要吃药吗？', '多久复查一次甲功？'],
  },
};

function buildClinicGuide(items) {
  const abnormal = items.filter((i) => i.status === 'high' || i.status === 'low' || i.status === 'borderline-high');
  const seen = new Set();
  const guides = [];
  for (const item of abnormal) {
    const guide = GUIDES[item.id];
    if (!guide || seen.has(guide.department + item.id)) continue;
    seen.add(guide.department + item.id);
    guides.push({
      indicator: item.name,
      value: `${item.value} ${item.unit}`,
      status: item.status,
      department: guide.department,
      reason: guide.reason,
      bring: [...guide.bring],
      questions: [...guide.questions],
    });
  }
  return guides;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildClinicGuide, GUIDES };
}
