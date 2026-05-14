import zipfile
import xml.etree.ElementTree as ET

path = r'C:\Users\USER\Downloads\Debtors Update (1).xlsx'
z = zipfile.ZipFile(path)
ns = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', 'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
wb = ET.fromstring(z.read('xl/workbook.xml'))
rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
rid_to_target = {rel.attrib['Id']: rel.attrib['Target'] for rel in rels}

sheet_target = None
for s in wb.find('a:sheets', ns):
    if s.attrib['name'] == 'Kuru-Ageing':
        sheet_target = 'xl/' + rid_to_target[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        break

print('target', sheet_target)

shared = []
try:
    sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in sst:
        texts = []
        for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
            texts.append(t.text or '')
        shared.append(''.join(texts))
except KeyError:
    pass

ws = ET.fromstring(z.read(sheet_target))
for row in ws.find('a:sheetData', ns):
    r = int(row.attrib['r'])
    vals = []
    for c in row:
        ref = c.attrib.get('r')
        t = c.attrib.get('t')
        v = c.find('a:v', ns)
        val = ''
        if v is not None:
            val = v.text or ''
        if t == 's' and val != '':
            val = shared[int(val)]
        elif t == 'inlineStr':
            val = ''.join(x.text or '' for x in c.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
        vals.append(f'{ref}={val}')
    if r <= 40:
        print(r, ' | '.join(vals))
