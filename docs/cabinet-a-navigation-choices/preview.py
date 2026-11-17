"""Capture unapproved navigation options without editing application styles."""
from pathlib import Path
from datetime import datetime, timezone
import json, os, subprocess, sys, time, urllib.request

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
repo = Path(os.environ.get('MEDIFOLLOW_REPO', root.parents[1]))
sys.path.insert(0, str(repo / 'docs/cabinet-a-global'))
from fixtures import seed, URL, snapshot_script

baseline = '37f65c0e1c491f36ec1aad681eb3a31689c729f4'
subprocess.run(['git', 'diff', '--quiet', baseline, '--', 'src', 'server', 'scripts', 'package.json', 'package-lock.json'], cwd=repo, check=True)
subprocess.run(['git', 'diff', '--quiet', '51078393c7889724c0c84c65c7e4eaad21db445a', '--', 'index.html'], cwd=repo, check=True)

geometry = """() => {
  const sidebar = document.querySelector('#cabinet-navigation .sidebar');
  const s = sidebar.getBoundingClientRect();
  const inside = (r, c) => r.top >= c.top - .5 && r.bottom <= c.bottom + .5 && r.left >= c.left - .5 && r.right <= c.right + .5;
  return {
    overflow:document.documentElement.scrollWidth > innerWidth,
    buttons:[...sidebar.querySelectorAll('.premium-nav-item')].map(e => {
      const r = e.getBoundingClientRect(), nav = e.closest('.sidebar-nav');
      return {name:e.innerText.trim(), width:r.width, height:r.height,
        initiallyVisible:inside(r,s) && (!nav || getComputedStyle(nav).overflowY === 'visible' || inside(r,nav.getBoundingClientRect()))};
    })
  };
}"""

records = []
with open('/tmp/cabinet-a-navigation-preview-vite.log', 'w') as server_log:
    server = subprocess.Popen([str(repo/'node_modules/.bin/vite'), '--host', '127.0.0.1', '--port', '5195', '--strictPort'], cwd=repo, stdout=server_log, stderr=subprocess.STDOUT)
    try:
        for _ in range(100):
            if server.poll() is not None:
                raise RuntimeError('Local preview server exited')
            try:
                urllib.request.urlopen(URL, timeout=1).close()
                break
            except OSError:
                time.sleep(.1)
        else:
            raise RuntimeError('Local preview server unavailable')

        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
            for width, height in [(1280,800), (800,1280), (360,740)]:
                for theme in ['light', 'dark']:
                    for option in ['actuel', 'a1', 'a2', 'a3']:
                        context = browser.new_context(viewport={'width':width, 'height':height}, has_touch=True, timezone_id='Africa/Tunis')
                        page = context.new_page()
                        page.set_default_timeout(15000)
                        errors = []
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        seed(page, 'fictif', theme)
                        page.goto(URL)
                        page.locator('#cabinet-app').wait_for()
                        assert page.title() == 'MediFollow AI — Espace clinique'
                        assert page.locator('html').get_attribute('lang') == 'fr'
                        before = page.evaluate(snapshot_script)

                        if option != 'actuel':
                            css = (root/('a2.css' if option == 'a3' else option+'.css')).read_text()
                            if option == 'a3':
                                css += '\n' + (root/'a3.css').read_text()
                            page.add_style_tag(content=css)
                        label = 'ACTUEL — PR #18' if option == 'actuel' else 'PROPOSITION '+option.upper()+' — NON APPLIQUÉE'
                        page.locator('.top-label').evaluate('(e,label)=>e.textContent=label', label)
                        compact = page.locator('#cabinet-navigation').get_attribute('data-mode') == 'drawer'
                        if compact:
                            page.locator('.cabinet-menu-toggle[aria-haspopup=dialog]').click()
                            page.locator('.cabinet-drawer-heading > strong').evaluate('(e,label)=>e.textContent=label', 'Actuel' if option == 'actuel' else 'Proposition '+option.upper())
                        assert page.evaluate(snapshot_script) == before, 'Clinical data or Dashboard values changed'
                        measured = page.evaluate(geometry)
                        assert not measured['overflow'] and len(measured['buttons']) == 8
                        assert all(b['width'] >= 48 and b['height'] >= 48 for b in measured['buttons'])
                        settings = next(b for b in measured['buttons'] if b['name'] == 'Paramètres')
                        if option != 'actuel':
                            assert settings['initiallyVisible'], measured
                        if option in ['a2','a3']:
                            assert all(b['initiallyVisible'] for b in measured['buttons']), measured
                        assert not errors, errors
                        name = f'{option}-{width}x{height}-{theme}.png'
                        page.screenshot(path=str(root/name), animations='disabled')
                        records.append({'option':option,'viewport':f'{width}x{height}','theme':theme,'drawerOpen':compact,'title':page.title(),'language':page.locator('html').get_attribute('lang'),'clinicalSnapshotUnchanged':True,'pageErrors':errors,**measured,'screenshot':name})
                        (root/'metrics.json').write_text(json.dumps(records, ensure_ascii=False, indent=2)+'\n')
                        print(option, width, height, theme, 'PASS', flush=True)
                        context.close()
            browser.close()
        (root/'capture-info.json').write_text(json.dumps({'capturedAt':datetime.now(timezone.utc).isoformat(),'base':baseline,'scope':'Unapproved browser-injected navigation proposals; no application style edits','cases':len(records)}, indent=2)+'\n')
    finally:
        server.terminate()
        try:
            server.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
