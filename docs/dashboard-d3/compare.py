from pathlib import Path
import json,re
root=Path(__file__).resolve().parent
normalize=lambda x:re.sub(r'\s+',' ',x).strip() if isinstance(x,str) else [normalize(y) for y in x]
a=json.loads((root/'avant/metrics.json').read_text());b=json.loads((root/'apres/metrics.json').read_text())
assert len(a)==len(b)==12
keys=['stats','recent','chart','follow','alerts','inventory','indicators','appointments']
for old,new in zip(a,b):
 assert (old['dataset'],old['viewport'],old['theme'])==(new['dataset'],new['viewport'],new['theme'])
 assert not old['overflow'] and not new['overflow'] and not old['duplicateIds'] and not new['duplicateIds']
 for key in keys:assert normalize(old[key])==normalize(new[key]),(new['dataset'],new['viewport'],new['theme'],key)
 assert all(row['ratio']>=4.5 for row in new['textContrastSamples'])
actions=json.loads((root/'actions.json').read_text());assert len(actions)==6
assert all(len(row['actions'])==5 and row['clinicalStorageUnchanged'] and row['singleColumnSidePanels'] and not row['pageErrors'] for row in actions)
samples=[row['ratio'] for snapshot in b for row in snapshot['textContrastSamples']]
assert len(list((root/'avant').glob('*.png')))==len(list((root/'apres').glob('*.png')))==24
print(json.dumps({'clinicalContentComparisons':12,'categoriesCompared':keys,'screenshots':48,'buttonNavigations':30,'minimumSampledTextContrast':min(samples),'textContrastSamples':len(samples),'status':'PASS'},indent=2))
