from playwright.sync_api import sync_playwright
from browser import URL,seed,root,patients,consultations,inventory
import json
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c=b.new_context(viewport={'width':1280,'height':800},timezone_id='Africa/Tunis');page=c.new_page();seed(page,'fictif','light');errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(URL);page.locator('.warm-dashboard').wait_for()
 values=lambda:page.locator('.wd-kpi strong').all_text_contents()
 initial=values();assert initial[4]==page.locator('#dashboard-follow-up p strong').first.inner_text()
 stored=page.evaluate("Object.fromEntries(['medifollow-patients','medifollow-consultations','medifollow-prescriptions','medifollow-inventory'].map(k=>[k,localStorage.getItem(k)]))")
 new_patients=patients+[{'id':'lab003-c','name':'Dossier fictif C','age':35,'sex':'Non renseigné','status':'Nouveau'}]
 extra={**consultations[0],'id':'refresh','motif':'Événement fictif de rafraîchissement','date':'2026-11-17T18:00:00+01:00'}
 new_inventory=json.loads(json.dumps(inventory));new_inventory['items'][0]['quantity']=7
 page.evaluate('data=>{localStorage.setItem("medifollow-patients",JSON.stringify(data.patients));localStorage.setItem("medifollow-consultations",JSON.stringify(data.consultations));localStorage.setItem("medifollow-inventory",JSON.stringify(data.inventory));window.dispatchEvent(new Event("medifollow:data-updated"))}',{'patients':new_patients,'consultations':consultations+[extra],'inventory':new_inventory})
 page.wait_for_function("document.querySelector('.wd-kpi strong').textContent==='3'")
 page.get_by_text('Événement fictif de rafraîchissement',exact=True).wait_for()
 changed=values();assert int(changed[1])==int(initial[1])+1
 stock_low=page.get_by_role('heading',name='État de l’inventaire',exact=True).locator('xpath=ancestor::section[1]').locator('small',has_text='Stocks bas').locator('xpath=..').locator('strong')
 assert stock_low.inner_text()=='0'
 page.evaluate('data=>{for(const[k,v]of Object.entries(data))localStorage.setItem(k,v);window.dispatchEvent(new Event("medifollow:data-updated"))}',stored)
 page.wait_for_function("document.querySelector('.wd-kpi strong').textContent==='2'")
 assert values()==initial and stock_low.inner_text()=='1' and not errors
 c.close();b.close()
(root/'refresh.json').write_text(json.dumps({'customRefreshEvent':'medifollow:data-updated','before':initial,'afterSyntheticUpdate':changed,'restored':True,'recentListAndStockUpdated':True,'lateKpiMatchesFollowup':True,'pageErrors':errors},indent=2));print('PASS: real refresh event updates KPI, recent consultations and stock; synthetic storage fully restored.')
