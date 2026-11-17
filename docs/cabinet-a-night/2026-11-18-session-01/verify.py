"""Verify frozen browser evidence without launching a server or rewriting files."""
from pathlib import Path
import hashlib, json, sys, xml.etree.ElementTree as ET

root=Path(__file__).resolve().parent
read=lambda name:json.loads((root/name).read_text())
manifest=read('final-run.json')
assert manifest['sourceHashesUnchanged'] and len(manifest['runs'])==5
assert all(r['exitCode']==0 for r in manifest['runs'])
for folder,count in [('baseline-before',16),('baseline-after',16),('long-before-strict',48),('long-after',48)]:
    rows=read(folder+'/results.json');assert len(rows)==count
    assert all(r['dataUnchanged'] and not r['pageErrors'] for r in rows)
    if folder in ['baseline-before','baseline-after','long-after']:
        assert all(not r['failures'] for r in rows)
before=read('long-before-strict/results.json');after=read('long-after/results.json')
assert sum(bool(r['bad']) for r in before)==35
assert all(not r['bad'] for r in after)
assert [(r['viewport'],r['theme'],r['page']) for r in before]==[(r['viewport'],r['theme'],r['page']) for r in after]
for r in read('baseline-after/results.json'):
    assert r['keyboardSkipIntoMain'] and r['lang']=='fr'
    assert not r['unnamedFields'] and not r['unnamedAXControls']

oldpdf=read('print-before/results.json')
assert len(oldpdf)==4
assert all(len(r['splitRows'])==5 for r in oldpdf if r['kind']=='long')
pdfs=read('print-after/results.json')+read('print-after-oversize/results.json')
assert len(pdfs)==6
for r in pdfs:
    assert not r['failures'] and not r['missingRows'] and not r['outsidePage']
    assert r['rowsInOrder'] and r['instructionTokensMatch'] and r['clinicalStorageUnchanged']
    assert r['minimumRowWordHeightPt']>=9
    if r['kind']=='short':assert r['pdfPages']==1
    if r['kind']=='long':assert not r['splitRows']
    if r['kind']=='oversize':assert r['firstRowPage']==1
    folder='print-after-oversize' if r['kind']=='oversize' else 'print-after'
    path=root/folder/(r['kind']+'-'+r['theme'])
    assert path.with_suffix('.pdf').read_bytes().startswith(b'%PDF-')
    assert len(ET.fromstring(path.with_suffix('.xml').read_text()).findall('.//{*}page'))==r['pdfPages']

oldstatus=read('status-before/results.json');status=read('status-after/results.json')
assert len(oldstatus)==len(status)==2
assert all(r['initialRegionCount']==0 and r['saved']['contrast']<4.5 for r in oldstatus)
for r in status:
    assert not r['failures'] and r['initialRegionCount']==1
    assert r['otherMedicalDataUnchanged'] and r['stockUnchanged'] and r['failedSaveDataUnchanged'] and r['storageErrorAlert']
    assert not r['failedRequests'] and not r['pageErrors']
    assert all(c['type']!='error' for c in r['consoleBeforeSimulation'])
    for key in ['saved','refused']:
        state=r[key]
        assert state['regionCount']==1 and state['AXLive']=='polite' and state['AXAtomic']
        assert state['contrast']>=4.5
negative=read('negative-controls.json')
assert len(negative)==2 and all(r['exitCode']==r['expectedExitCode']==1 for r in negative)
assert len(list(root.rglob('*.png')))==32 and len(list(root.rglob('*.pdf')))==10
if '--check-source' in sys.argv:
    repo=root.parents[2]
    assert all(hashlib.sha256((repo/name).read_bytes()).hexdigest()==expected for name,expected in manifest['sourceHashes'].items())
print(json.dumps({'status':'PASS','finalPageStates':64,'beforePageStates':64,'clippedStatesBefore':35,'clippedStatesAfter':0,'finalPDFCases':6,'negativeRegressionCommands':2,'saveWorkflows':2,'messageStates':4,'pngArtifacts':32,'browserScreenshots':16,'pdfPageRenders':16,'pdfArtifacts':10,'sourceChecked':'--check-source' in sys.argv},indent=2))
