from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright
import json
out=Path('/workspace/work/dashboard-d3')
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(1280,800),(800,1280),(360,740)]:
  for theme in ['light','dark']:
   c=b.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis'); page=c.new_page();errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('**/*',lambda q:q.continue_() if q.request.url.startswith('http://127.0.0.1:5190') and '/api/' not in q.request.url else q.abort())
   page.clock.set_fixed_time(datetime.fromisoformat('2026-11-17T10:00:00+01:00'))
   storage={'medifollow-theme-v2-initialized':'true','medifollow-theme':theme,'medifollow-patients':'[]','medifollow-consultations':'[]','medifollow-prescriptions':'[]','medifollow-inventory':'{"items":[],"movements":[]}'}
   page.add_init_script('for (const [k,v] of Object.entries('+json.dumps(storage)+')) localStorage.setItem(k,v)')
   page.goto('http://127.0.0.1:5190'); page.locator('[data-dashboard-layout="d3"]').wait_for()
   clinical=lambda:page.evaluate("JSON.stringify(Object.entries(localStorage).filter(([k])=>['medifollow-patients','medifollow-consultations','medifollow-prescriptions','medifollow-inventory'].includes(k)).sort())")
   before=clinical(); sizes=[]
   for name,target in [('Nouvelle consultation','Consultations'),('Dossiers patients','Patients'),('Copilote IA','Copilote IA'),('Ouvrir les consultations','Consultations'),('Ouvrir le Copilote','Copilote IA')]:
    button=page.locator('[data-dashboard-layout="d3"]').get_by_role('button',name=name,exact=False)
    assert button.count()==1,(name,button.count())
    box=button.bounding_box(); assert box['width']>=44 and box['height']>=52,(name,box)
    page.keyboard.press('Tab'); button.focus(); outline=button.evaluate("e=>({style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth)})")
    assert outline['style']!='none' and outline['width']>=2,(name,outline)
    button.click();page.locator('h1').filter(has_text=target).wait_for()
    assert page.locator('.n3-navigation [aria-current="page"]').inner_text()==target
    assert before==clinical(),name+' changed clinical storage'
    if w<=600:page.get_by_role('button',name='Pages',exact=True).click()
    page.get_by_role('navigation',name='Navigation principale').get_by_role('button',name='Tableau de bord',exact=True).click()
    page.locator('[data-dashboard-layout="d3"]').wait_for(); sizes.append({'action':name,'target':target,'width':round(box['width'],1),'height':round(box['height'],1),'focus':outline})
   assert not errors,errors
   assert before==clinical()
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   side=page.locator('.d3-side-column'); widths=side.evaluate('e=>({width:e.clientWidth,children:[...e.children].map(x=>x.getBoundingClientRect().width)})')
   assert all(abs(widths['width']-child)<3 for child in widths['children']),widths
   results.append({'viewport':f'{w}x{h}','theme':theme,'actions':sizes,'pageErrors':errors,'clinicalStorageUnchanged':True,'singleColumnSidePanels':True})
   print(w,h,theme,'5 actions PASS',flush=True);c.close()
 b.close()
(out/'actions.json').write_text(json.dumps(results,indent=2))
