# 生成 README 截图到 docs/assets/：先在仓库根目录 python3 -m http.server 8765，再运行本脚本。
import base64
from playwright.sync_api import sync_playwright
A='docs/assets/'
with sync_playwright() as p:
    b=p.chromium.launch()
    for lang in ['zh','en']:
        pg=b.new_page(viewport={'width':1280,'height':860},device_scale_factor=1)
        pg.add_init_script(f"localStorage.setItem('checkup-brief.lang','\"{lang}\"');localStorage.setItem('checkup-brief.checks', JSON.stringify(Array.from({{length:30}},(_, i)=>({{eat:i<9||i==11,move:i<9||i==10,sleep:i<9}}))));localStorage.setItem('checkup-brief.start', String(Date.now()-9*86400000))")
        pg.goto('http://localhost:8765/web/index.html#demo'); pg.wait_for_timeout(2600)
        top=pg.evaluate("document.querySelector('#result .block-head').getBoundingClientRect().bottom + window.scrollY + 36 - 60")
        sfx='' if lang=='zh' else '-en'
        for tab in ['brief','parser','package','clinic','plan']:
            pg.evaluate(f"document.querySelector('#tabs button[data-tab={tab}]').click()")
            pg.evaluate(f"window.scrollTo(0,{top})"); pg.wait_for_timeout(1500)
            pg.screenshot(path=A+f'{tab}{sfx}.png')
        if lang=='zh':
            pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(1700)
            pg.screenshot(path=A+'hero.png')
            pg.evaluate("document.querySelector('#tabs button[data-tab=brief]').click()"); pg.wait_for_timeout(300)
            pg.click('#shareBtn'); pg.wait_for_timeout(600)
            src=pg.eval_on_selector('.share-modal img','e=>e.src')
            open(A+'share-card.png','wb').write(base64.b64decode(src.split(',')[1]))
        pg.close()
    m=b.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
    m.add_init_script("localStorage.setItem('checkup-brief.lang','\"zh\"')")
    m.goto('http://localhost:8765/web/index.html#demo'); m.wait_for_timeout(2600)
    m.evaluate("window.scrollTo(0,document.querySelector('#result').offsetTop+40)"); m.wait_for_timeout(1500)
    m.screenshot(path=A+'mobile.png')
    b.close()
