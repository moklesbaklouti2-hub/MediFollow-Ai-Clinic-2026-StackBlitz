from pathlib import Path
import json, os, subprocess, tempfile

root=Path(__file__).resolve().parent
repo=Path(os.environ.get('MEDIFOLLOW_REPO',str(root.parents[2])))

def verify(stage):
    key='before' if str(stage).startswith('before') else 'after'
    reference=json.loads((root/'references.json').read_text())[key]
    subprocess.run(['git','diff','--quiet',reference,'--','src','server','scripts','index.html','package.json','package-lock.json'],cwd=repo,check=True)

def output_root():
    path=Path(os.environ.get("MEDIFOLLOW_EVIDENCE_DIR") or tempfile.mkdtemp(prefix="medifollow-night-01-replay-"))
    path.mkdir(parents=True,exist_ok=True)
    return path
