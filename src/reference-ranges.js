// checkup-brief — src/reference-ranges.js
// 成人常见体检指标参考范围（中国成人常规区间，仅作科普判定用）。
// 重要：每家医院、每种试剂的参考范围都可能不同。
// 一切以你报告单上印的参考范围和医生解释为准。
// 本文件只做健康科普，不做诊断，不能替代医生。
//
// 数据结构：
//   { id, name, unit, low, high, note }
//   low / high 为 null 表示该侧没有明确界限（例如总胆固醇只有上限）。
//   判定规则见 src/parser.js：低于 low 为偏低，高于 high 为偏高，
//   在区间内但接近边界为“正常偏高 / 正常偏低”。

'use strict';

const REFERENCE_RANGES = [
  // —— 血常规 ——
  { id: 'wbc', name: '白细胞计数', unit: '10^9/L', low: 3.5, high: 9.5, note: '感染、炎症时常升高' },
  { id: 'rbc', name: '红细胞计数', unit: '10^12/L', low: 4.3, high: 5.8, note: '男性区间；女性为 3.8–5.1' },
  { id: 'hb', name: '血红蛋白', unit: 'g/L', low: 130, high: 175, note: '男性区间；女性为 115–150' },
  { id: 'plt', name: '血小板计数', unit: '10^9/L', low: 125, high: 350, note: '' },
  { id: 'hct', name: '红细胞压积', unit: '%', low: 40, high: 50, note: '男性区间' },

  // —— 血糖 ——
  { id: 'fpg', name: '空腹血糖', unit: 'mmol/L', low: 3.9, high: 6.1, note: '6.1–7.0 为空腹血糖受损区间，需复查' },
  { id: 'hba1c', name: '糖化血红蛋白', unit: '%', low: 4.0, high: 6.0, note: '反映近 2–3 个月平均血糖' },

  // —— 血脂 ——
  { id: 'tc', name: '总胆固醇', unit: 'mmol/L', low: null, high: 5.2, note: '5.2–6.2 为边缘升高，≥6.2 为升高' },
  { id: 'tg', name: '甘油三酯', unit: 'mmol/L', low: null, high: 1.7, note: '1.7–2.3 为边缘升高，≥2.3 为升高' },
  { id: 'ldl', name: '低密度脂蛋白胆固醇', unit: 'mmol/L', low: null, high: 3.4, note: '心血管高危人群目标值更低，以医生意见为准' },
  { id: 'hdl', name: '高密度脂蛋白胆固醇', unit: 'mmol/L', low: 1.0, high: null, note: '男性 ≥1.0，女性 ≥1.3 为宜；偏低是风险因素' },

  // —— 肝功能 ——
  { id: 'alt', name: '谷丙转氨酶', unit: 'U/L', low: 9, high: 50, note: '轻度升高常见于脂肪肝、饮酒、熬夜、药物影响' },
  { id: 'ast', name: '谷草转氨酶', unit: 'U/L', low: 15, high: 40, note: '' },
  { id: 'ggt', name: '谷氨酰转肽酶', unit: 'U/L', low: 10, high: 60, note: '男性区间；饮酒后常升高' },
  { id: 'alp', name: '碱性磷酸酶', unit: 'U/L', low: 45, high: 125, note: '' },
  { id: 'tbil', name: '总胆红素', unit: 'umol/L', low: 0, high: 23, note: '' },
  { id: 'dbil', name: '直接胆红素', unit: 'umol/L', low: 0, high: 8, note: '' },
  { id: 'alb', name: '白蛋白', unit: 'g/L', low: 40, high: 55, note: '' },
  { id: 'tp', name: '总蛋白', unit: 'g/L', low: 65, high: 85, note: '' },

  // —— 肾功能 ——
  { id: 'crea', name: '肌酐', unit: 'umol/L', low: 57, high: 97, note: '男性区间；女性为 41–73；受肌肉量影响' },
  { id: 'bun', name: '尿素氮', unit: 'mmol/L', low: 3.1, high: 8.0, note: '高蛋白饮食、脱水时可升高' },
  { id: 'ua', name: '尿酸', unit: 'umol/L', low: 208, high: 428, note: '男性区间；女性为 155–357；≥420 需关注' },
  { id: 'egfr', name: '肾小球滤过率', unit: 'ml/min/1.73m²', low: 90, high: null, note: '<60 提示肾功能下降，需就医评估' },

  // —— 甲状腺 ——
  { id: 'tsh', name: '促甲状腺激素', unit: 'mIU/L', low: 0.27, high: 4.2, note: '' },
  { id: 'ft3', name: '游离三碘甲状腺原氨酸', unit: 'pmol/L', low: 3.1, high: 6.8, note: '' },
  { id: 'ft4', name: '游离甲状腺素', unit: 'pmol/L', low: 12, high: 22, note: '' },

  // —— 血压 / 体格 ——
  { id: 'sbp', name: '收缩压', unit: 'mmHg', low: 90, high: 140, note: '120–139 为正常高值；≥140 需就医评估' },
  { id: 'dbp', name: '舒张压', unit: 'mmHg', low: 60, high: 90, note: '80–89 为正常高值；≥90 需就医评估' },
  { id: 'bmi', name: '体重指数', unit: 'kg/m²', low: 18.5, high: 24, note: '24–28 为超重，≥28 为肥胖（中国标准）' },
];

// 按 id 快速查表。
const RANGES_BY_ID = Object.fromEntries(
  REFERENCE_RANGES.map((r) => [r.id, r]),
);

function getRange(id) {
  return RANGES_BY_ID[id] || null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { REFERENCE_RANGES, RANGES_BY_ID, getRange };
}

// 浏览器直接引入时，把数据挂到全局，供 parser.js 读取。
if (typeof globalThis !== 'undefined') {
  globalThis.REFERENCE_RANGES = REFERENCE_RANGES;
  globalThis.RANGES_BY_ID = RANGES_BY_ID;
  globalThis.getRange = getRange;
}
