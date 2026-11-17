from pathlib import Path
from playwright.sync_api import sync_playwright
from fixtures import seed, URL, root, snapshot_script
import json,sys,subprocess,os
from browser_checks import check_layout

PAGES=[('dashboard','Tableau de bord'),('patients','Patients'),('consultations','Consultations'),('helios','Copilote IA'),('ordonnances','Ordonnances'),('protocoles','Protocoles médicaux'),('inventaire','Inventaire'),('parametres','Paramètres')]

def navigate(page,target):
    if page.locator('#cabinet-app').count():
        page.wait_for_function("()=>{const n=document.querySelector('#cabinet-navigation');return n&&getComputedStyle(n).visibility==='visible'&&(n.dataset.mode==='drawer')===window.matchMedia('(max-width:700px), (orientation:portrait), (max-height:500px)').matches}")
        if page.locator('#cabinet-navigation').get_attribute('data-mode')=='drawer':
            page.locator('.cabinet-menu-toggle[aria-haspopup=dialog]').click()
            page.get_by_role('dialog',name='Navigation MediFollow').get_by_role('button',name=target,exact=True).click()
        else:page.locator('.sidebar').get_by_role('button',name=target,exact=True).click()
    elif page.locator('.sidebar').get_by_role('button',name=target,exact=True).is_visible():
        page.locator('.sidebar').get_by_role('button',name=target,exact=True).click()
    else:
        page.locator('.sidebar').get_by_role('button',name='Tableau de bord',exact=True).click()
        page.locator('.wd-mobile-pages summary').click()
        page.get_by_role('navigation',name='Navigation du Dashboard').get_by_role('button',name=target,exact=True).click()
    page.get_by_role('heading',level=1,name=target,exact=True).wait_for()
    page.evaluate('window.scrollTo(0,0)')

def controls(page):
    return page.locator('#contenu-principal').evaluate('''e=>[...e.querySelectorAll('input,select,textarea')].map(c=>({tag:c.tagName,type:c.type,value:c.value,checked:c.checked??null,placeholder:c.getAttribute('placeholder'),options:c.tagName==='SELECT'?[...c.options].map(o=>({value:o.value,label:o.text})):null}))''')

def screenshot(page,out,name):
    page.screenshot(path=str(out/(name+'.png')),animations='disabled')

if __name__=='__main__':
    stage=sys.argv[1]
    reference=json.loads((root/'reference.json').read_text())
    repo=Path(os.environ.get('MEDIFOLLOW_REPO',Path(__file__).resolve().parents[2]))
    subprocess.run(['git','diff','--quiet',reference[stage],'--','src','server','package.json','package-lock.json'],cwd=repo,check=True)
    out=root/stage;out.mkdir(exist_ok=True);results=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        for w,h in [(1280,800),(800,1280),(360,740),(1648,928)]:
            for theme in ['light','dark']:
                context=browser.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis')
                page=context.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
                seed(page,'fictif',theme);page.goto(URL);page.locator('.warm-dashboard').wait_for();page.wait_for_function('(theme)=>document.documentElement.dataset.theme===theme',arg=theme)
                original=page.evaluate(snapshot_script)['stored']
                for slug,title in PAGES:
                    navigate(page,title)
                    record={'page':slug,'viewport':f'{w}x{h}','theme':theme,'controls':controls(page),'overflow':page.evaluate('document.documentElement.scrollWidth>innerWidth'),'pageErrors':errors.copy(),'clinicalStorageUnchanged':page.evaluate(snapshot_script)['stored']==original}
                    if stage=='apres':record['ui']=check_layout(page)
                    if slug=='dashboard':
                        record['dashboard']=page.evaluate(snapshot_script)
                        page.screenshot(path=str(out/f'{slug}-{w}x{h}-{theme}-complet.png'),full_page=True,animations='disabled')
                    screenshot(page,out,f'{slug}-{w}x{h}-{theme}')
                    if slug=='patients':
                        page.locator('.patient-card').first.get_by_role('button',name='Ouvrir le dossier',exact=False).click()
                        page.locator('.patient-detail').wait_for();page.locator('.patient-detail').scroll_into_view_if_needed()
                        record['detailControls']=controls(page)
                        if stage=='apres':record['detailUI']=check_layout(page)
                        screenshot(page,out,f'dossier-{w}x{h}-{theme}')
                    if slug=='consultations':
                        editor=page.locator('.physical-exam-editor');editor.scroll_into_view_if_needed()
                        editor.locator('details').first.locator('summary').click()
                        editor.locator('details').first.scroll_into_view_if_needed()
                        if stage=='apres':record['examUI']=check_layout(page)
                        screenshot(page,out,f'examen-{w}x{h}-{theme}')
                    assert record['clinicalStorageUnchanged'] and not errors,(slug,w,theme,errors)
                    if stage=='apres':assert not record['overflow'],(slug,w,theme,'overflow')
                    results.append(record);(out/'metrics.json').write_text(json.dumps(results,indent=2))
                    print(stage,slug,w,h,theme,'PASS',flush=True)
                context.close()
        browser.close()
    assert len(results)==64
