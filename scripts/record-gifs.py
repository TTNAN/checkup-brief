# 录制 README 里的动图：先在仓库根目录 python3 -m http.server 8765，再运行本脚本。
# 依赖：pip install playwright && python3 -m playwright install chromium；ffmpeg 转 GIF 见 docs/assets/README.md。
import sys, time, shutil, glob, os
from playwright.sync_api import sync_playwright
W,H=1280,800
def session(name, fn, lang='zh'):
    with sync_playwright() as p:
        b=p.chromium.launch()
        ctx=b.new_context(viewport={'width':W,'height':H}, record_video_dir=f'/tmp/vid_{name}', record_video_size={'width':W,'height':H})
        pg=ctx.new_page()
        pg.add_init_script(f"localStorage.setItem('checkup-brief.lang', '\"{lang}\"')")
        fn(pg)
        ctx.close(); b.close()
    v=glob.glob(f'/tmp/vid_{name}/*.webm')[0]
    shutil.move(v, f'/tmp/{name}.webm'); shutil.rmtree(f'/tmp/vid_{name}')

def smooth_scroll(pg, y, ms=900):
    pg.evaluate(f"window.scrollTo({{top:{y},behavior:'smooth'}})"); pg.wait_for_timeout(ms)

def demo(pg):
    pg.goto('http://localhost:8765/web/index.html'); pg.wait_for_timeout(1800)
    smooth_scroll(pg, pg.evaluate("document.querySelector('#input').offsetTop-70"), 1000)
    # type a few lines as if pasting
    pg.click('#reportText')
    pg.wait_for_timeout(300)
    pg.click('#loadSample'); pg.wait_for_timeout(900)
    pg.click('#familyChips button[data-fam="糖尿病"]'); pg.wait_for_timeout(500)
    pg.hover('#runBtn'); pg.wait_for_timeout(300)
    pg.click('#runBtn'); pg.wait_for_timeout(3200)
    smooth_scroll(pg, pg.evaluate("window.scrollY+420"), 1500)
    smooth_scroll(pg, pg.evaluate("window.scrollY+420"), 1500)
    smooth_scroll(pg, pg.evaluate("document.querySelector('#result').offsetTop-70"), 900)
    for tab in ['package','clinic','plan']:
        pg.click(f'#tabs button[data-tab={tab}]'); pg.wait_for_timeout(1700)
    pg.click('#tabs button[data-tab=brief]'); pg.wait_for_timeout(600)
    pg.click('.nav .seg button[data-lang=en]'); pg.wait_for_timeout(1800)
    pg.click('.nav .seg button[data-lang=zh]'); pg.wait_for_timeout(900)

def plan(pg):
    pg.goto('http://localhost:8765/web/index.html#demo'); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('#tabs button[data-tab=plan]').click()")
    pg.evaluate("window.scrollTo({top:document.querySelector('#result').offsetTop-70})"); pg.wait_for_timeout(1000)
    for d in range(1,6):
        pg.click(f'.day[data-day="{d}"]'); pg.wait_for_timeout(250)
        for k in ['eat','move','sleep']:
            pg.click(f'.check3 button[data-k={k}]'); pg.wait_for_timeout(220)
    pg.click('.day[data-day="8"]'); pg.wait_for_timeout(800)
    pg.click('.week[data-week="3"]'); pg.wait_for_timeout(1200)
    pg.click('#tabs button[data-tab=brief]'); pg.wait_for_timeout(900)
    pg.click('#shareBtn'); pg.wait_for_timeout(2200)

session('demo', demo)
session('plan', plan)
print('done')
