// checkup-brief — src/clinic-guide.js
// 纯函数：挂号 + 问诊清单生成器。
//   buildClinicGuide(items, lang) -> [{ indicator, value, status, department, reason, bring, questions }]
//   同一科室的问题会合并（例如收缩压、舒张压只出一张血压卡）。
// 每个异常指标对应一个科室、要带的资料、见医生时要问的问题。
// 只给“去哪、带什么、问什么”的行动清单，不给诊断、不开药。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

const GUIDES_ZH = {
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
    questions: ['我的尿酸需要吃药吗，还是先调整饮食？', '平时饮食上最需要忌什么？', '多久复查一次尿酸和肾功能？'],
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
  crea: {
    department: '肾内科',
    reason: '肌酐偏高，评估肾功能',
    bring: ['本次体检报告', '尿常规结果', '既往肾功能结果'],
    questions: ['肌酐升高是肾的问题，还是肌肉、脱水的影响？', '需要进一步检查吗？', '平时饮食上要注意什么？'],
  },
  hb: {
    department: '血液科 / 全科',
    reason: '血红蛋白偏低，查找贫血原因',
    bring: ['本次体检报告', '既往血常规结果', '月经情况（女性）、饮食习惯'],
    questions: ['我是缺铁性贫血吗？', '需要查铁蛋白吗？', '饮食上怎么补？'],
  },
  egfr: {
    department: '肾内科',
    reason: '肾小球滤过率偏低，评估肾功能',
    bring: ['本次体检报告', '尿常规结果', '血压记录'],
    questions: ['我的肾功能处在什么阶段？', '需要做哪些进一步检查？', '有哪些药物要避免？'],
  },
  bmi: {
    department: '营养科 / 内分泌科',
    reason: '体重指数超标，制定减重方案',
    bring: ['本次体检报告', '一周饮食记录', '腰围数据'],
    questions: ['我适合减多少、多快？', '饮食上最该先改什么？', '需要查代谢相关指标吗？'],
  },
  tsh: {
    department: '内分泌科',
    reason: '促甲状腺激素异常，评估甲状腺功能',
    bring: ['本次体检报告', '游离 T3、T4 结果', '甲状腺超声结果（如有）'],
    questions: ['我的甲状腺功能现在是什么情况？', '需要吃药吗？', '多久复查一次甲功？'],
  },
};

