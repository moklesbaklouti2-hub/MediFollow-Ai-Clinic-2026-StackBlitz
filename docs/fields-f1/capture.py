from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright
import json,sys
stage=sys.argv[1];root=Path('/workspace/work/fields-f1')/stage;root.mkdir(parents=True,exist_ok=True)
url='http://127.0.0.1:5191'
fixture=[{'id':'f1-fiction','name':'Dossier fictif F1','age':42,'sex':'Non renseigné','status':'Nouveau'}]
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(1280,800),(800,1280),(360,740)]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis');page=c.new_page();page.emulate_media(reduced_motion='reduce');errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(url) and '/api/' not in r.request.url else r.abort())
   page.clock.set_fixed_time(datetime.fromisoformat('2026-11-17T16:00:00+01:00'))
   data={'medifollow-theme-v2-initialized':'true','medifollow-theme':theme,'medifollow-patients':json.dumps(fixture),'medifollow-consultations':'[]','medifollow-prescriptions':'[]','medifollow-inventory':'{"items":[],"movements":[]}'}
   page.add_init_script('for(const [k,v] of Object.entries('+json.dumps(data)+'))localStorage.setItem(k,v)')
   page.goto(url)
   if w<=600:page.get_by_role('button',name='Pages',exact=True).click()
   page.get_by_role('navigation',name='Navigation principale').get_by_role('button',name='Consultations',exact=True).click()
   toggle=page.get_by_role('checkbox',name='Activer ou désactiver le copilote clinique intelligent')
   if toggle.is_checked():toggle.uncheck()
   page.locator('#consultation-patient').select_option('f1-fiction')
   page.locator('#consultation-specialty').select_option('Médecine générale')
   fields={'consultation-reason':'Contrôle fictif F1','consultation-symptoms':'Exemple fictif pour comparer la lisibilité des champs.','consultation-history':'Antécédents fictifs conservés.','consultation-interview':'Réponse fictive conservée.','consultation-diagnosis':'Hypothèse de démonstration','consultation-plan':'Plan fictif conservé.','follow-up-date':'2026-11-20','follow-up-objective':'Revoir les constantes fictives.'}
   for key,value in fields.items():page.locator('#'+key).fill(value)
   for key,value in {'systolic':'120','diastolic':'80','heartRate':'72','spo2':'98','temperature':'37','weight':'70','height':'170'}.items():page.locator('#consultation-vital-'+key).fill(value)
   page.locator('.pex-section summary').first.click()
   page.locator('#pex-status-general-generalAppearance').select_option('not_examined')
   page.locator('#pex-observations-general-generalAppearance').fill('Constatation fictive conservée.')
   page.locator('#consultation-reason').blur()
   for name,text in [('identification','01 · Identification'),('histoire','02 · Histoire de la maladie'),('constantes','03 · Constantes vitales'),('examen','04 · Examen physique')]:
    section=page.locator('.consultation-section').filter(has=page.get_by_role('heading',name=text,exact=True))
    section.evaluate('e=>window.scrollTo({top:window.scrollY+e.getBoundingClientRect().top-18,behavior:"instant"})')
    page.screenshot(path=str(root/f'{w}x{h}-{theme}-{name}.png'),animations='disabled')
   snapshot=page.evaluate('''()=>({overflow:document.documentElement.scrollWidth>innerWidth,duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,a)=>a.indexOf(id)!==i),controls:[...document.querySelectorAll('.consultation-section input,.consultation-section select,.consultation-section textarea')].map(e=>({id:e.id,type:e.type,value:e.value,checked:e.checked,options:e.tagName==='SELECT'?[...e.options].map(x=>({value:x.value,text:x.textContent})):undefined})),units:[...document.querySelectorAll('.vital-input-row span')].map(e=>e.textContent),context:document.querySelector('.n3-context-identity').textContent,stored:Object.fromEntries(['medifollow-patients','medifollow-consultations','medifollow-prescriptions','medifollow-inventory'].map(k=>[k,localStorage.getItem(k)]))})''')
   assert not snapshot['overflow'] and not snapshot['duplicateIds'] and not errors,(snapshot['overflow'],errors)
   results.append({'viewport':f'{w}x{h}','theme':theme,'pageErrors':errors,**snapshot});(root/'metrics.json').write_text(json.dumps(results,indent=2))
   print(stage,w,h,theme,'4 captures PASS',flush=True);c.close()
 browser.close()
