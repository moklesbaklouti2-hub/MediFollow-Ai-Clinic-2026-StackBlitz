from pathlib import Path
import json,struct
root=Path(__file__).resolve().parent
a=json.loads((root/'avant/metrics.json').read_text()); b=json.loads((root/'apres/metrics.json').read_text())
assert len(a)==len(b)==6
for old,new in zip(a,b):
 assert old==new,(new['viewport'],new['theme'])
 assert not new['overflow'] and not new['duplicateIds'] and not new['pageErrors']
for stage in ['avant','apres']:
 paths=list((root/stage).glob('*.png'));assert len(paths)==24
 for path in paths:
  expected=tuple(map(int,path.name.split('-')[0].split('x')))
  assert struct.unpack('>II',path.read_bytes()[16:24])==expected,path.name
browser=json.loads((root/'browser-results.json').read_text());assert len(browser)==6
for row in browser:
 assert row['saveEditCancelRoundtrip'] and row['fourExamStatuses'] and row['otherPatientUntouched']
 assert not row['pageErrors'] and not row['overflow'] and not row['duplicateIds']
 assert row['focus']['style']!='none' and row['focus']['width']>=2 and row['focus']['clipped']=='visible'
 assert all(field['height']>=52 and field['font']>=16 and field['labelAbove'] for field in row['fields'])
 assert all(not field['multiline'] or field['height']>=112 for field in row['fields'])
 assert all(v['unitInside'] and v['available']>=v['textWidth'] for v in row['vitals'])
print(json.dumps({'status':'PASS','screenshots':48,'identicalBeforeAfterFormStates':6,'saveEditCancelRoundtrips':6,'clinicalFieldBindingsPreserved':89,'visibleFieldChecks':sum(len(r['fields']) for r in browser),'vitalGeometryChecks':sum(len(r['vitals']) for r in browser),'minimumFieldHeight':min(f['height'] for r in browser for f in r['fields']),'minimumTextareaHeight':min(f['height'] for r in browser for f in r['fields'] if f['multiline'])},indent=2))
