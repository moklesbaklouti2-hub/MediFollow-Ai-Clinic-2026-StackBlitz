from pathlib import Path
import copy, json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

from preflight import repo,root,verify,output_root
sys.path.insert(0,str(repo/'docs/cabinet-a-global'))
import fixtures
from capture import PAGES,navigate

mode=sys.argv[1] if len(sys.argv)>1 else 'baseline'
stage=sys.argv[2] if len(sys.argv)>2 else 'before'
out=output_root()/(mode+'-'+stage)
out.mkdir(exist_ok=True)
verify(stage)
if mode=='long':
    fixtures.patients=copy.deepcopy(fixtures.patients)
    fixtures.consultations=copy.deepcopy(fixtures.consultations)
    fixtures.inventory=copy.deepcopy(fixtures.inventory)
    long='FICTIF_'+('W'*120)
    fixtures.patients[0]['name']=long
    for visit in fixtures.consultations:
        if visit['patientId']=='lab003-a':visit['patient']=long
        visit['motif']='Motif fictif '+('X'*120)
    fixtures.inventory['items'][0]['name']='ARTICLE_FICTIF_'+('Z'*120)
    fixtures.inventory['items'][0]['batchNumber']='LOT_FICTIF_'+('B'*120)

cases=[(1280,800,'light'),(800,1280,'dark')] if mode=='baseline' else [(700,600,'light'),(701,600,'dark'),(1280,500,'light'),(1280,501,'dark'),(1024,768,'light'),(320,640,'dark')]
records=[]
with open('/tmp/cabinet-night-01-vite.log','w') as log:
    server=subprocess.Popen([str(repo/'node_modules/.bin/vite'),'--host','127.0.0.1','--port','5195','--strictPort'],cwd=repo,stdout=log,stderr=subprocess.STDOUT)
    try:
        for _ in range(100):
            if server.poll() is not None:raise RuntimeError('Local Vite exited')
            try:urllib.request.urlopen(fixtures.URL,timeout=1).close();break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('Local Vite unavailable')
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
            for w,h,theme in cases:
                context=browser.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis')
                page=context.new_page();page.set_default_timeout(15000)
                errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                fixtures.seed(page,'fictif',theme);page.goto(fixtures.URL);page.locator('#cabinet-app').wait_for()
                original=page.evaluate(fixtures.snapshot_script)['stored']
                if mode=='baseline':
                    page.keyboard.press('Tab')
                    assert page.locator('.premium-skip-link').evaluate('e=>e===document.activeElement'),'Skip link must be the first tab stop'
                for slug,title in PAGES:
                    if mode=='baseline':
                        if page.locator('#cabinet-navigation').get_attribute('data-mode')=='drawer':
                            page.locator('.cabinet-menu-toggle[aria-haspopup=dialog]').focus();page.keyboard.press('Space')
                            page.get_by_role('dialog',name='Navigation MediFollow').get_by_role('button',name=title,exact=True).focus();page.keyboard.press('Enter')
                        else:
                            page.locator('.sidebar').get_by_role('button',name=title,exact=True).focus();page.keyboard.press('Enter')
                        page.get_by_role('heading',level=1,name=title,exact=True).wait_for()
                        page.locator('.premium-skip-link').focus();page.keyboard.press('Enter');page.keyboard.press('Tab')
                        skip=page.evaluate('document.querySelector("#contenu-principal").contains(document.activeElement)')
                    else:
                        navigate(page,title);skip=None
                    page.evaluate('window.scrollTo(0,0)')
                    data=page.evaluate('''()=>{
                      const main=document.querySelector('#contenu-principal');
                      const visible=e=>e.checkVisibility();
                      const fields=[...main.querySelectorAll('input,select,textarea')].filter(visible).map(e=>({name:e.getAttribute('aria-label')||[...(e.labels||[])].map(x=>x.textContent.trim()).join(' '),type:e.type}));
                      const bad=[...main.querySelectorAll('*')].filter(visible).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'',text:e.children.length?'':e.textContent.trim().slice(0,80),r:e.getBoundingClientRect()})).filter(e=>e.r.width&& (e.r.right>innerWidth+.5 || e.r.left<-.5)).slice(0,12).map(e=>({...e,r:{x:e.r.x,y:e.r.y,width:e.r.width,height:e.r.height}}));
                      const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
                      const orb=document.querySelector('.mf-orb-assistant').getBoundingClientRect(),m=main.getBoundingClientRect(),nav=document.querySelector('#cabinet-navigation'),b=nav.getBoundingClientRect();
                      const brand=document.querySelector('.cabinet-mobile-brand'),brandClear=!brand||brand.getBoundingClientRect().right<=orb.left+.5;
                      const docked=nav.dataset.mode==='drawer'?orb.left>=b.left&&orb.right<=b.right+.5&&orb.top>=b.top-.5&&orb.bottom<=b.bottom+.5:orb.right<=m.left&&orb.top>=document.querySelector('.sidebar').getBoundingClientRect().bottom-.5;
                      return {lang:document.documentElement.lang,title:document.title,mainCount:document.querySelectorAll('main').length,h1:[...document.querySelectorAll('h1')].map(e=>e.innerText),current:[...document.querySelectorAll('.sidebar [aria-current=page]')].map(e=>e.innerText.trim()),unnamedFields:fields.filter(e=>!e.name),overflow:document.documentElement.scrollWidth>innerWidth,scrollWidth:document.documentElement.scrollWidth,bad,brandClear,docked};
                    }''')
                    ax=page.context.new_cdp_session(page)
                    tree=ax.send('Accessibility.getFullAXTree')['nodes'];ax.detach()
                    unnamed=[{'role':n.get('role',{}).get('value'),'name':n.get('name',{}).get('value'),'backendDOMNodeId':n.get('backendDOMNodeId')} for n in tree if not n.get('ignored') and n.get('role',{}).get('value') in ['button','checkbox','combobox','textbox','spinbutton','searchbox'] and not n.get('name',{}).get('value')]
                    data.update({'viewport':f'{w}x{h}','theme':theme,'page':slug,'keyboardSkipIntoMain':skip,'unnamedAXControls':unnamed,'dataUnchanged':page.evaluate(fixtures.snapshot_script)['stored']==original,'pageErrors':list(errors)})
                    failures=[]
                    if data['overflow']:failures.append('horizontal overflow')
                    if data['bad']:failures.append('descendants extend outside viewport')
                    if not data['brandClear'] or not data['docked']:failures.append('assistant geometry')
                    if data['unnamedFields'] or unnamed:failures.append('unnamed controls')
                    if data['lang']!='fr' or data['title']!='MediFollow AI — Espace clinique' or data['mainCount']!=1 or data['h1']!=[title] or data['current']!=[title]:failures.append('document semantics')
                    if skip is False:failures.append('skip link')
                    if not data['dataUnchanged'] or errors:failures.append('storage or runtime')
                    data['failures']=failures
                    capture=(mode=='baseline' and slug=='patients') or (mode=='long' and w==320 and slug in ['patients','inventaire'])
                    if capture:
                        if mode=='long':
                            target=fixtures.patients[0]['name'] if slug=='patients' else fixtures.inventory['items'][0]['name']
                            page.get_by_text(target,exact=True).first.scroll_into_view_if_needed()
                        page.screenshot(path=str(out/f'{slug}-{w}x{h}-{theme}.png'),animations='disabled')
                    records.append(data);(out/'results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
                    print(mode,w,h,theme,slug,failures or 'PASS',flush=True)
                context.close()
            browser.close()
        print('SUMMARY',len(records),'states',sum(bool(x['failures']) for x in records),'with findings',flush=True)
        if any(record['failures'] for record in records):raise SystemExit(1)
    finally:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
