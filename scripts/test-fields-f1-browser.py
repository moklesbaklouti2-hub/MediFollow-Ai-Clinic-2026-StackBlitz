"""Optional browser regression: requires Python Playwright and Chromium.

Start Vite, then run npm run test:fields-f1:browser. Only fictitious local
records are used; API/external requests are blocked before the app loads.
"""
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
import os


URL = os.environ.get('MEDIFOLLOW_TEST_URL', 'http://127.0.0.1:5191').rstrip('/')
OUTPUT = Path(os.environ.get('MEDIFOLLOW_TEST_OUTPUT', '/tmp/medifollow-fields-f1-browser.json'))
PATIENTS = [
    {'id': 'f1-a', 'name': 'Dossier fictif A', 'age': 42, 'sex': 'Non renseigné', 'status': 'Nouveau'},
    {'id': 'f1-b', 'name': 'Dossier fictif B', 'age': 51, 'sex': 'Non renseigné', 'status': 'Nouveau'},
]
OTHER_RECORD = {
    'id': 'f1-other', 'patientId': 'f1-b', 'patient': 'Dossier fictif B',
    'date': '2026-11-10T10:00:00+01:00', 'specialty': 'Médecine générale',
    'motif': 'Autre consultation fictive', 'symptoms': 'Autre histoire fictive',
    # Use the canonical shape: the existing storage reader fills missing vital
    # keys with empty strings before any save, including on the baseline.
    'history': '', 'vitals': {key: '' for key in [
        'systolic', 'diastolic', 'heartRate', 'spo2', 'temperature',
        'respiratoryRate', 'weight', 'height', 'glycemia',
    ]}, 'physicalExamination': {}, 'examination': '',
    'diagnosis': '', 'plan': '', 'createdAt': '2026-11-10', 'updatedAt': '2026-11-10',
}
TEXT_FIELDS = {
    'consultation-reason': 'Contrôle fictif F1',
    'consultation-symptoms': 'Histoire fictive conservée, sans données réelles.',
    'consultation-history': 'Antécédents fictifs conservés.',
    'consultation-interview': 'Réponse fictive conservée.',
    'consultation-examination-notes': 'Notes historiques fictives conservées.',
    'consultation-diagnosis': 'Hypothèse de démonstration',
    'consultation-plan': 'Plan fictif conservé.',
    'follow-up-date': '2026-11-20',
    'follow-up-objective': 'Contrôle des constantes fictives.',
}
VITALS = {'systolic': '120', 'diastolic': '80', 'heartRate': '72', 'spo2': '98',
          'temperature': '37', 'respiratoryRate': '16', 'weight': '70',
          'height': '170', 'glycemia': '1,05'}
STATUS_IDS = {
    'generalAppearance': 'not_examined', 'consciousness': 'normal',
    'orientation': 'abnormal', 'hydration': 'not_recorded',
}


def open_consultations(page, width):
    if width <= 600:
        page.get_by_role('button', name='Pages', exact=True).click()
    page.get_by_role('navigation', name='Navigation principale').get_by_role(
        'button', name='Consultations', exact=True).click()
    toggle = page.get_by_role('checkbox', name='Activer ou désactiver le copilote clinique intelligent')
    if toggle.is_checked():
        toggle.uncheck()


def records(page):
    return page.evaluate("JSON.parse(localStorage.getItem('medifollow-consultations'))")


def primary(page):
    return next(row for row in records(page) if row.get('patientId') == 'f1-a')


def ensure_open(locator):
    if not locator.evaluate('e=>e.open'):
        locator.locator('summary').first.click()


results = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('MEDIFOLLOW_CHROMIUM', '/usr/bin/chromium'),
                                headless=True, args=['--no-sandbox'])
    for width, height in [(1280, 800), (800, 1280), (360, 740)]:
        for theme in ['light', 'dark']:
            context = browser.new_context(viewport={'width': width, 'height': height},
                                          has_touch=True, timezone_id='Africa/Tunis')
            page = context.new_page()
            page.emulate_media(reduced_motion='reduce')
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.route('**/*', lambda route: route.continue_()
                       if route.request.url.startswith(URL + '/') and '/api/' not in route.request.url
                       else route.abort())
            page.clock.set_fixed_time(datetime.fromisoformat('2026-11-17T16:00:00+01:00'))
            initial = {'medifollow-theme-v2-initialized': 'true', 'medifollow-theme': theme,
                       'medifollow-patients': json.dumps(PATIENTS),
                       'medifollow-consultations': json.dumps([OTHER_RECORD]),
                       'medifollow-prescriptions': '[]',
                       'medifollow-inventory': '{"items":[],"movements":[]}'}
            page.add_init_script('for(const [k,v] of Object.entries(' + json.dumps(initial) +
                                 '))localStorage.setItem(k,v)')
            page.goto(URL)
            open_consultations(page, width)
            page.locator('[data-field-design="f1"]').wait_for()
            page.locator('#consultation-patient').select_option('f1-a')
            page.locator('#consultation-specialty').select_option('Médecine générale')
            historical = page.locator('details').filter(has=page.locator('#consultation-examination-notes'))
            ensure_open(historical)
            for key, value in TEXT_FIELDS.items():
                page.locator('#' + key).fill(value)
            for key, value in VITALS.items():
                page.locator('#consultation-vital-' + key).fill(value)
            ensure_open(page.locator('.pex-section').first)
            for key, value in STATUS_IDS.items():
                select = page.locator('#pex-status-general-' + key)
                assert set(select.locator('option').evaluate_all('es=>es.map(e=>e.value)')) == {
                    'normal', 'abnormal', 'not_examined', 'not_recorded'}
                assert select.input_value() == 'not_recorded'
                select.select_option(value)
            page.locator('#pex-observations-general-generalAppearance').fill('Constatation fictive conservée.')

            # Check actual geometry and styles, not stylesheet text.
            metrics = page.evaluate('''()=>{
              const controls=[...document.querySelectorAll('.consultation-section input:not([type=checkbox]),.consultation-section select,.consultation-section textarea')].filter(e=>e.getBoundingClientRect().height>0);
              const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
              return {
                overflow:document.documentElement.scrollWidth>innerWidth,
                duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,a)=>a.indexOf(id)!==i),
                fields:controls.map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect(),l=document.querySelector('label[for="'+e.id+'"]');return {id:e.id,height:r.height,multiline:e.tagName==='TEXTAREA',font:parseFloat(s.fontSize),labelAbove:!!l&&l.getBoundingClientRect().bottom<=r.top+2}}),
                vitals:[...document.querySelectorAll('.vital-input-row input')].map(e=>{const s=getComputedStyle(e);ctx.font=s.font;return {id:e.id,available:e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),textWidth:ctx.measureText(e.value).width,unitInside:e.parentElement.querySelector('span').getBoundingClientRect().right<=e.getBoundingClientRect().right}})
              };
            }''')
            assert not metrics['overflow'] and not metrics['duplicateIds'], metrics
            assert all(field['height'] >= 52 and field['font'] >= 16 and field['labelAbove']
                       for field in metrics['fields']), metrics['fields']
            assert all(not field['multiline'] or field['height'] >= 112
                       for field in metrics['fields']), 'Comment fields must retain their readable multiline height'
            assert all(vital['available'] >= vital['textWidth'] and vital['unitInside']
                       for vital in metrics['vitals']), metrics['vitals']
            page.keyboard.press('Tab')
            page.locator('#consultation-vital-systolic').focus()
            focus = page.locator('#consultation-vital-systolic').evaluate(
                'e=>({style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth),clipped:getComputedStyle(e.closest(".vital-card")).overflow})')
            assert focus['style'] != 'none' and focus['width'] >= 2 and focus['clipped'] == 'visible', focus

            page.get_by_role('button', name='Enregistrer la consultation', exact=True).click()
            page.get_by_text('Consultation enregistrée et reliée au dossier du patient.', exact=True).wait_for()
            saved = primary(page)
            assert saved['vitals'] == VITALS, saved['vitals']
            for key, value in STATUS_IDS.items():
                actual = saved['physicalExamination']['general'].get(key, {}).get('status', 'not_recorded')
                assert actual == value, (key, actual)
            assert saved['physicalExamination']['general']['generalAppearance']['value'] == 'Constatation fictive conservée.'
            assert saved['examination'] == TEXT_FIELDS['consultation-examination-notes']
            assert saved['followUp']['objective'] == TEXT_FIELDS['follow-up-objective']
            assert saved['followUp']['dueDate'] == TEXT_FIELDS['follow-up-date']
            assert len(records(page)) == 2

            page.get_by_role('button', name='Modifier cette consultation', exact=True).first.click()
            for key, value in TEXT_FIELDS.items():
                assert page.locator('#' + key).input_value() == value, key
            for key, value in VITALS.items():
                assert page.locator('#consultation-vital-' + key).input_value() == value, key
            ensure_open(page.locator('.pex-section').first)
            assert page.locator('#pex-status-general-generalAppearance').input_value() == 'not_examined'
            page.locator('#pex-observations-general-generalAppearance').fill('Constatation fictive corrigée.')
            page.get_by_role('button', name='Enregistrer les modifications', exact=True).click()
            page.wait_for_function("JSON.parse(localStorage.getItem('medifollow-consultations')).some(r=>r.patientId==='f1-a'&&r.physicalExamination.general.generalAppearance.value==='Constatation fictive corrigée.')")
            updated = primary(page)
            expected = json.loads(json.dumps(saved))
            expected['physicalExamination']['general']['generalAppearance']['value'] = 'Constatation fictive corrigée.'
            expected['updatedAt'] = updated['updatedAt']
            assert updated == expected, 'Editing one finding changed other clinical values'
            page.get_by_role('button', name='Modifier cette consultation', exact=True).first.click()
            page.locator('#consultation-reason').fill('Brouillon fictif à annuler')
            page.get_by_role('button', name='Annuler la modification', exact=True).click()
            assert primary(page) == updated
            actual_other = next(row for row in records(page) if row['id'] == 'f1-other')
            assert actual_other == OTHER_RECORD, (actual_other, OTHER_RECORD)
            assert page.evaluate("localStorage.getItem('medifollow-patients')") == initial['medifollow-patients']
            assert page.evaluate("localStorage.getItem('medifollow-prescriptions')") == '[]'
            assert page.evaluate("localStorage.getItem('medifollow-inventory')") == initial['medifollow-inventory']
            assert not errors, errors
            results.append({'viewport': f'{width}x{height}', 'theme': theme,
                            'saveEditCancelRoundtrip': True, 'fourExamStatuses': True,
                            'otherPatientUntouched': True, 'focus': focus, 'pageErrors': errors, **metrics})
            OUTPUT.parent.mkdir(parents=True, exist_ok=True)
            OUTPUT.write_text(json.dumps(results, indent=2))
            print(f'PASS F1 {width}x{height} {theme}: labels, units, focus, four statuses, save/edit/cancel and patient isolation', flush=True)
            context.close()
    browser.close()
assert len(results) == 6
