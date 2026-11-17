from playwright.sync_api import sync_playwright
from fixtures import root,seed,URL
from capture import PAGES,navigate
import json
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for theme in ['light','dark']:
        c=browser.new_context(viewport={'width':1280,'height':800},timezone_id='Africa/Tunis');page=c.new_page();seed(page,'fictif',theme);page.goto(URL);page.locator('#cabinet-app').wait_for()
        for slug,title in PAGES:
            navigate(page,title);failures=page.evaluate((root/'contrast.js').read_text())
            results.append({'theme':theme,'page':slug,'failures':failures});print(theme,slug,json.dumps(failures),flush=True)
            (root/'contrast.json').write_text(json.dumps(results,indent=2))
        c.close()
    browser.close()
