from pathlib import Path
import json,struct
root=Path(__file__).resolve().parent
before=json.loads((root/'avant/metrics.json').read_text());after=json.loads((root/'apres/metrics.json').read_text());assert len(before)==len(after)==64
identity=lambda r:(r['page'],r['viewport'],r['theme'])
assert [identity(r) for r in before]==[identity(r) for r in after]
field_count=0;button_count=0
for old,new in zip(before,after):
    assert old['controls']==new['controls'],(identity(new),'field values/options changed')
    assert old.get('detailControls')==new.get('detailControls'),(identity(new),'dossier values changed')
    if new['page']=='dashboard':
        for key in ['stats','recent','chart','follow','identity','inventory','activity','indicators','stored']:assert old['dashboard'][key]==new['dashboard'][key],(identity(new),key)
    assert new['clinicalStorageUnchanged'] and not new['pageErrors'] and not new['overflow']
    for key in ['ui','detailUI','examUI']:
        if key not in new:continue
        ui=new[key];assert not ui['overflow'] and not ui['duplicateIds'] and ui['assistantDocked'] and ui['brandClear']
        assert ui['prototypeVisible'] and ui['storageVisible']
        for field in ui['fields']:
            assert field['name'] and field['targetHeight']>=48 and field['targetWidth']>=48
            if field['type'] not in ['checkbox','radio']:assert field['font']>=16
            field_count+=1
        for button in ui['buttons']:assert button['width']>=48 and button['height']>=48;button_count+=1
for stage in ['avant','apres']:
    images=list((root/stage).glob('*.png'));assert len(images)==88,(stage,len(images))
    for image in images:
        dims=image.stem.split('-')[1];width,height=map(int,dims.split('x'));actual=struct.unpack('>II',image.read_bytes()[16:24]);assert actual[0]==width
        if 'complet' not in image.stem:assert actual[1]==height
actions=json.loads((root/'actions.json').read_text());assert len(actions)==3
for case in actions:
    assert not case['pageErrors']
    for key,value in case.items():
        if isinstance(value,bool):assert value,(case['viewport'],key)
navigation=json.loads((root/'navigation.json').read_text());assert len(navigation)==9
for case in navigation:
    if 'pageErrors' in case:assert not case['pageErrors']
    for key,value in case.items():
        if isinstance(value,bool):assert value,(case,key)
    if 'focus' in case:assert case['focus']['width']>=3 and case['focus']['style']!='none'
contrast=json.loads((root/'contrast.json').read_text());assert len(contrast)==16
assert all(not c['failures'] for c in contrast),contrast
assert len(list(root.glob('impression-*.png')))==3
pdfs=list(root.glob('impression-*.pdf'));assert len(pdfs)==3
for pdf in pdfs:assert pdf.read_bytes().startswith(b'%PDF-') and pdf.stat().st_size>10000
assert all(c.get('printPdfOnePageAndContent') for c in actions)
assert len(list(root.glob('focus-*.png')))==4
assert len(list(root.glob('assistant-*.png')))==2
assert len(list(root.glob('reflow-*.png')))==2
assert (root/'storage-warning-800-dark.png').exists()
print(json.dumps({'status':'PASS','pageComparisons':64,'dashboardClinicalComparisons':8,'comparisonScreenshots':176,'extraScreenshots':12,'onePagePdfExports':3,'syntheticWriteWorkflows':3,'portraitNavigationCases':4,'reflowCases':2,'storageFailureModes':2,'contrastPageCases':16,'fieldStatesMeasured':field_count,'buttonStatesMeasured':button_count,'nativeChromeZoomTested':False},indent=2))
