#!/usr/bin/env bash
# 重新生成 web/fonts/serif-sc.woff2：只保留页面上会出现的汉字，体积约 250 KB。
# 依赖：pip install fonttools brotli；思源宋体可变字体 NotoSerifSC[wght].ttf（SIL OFL 1.1）。
set -euo pipefail
SRC=${1:-NotoSerifSC.ttf}
python3 - <<'PY' > /tmp/cb-chars.txt
import glob
txt = ''.join(open(f, encoding='utf-8').read() for f in ['web/index.html', 'web/app.js', *glob.glob('src/*.js')])
cjk = sorted({c for c in txt if '\u4e00' <= c <= '\u9fff' or c in '，。、：；！？“”‘’（）《》·—…'})
print(''.join(cjk) + ''.join(chr(i) for i in range(32, 127)) + '–—·×÷±≤≥↑↓¥°²', end='')
PY
pyftsubset "$SRC" --text-file=/tmp/cb-chars.txt --flavor=woff2 --layout-features='kern,liga,palt' --output-file=web/fonts/serif-sc.woff2
ls -la web/fonts/serif-sc.woff2
