from pathlib import Path
from playwright.sync_api import sync_playwright
from datetime import datetime
import json,sys
stage=sys.argv[1];root=Path('/workspace/work/dashboard-d3')/stage;root.mkdir(exist_ok=True)
patients=[{'id':'a','name':'Dossier fictif A','age':42,'sex':'Non renseigné','status':'Actif'},{'id':'b','name':'Dossier fictif B','age':51,'sex':'Non renseigné','status':'Nouveau'}]
consultations=[]
for cid,pid,name,date,due in [('c1','a','Dossier fictif A','2026-11-17T10:00:00+01:00','2026-11-17'),('c2','b','Dossier fictif B','2026-11-16T10:00:00+01:00','2026-11-16'),('c3','a','Dossier fictif A','2026-11-10T10:00:00+01:00','2026-11-20'),('c4','missing','Document fictif à relier','2026-11-17T09:00:00+01:00','2026-11-27'),('c5','a','Dossier fictif A','2026-09-12T10:00:00+01:00','2026-12-01')]:
 consultations.append({'id':cid,'patientId':pid,'patient':name,'date':date,'motif':'Contrôle fictif '+cid,'specialty':'Médecine générale','symptoms':'Données de démonstration','history':'','vitals':{'systolic':'120','diastolic':'80','heartRate':'72','spo2':'98','temperature':'37'} if cid=='c1' else {},'physicalExamination':{},'examination':'','diagnosis':'','plan':'','createdAt':date,'updatedAt':date,'followUp':{'dueDate':due,'objective':'Contrôle de démonstration','status':'planned'}})
rx=[{'id':'rx1','patientId':'a','patient':'Dossier fictif A','date':'2026-11-17','medications':[],'exams':[]},{'id':'rx2','patientId':'missing','patient':'Document fictif à relier','date':'2026-11-16','medications':[],'exams':[]}]
inv={'items':[{'id':'stock1','name':'Compresses fictives','category':'supply','unit':'boîte','quantity':2,'minimumQuantity':5,'unitCost':3.5,'expiryDate':'2026-11-01','batchNumber':'LAB-01','createdAt':'2026-11-01','updatedAt':'2026-11-17'}],'movements':[{'id':'m1','itemId':'stock1','itemName':'Compresses fictives','type':'entry','quantity':2,'date':'2026-11-16','reason':'Entrée fictive'}]}
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for dataset in ['fictif','vide']:
  for w,h in [(1280,800),(800,1280),(360,740)]:
   for theme in ['light','dark']:
    c=b.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis');page=c.new_page();page.emulate_media(reduced_motion='reduce');errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/*',lambda q:q.continue_() if q.request.url.startswith('http://127.0.0.1:5190') and '/api/' not in q.request.url else q.abort())
    page.clock.set_fixed_time(datetime.fromisoformat('2026-11-17T10:00:00+01:00'))
    data={'medifollow-theme-v2-initialized':'true','medifollow-theme':theme}
    if dataset=='fictif':data.update({'medifollow-patients':json.dumps(patients),'medifollow-consultations':json.dumps(consultations),'medifollow-prescriptions':json.dumps(rx),'medifollow-inventory':json.dumps(inv)})
    page.add_init_script('for (const [k,v] of Object.entries('+json.dumps(data)+')) localStorage.setItem(k,v)')
    page.goto('http://127.0.0.1:5190');page.locator('.mf-stat strong').first.wait_for();page.wait_for_timeout(200)
    before=page.evaluate('JSON.stringify(Object.entries(localStorage).sort())')
    page.screenshot(path=str(root/f'{dataset}-{w}x{h}-{theme}.png'),animations='disabled')
    page.screenshot(path=str(root/f'{dataset}-{w}x{h}-{theme}-complet.png'),animations='disabled',full_page=True)
    snapshot=page.evaluate('''()=>{let texts=s=>[...document.querySelectorAll(s)].map(e=>e.textContent.replace(/\\s+/g,' ').trim());return {overflow:document.documentElement.scrollWidth>innerWidth,stats:texts('.mf-stat'),recent:texts('.mf-activity-copy'),chart:texts('.mf-chart-labels span'),follow:texts('[aria-label="HELIOS Follow-up : échéances de suivi"]'),alerts:texts('[aria-label="Documents sans dossier patient confirmé"]'),inventory:[...document.querySelectorAll('h3')].filter(e=>e.textContent==='État de l’inventaire').map(e=>e.closest('.mf-panel').textContent.replace(/\\s+/g,' ').trim()),indicators:texts('.mf-indicator'),appointments:texts('.mf-appointments-panel'),duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,a)=>a.indexOf(id)!==i)}}''')
    contrast=page.evaluate('''()=>{
     const rgb=s=>s.match(/[0-9.]+/g).map(Number);
     const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((t,v,i)=>t+v*[.2126,.7152,.0722][i],0);
     const sels=['.mf-activity-copy strong','.mf-activity-copy span','.mf-activity-copy small','.mf-stat-label','.mf-stat-foot span','.mf-quick-action strong','.mf-quick-action small','.mf-chart-labels span','.mf-chart-labels b','.mf-indicator small','.mf-indicator strong','.mf-indicator em','.mf-empty-state strong','.mf-empty-state p','[role="alert"] > strong','.mf-copilot-copy button'];
     return sels.flatMap(selector=>[...document.querySelectorAll(selector)].filter(e=>e.getClientRects().length).map(e=>{
      const fg=rgb(getComputedStyle(e).color);let bg=[255,255,255],ancestor=e;
      while(ancestor){const c=getComputedStyle(ancestor);const v=rgb(c.backgroundColor);if(v.length===3||v[3]===1){bg=v;break}ancestor=ancestor.parentElement}
      const a=luminance(fg),b=luminance(bg);return {selector,ratio:Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*100)/100,color:getComputedStyle(e).color,background:bg};
     }));
    }''')
    assert all(item['ratio']>=4.5 for item in contrast),[item for item in contrast if item['ratio']<4.5]
    snapshot['textContrastSamples']=contrast
    assert not snapshot['overflow'] and not snapshot['duplicateIds'] and not errors,(snapshot,errors)
    assert before==page.evaluate('JSON.stringify(Object.entries(localStorage).sort())'),'Rendering must not mutate storage'
    results.append({'dataset':dataset,'viewport':f'{w}x{h}','theme':theme,**snapshot})
    print(stage,dataset,w,h,theme,'PASS',flush=True);c.close();(root/'metrics.json').write_text(json.dumps(results,indent=2))
 b.close()
