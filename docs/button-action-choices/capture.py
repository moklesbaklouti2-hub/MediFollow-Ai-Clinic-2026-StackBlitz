from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent
source=(root/'mockups.html').read_text()
assert r'\"' not in source
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for width in [320,360,800,1280]:
  for theme in ['light','dark']:
   page=browser.new_page(viewport={'width':width,'height':1000},color_scheme=theme,has_touch=True)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.route('**/*',lambda r:r.abort())
   page.set_content('<meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:light dark}body{margin:0;padding:16px;background:light-dark(#fffdf8,#211f1b)}[hidden]{display:none!important}</style>'+source)
   for i,key in enumerate(['b1','b2','b3']):
    page.locator('[data-variant]').evaluate_all('(es,index)=>es.forEach((e,i)=>e.hidden=i!==index)',i)
    product=page.locator('#mf-buttons-'+key)
    snapshot=product.evaluate('''e=>({buttons:[...e.querySelectorAll('button')].map(x=>{let r=x.getBoundingClientRect();return {label:x.textContent,width:r.width,height:r.height,disabled:x.disabled,contentFits:x.scrollWidth<=x.clientWidth}}),fieldHeight:e.querySelector('input').getBoundingClientRect().height,textareaHeight:e.querySelector('textarea').getBoundingClientRect().height})''')
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),(width,theme,key,'overflow')
    assert all(b['width']>=44 and b['height']>=52 and b['contentFits'] for b in snapshot['buttons']),(width,theme,key,snapshot)
    assert snapshot['fieldHeight']==52 and snapshot['textareaHeight']>=112
    page.keyboard.press('Tab');product.locator('button.primary').first.focus()
    focus=product.locator('button.primary').first.evaluate('e=>({style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth)})')
    assert focus['style']!='none' and focus['width']>=3
    product.locator('button.primary').first.blur()
    if width in [360,800]:
     name=key+('' if width==800 and theme=='light' else f'-{width}-{theme}')+'.png'
     page.locator('[data-variant]').nth(i).screenshot(path=str(root/name),animations='disabled')
    results.append({'variant':key,'viewportWidth':width,'theme':theme,'noOverflow':True,'focus':focus,**snapshot})
   assert not errors,errors
   page.close()
 browser.close()
(root/'checks.json').write_text(json.dumps(results,indent=2))
print('PASS: 24 mockup combinations, no horizontal overflow or button text clipping; targets >=52px, F1 fields unchanged, focus visible. 12 PNG exported.')
