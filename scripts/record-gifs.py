# 录制 README 里的动图：先在仓库根目录 python3 -m http.server 8765，再运行本脚本（输出 /tmp/*.webm）。
# 依赖：pip install playwright && python3 -m playwright install chromium；转 GIF 的 ffmpeg 命令见 docs/assets/README.md。
import glob, shutil
from playwright.sync_api import sync_playwright
W, H = 1280, 800
URL = 'http://localhost:8765/web/index.html'

def session(name, fn, lang='zh'):
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': W, 'height': H}, record_video_dir=f'/tmp/vid_{name}', record_video_size={'width': W, 'height': H})
        pg = ctx.new_page()
        pg.add_init_script(f"localStorage.setItem('checkup-brief.lang', '\"{lang}\"')")
        fn(pg)
        ctx.close(); b.close()
    shutil.move(glob.glob(f'/tmp/vid_{name}/*.webm')[0], f'/tmp/{name}.webm')
    shutil.rmtree(f'/tmp/vid_{name}')

def scroll(pg, y, ms=900):
    pg.evaluate(f"window.scrollTo({{top:{y},behavior:'smooth'}})"); pg.wait_for_timeout(ms)

def top_of(pg, sel, off=0):
    return pg.evaluate(f"document.querySelector('{sel}').getBoundingClientRect().top + window.scrollY - 60 + {off}")

def demo(pg):
    pg.goto(URL); pg.wait_for_timeout(2200)
    scroll(pg, top_of(pg, '#input'), 1100)
    pg.hover('[data-sample=pdf]'); pg.wait_for_timeout(500)
    pg.click('[data-sample=pdf]'); pg.wait_for_timeout(3600)
    scroll(pg, pg.evaluate('window.scrollY+460'), 1600)
    scroll(pg, pg.evaluate('window.scrollY+460'), 1600)
    for tab in ['package', 'clinic', 'plan']:
        pg.click(f'#tabs button[data-tab={tab}]'); pg.wait_for_timeout(1900)
    pg.click('#tabs button[data-tab=brief]'); pg.wait_for_timeout(700)
    pg.click('.nav .seg button[data-lang=en]'); pg.wait_for_timeout(2000)
    pg.click('.nav .seg button[data-lang=zh]'); pg.wait_for_timeout(900)

def photo(pg):
    pg.goto(URL); pg.wait_for_timeout(600)
    pg.evaluate(f"window.scrollTo(0, {top_of(pg, '#input')})"); pg.wait_for_timeout(900)
    pg.hover('[data-sample=img]'); pg.wait_for_timeout(400)
    pg.click('[data-sample=img]')
    pg.wait_for_selector('#result:not([hidden])', timeout=60000); pg.wait_for_timeout(2600)
    scroll(pg, pg.evaluate('window.scrollY+380'), 1800)

def plan(pg):
    pg.goto(URL + '#demo'); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('#tabs button[data-tab=plan]').click()")
    pg.evaluate("window.scrollTo(0, document.querySelector('#result .block-head').getBoundingClientRect().bottom + window.scrollY + 36 - 60 + 250)"); pg.wait_for_timeout(1000)
    for d in range(1, 8):
        pg.click(f'.day[data-day="{d}"]'); pg.wait_for_timeout(200)
        for k in (['eat', 'move', 'sleep'] if d != 5 else ['eat', 'sleep']):
            pg.click(f'.check3 button[data-k={k}]'); pg.wait_for_timeout(180)
    pg.click('.day[data-day="8"]'); pg.wait_for_timeout(900)
    pg.click('.week[data-week="3"]'); pg.wait_for_timeout(1100)
    pg.click('#tabs button[data-tab=brief]'); pg.wait_for_timeout(900)
    pg.click('#shareBtn'); pg.wait_for_timeout(2400)

if __name__ == '__main__':
    session('demo', demo)
    session('photo', photo)
    session('plan', plan)
    print('done')
