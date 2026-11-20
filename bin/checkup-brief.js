#!/usr/bin/env node
// checkup-brief 命令行：把体检报告文字变成 Markdown 一页纸简报。
//   node bin/checkup-brief.js report.txt --age 32 --sex male [--lang en] [--budget 1500] > brief.md
//   cat report.txt | node bin/checkup-brief.js --json
// 只做健康科普，不做诊断，不能替代医生。所有处理都在本地完成。
'use strict';
const fs = require('fs');
const { parseReportText } = require('../src/parser.js');
const { renderMarkdown } = require('../src/markdown.js');

const args = process.argv.slice(2);
const opt = (name, d) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : d; };
if (args.includes('-h') || args.includes('--help')) {
  console.log('用法: checkup-brief <report.txt> [--age 32] [--sex male|female] [--budget 1500] [--lang zh|en] [--json]');
  process.exit(0);
}
const file = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--json'].includes(args[i - 1])));
const text = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
if (args.includes('--json')) {
  process.stdout.write(JSON.stringify(parseReportText(text), null, 2) + '\n');
} else {
  const profile = { age: parseInt(opt('age', '0'), 10) || undefined, sex: opt('sex'), budget: parseInt(opt('budget', '0'), 10) || undefined };
  process.stdout.write(renderMarkdown(text, profile, opt('lang', 'zh')));
}
