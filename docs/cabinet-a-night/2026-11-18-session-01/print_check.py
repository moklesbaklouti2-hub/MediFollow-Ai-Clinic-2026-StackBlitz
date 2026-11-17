from pathlib import Path
import copy, json, os, re, subprocess, sys, time, urllib.request, xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
from pdf_tokens import instruction_tokens

from preflight import repo,root,verify,output_root
out=output_root()/('print-'+(sys.argv[1] if len(sys.argv)>1 else 'before'))
out.mkdir(exist_ok=True)
verify(sys.argv[1] if len(sys.argv)>1 else 'before')
sys.path.insert(0,str(repo/'docs/cabinet-a-global'))
import fixtures
from capture import navigate

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
            cases=[('oversize',1)] if len(sys.argv)>2 and sys.argv[2]=='oversize' else [('short',1),('long',36)]
            for kind,count in cases:
                for theme,w,h in [('light',1280,800),('dark',800,1280)]:
                    medications=[]
                    for i in range(1,count+1):
                        name=f'MED_{i:03}_FICTIF'
                        if kind=='long' and i==8:name+=' '+('W'*120)
                        medications.append({'id':f'med-fictif-{i}','name':name,'dosage':'Présentation fictive','frequency':'Instruction fictive sans valeur clinique.','duration':'Durée fictive','route':'Voie fictive','instructions':('Texte fictif de contrôle de pagination. '*(160 if kind=='oversize' else 5)+f'FIN_{i:03}_FICTIF' if kind in ['long','oversize'] else f'FIN_{i:03}_FICTIF'),'quantity':1})
                    fixtures.prescriptions=[{'id':'rx-print-fictif','patientId':'lab003-a','patient':'Dossier fictif A','date':'2026-11-17','status':'draft','medications':medications,'advice':'Conseil fictif, sans recommandation clinique. '+('Texte fictif de mise en page. '*100 if kind in ['long','oversize'] else '')}]
                    context=browser.new_context(viewport={'width':w,'height':h},timezone_id='Africa/Tunis')
                    page=context.new_page();page.set_default_timeout(15000)
                    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
                    page.on('dialog',lambda dialog: (_ for _ in ()).throw(AssertionError('Unexpected dialog: '+dialog.message)))
                    fixtures.seed(page,'fictif',theme);page.goto(fixtures.URL);page.locator('#cabinet-app').wait_for()
                    before=page.evaluate(fixtures.snapshot_script)['stored']
                    navigate(page,'Ordonnances')
                    page.locator('.history-card').get_by_role('button',name='Modifier',exact=True).click()
                    preview=page.locator('.prescription-preview');preview.wait_for()
                    assert preview.locator('tbody tr').count()==count
                    name=f'{kind}-{theme}'
                    pdf=out/(name+'.pdf')
                    page.emulate_media(media='print',reduced_motion='reduce')
                    page.pdf(path=str(pdf),format='A4',print_background=True)
                    text=subprocess.check_output(['pdftotext',str(pdf),'-'],text=True)
                    (out/(name+'.txt')).write_text(text)
                    xml=subprocess.check_output(['pdftotext','-bbox',str(pdf),'-'],text=True)
                    (out/(name+'.xml')).write_text(xml)
                    document=ET.fromstring(xml)
                    pages=document.findall('.//{*}page')
                    words=document.findall('.//{*}word')
                    row_words=[x for x in words if (x.text or '').startswith('MED_')]
                    expected=[f'MED_{i:03}_FICTIF' for i in range(1,count+1)]
                    positions=[text.find(value) for value in expected]
                    missing=[value for value in expected if value not in text]
                    heights=[float(word.attrib['yMax'])-float(word.attrib['yMin']) for word in row_words]
                    out_of_page=[]
                    for n,pdfpage in enumerate(pages,1):
                        pw=float(pdfpage.attrib['width']);ph=float(pdfpage.attrib['height'])
                        for word in pdfpage.findall('.//{*}word'):
                            if float(word.attrib['xMin'])<-.5 or float(word.attrib['xMax'])>pw+.5 or float(word.attrib['yMin'])<-.5 or float(word.attrib['yMax'])>ph+.5:out_of_page.append({'page':n,'text':word.text})
                    page_words=[' '.join((word.text or '') for word in pdfpage.findall('.//{*}word')) for pdfpage in pages]
                    split_rows=[]
                    if kind in ['long','oversize']:
                        for i in range(1,count+1):
                            start=next((n for n,t in enumerate(page_words,1) if f'MED_{i:03}_FICTIF' in t),None)
                            end=next((n for n,t in enumerate(page_words,1) if f'FIN_{i:03}_FICTIF' in t),None)
                            if start is None or end is None or start!=end:split_rows.append({'row':i,'startPage':start,'endPage':end})
                    first_row_page=next((n for n,t in enumerate(page_words,1) if 'MED_001_FICTIF' in t),None)
                    failures=[]
                    if kind=='oversize' and first_row_page!=1:failures.append('oversized first row unnecessarily deferred')
                    if split_rows and kind=='long':failures.append('medication rows split across pages')
                    phrase='Texte fictif de contrôle de pagination.'
                    expected_phrases=count*(160 if kind=='oversize' else 5) if kind in ['long','oversize'] else 0
                    expected_tokens,actual_tokens=instruction_tokens(pages,medications)
                    actual_phrases=actual_tokens.get('Texte',0)
                    tokens_match=expected_tokens==actual_tokens
                    if not tokens_match:failures.append('instruction text missing or duplicated')
                    if missing or positions!=sorted(positions):failures.append('missing or reordered rows')
                    if not heights or min(heights)<9:failures.append('PDF text scaled below readable size')
                    if out_of_page:failures.append('content outside page')
                    if kind=='short' and len(pages)!=1:failures.append('short prescription not one page')
                    if kind in ['long','oversize'] and len(pages)<2:failures.append('long prescription pagination')
                    if any(not page_text.strip() for page_text in text.split('\f')[:-1]):failures.append('blank pages')
                    if 'Dossier fictif A' not in text:failures.append('patient name missing')
                    unchanged=page.evaluate(fixtures.snapshot_script)['stored']==before
                    if not unchanged or errors:failures.append('storage or runtime')
                    record={'kind':kind,'theme':theme,'viewport':f'{w}x{h}','expectedRows':count,'firstRowPage':first_row_page,'expectedInstructionPhrases':expected_phrases,'actualInstructionPhrases':actual_phrases,'instructionTokensMatch':tokens_match,'missingTokens':dict(expected_tokens-actual_tokens),'unexpectedTokens':dict(actual_tokens-expected_tokens),'pdfPages':len(pages),'missingRows':missing,'rowsInOrder':positions==sorted(positions),'minimumRowWordHeightPt':min(heights) if heights else None,'outsidePage':out_of_page,'splitRows':split_rows,'clinicalStorageUnchanged':unchanged,'pageErrors':errors,'failures':failures}
                    records.append(record);(out/'results.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
                    subprocess.run(['pdftoppm','-f','1','-singlefile','-scale-to','1100','-png',str(pdf),str(out/(name+'-page-1'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
                    if kind in ['long','oversize']:subprocess.run(['pdftoppm','-f',str(len(pages)),'-singlefile','-scale-to','1100','-png',str(pdf),str(out/(name+'-page-last'))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
                    print(kind,theme,record,flush=True)
                    context.close()
            browser.close()
        if any(record['failures'] for record in records):raise SystemExit(1)
    finally:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
