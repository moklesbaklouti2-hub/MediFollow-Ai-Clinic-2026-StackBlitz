from playwright.sync_api import sync_playwright
from fixtures import seed,URL,root,snapshot_script
from capture import navigate
from browser_checks import check_layout
import json,re,sys,subprocess

clinical_keys=['medifollow-patients','medifollow-consultations','medifollow-prescriptions','medifollow-inventory']
def stored(page):return page.evaluate('(keys)=>Object.fromEntries(keys.map(k=>[k,JSON.parse(localStorage.getItem(k))]))',clinical_keys)

results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    cases=[(1280,800,'light'),(800,1280,'dark'),(360,740,'light')]
    if len(sys.argv)>1:cases=cases[:1]
    for w,h,theme in cases:
        c=browser.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis');page=c.new_page();errors=[];alerts=[]
        page.set_default_timeout(15000);page.on('pageerror',lambda e:errors.append(str(e)))
        def accept(d):
            assert d.type=='alert',('Unexpected destructive confirmation/prompt',d.type,d.message)
            alerts.append(d.message);d.accept()
        page.on('dialog',accept);seed(page,'fictif',theme);page.goto(URL);page.locator('#cabinet-app').wait_for()
        # Prepare complete fixtures through the unchanged read adapter. Existing writes
        # legitimately complete omitted legacy fields; compare normalized records.
        page.evaluate('''async()=>{const api=await import('/src/services/storage.ts');const data=api.getMedicalData();for(const [key,value] of Object.entries({'medifollow-patients':data.patients,'medifollow-consultations':data.consultations,'medifollow-prescriptions':data.prescriptions,'medifollow-inventory':api.getInventoryData()}))localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new Event('medifollow:data-updated'));}''')
        original=stored(page)

        navigate(page,'Patients');page.get_by_role('button',name='+ Nouveau patient',exact=True).click();check_layout(page)
        page.get_by_label('Nom et prénom',exact=True).fill('Dossier fictif UI A')
        page.get_by_label('Âge',exact=True).fill('33');page.get_by_label('Téléphone (facultatif)',exact=True).fill('00000000')
        page.get_by_role('button',name='Enregistrer le patient',exact=True).click()
        patient=next(x for x in stored(page)['medifollow-patients'] if x['name']=='Dossier fictif UI A');pid=patient['id']
        page.locator('.patient-card').filter(has_text='Dossier fictif UI A').get_by_role('button',name='Ouvrir le dossier',exact=True).click()
        page.get_by_role('button',name='Modifier le patient',exact=True).click();page.get_by_label('Téléphone',exact=True).fill('11111111')
        page.get_by_role('button',name='Enregistrer les modifications',exact=True).click()
        assert next(x for x in stored(page)['medifollow-patients'] if x['id']==pid)['phone']=='11111111'
        group=page.locator('.pci-group').first;group.get_by_role('button',name='+ Ajouter',exact=True).click()
        group.locator('input').first.fill('Antécédent fictif UI');check_layout(page)
        page.get_by_role('button',name='Enregistrer les antécédents et traitements',exact=True).click()
        assert 'Antécédent fictif UI' in json.dumps(next(x for x in stored(page)['medifollow-patients'] if x['id']==pid),ensure_ascii=False)
        print(w,theme,'PASS patient create/edit/history save',flush=True)

        navigate(page,'Consultations');page.locator('.smart-copilot-checkbox').uncheck()
        page.get_by_label('Patient *',exact=True).select_option(pid)
        page.get_by_label('Spécialité de consultation *',exact=True).select_option(index=1)
        page.get_by_label('Motif de consultation *',exact=True).fill('Contrôle fictif UI')
        page.get_by_label('Symptômes et histoire clinique',exact=True).fill('Note clinique fictive UI')
        page.get_by_label('Antécédents et traitements',exact=True).fill('Antécédents fictifs UI')
        page.get_by_label('Interrogatoire ciblé · réponses au copilote',exact=True).fill('Réponse fictive UI')
        vitals={'systolic':('Pression systolique','120'),'diastolic':('Pression diastolique','80'),'heartRate':('Fréquence cardiaque','72'),'spo2':('Saturation SpO₂','98'),'temperature':('Température','37'),'respiratoryRate':('Fréquence respiratoire','16'),'weight':('Poids','70'),'height':('Taille','175'),'glycemia':('Glycémie','1.00')}
        for key,(label,value) in vitals.items():page.get_by_label(label,exact=True).fill(value)
        page.locator('.pex-section').first.locator('summary').click()
        page.get_by_label('Statut : État général et apparence',exact=True).select_option('normal')
        page.get_by_label('Constatations et commentaires : État général et apparence',exact=True).fill('Constatation fictive UI')
        page.get_by_text('Ancien examen libre (facultatif) — conserver les notes historiques',exact=True).click()
        page.get_by_label('Notes libres de l’examen clinique',exact=True).fill('Note historique fictive UI')
        page.get_by_label('Hypothèses diagnostiques',exact=True).fill('Exemple fictif de saisie')
        page.get_by_label('Conduite à tenir',exact=True).fill('Plan fictif de test')
        page.locator('#follow-up-date').fill('2026-11-20');page.locator('#follow-up-objective').fill('Suivi fictif UI')
        check_layout(page);page.get_by_role('button',name='Enregistrer la consultation',exact=True).click()
        visits=stored(page)['medifollow-consultations'];visit=next(x for x in visits if x.get('motif')=='Contrôle fictif UI')
        assert visit['patientId']==pid and visit['symptoms']=='Note clinique fictive UI' and visit['examination']=='Note historique fictive UI'
        assert visit['targetedInterview']=='Réponse fictive UI'
        for key,(_,value) in vitals.items():assert visit['vitals'][key]==value,(key,visit['vitals'])
        assert visit['physicalExamination']['general']['generalAppearance']=={'status':'normal','value':'Constatation fictive UI','comment':''}
        assert visit['followUp']['dueDate']=='2026-11-20'
        history=page.locator('.consultation-section').filter(has=page.get_by_role('heading',name=re.compile('^Historique des consultations')))
        history.locator('.saved-consultation').filter(has_text='Contrôle fictif UI').get_by_role('button',name=re.compile('Modifier')).click()
        assert page.get_by_label('Symptômes et histoire clinique',exact=True).input_value()=='Note clinique fictive UI'
        assert page.get_by_label('Statut : État général et apparence',exact=True).input_value()=='normal'
        page.get_by_label('Conduite à tenir',exact=True).fill('Plan fictif corrigé UI')
        page.get_by_role('button',name='Enregistrer les modifications',exact=True).click()
        assert len(stored(page)['medifollow-consultations'])==len(visits)
        assert next(x for x in stored(page)['medifollow-consultations'] if x['id']==visit['id'])['plan']=='Plan fictif corrigé UI'
        print(w,theme,'PASS consultation/vitals/physical/legacy/follow-up save and edit',flush=True)

        navigate(page,'Ordonnances');stock_before=stored(page)['medifollow-inventory']
        page.get_by_label('Nom et prénom du patient',exact=True).select_option(pid)
        page.get_by_label('Nom du médicament',exact=True).fill('Produit fictif UI')
        page.get_by_label('Dosage / concentration',exact=True).fill('Présentation fictive')
        page.get_by_label('Fréquence / posologie',exact=True).fill('Valeur fictive')
        page.get_by_label('Durée du traitement',exact=True).fill('Durée fictive')
        page.get_by_label('Article de stock associé (facultatif)',exact=True).select_option('stock2')
        page.get_by_role('button',name='+ Ajouter ce médicament',exact=True).click();check_layout(page)
        page.get_by_role('button',name="Enregistrer l'ordonnance",exact=True).click()
        prescription=next(x for x in stored(page)['medifollow-prescriptions'] if x['patientId']==pid)
        assert prescription['medications'][0]['name']=='Produit fictif UI' and prescription['medications'][0]['dosage']=='Présentation fictive'
        assert stored(page)['medifollow-inventory']==stock_before,'Draft save cannot dispense or change stock'
        page.get_by_role('button',name="Prévisualiser l'ordonnance",exact=True).click();preview=page.locator('.prescription-preview');preview.wait_for()
        assert 'Produit fictif UI' in preview.inner_text()
        page.emulate_media(media='print',reduced_motion='reduce')
        assert preview.evaluate('e=>getComputedStyle(e).color')=='rgb(0, 0, 0)'
        assert preview.locator('h3').evaluate('e=>getComputedStyle(e).color')=='rgb(0, 0, 0)'
        assert preview.evaluate('e=>getComputedStyle(e).backgroundColor')=='rgb(255, 255, 255)'
        page.evaluate('window.scrollTo(0,0)')
        page.wait_for_function('window.scrollY===0')
        box=preview.bounding_box()
        assert box and 0<=box['y']<h and box['width']>200 and box['height']>100,box
        page.screenshot(path=str(root/f'impression-{w}-{theme}.png'),animations='disabled')
        pdf=root/f'impression-{w}-{theme}.pdf'
        page.pdf(path=str(pdf),format='A4',print_background=True)
        printed=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True)
        assert 'Produit fictif UI' in printed and 'Dossier fictif UI A' in printed,printed
        pages=re.search(r'^Pages:\s+(\d+)',subprocess.check_output(['pdfinfo',str(pdf)],text=True),re.MULTILINE)
        assert pages and int(pages[1])==1,'Short prescription must print on one page'
        print('PASS real one-page PDF content',w,theme,flush=True)
        page.emulate_media(media='screen',reduced_motion='reduce')
        print(w,theme,'PASS prescription draft save/stock unchanged/print media',flush=True)

        navigate(page,'Inventaire');page.get_by_role('button',name='+ Ajouter un article',exact=True).click()
        page.get_by_label('Nom de l’article *',exact=True).fill('Article fictif UI')
        page.get_by_label('Unité',exact=True).fill('boîte');page.get_by_label('Quantité initiale',exact=True).fill('5')
        page.get_by_label('Seuil d’alerte',exact=True).fill('2');page.get_by_label('Coût d’achat unitaire (DT) · facultatif',exact=True).fill('1.5')
        page.get_by_label('Numéro de lot',exact=True).fill('UI-FICTIF');page.get_by_label('Date de péremption',exact=True).fill('2027-01-01');check_layout(page)
        page.get_by_role('button',name='Enregistrer l’article',exact=True).click()
        item=next(x for x in stored(page)['medifollow-inventory']['items'] if x['name']=='Article fictif UI');assert item['quantity']==5 and item['unitCost']==1.5
        navigate(page,'Paramètres');page.get_by_label('Nom du médecin',exact=True).fill('Cabinet fictif UI')
        page.get_by_role('button',name='Enregistrer les paramètres',exact=True).click()
        assert page.evaluate("JSON.parse(localStorage.getItem('medifollow-settings')).doctorName")=='Cabinet fictif UI'
        for label,theme_value in [('Clair','light'),('Sombre','dark')]:
            page.get_by_role('button',name=label,exact=True).click();page.wait_for_function('(theme)=>document.documentElement.dataset.theme===theme',arg=theme_value)
            assert page.evaluate("localStorage.getItem('medifollow-theme')")==theme_value
        before_reload=stored(page);page.reload();page.locator('#cabinet-app').wait_for();assert stored(page)==before_reload
        for key in ['medifollow-patients','medifollow-consultations','medifollow-prescriptions']:
            for old in original[key]:assert next(x for x in stored(page)[key] if x['id']==old['id'])==old,(key,old['id'])
        for key in ['items','movements']:
            for old in original['medifollow-inventory'][key]:assert next(x for x in stored(page)['medifollow-inventory'][key] if x['id']==old['id'])==old
        assert not errors,errors
        results.append({'viewport':f'{w}x{h}','theme':theme,'patientCreateEditHistory':True,'consultationCreateEdit':True,'nineVitalsPreserved':True,'physicalAndLegacyPreserved':True,'followUpPreserved':True,'prescriptionDraftAndStockPreserved':True,'printMedia':True,'printPdfOnePageAndContent':True,'inventorySave':True,'settingsSave':True,'themeSwitchesPersist':True,'reloadPersists':True,'originalRecordsUnchanged':True,'pageErrors':errors,'alerts':alerts})
        (root/'actions.json').write_text(json.dumps(results,indent=2));print(w,theme,'PASS inventory/settings/theme/reload; all original fixtures unchanged',flush=True);c.close()
    browser.close()
