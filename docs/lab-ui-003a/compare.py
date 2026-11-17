from pathlib import Path
import json,struct
root=Path(__file__).resolve().parent
before=json.loads((root/'avant/metrics.json').read_text());after=json.loads((root/'apres/metrics.json').read_text());assert len(before)==len(after)==16
for old,new in zip(before,after):
 assert (old['dataset'],old['viewport'],old['theme'])==(new['dataset'],new['viewport'],new['theme'])
 for key in ['stats','recent','chart','follow','identity','inventory','activity','indicators','stored']:
  assert old[key]==new[key],(new['dataset'],new['viewport'],new['theme'],key)
 assert not new['overflow'] and not new['duplicateIds'] and not new['pageErrors']
for stage in ['avant','apres']:
 paths=list((root/stage).glob('*.png'));assert len(paths)==32
 for path in paths:
  w,h=map(int,path.name.split('-')[1].split('x'));actual=struct.unpack('>II',path.read_bytes()[16:24]);assert actual[0]==w
  if '-complet' not in path.name:assert actual[1]==h
checks=json.loads((root/'interactions.json').read_text());assert len(checks)==6
assert sum(len(c['routes']) for c in checks)==66
for c in checks:
 assert c['clinicalStorageUnchanged'] and not c['pageErrors'] and c['focus']['width']>=3 and c['primaryContrast']>=4.5
 assert all(v['width']>=44 and v['height']>=44 for v in c['controls'])
extra=json.loads((root/'extras.json').read_text());assert len(extra['reflow'])==2 and extra['automaticTheme']['preferencePreserved']
refresh=json.loads((root/'refresh.json').read_text());assert refresh['restored'] and refresh['recentListAndStockUpdated'] and refresh['lateKpiMatchesFollowup'] and not refresh['pageErrors']
assert len(list(root.glob('focus-*.png')))==6 and len(list(root.glob('reflow-*.png')))==2
council=json.loads((root/'council.json').read_text());assert len(council)==10
assert {(c['viewport'],c['theme']) for c in council}=={(str(w)+'x1280',t) for w in [701,750,800,850,900] for t in ['light','dark']}
for c in council:
 for flag in ['heliosBeforeAgendaAndRecent','heliosButtonInFirstViewport','identityPreservedBeforeTools','storageNoticeVisible','prototypeVisible','heliosCallbackNavigates','clinicalStorageUnchanged']:
  assert c[flag],(c['viewport'],c['theme'],flag)
 b=c['boxes'];assert b['helios']['y']<min(b['agenda']['y'],b['recent']['y'])
 assert b['heliosButton']['y']+b['heliosButton']['height']<=1280
 assert b['identity']['y']+b['identity']['height']<=b['helios']['y']
 assert b['header']['height']+b['welcome']['height']<=300 and not c['pageErrors']
 assert c['storageFailureChecked']==(c['viewport']=='800x1280')
assert (root/'storage-alert-800x1280-light.png').is_file()
print(json.dumps({'status':'PASS','beforeAfterDataComparisons':16,'comparisonScreenshots':64,'focusAndReflowScreenshots':8,'saveFailureScreenshots':1,'navigationChecks':76,'existingNavigationChecks':66,'councilPortraitConfigurations':10,'minimumPrimaryContrast':min(c['primaryContrast'] for c in checks),'autoTheme':True,'refreshEvent':True,'nativeZoomTested':False},indent=2))
