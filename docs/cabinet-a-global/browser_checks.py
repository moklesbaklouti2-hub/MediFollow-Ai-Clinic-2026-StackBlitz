from fixtures import root

def check_layout(page):
    m=page.evaluate((root/'layout.js').read_text())
    assert not m['overflow'] and not m['duplicateIds'],m
    assert m['assistantDocked'],('Assistant covers content/navigation',m['orbBox'])
    assert m['brandClear'],'Assistant covers the brand'
    assert m['prototypeVisible'] and m['storageVisible']
    for f in m['fields']:
        assert f['name'],('Unlabeled field',f)
        assert f['targetHeight']>=48 and f['targetWidth']>=48,('Small field target',f)
        if f['type'] not in ['checkbox','radio']:assert f['font']>=16,('Small field text',f)
    for b in m['buttons']:assert b['height']>=48 and b['width']>=48,('Small button',b)
    return m