const GUIDES_EN = {
  tc: { department: 'Cardiology / GP', reason: 'High total cholesterol — assess cardiovascular risk', bring: ['This checkup report', 'Past lipid results (if any)', 'List of medicines and supplements'], questions: ['Do I need medication, or should I start with lifestyle?', 'How often should I recheck lipids?', 'What should my LDL target be?'] },
  tg: { department: 'Cardiology / Endocrinology', reason: 'High triglycerides — closely tied to diet and metabolism', bring: ['This checkup report', 'A rough food log from the past week', 'How much you drink'], questions: ['Are triglycerides this high worth medication?', 'What is the single biggest diet change?', 'How soon will a recheck show change?'] },
  ldl: { department: 'Cardiology', reason: 'High LDL — assess cardiovascular risk', bring: ['This checkup report', 'Blood pressure and glucose results', 'Family heart history'], questions: ['What is my LDL target?', 'Do I need medication?', 'When should I recheck?'] },
  ua: { department: 'Rheumatology / Nephrology', reason: 'High uric acid — assess gout and kidney risk', bring: ['This checkup report', 'Any joint pain or swelling notes', 'Kidney function results'], questions: ['Does my uric acid need medication, or diet first?', 'Which foods should I avoid most?', 'How often should I recheck uric acid and kidneys?'] },
  alt: { department: 'Gastroenterology / Hepatology', reason: 'Raised liver enzymes — find the cause', bring: ['This checkup report', 'Liver ultrasound (if any)', 'Alcohol use and current medicines'], questions: ['What is the most likely cause?', 'Do I need a liver ultrasound?', 'When should I recheck liver function?'] },
  fpg: { department: 'Endocrinology', reason: 'Fasting glucose on the high side — assess the trend', bring: ['This checkup report', 'HbA1c (if any)', 'Family history of diabetes'], questions: ['Am I prediabetic?', 'Do I need a glucose tolerance test?', 'How should I adjust diet and exercise?'] },
  sbp: { department: 'Cardiology / GP', reason: 'Blood pressure on the high side — decide whether to act', bring: ['This checkup report', 'Home BP readings from at least 3 days', 'Current medicines'], questions: ['Do I need medication?', 'How do I measure BP correctly at home?', 'When should I recheck?'] },
  crea: { department: 'Nephrology', reason: 'High creatinine — assess kidney function', bring: ['This checkup report', 'Urine test results', 'Past kidney results'], questions: ['Is this the kidneys, or muscle mass / dehydration?', 'Do I need more tests?', 'What should I watch in my diet?'] },
  hb: { department: 'Hematology / GP', reason: 'Low hemoglobin — find the cause of anemia', bring: ['This checkup report', 'Past blood counts', 'Diet habits (and periods, for women)'], questions: ['Is this iron-deficiency anemia?', 'Should I check ferritin?', 'How do I eat for it?'] },
  egfr: { department: 'Nephrology', reason: 'Low eGFR — assess kidney function', bring: ['This checkup report', 'Urine test results', 'Blood pressure log'], questions: ['What stage is my kidney function?', 'What further tests do I need?', 'Which medicines should I avoid?'] },
  bmi: { department: 'Nutrition / Endocrinology', reason: 'BMI above range — build a weight plan', bring: ['This checkup report', 'A week of food log', 'Waist measurement'], questions: ['How much and how fast should I lose?', 'What should I change first?', 'Should I check metabolic markers?'] },
  tsh: { department: 'Endocrinology', reason: 'Abnormal TSH — assess thyroid function', bring: ['This checkup report', 'Free T3 / T4 results', 'Thyroid ultrasound (if any)'], questions: ['What is my thyroid doing right now?', 'Do I need medication?', 'When should I recheck?'] },
};

// 同一个问题只出一张卡：舒张压并入血压卡，谷草 / 谷氨酰转肽酶并入肝功能卡。
const MERGE = { dbp: 'sbp', ast: 'alt', ggt: 'alt', hba1c: 'fpg' };

function buildClinicGuide(items, lang = 'zh') {
  const table = lang === 'en' ? GUIDES_EN : GUIDES_ZH;
  const flagged = items.filter((i) => ['high', 'low', 'borderline-high'].includes(i.status));
  const cards = new Map();
  for (const item of flagged) {
    const key = MERGE[item.id] || item.id;
    const guide = table[key];
    if (!guide) continue;
    const name = lang === 'en' ? (item.en || item.name) : item.name;
    const value = `${item.value} ${item.unit}`;
    if (cards.has(key)) {
      const c = cards.get(key);
      if (key !== 'sbp') c.indicator += ` / ${name}`;
      c.value += ` / ${value}`;
      continue;
    }
    cards.set(key, {
      id: key,
      indicator: key === 'sbp' ? (lang === 'en' ? 'Blood pressure' : '血压') : name,
      value,
      status: item.status,
      department: guide.department,
      reason: guide.reason,
      bring: [...guide.bring],
      questions: [...guide.questions],
    });
  }
  // 血压卡的数值合并成 132/84 mmHg 的样子。
  const bp = cards.get('sbp');
  if (bp) bp.value = bp.value.replace(/ mmHg \/ (\d+) mmHg/, '/$1 mmHg');
  // 超出范围的排前面，正常偏高的排后面。
  const rank = (s) => (s === 'high' || s === 'low' ? 0 : 1);
  return [...cards.values()].sort((a, b) => rank(a.status) - rank(b.status));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildClinicGuide, GUIDES: GUIDES_ZH, GUIDES_EN };
}
if (typeof globalThis !== 'undefined') {
  globalThis.buildClinicGuide = buildClinicGuide;
}
