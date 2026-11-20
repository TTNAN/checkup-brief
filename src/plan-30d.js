// checkup-brief — src/plan-30d.js
// 纯函数：30 天改善计划生成器。
//   buildPlan30d(items, profile, lang) -> { focus, headline, daily, extras, weeks, checklist, note }
// 原则：只给吃、动、睡这些生活方式上的可执行动作，
//   不给药、不给具体剂量、不承诺“30 天降到正常”。
//   每天只做 3 件小事（每周的 tasks 就是这 3 件），每周一个主题，逐步加量。
// 打卡数据结构 checklist 由调用方保存；演示页只存在浏览器 localStorage，不上传。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

const TEXT = {
  zh: {
    focus: { lipids: '血脂', ua: '尿酸', liver: '肝脏', glucose: '血糖', bp: '血压', weight: '体重', general: '整体健康' },
    headline: (f) => `未来 30 天，重点关注：${f.join('、')}。每天只做 3 件小事。`,
    daily: {
      eat: [
        '主食一半换成粗粮（糙米、燕麦、红薯），少吃白米白面。',
        '每天一斤蔬菜、半斤水果，深色蔬菜占一半。',
        '红肉每天不超过一掌心，鱼、豆制品、鸡蛋轮换着吃。',
        '油每天不超过 25 克（一小汤勺半），少吃油炸、外卖。',
        '不喝含糖饮料、奶茶，啤酒能不喝就不喝。',
      ],
      move: [
        '每天快走 30 分钟，心率微微加快、能说话但不能唱歌的程度。',
        '每坐 1 小时起身活动 5 分钟，倒水、走两圈都算。',
        '每周 2 次力量练习：深蹲、俯卧撑、弹力带，各 15 分钟。',
      ],
      sleep: [
        '23:30 前睡觉，保证 7–8 小时。',
        '睡前 1 小时不刷手机，调暗灯光。',
        '早上固定时间起床，周末也别补觉超过 1 小时。',
      ],
    },
    extras: {
      ua: '每天喝水 2000 毫升左右，别等渴了才喝；海鲜、动物内脏、浓肉汤这 30 天先少吃。',
      liver: '这 30 天不喝酒；别熬夜，肝脏恢复最需要的是睡眠。',
      lipids: '外卖备注“少油少盐”，自己做饭时先放菜、后放肉。',
      glucose: '先吃菜、再吃肉、最后吃主食，饭后走 10 分钟。',
      bp: '少盐：酱油、咸菜、腌肉、方便面是盐的大户；有条件在家每周量 2 次血压。',
    },
    weeks: [
      { theme: '先记下来', goal: '不追求完美，先把现状记清楚。', tasks: ['记 3 天饮食（拍照就行）', '每天快走 20 分钟', '23:30 前睡觉，记下实际入睡时间'] },
      { theme: '换掉一顿', goal: '把最油的一顿换成清淡的。', tasks: ['午餐主食换一半粗粮', '快走加到 30 分钟', '含糖饮料换成白开水、淡茶'] },
      { theme: '动起来', goal: '运动变成固定时间。', tasks: ['每周 2 次力量练习，每次 15 分钟', '每坐 1 小时起身 5 分钟', '周末一次 60 分钟户外活动'] },
      { theme: '复盘', goal: '看看哪些做到了，哪些最难。', tasks: ['对比第 1 周和第 4 周的饮食记录', '称一次体重、量一次血压', '把 30 天记录带去复查，和医生一起看趋势'] },
    ],
    note: '这份计划只针对生活方式，不涉及药物。正在吃药请不要自行停药或改量，复查时带上这 30 天的记录给医生看。',
  },
  en: {
    focus: { lipids: 'lipids', ua: 'uric acid', liver: 'liver', glucose: 'blood sugar', bp: 'blood pressure', weight: 'weight', general: 'overall health' },
    headline: (f) => `For the next 30 days, focus on ${f.join(', ')}. Just three small things a day.`,
    daily: {
      eat: [
        'Swap half your rice / noodles for whole grains (brown rice, oats, sweet potato).',
        'About 500 g of vegetables and 250 g of fruit a day, half of the veg dark-coloured.',
        'Red meat no bigger than your palm a day; rotate fish, tofu and eggs.',
        'Under 25 g of cooking oil a day; less fried food and takeout.',
        'No sugary drinks or milk tea; skip the beer if you can.',
      ],
      move: [
        'Brisk walk 30 minutes a day — you can talk, but not sing.',
        'Stand up for 5 minutes every hour you sit.',
        'Strength work twice a week: squats, push-ups, bands, 15 minutes each.',
      ],
      sleep: [
        'In bed before 23:30, 7–8 hours.',
        'No phone for the last hour; dim the lights.',
        'Same wake-up time daily; no more than 1 hour of weekend lie-in.',
      ],
    },
    extras: {
      ua: 'Drink about 2 litres of water a day; go easy on seafood, organ meat and rich broths for 30 days.',
      liver: 'No alcohol for 30 days, and no late nights — sleep is what the liver needs most.',
      lipids: 'Ask for "less oil, less salt" on takeout; cook veg first, meat second.',
      glucose: 'Eat veg first, protein next, carbs last; walk 10 minutes after meals.',
      bp: 'Cut salt: soy sauce, pickles, cured meat and instant noodles are the big ones. Check BP at home twice a week if you can.',
    },
    weeks: [
      { theme: 'Write it down', goal: 'No perfection — just record where you are.', tasks: ['Log 3 days of meals (photos are fine)', 'Brisk walk 20 minutes a day', 'Bed before 23:30, note when you actually fall asleep'] },
      { theme: 'Swap one meal', goal: 'Replace your oiliest meal with a lighter one.', tasks: ['Half whole grains at lunch', 'Walk up to 30 minutes', 'Sugary drinks → water or light tea'] },
      { theme: 'Get moving', goal: 'Make exercise a fixed time.', tasks: ['Strength work twice a week, 15 min', 'Stand up 5 min every hour', 'One 60-minute outdoor activity at the weekend'] },
      { theme: 'Review', goal: 'See what stuck and what was hardest.', tasks: ['Compare week 1 and week 4 food logs', 'Weigh yourself and take your BP once', 'Bring the 30-day log to your recheck'] },
    ],
    note: 'This plan is lifestyle only, no medication. If you take medicine, don\'t stop or change it yourself; bring this 30-day log to your doctor.',
  },
};

