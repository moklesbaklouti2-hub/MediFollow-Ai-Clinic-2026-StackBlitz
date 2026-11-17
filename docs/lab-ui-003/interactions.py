from pathlib import Path
from playwright.sync_api import sync_playwright
from browser import URL,seed,snapshot_script,root
import json,re
results=[]
def ratio(color,background):
 def light(value):
  rgb=[float(x)/255 for x in re.findall(r'[0-9.]+',value)[:3]]
  channels=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in rgb]
  return sum(c*w for c,w in zip(channels,[.2126,.7152,.0722]))
 a,b=light(color),light(background)
 return (max(a,b)+.05)/(min(a,b)+.05)


def back(page):
 page.locator('.sidebar').get_by_role('button',name='Tableau de bord',exact=True).click()
 page.locator('[data-dashboard-layout="warm-003"]').wait_for()

def expect_page(page,label):
 page.get_by_role('heading',name=label,exact=True,level=1).wait_for()

def clinical(page):
 return page.evaluate("JSON.stringify(Object.fromEntries(['medifollow-patients','medifollow-consultations','medifollow-prescriptions','medifollow-inventory'].map(k=>[k,localStorage.getItem(k)])))")

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(1280,800),(800,1280),(360,740)]:
  for theme in ['light','dark']:
   c=browser.new_context(viewport={'width':w,'height':h},has_touch=True,timezone_id='Africa/Tunis');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));seed(page,'fictif',theme)
   page.goto(URL);page.locator('.warm-dashboard').wait_for();stored=clinical(page);routes=[]
   boxes=[page.locator(s).bounding_box() for s in ['.wd-agenda','.wd-recent-panel','.wd-helios']]
   if w>=1150:assert boxes[0]['x']<boxes[1]['x']<boxes[2]['x'] and max(b['y'] for b in boxes)-min(b['y'] for b in boxes)<2,boxes
   if w<=600:assert abs(boxes[0]['x']-boxes[1]['x'])<2 and boxes[0]['y']<boxes[1]['y']<boxes[2]['y'],boxes
   assert page.locator('.wd-kpi').count()==5
   sizes=[]
   for locator in page.locator('.warm-dashboard button,.warm-dashboard summary,.warm-dashboard .wd-kpi[href]').all():
    if locator.is_visible():
     b=locator.bounding_box();assert b['height']>=44 and b['width']>=44,(locator.inner_text(),b);sizes.append({'label':locator.inner_text(),'width':round(b['width'],1),'height':round(b['height'],1)})
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   page.keyboard.press('Tab');primary=page.locator('.wd-welcome .wd-primary');primary.focus()
   focus=primary.evaluate('e=>({style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth)})')
   assert focus['style']!='none' and focus['width']>=3,focus
   colors=primary.evaluate('e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,paper:getComputedStyle(document.querySelector(".wd-panel")).backgroundColor})')
   assert colors['background']!=colors['paper'],colors
   assert ratio(colors['color'],colors['background'])>=4.5,colors
   page.screenshot(path=str(root/f'focus-{w}x{h}-{theme}.png'),animations='disabled')
   page.get_by_role('link',name='Contrôles en retard',exact=False).click();assert page.evaluate('location.hash')=='#dashboard-follow-up'
   assert page.locator('#dashboard-follow-up [role="status"]').is_visible()
   for label,target in [('Nouvelle consultation','Consultations'),('Patients','Patients'),('HELIOS','Copilote IA'),('Ordonnances','Ordonnances'),('Protocoles','Protocoles médicaux'),('Inventaire','Inventaire')]:
    page.locator('.wd-quick-pathways').get_by_role('button',name=label,exact=False).click();expect_page(page,target);assert clinical(page)==stored;routes.append({'action':label,'target':target});back(page)
   for selector,label,target in [('.wd-helios','Ouvrir HELIOS','Copilote IA'),('#dashboard-follow-up','Ouvrir les consultations','Consultations')]:
    page.locator(selector).get_by_role('button',name=label,exact=True).click();expect_page(page,target);assert clinical(page)==stored;routes.append({'action':label,'target':target});back(page)
   if w==1280 and theme=='light':
    for label,target in [('Nouvelle consultation','Consultations'),('Patients','Patients')]:
     page.locator('.wd-welcome').get_by_role('button',name=label,exact=True).click();expect_page(page,target);routes.append({'action':'Bienvenue: '+label,'target':target});back(page)
   if w<=700:
    summary=page.locator('.wd-mobile-pages summary');summary.click();page.keyboard.press('Escape');assert not page.locator('.wd-mobile-pages').evaluate('e=>e.open');assert page.evaluate('document.activeElement.tagName')=='SUMMARY'
    for target in ['Tableau de bord','Patients','Consultations','Copilote IA','Ordonnances','Protocoles médicaux','Inventaire','Paramètres']:
     page.locator('.wd-mobile-pages summary').click();page.get_by_role('navigation',name='Navigation du Dashboard').get_by_role('button',name=target,exact=True).click();expect_page(page,target);assert clinical(page)==stored;routes.append({'action':'Menu mobile','target':target});back(page)
   assert not errors,errors
   assert clinical(page)==stored
   results.append({'viewport':f'{w}x{h}','theme':theme,'routes':routes,'clinicalStorageUnchanged':True,'pageErrors':errors,'focus':focus,'primaryColors':colors,'primaryContrast':round(ratio(colors['color'],colors['background']),2),'controls':sizes,'mainPanels':boxes});(root/'interactions.json').write_text(json.dumps(results,indent=2));print(w,h,theme,'PASS',len(routes),'routes',flush=True);c.close()
 # Responsive reflow equivalent to 200% of a 1280x800 CSS viewport.
 extras=[]
 for theme in ['light','dark']:
  c=browser.new_context(viewport={'width':640,'height':400},timezone_id='Africa/Tunis');page=c.new_page();seed(page,'fictif',theme);page.goto(URL);page.locator('.warm-dashboard').wait_for()
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  page.locator('.wd-quick-pathways').scroll_into_view_if_needed()
  for b in page.locator('.wd-quick-pathways button').all():
   box=b.bounding_box();assert box['x']>=0 and box['x']+box['width']<=640 and box['height']>=44
  page.screenshot(path=str(root/f'reflow-200-equivalent-{theme}.png'),animations='disabled');extras.append({'theme':theme,'viewport':'640x400','reflowEquivalent200':True});c.close()
 # Exercise the existing automatic theme preference, without changing its logic.
 c=browser.new_context(viewport={'width':1280,'height':800},color_scheme='light',timezone_id='Africa/Tunis');page=c.new_page();seed(page,'vide','auto');page.goto(URL);page.wait_for_function("document.documentElement.dataset.theme==='light'")
 page.wait_for_function('()=>{const e=document.querySelector(".wd-panel"),probe=document.createElement("span");probe.style.backgroundColor=getComputedStyle(e).getPropertyValue("--wd-paper");return getComputedStyle(e).backgroundColor===probe.style.backgroundColor}')
 light=page.locator('.wd-panel').first.evaluate('e=>getComputedStyle(e).backgroundColor')
 page.emulate_media(color_scheme='dark',reduced_motion='reduce');page.wait_for_function("document.documentElement.dataset.theme==='dark'")
 page.wait_for_function('()=>{const e=document.querySelector(".wd-panel"),probe=document.createElement("span");probe.style.backgroundColor=getComputedStyle(e).getPropertyValue("--wd-paper");return getComputedStyle(e).backgroundColor===probe.style.backgroundColor}')
 dark=page.locator('.wd-panel').first.evaluate('e=>getComputedStyle(e).backgroundColor');assert light!=dark
 assert page.evaluate("localStorage.getItem('medifollow-theme')")=='auto';c.close();browser.close()
(root/'extras.json').write_text(json.dumps({'reflow':extras,'automaticTheme':{'light':light,'dark':dark,'preferencePreserved':True}},indent=2))
assert len(results)==6
print('PASS: routes, focus, clinical data, mobile menu, 200% equivalent reflow and auto theme.',flush=True)
