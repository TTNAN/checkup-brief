// checkup-brief — src/plan-30d.js
// 纯函数：30 天改善计划生成器。
//   buildPlan30d(items, profile) -> { focus, weeks, daily }
// 原则：只给吃、动、睡这些生活方式上的可执行动作，
//   不给药、不给具体剂量、不承诺“30 天降到正常”。
//   每天只做 3 件小事，降低执行难度；每周一个主题，逐步加量。
// 只做健康科普，不做诊断，不能替代医生。

'use strict';

function buildPlan30d(items, profile) {
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const isHigh = (id) => byId[id] && (byId[id].status === 'high' || byId[id].status === 'borderline-high');

  const focus = [];
  if (isHigh('tc') || isHigh('tg') || isHigh('ldl')) focus.push('血脂');
  if (isHigh('ua')) focus.push('尿酸');
  if (isHigh('alt')) focus.push('肝脏');
  if (isHigh('fpg')) focus.push('血糖');
  if (isHigh('sbp') || isHigh('dbp')) focus.push('血压');
  if (focus.length === 0) focus.push('整体健康');

  const daily = {
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
  };

  // 针对示例数据（血脂 + 尿酸 + 肝）的额外提醒，写在通用动作之外。
  const extras = [];
  if (isHigh('ua')) extras.push('每天喝水 2000 毫升左右，别等渴了才喝；海鲜、动物内脏、浓肉汤这 30 天先少吃。');
  if (isHigh('alt')) extras.push('这 30 天不喝酒；别熬夜，肝脏恢复最需要的是睡眠。');
  if (isHigh('tc') || isHigh('tg')) extras.push('外卖备注“少油少盐”，自己做饭时先放菜、后放肉。');

  const weeks = [
    { week: 1, theme: '先记下来', goal: '不追求完美，先把现状记清楚。', tasks: ['记 3 天饮食（拍照就行）', '每天快走 20 分钟', '23:30 前睡觉，记下实际入睡时间'] },
    { week: 2, theme: '换掉一顿', goal: '把最油的一顿换成清淡的。', tasks: ['午餐主食换一半粗粮', '快走加到 30 分钟', '含糖饮料换成白开水、淡茶'] },
    { week: 3, theme: '动起来', goal: '运动变成固定时间。', tasks: ['每周 2 次力量练习，每次 15 分钟', '周末一次 60 分钟户外活动', '每坐 1 小时起身 5 分钟'] },
    { week: 4, theme: '复盘', goal: '看看哪些做到了，哪些最难。', tasks: ['对比第 1 周和第 4 周的饮食记录', '称一次体重、量一次血压', '把 30 天记录带去复查，和医生一起看趋势'] },
  ];

  // 30 天打卡表：每天 3 个勾选框（吃 / 动 / 睡），数据存在本地。
  const checklist = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    eat: false,
    move: false,
    sleep: false,
  }));

  return {
    focus,
    headline: `未来 30 天，重点关注：${focus.join('、')}。每天只做 3 件小事。`,
    daily,
    extras,
    weeks,
    checklist,
    note: '这份计划只针对生活方式，不涉及药物。正在吃药请不要自行停药或改量，复查时带上这 30 天的记录给医生看。',
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildPlan30d };
}
