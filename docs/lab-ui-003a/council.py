from playwright.sync_api import sync_playwright
from browser import seed,URL,root,snapshot_script
import json

checks=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [701,750,800,850,900]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':width,'height':1280},has_touch=True,timezone_id='Africa/Tunis')
   page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));seed(page,'fictif',theme)
   page.goto(URL);page.locator('.warm-dashboard').wait_for()
   initial=page.evaluate(snapshot_script)
   box=lambda selector:page.locator(selector).bounding_box()
   helios,agenda,recent,identity,header,welcome=[box(s) for s in ['.wd-helios','.wd-agenda','.wd-recent-panel','.wd-integrity-notice','.premium-topbar','.wd-welcome']]
   button=page.locator('.wd-helios').get_by_role('button',name='Ouvrir HELIOS',exact=True)
   button_box=button.bounding_box()
   assert helios['y']<min(agenda['y'],recent['y']), (width,theme,helios,agenda,recent)
   assert button_box['y']+button_box['height']<=1280, (width,theme,button_box)
   assert identity['y']+identity['height']<=helios['y'] and page.locator('.wd-integrity-notice').is_visible()
   assert not page.locator('.wd-integrity-notice').evaluate('e=>e.scrollHeight>e.clientHeight+1')
   assert header['height']+welcome['height']<=300, (width,theme,header,welcome)
   end=box('.wd-agenda small')
   assert agenda['y']+agenda['height']-(end['y']+end['height'])<=40, (width,theme,agenda,end)
   assert page.locator('.wd-agenda').get_by_text('Calendrier non activé',exact=True).is_visible()
   assert page.locator('.wd-agenda button,.wd-agenda input').count()==0
   assert page.locator('.premium-topbar').get_by_text('Mode prototype',exact=True).is_visible()
   assert page.locator('.header-date').get_by_text('Stockage dans le navigateur',exact=True).is_visible()
   icons=page.locator('.wd-kpi .wd-icon');assert icons.count()==5
   for icon in icons.all():
    assert icon.get_attribute('aria-hidden')=='true' and icon.get_attribute('focusable')=='false'
   assert not initial['overflow'] and not initial['duplicateIds']
   alert_checked=False
   if width==800:
    page.evaluate("window.dispatchEvent(new CustomEvent('medifollow:storage-error',{detail:{key:'medifollow-consultations'}}))")
    warning=page.locator('.clinical-storage-alert[role=alert]');warning.wait_for()
    assert warning.get_by_text('Attention — stockage non confirmé',exact=True).is_visible()
    assert 'Vos modifications ne sont peut-être pas sauvegardées.' in warning.inner_text()
    assert warning.bounding_box()['y']<box('.warm-dashboard')['y']
    assert button.bounding_box()['y']+button.bounding_box()['height']<=2560
    assert page.evaluate(snapshot_script)['stored']==initial['stored']
    if theme=='light':page.screenshot(path=str(root/'storage-alert-800x1280-light.png'),animations='disabled')
    alert_checked=True
   button.click();page.get_by_role('heading',name='Copilote IA',level=1,exact=True).wait_for()
   assert page.evaluate(snapshot_script)['stored']==initial['stored'] and not errors
   checks.append({'viewport':str(width)+'x1280','theme':theme,'heliosBeforeAgendaAndRecent':True,'heliosButtonInFirstViewport':True,'identityPreservedBeforeTools':True,'storageNoticeVisible':True,'prototypeVisible':True,'storageFailureChecked':alert_checked,'heliosCallbackNavigates':True,'clinicalStorageUnchanged':True,'pageErrors':errors,'boxes':{'header':header,'welcome':welcome,'identity':identity,'helios':helios,'heliosButton':button_box,'agenda':agenda,'recent':recent}})
   (root/'council.json').write_text(json.dumps(checks,indent=2))
   print(width,theme,'PASS: HELIOS in first viewport, identity before tools, compact empty calendar, honest storage/prototype notices, actual callback',flush=True)
   c.close()
 browser.close()
assert len(checks)==10
print('PASS LAB-UI-003A: 10 portrait-tablet configurations and 10 real HELIOS transitions; save-failure alert checked in both themes.',flush=True)
