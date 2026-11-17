from playwright.sync_api import sync_playwright
from fixtures import seed,URL,root,snapshot_script
from capture import PAGES,navigate
from browser_checks import check_layout
import json

checks=[]
query='(max-width:700px), (orientation:portrait), (max-height:500px)'
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for w,h,theme in [(701,1280,'light'),(800,1280,'dark'),(900,1280,'light'),(360,740,'dark')]:
        c=browser.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));seed(page,'fictif',theme)
        page.goto(URL);page.locator('#cabinet-app').wait_for();original=page.evaluate(snapshot_script)['stored']
        trigger=page.locator('.cabinet-menu-toggle[aria-haspopup=dialog]')
        trigger.click();page.get_by_role('dialog',name='Navigation MediFollow').wait_for();dialog=page.locator('#cabinet-navigation-dialog')
        assert trigger.get_attribute('aria-expanded')=='true' and dialog.evaluate('e=>e.matches(":modal")')
        browser_chrome_focus=0
        for _ in range(18):
            page.keyboard.press('Tab')
            focus_state=page.evaluate('()=>({inside:!!document.activeElement.closest("dialog"),body:document.activeElement===document.body,documentFocused:document.hasFocus(),background:document.querySelector("#contenu-principal").contains(document.activeElement)})')
            assert not focus_state['background'] and dialog.evaluate('e=>e.matches(":modal")'),focus_state
            if not focus_state['inside']:
                assert focus_state['body'] and not focus_state['documentFocused'],focus_state
                browser_chrome_focus+=1
        dialog.get_by_role('button',name='Fermer le menu',exact=True).focus()
        page.keyboard.press('Escape');assert not dialog.evaluate('e=>e.open')
        assert trigger.get_attribute('aria-expanded')=='false' and trigger.evaluate('e=>document.activeElement===e')
        trigger.click();page.get_by_role('button',name='Fermer le menu',exact=True).click();assert not dialog.evaluate('e=>e.open')
        trigger.click();bounds=dialog.bounding_box();page.mouse.click(min(w-2,bounds['x']+bounds['width']+8),h/2);assert not dialog.evaluate('e=>e.open')
        for slug,title in PAGES:
            navigate(page,title);assert page.evaluate('window.scrollY')==0;check_layout(page)
        assert page.evaluate(snapshot_script)['stored']==original
        navigate(page,'Patients');field=page.get_by_label('Rechercher un dossier patient',exact=True)
        page.keyboard.press('Tab');field.focus()
        focus=field.evaluate('e=>({style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth)})')
        assert focus['style']!='none' and focus['width']>=3
        page.screenshot(path=str(root/f'focus-{w}-{theme}.png'),animations='disabled')
        # Actual orientation transition while the modal is open.
        trigger.click();page.set_viewport_size({'width':1280,'height':800})
        page.wait_for_function("document.querySelector('#cabinet-navigation').dataset.mode==='sidebar'")
        assert page.locator('dialog:modal').count()==0
        page.locator('.sidebar').get_by_role('button',name='Patients',exact=True).click()
        page.get_by_role('heading',name='Patients',level=1,exact=True).wait_for();assert page.evaluate('window.scrollY')==0
        page.set_viewport_size({'width':w,'height':h});page.wait_for_function("document.querySelector('#cabinet-navigation').dataset.mode==='drawer'")
        navigate(page,'Consultations');page.locator('.physical-exam-editor').scroll_into_view_if_needed()
        page.locator('.cabinet-menu-toggle[aria-haspopup=dialog]').click();page.get_by_role('dialog',name='Navigation MediFollow').get_by_role('button',name='Patients',exact=True).click()
        page.wait_for_function('window.scrollY===0')
        launcher=page.locator('.mf-orb-launcher');launcher.click();panel=page.get_by_role('region',name='Discussion avec MediFollow AI');panel.wait_for()
        message=page.get_by_label('Votre message',exact=True);assert message.input_value()=='' and message.evaluate('e=>parseFloat(getComputedStyle(e).fontSize)')>=16
        box=panel.bounding_box();assert box['x']>=0 and box['x']+box['width']<=w+1 and box['y']>=80 and box['y']+box['height']<=h+1,box
        if w in [800,360]:page.screenshot(path=str(root/f'assistant-{w}-{theme}.png'),animations='disabled')
        page.get_by_role('button',name="Fermer l'assistant",exact=True).click();assert not panel.count()
        assert page.evaluate(snapshot_script)['stored']==original and not errors,errors
        checks.append({'viewport':f'{w}x{h}','theme':theme,'routes':8,'nativeModalTabAndEscapeFocus':True,'browserChromeFocusStops':browser_chrome_focus,'focus':focus,'closeButtonAndBackdrop':True,'orientationWhileOpen':True,'scrollReset':True,'assistantPanelFits':True,'dataUnchanged':True,'pageErrors':errors})
        print(w,theme,'PASS native drawer, 8 routes, focus/Escape/backdrop, rotation, scroll reset and assistant panel',flush=True);c.close()

    for theme in ['light','dark']:
        c=browser.new_context(viewport={'width':640,'height':400},has_touch=True,timezone_id='Africa/Tunis');page=c.new_page();seed(page,'fictif',theme);page.goto(URL);page.locator('#cabinet-app').wait_for()
        for slug,title in PAGES:navigate(page,title);check_layout(page)
        page.screenshot(path=str(root/f'reflow-640x400-{theme}.png'),animations='disabled')
        checks.append({'viewport':'640x400','theme':theme,'routes':8,'reflowEquivalent200':True});print(theme,'PASS 200% equivalent reflow across 8 pages',flush=True);c.close()

    c=browser.new_context(viewport={'width':800,'height':1280},color_scheme='light',timezone_id='Africa/Tunis');page=c.new_page();seed(page,'fictif','auto');page.goto(URL);page.wait_for_function("document.documentElement.dataset.theme==='light'")
    before=page.evaluate(snapshot_script)['stored'];light=page.locator('#cabinet-app').evaluate('e=>getComputedStyle(e).backgroundColor')
    page.emulate_media(color_scheme='dark',reduced_motion='reduce');page.wait_for_function("document.documentElement.dataset.theme==='dark'")
    dark=page.locator('#cabinet-app').evaluate('e=>getComputedStyle(e).backgroundColor');assert light!=dark and page.evaluate("localStorage.getItem('medifollow-theme')")=='auto'
    page.evaluate("window.dispatchEvent(new CustomEvent('medifollow:storage-error',{detail:{key:'medifollow-consultations'}}))")
    warning=page.locator('.clinical-storage-alert[role=alert]');warning.wait_for();assert 'Vos modifications ne sont peut-être pas sauvegardées.' in warning.inner_text()
    assert warning.bounding_box()['y']<page.locator('.warm-dashboard').bounding_box()['y'];page.screenshot(path=str(root/'storage-warning-800-dark.png'),animations='disabled')
    assert page.evaluate(snapshot_script)['stored']==before
    checks.append({'automaticTheme':True,'preferencePreserved':True,'storageAlertVisibleBeforeContent':True,'dataUnchanged':True,'light':light,'dark':dark});print('PASS automatic theme and real storage error event',flush=True);c.close()

    for mode in ['theme-writes','storage-getter']:
        c=browser.new_context(viewport={'width':360,'height':740},has_touch=True,timezone_id='Africa/Tunis');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        seed(page,'fictif','light',blocked_theme=mode=='theme-writes',blocked_storage=mode=='storage-getter')
        page.goto(URL);page.locator('#cabinet-app').wait_for();page.locator('.clinical-storage-alert[role=status]').wait_for()
        navigate(page,'Paramètres');page.get_by_role('button',name='Clair',exact=True).click();page.wait_for_function("document.documentElement.dataset.theme==='light'")
        page.get_by_role('button',name='Sombre',exact=True).click();page.wait_for_function("document.documentElement.dataset.theme==='dark'")
        assert page.locator('.clinical-storage-alert[role=status]').is_visible() and not errors,errors
        checks.append({'mode':mode,'sessionThemeUsable':True,'persistenceWarningVisible':True,'pageErrors':errors});print(mode,'PASS application and session theme remain usable',flush=True);c.close()
    browser.close()
(root/'navigation.json').write_text(json.dumps(checks,indent=2))
print('PASS navigation/assistant/reflow/auto/storage resilience suite',flush=True)
