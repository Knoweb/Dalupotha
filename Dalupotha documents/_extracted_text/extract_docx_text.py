import re, zipfile, pathlib
from xml.etree import ElementTree as ET

def docx_to_text(p: pathlib.Path) -> str:
    with zipfile.ZipFile(p) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    texts = [t.text for t in root.findall(".//w:t", ns) if t.text]
    s = "".join(texts)
    s = re.sub(r"[\t\r ]{2,}", " ", s)
    return s.strip()

def main():
    base = pathlib.Path(r"C:\Users\USER\OneDrive - itum.mrt.ac.lk\Desktop\Dalupotha\Dalupotha documents")
    out_dir = base / "_extracted_text"
    out_dir.mkdir(exist_ok=True)

    names = [
        "Business Problem Document.docx",
        "Business Requirement Document.docx",
        "Software Requirements Specification (SRS)-Project Dalupotha.docx",
        "System Architecture Document.docx",
        "API Documentation.docx",
        "Existing requirment for Dalupotha_21-02-2026.docx",
        "PROJECT CHARTER.docx",
    ]

    for name in names:
        p = base / name
        if not p.exists():
            print("missing", name)
            continue
        try:
            txt = docx_to_text(p)
        except Exception as e:
            print("failed", name, e)
            continue
        out = out_dir / (p.stem + ".txt")
        out.write_text(txt, encoding="utf-8")
        print("ok", name, "->", out.name, "chars", len(txt))

if __name__ == "__main__":
    main()
