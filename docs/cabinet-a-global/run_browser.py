from pathlib import Path
import subprocess,time,urllib.request,sys,os,json

root=Path(__file__).resolve().parent
repo=Path(os.environ.get('MEDIFOLLOW_REPO',Path(__file__).resolve().parents[2]))
reference=json.loads((root/'reference.json').read_text())
stage='avant' if len(sys.argv)>1 and sys.argv[1]=='avant' else 'apres'
subprocess.run(['git','diff','--quiet',reference[stage],'--','src','server','package.json','package-lock.json'],cwd=repo,check=True)
with open('/tmp/cabinet-a-vite.log','w') as server_log:
    server=subprocess.Popen([str(repo/'node_modules/.bin/vite'),'--host','127.0.0.1','--port','5195','--strictPort'],cwd=repo,stdout=server_log,stderr=subprocess.STDOUT)
    try:
        for attempt in range(100):
            if server.poll() is not None:raise RuntimeError('Local Vite server exited')
            try:
                urllib.request.urlopen('http://127.0.0.1:5195',timeout=1).close();break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('Local Vite server unavailable')
        commands=[('navigation.py',[],'navigation'),('actions.py',[],'actions'),('check-contrast.py',[],'contrast'),('capture.py',['apres'],'capture')]
        if len(sys.argv)>1 and sys.argv[1]=='capture':commands=commands[-1:]
        if len(sys.argv)>1 and sys.argv[1]=='navigation':commands=commands[:1]
        if len(sys.argv)>1 and sys.argv[1]=='actions':commands=commands[1:2]
        if stage=='avant':commands=[('capture.py',['avant'],'before')]
        for script,args,log in commands:
            print('Running',script,*args,flush=True)
            with open('/tmp/cabinet-a-'+log+'.log','w') as output:
                result=subprocess.run([sys.executable,str(root/script),*args],cwd=repo,stdout=output,stderr=subprocess.STDOUT)
            if result.returncode:
                print(Path('/tmp/cabinet-a-'+log+'.log').read_text()[-4500:],flush=True);sys.exit(result.returncode)
            print('PASS',script,flush=True)
        print('PASS full real-browser suite on unchanged application sources',flush=True)
    finally:
        server.terminate()
        try:server.wait(timeout=10)
        except subprocess.TimeoutExpired:server.kill();server.wait()
