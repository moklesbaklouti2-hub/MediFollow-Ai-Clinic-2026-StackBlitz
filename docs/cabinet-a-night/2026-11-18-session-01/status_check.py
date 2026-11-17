from pathlib import Path
import json, os, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

from preflight import repo,root,verify,output_root
out=output_root()/('status-'+(sys.argv[1] if len(sys.argv)>1 else 'before'))
out.mkdir(exist_ok=True)
verify(sys.argv[1] if len(sys.argv)>1 else 'before')
sys.path.insert(0,str(repo/'docs/cabinet-a-global'))
import fixtures
from capture import navigate

fixtures.prescriptions=[{'id':'rx-status-fictif','patientId':'lab003-a','patient':'Dossier fictif A','date':'2026-11-17','status':'draft','advice':'Note fictive initiale','medications':[{'id':'med-fictif','name':'Produit fictif sans valeur clinique','dosage':'Présentation fictive','frequency':'Instruction fictive','duration':'Durée fictive','route':'Voie fictive','quantity':1,'instructions':''}]}]

def luminance(rgb):
    parts=[float(v)/255 for v in rgb.removeprefix('rgb(').removesuffix(')').split(',')]
    parts=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in parts]
    return sum(a*b for a,b in zip(parts,[.2126,.7152,.0722]))

def status(page):
    region=page.locator('[role=status][aria-label="État de l’ordonnance"]')
    message=page.locator('.prescription-success').last
    colors=message.evaluate('e=>({foreground:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor})')
    l=[luminance(v) for v in colors.values()]
    ratio=(max(l)+.05)/(min(l)+.05)
    ax=page.context.new_cdp_session(page);tree=ax.send('Accessibility.getFullAXTree')['nodes'];ax.detach()
    nodes=[n for n in tree if not n.get('ignored') and n.get('role',{}).get('value')=='status' and n.get('name',{}).get('value')=='État de l’ordonnance']
    props={p['name']:p['value'].get('value') for p in nodes[0].get('properties',[])} if nodes else {}
    return {'text':message.inner_text(),'regionCount':region.count(),'ariaLive':region.get_attribute('aria-live') if region.count() else None,'ariaAtomic':region.get_attribute('aria-atomic') if region.count() else None,'AXLive':props.get('live'),'AXAtomic':props.get('atomic'),'colors':colors,'contrast':ratio}

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
            for theme,w,h in [('light',1280,800),('dark',800,1280)]:
                context=browser.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis');page=context.new_page();page.set_default_timeout(15000)
                errors=[];console=[];failed_requests=[];page.on('requestfailed',lambda request:failed_requests.append({'url':request.url,'failure':request.failure}));page.on('pageerror',lambda error:errors.append(str(error)));page.on('console',lambda message:console.append({'type':message.type,'text':message.text}) if message.type in ['error','warning'] else None)
                fixtures.seed(page,'fictif',theme);page.goto(fixtures.URL);page.locator('#cabinet-app').wait_for()
                page.evaluate('''async()=>{const api=await import('/src/services/storage.ts');const data=api.getMedicalData();for(const [key,value] of Object.entries({'medifollow-patients':data.patients,'medifollow-consultations':data.consultations,'medifollow-prescriptions':data.prescriptions,'medifollow-inventory':api.getInventoryData()}))localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new Event('medifollow:data-updated'));}''')
                original=page.evaluate(fixtures.snapshot_script)['stored']
                navigate(page,'Ordonnances');initial=page.locator('[role=status][aria-label="État de l’ordonnance"]').count()
                page.locator('.history-card').get_by_role('button',name='Modifier',exact=True).click()
                page.get_by_label('Instructions complémentaires',exact=True).fill('Note fictive enregistrée')
                page.get_by_role('button',name='Enregistrer les modifications',exact=True).click()
                page.locator('.prescription-success').filter(has_text='Modifications de l’ordonnance enregistrées.').wait_for()
                saved=status(page)
                stored=page.evaluate(fixtures.snapshot_script)['stored']
                assert all(stored[k]==original[k] for k in original if k!='medifollow-prescriptions')
                assert json.loads(stored['medifollow-prescriptions'])[0]['advice']=='Note fictive enregistrée'
                page.locator('.prescription-success').last.scroll_into_view_if_needed();page.screenshot(path=str(out/f'saved-{theme}.png'),animations='disabled')
                baseline_console=list(console)
                page.evaluate('''()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='medifollow-prescriptions')throw new DOMException('Synthetic refusal','QuotaExceededError');return set.call(this,key,value)}}''')
                page.get_by_label('Instructions complémentaires',exact=True).fill('Note fictive non sauvegardée')
                page.get_by_role('button',name='Enregistrer les modifications',exact=True).click()
                page.locator('.prescription-success').filter(has_text='Échec de sauvegarde').wait_for()
                refused=status(page)
                assert page.evaluate(fixtures.snapshot_script)['stored']==stored,'Failed save changed clinical storage'
                assert page.locator('.clinical-storage-alert[role=alert]').is_visible()
                page.locator('.prescription-success').last.scroll_into_view_if_needed();page.screenshot(path=str(out/f'refused-{theme}.png'),animations='disabled')
                failures=[]
                if initial!=1:failures.append('persistent status region missing')
                for name,result in [('saved',saved),('refused',refused)]:
                    if result['regionCount']!=1 or result['AXLive']!='polite' or result['AXAtomic'] is not True:failures.append(name+': live status semantics missing')
                    if result['contrast']<4.5:failures.append(name+': low message contrast')
                if errors or any(c['type']=='error' for c in baseline_console):failures.append('unexpected runtime/console error')
                record={'theme':theme,'viewport':f'{w}x{h}','initialRegionCount':initial,'saved':saved,'refused':refused,'otherMedicalDataUnchanged':True,'stockUnchanged':True,'failedSaveDataUnchanged':True,'storageErrorAlert':True,'pageErrors':errors,'failedRequests':failed_requests,'consoleBeforeSimulation':baseline_console,'consoleAfterStorageSimulation':console[len(baseline_console):],'failures':failures}
                records.append(record);(out/'results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
                print(theme,json.dumps(record,ensure_ascii=False),flush=True);context.close()
            browser.close()
        if any(record['failures'] for record in records):raise SystemExit(1)
    finally:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
