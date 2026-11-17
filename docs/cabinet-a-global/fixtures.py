from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright
import json,sys,subprocess
root=Path(__file__).resolve().parent
URL='http://127.0.0.1:5195'
patients=[{'id':'lab003-a','name':'Dossier fictif A','age':42,'sex':'Non renseigné','status':'Actif'},{'id':'lab003-b','name':'Dossier fictif B','age':51,'sex':'Non renseigné','status':'Nouveau'}]
consultations=[]
for cid,pid,name,date,due in [('c1','lab003-a','Dossier fictif A','2026-11-17T10:00:00+01:00','2026-11-17'),('c2','lab003-b','Dossier fictif B','2026-11-16T10:00:00+01:00','2026-11-16'),('c3','lab003-a','Dossier fictif A','2026-11-10T10:00:00+01:00','2026-11-20'),('c4','missing','Document fictif à relier','2026-11-17T09:00:00+01:00','2026-11-27'),('c5','lab003-a','Dossier fictif A','2026-09-12T10:00:00+01:00','2026-12-01'),('c6','lab003-b','Dossier fictif B','2026-11-09T10:00:00+01:00','')]:
 consultations.append({'id':cid,'patientId':pid,'patient':name,'date':date,'specialty':'Médecine générale','motif':'Contrôle fictif '+cid,'symptoms':'Démonstration','history':'','vitals':{'systolic':'120','diastolic':'80','heartRate':'72','spo2':'98','temperature':'37'} if cid=='c1' else {},'physicalExamination':{},'examination':'','diagnosis':'','plan':'','createdAt':date,'updatedAt':date,'followUp':{'dueDate':due,'objective':'Contrôle de démonstration','status':'planned'}})
prescriptions=[{'id':'rx1','patientId':'lab003-a','patient':'Dossier fictif A','date':'2026-11-17','medications':[],'exams':[]},{'id':'rx2','patientId':'missing','patient':'Document fictif à relier','date':'2026-11-16','medications':[],'exams':[]}]
inventory={'items':[{'id':'stock1','name':'Compresses fictives','category':'supply','unit':'boîte','quantity':2,'minimumQuantity':5,'unitCost':3.5,'expiryDate':'2026-11-01','batchNumber':'LAB-01','createdAt':'2026-11-01','updatedAt':'2026-11-17'},{'id':'stock2','name':'Gants fictifs','category':'supply','unit':'boîte','quantity':3,'minimumQuantity':2,'expiryDate':'2026-11-30','batchNumber':'LAB-02','createdAt':'2026-11-01','updatedAt':'2026-11-17'}],'movements':[{'id':'m1','itemId':'stock1','itemName':'Compresses fictives','type':'entry','quantity':2,'date':'2026-11-16','reason':'Entrée fictive'},{'id':'m2','itemId':'stock2','itemName':'Gants fictifs','type':'dispense','quantity':1,'date':'2026-11-17','reason':'Sortie fictive'}]}

def seed(page,dataset,theme,blocked_theme=False,blocked_storage=False):
 data={'medifollow-theme-v2-initialized':'true','medifollow-theme':theme,'medifollow-settings':json.dumps({'doctorName':'Cabinet fictif A','specialty':'Démonstration','cabinetName':'Cabinet de démonstration','address':'Adresse fictive','phone':'00000000','email':'demo@example.test','copilotEnabled':True,'confirmBeforePrescription':True,'themePreference':theme}),'medifollow-patients':json.dumps(patients if dataset=='fictif' else []),'medifollow-consultations':json.dumps(consultations if dataset=='fictif' else []),'medifollow-prescriptions':json.dumps(prescriptions if dataset=='fictif' else []),'medifollow-inventory':json.dumps(inventory if dataset=='fictif' else {'items':[],'movements':[]})}
 script='if(!localStorage.getItem("cabinet-a-fixture-ready")){for(const [k,v] of Object.entries('+json.dumps(data)+'))localStorage.setItem(k,v);localStorage.setItem("cabinet-a-fixture-ready","true");}'
 if blocked_theme:script+='const originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==="medifollow-theme"||k==="medifollow-theme-v2-initialized")throw new DOMException("Synthetic test refusal","QuotaExceededError");return originalSetItem.call(this,k,v);};'
 if blocked_storage:script+='Object.defineProperty(window,"localStorage",{get(){throw new DOMException("Synthetic test refusal","SecurityError");}});'
 page.add_init_script(script)
 page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(URL+'/') and '/api/' not in r.request.url else r.abort())
 page.emulate_media(reduced_motion='reduce');page.clock.set_fixed_time(datetime.fromisoformat('2026-11-17T19:00:00+01:00'))

snapshot_script=r'''()=>{
 const text=e=>e.textContent.replace(/\s+/g,' ').trim();
 const texts=s=>[...document.querySelectorAll(s)].map(text);
 const panel=title=>[...document.querySelectorAll('h3')].filter(e=>e.textContent===title).map(e=>text(e.closest('.mf-panel,.wd-panel')));
 const cards=[...document.querySelectorAll('.mf-stat,.wd-kpi')].slice(0,4).map(e=>({label:text(e.querySelector('.mf-stat-label,.wd-kpi-label')),value:text(e.querySelector('strong')),note:text(e.querySelector('.mf-stat-foot span,.wd-kpi-note'))}));
 return {overflow:document.documentElement.scrollWidth>innerWidth,duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,a)=>a.indexOf(id)!==i),stats:cards,recent:texts('.mf-activity-copy,.wd-recent-copy'),chart:texts('.mf-chart-labels span,.wd-chart-labels span'),follow:texts('[aria-label="HELIOS Follow-up : échéances de suivi"]'),identity:texts('[aria-label="Documents sans dossier patient confirmé"]'),inventory:panel('État de l’inventaire'),activity:texts('[aria-label="HELIOS Activité — statistiques descriptives"]'),indicators:texts('.mf-indicator,.wd-indicator'),stored:Object.fromEntries(['medifollow-patients','medifollow-consultations','medifollow-prescriptions','medifollow-inventory'].map(k=>[k,localStorage.getItem(k)]))};
}'''
