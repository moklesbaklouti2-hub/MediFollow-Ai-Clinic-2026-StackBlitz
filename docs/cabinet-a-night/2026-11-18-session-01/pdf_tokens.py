from collections import Counter
import unicodedata

def normalized_tokens(text):
    return [unicodedata.normalize('NFKC',value) for value in text.split()]

def instruction_tokens(pages, medications):
    """Use column coordinates: PDF text extraction can interleave adjacent cells."""
    actual=[]
    end=f'FIN_{len(medications):03}_FICTIF'
    for page in pages:
        words=page.findall('.//{*}word')
        left=next((w for w in words if w.text=='Posologie'),None)
        right=next((w for w in words if w.text=='Durée'),None)
        if left is None or right is None:
            continue
        xmin=float(left.attrib['xMin'])-.5
        xmax=float(right.attrib['xMin'])-2
        ymin=float(left.attrib['yMax'])+.5
        last=next((w for w in words if w.text==end),None)
        ymax=float(last.attrib['yMax'])+.5 if last is not None else float(page.attrib['height'])
        actual.extend(w.text or '' for w in words if float(w.attrib['xMin'])>=xmin and float(w.attrib['xMax'])<=xmax and float(w.attrib['yMin'])>=ymin and float(w.attrib['yMax'])<=ymax)
        if last is not None:break
    expected=Counter(normalized_tokens(' '.join(' '.join([m['frequency'],m['route'],m['instructions']]) for m in medications)))
    actual=Counter(normalized_tokens(' '.join(actual)))
    return expected,actual
