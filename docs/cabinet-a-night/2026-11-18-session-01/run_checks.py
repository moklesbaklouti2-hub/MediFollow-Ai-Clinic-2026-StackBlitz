from pathlib import Path
import subprocess,json,hashlib,datetime,sys,os
from preflight import repo,root,verify,output_root
verify("after")
evidence=output_root();os.environ["MEDIFOLLOW_EVIDENCE_DIR"]=str(evidence)
def sources():
 names=subprocess.check_output(['git','ls-files','--','src','server','scripts','index.html','package.json','package-lock.json'],cwd=repo,text=True).splitlines()
 return {n:hashlib.sha256((repo/n).read_bytes()).hexdigest() for n in names}
before=sources();commands=[('explore.py',['baseline','after'],'accessibility-after'),('explore.py',['long','after'],'responsive-after'),('print_check.py',['after'],'print-after'),('print_check.py',['after-oversize','oversize'],'print-oversize'),('status_check.py',['after'],'status-after')]
manifest={'startedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parentHEAD':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'sourceHashes':before,'runs':[]}
for script,args,name in commands:
 print('RUN',name,flush=True)
 with open('/tmp/cabinet-night-01-'+name+'.log','w') as output:r=subprocess.run([sys.executable,str(root/script),*args],env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'},stdout=output,stderr=subprocess.STDOUT,cwd=repo)
 print(name,'EXIT',r.returncode,flush=True);manifest['runs'].append({'script':script,'arguments':args,'exitCode':r.returncode});(evidence/'final-run.json').write_text(json.dumps(manifest,indent=2)+'\n')
 if r.returncode:
  print(Path('/tmp/cabinet-night-01-'+name+'.log').read_text()[-3000:],flush=True);raise SystemExit(r.returncode)
assert sources()==before,'Application sources changed during suite'
manifest['sourceHashesUnchanged']=True;manifest['completedAtUTC']=datetime.datetime.now(datetime.timezone.utc).isoformat();(evidence/'final-run.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('PASS all targeted browser checks on unchanged application sources',flush=True)
print("Evidence:",evidence,flush=True)