function buildPlan30d(items, profile, lang = 'zh') {
  const t = TEXT[lang] || TEXT.zh;
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const isHigh = (id) => byId[id] && (byId[id].status === 'high' || byId[id].status === 'borderline-high');

  const keys = [];
  if (isHigh('tc') || isHigh('tg') || isHigh('ldl')) keys.push('lipids');
  if (isHigh('ua')) keys.push('ua');
  if (isHigh('alt') || isHigh('ast') || isHigh('ggt')) keys.push('liver');
  if (isHigh('fpg') || isHigh('hba1c')) keys.push('glucose');
  if (isHigh('sbp') || isHigh('dbp')) keys.push('bp');
  if (isHigh('bmi')) keys.push('weight');
  if (keys.length === 0) keys.push('general');

  const focus = keys.map((k) => t.focus[k]);
  const extras = keys.filter((k) => t.extras[k]).map((k) => t.extras[k]);
  const weeks = t.weeks.map((w, i) => ({ week: i + 1, ...w, tasks: [...w.tasks] }));
  const checklist = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, week: Math.min(4, Math.floor(i / 7) + 1), eat: false, move: false, sleep: false }));

  return {
    focus,
    focusKeys: keys,
    headline: t.headline(focus),
    daily: { eat: [...t.daily.eat], move: [...t.daily.move], sleep: [...t.daily.sleep] },
    extras,
    weeks,
    checklist,
    note: t.note,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildPlan30d };
}
if (typeof globalThis !== 'undefined') {
  globalThis.buildPlan30d = buildPlan30d;
}
