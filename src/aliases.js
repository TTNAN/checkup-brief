// checkup-brief — src/aliases.js
// 中文体检指标别名归一表。
// 同一个指标在不同医院、不同报告上有几十种写法：
//   谷丙转氨酶 = ALT = 谷丙转氨酶(ALT)
//   总胆固醇 = TC = 总胆固醇(TC)
// 解析器先用这张表把所有写法归一到同一个 id，再查参考范围。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

// 每个条目：标准 id，以及它在报告里可能出现的所有写法。
// 写法按长度降序排列，解析时优先匹配最长的，避免“胆固醇”抢走“总胆固醇”。
const ALIASES = [
  { id: 'alt', names: ['谷丙转氨酶', '丙氨酸氨基转移酶', 'ALT', '谷丙转氨酶(ALT)', '丙氨酸转氨酶'] },
  { id: 'ast', names: ['谷草转氨酶', '天门冬氨酸氨基转移酶', 'AST', '谷草转氨酶(AST)', '天冬氨酸转氨酶'] },
  { id: 'tc', names: ['总胆固醇', '胆固醇', 'TC', '总胆固醇(TC)', '血清总胆固醇'] },
  { id: 'tg', names: ['甘油三酯', '甘油三脂', 'TG', '甘油三酯(TG)', '三酰甘油'] },
  { id: 'ldl', names: ['低密度脂蛋白胆固醇', '低密度脂蛋白', 'LDL-C', 'LDL', '低密度脂蛋白胆固醇(LDL-C)'] },
  { id: 'hdl', names: ['高密度脂蛋白胆固醇', '高密度脂蛋白', 'HDL-C', 'HDL', '高密度脂蛋白胆固醇(HDL-C)'] },
  { id: 'ua', names: ['尿酸', '血尿酸', 'UA', '尿酸(UA)', '血清尿酸'] },
  { id: 'fpg', names: ['空腹血糖', '血糖', '空腹血葡萄糖', 'FPG', '空腹血糖(FPG)', '葡萄糖'] },
  { id: 'hba1c', names: ['糖化血红蛋白', 'HbA1c', '糖化血红蛋白(HbA1c)'] },
  { id: 'crea', names: ['肌酐', '血肌酐', 'CREA', 'Cr', '肌酐(CREA)', '血清肌酐'] },
  { id: 'bun', names: ['尿素氮', '血尿素氮', 'BUN', '尿素氮(BUN)', '尿素'] },
  { id: 'egfr', names: ['肾小球滤过率', 'eGFR', '估算肾小球滤过率', '肾小球滤过率(eGFR)'] },
  { id: 'wbc', names: ['白细胞计数', '白细胞', 'WBC', '白细胞计数(WBC)'] },
  { id: 'rbc', names: ['红细胞计数', '红细胞', 'RBC', '红细胞计数(RBC)'] },
  { id: 'hb', names: ['血红蛋白', '血色素', 'HGB', 'Hb', '血红蛋白(HGB)'] },
  { id: 'plt', names: ['血小板计数', '血小板', 'PLT', '血小板计数(PLT)'] },
  { id: 'hct', names: ['红细胞压积', 'HCT', '红细胞压积(HCT)'] },
  { id: 'ggt', names: ['谷氨酰转肽酶', 'GGT', 'γ-谷氨酰转肽酶', '谷氨酰转肽酶(GGT)'] },
  { id: 'alp', names: ['碱性磷酸酶', 'ALP', '碱性磷酸酶(ALP)'] },
  { id: 'tbil', names: ['总胆红素', 'TBIL', '总胆红素(TBIL)'] },
  { id: 'dbil', names: ['直接胆红素', 'DBIL', '直接胆红素(DBIL)'] },
  { id: 'alb', names: ['白蛋白', 'ALB', '白蛋白(ALB)'] },
  { id: 'tp', names: ['总蛋白', 'TP', '总蛋白(TP)'] },
  { id: 'tsh', names: ['促甲状腺激素', 'TSH', '促甲状腺激素(TSH)'] },
  { id: 'ft3', names: ['游离三碘甲状腺原氨酸', '游离T3', 'FT3', '游离三碘甲状腺原氨酸(FT3)'] },
  { id: 'ft4', names: ['游离甲状腺素', '游离T4', 'FT4', '游离甲状腺素(FT4)'] },
  { id: 'sbp', names: ['收缩压', '高压', '收缩压(SBP)'] },
  { id: 'dbp', names: ['舒张压', '低压', '舒张压(DBP)'] },
  { id: 'bmi', names: ['体重指数', 'BMI', '体重指数(BMI)', '身体质量指数'] },
  { id: 'crp', names: ['C反应蛋白', '超敏C反应蛋白', 'hs-CRP', 'CRP'] },
];

// 展开成“写法 -> id”的查表，匹配时按写法长度降序。
const NAME_TO_ID = new Map();
for (const entry of ALIASES) {
  for (const name of entry.names) {
    if (!NAME_TO_ID.has(name)) NAME_TO_ID.set(name, entry.id);
  }
}
const SORTED_NAMES = [...NAME_TO_ID.keys()].sort((a, b) => b.length - a.length);

function resolveAlias(name) {
  if (!name) return null;
  const clean = String(name).trim();
  return NAME_TO_ID.get(clean) || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ALIASES, NAME_TO_ID, SORTED_NAMES, resolveAlias };
}

// 浏览器直接引入时，把别名表挂到全局，供 parser.js 读取。
if (typeof globalThis !== 'undefined') {
  globalThis.ALIASES = ALIASES;
  globalThis.NAME_TO_ID = NAME_TO_ID;
  globalThis.SORTED_NAMES = SORTED_NAMES;
  globalThis.resolveAlias = resolveAlias;
}
