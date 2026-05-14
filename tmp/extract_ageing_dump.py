import pathlib
import zipfile
import xml.etree.ElementTree as ET

path = pathlib.Path(r"C:\Users\USER\Downloads\Debtors Update (1).xlsx")
out = pathlib.Path(r"C:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\Dalupotha\tmp\ageing_dump.txt")

ns = {
    'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}

with zipfile.ZipFile(path) as z:
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rid_to_target = {rel.attrib['Id']: rel.attrib['Target'] for rel in rels}

    sheet_target = None
    for sheet in wb.find('a:sheets', ns):
        if sheet.attrib['name'] == 'Kuru-Ageing':
            rid = sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            sheet_target = 'xl/' + rid_to_target[rid]
            break
    if sheet_target is None:
        raise SystemExit('Sheet Kuru-Ageing not found')

    shared = []
    try:
        sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in sst:
            shared.append(''.join(t.text or '' for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')))
    except KeyError:
        pass

    ws = ET.fromstring(z.read(sheet_target))
    lines = []
    for row in ws.find('a:sheetData', ns):
        r = int(row.attrib['r'])
        if r > 40:
            break
        vals = []
        for cell in row:
            ref = cell.attrib.get('r', '')
            t = cell.attrib.get('t')
            v = cell.find('a:v', ns)
            val = ''
            if v is not None:
                val = v.text or ''
            if t == 's' and val != '':
                val = shared[int(val)]
            elif t == 'inlineStr':
                val = ''.join(x.text or '' for x in cell.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'))
            vals.append(f'{ref}={val}')
        lines.append(f'{r} | ' + ' | '.join(vals))

out.write_text('\n'.join(lines), encoding='utf-8')
print(out)
