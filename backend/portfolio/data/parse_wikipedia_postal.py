"""Parse Wikipedia FR postal code list → JSON for migration seed.

Usage: python -m portfolio.data.parse_wikipedia_postal <path-to.md>
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

from portfolio.data.algeria_wilayas import WILAYAS

WILAYA_BY_NORM = {}
for code, name in WILAYAS:
    key = _norm = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode('ascii').lower()
    key = re.sub(r'[^a-z0-9]+', ' ', key).strip()
    WILAYA_BY_NORM[key] = code

# Wikipedia section titles → wilaya code (when auto-match fails)
WIKI_ALIASES = {
    'oum el bouaghi': '04',
    'bejaia': '06',
    'bejaïa': '06',
    'bechar': '08',
    'bechar': '08',
    'béchar': '08',
    'tamanghasset': '11',
    'tamanrasset': '11',
    'tebessa': '12',
    'tébessa': '12',
    'tizi ouzou': '15',
    'tizi-ouzou': '15',
    'alger': '16',
    'setif': '19',
    'sétif': '19',
    'saida': '20',
    'saïda': '20',
    'sidi bel abbes': '22',
    'sidi bel abbès': '22',
    'medea': '26',
    'médéa': '26',
    'msila': '28',
    "m'sila": '28',
    'bordj bou arreridj': '34',
    'bordj-bou-arreridj': '34',
    'boumerdes': '35',
    'boumerdès': '35',
    'el tarf': '36',
    'ain defla': '44',
    'aïn defla': '44',
    'naama': '45',
    'naâma': '45',
    'ain temouchent': '46',
    'aïn temouchent': '46',
    'ghardaia': '47',
    'ghardaïa': '47',
    'aflou': '59',
    'el abiodh sidi cheikh': '60',
    'el aricha': '61',
    'el kantara': '62',
    'barika': '63',
    'bou saada': '64',
    'bou saâda': '64',
    'bir el ater': '65',
    'ksar el boukhari': '66',
    'ksar chellala': '67',
    'ain oussara': '68',
    'aïn oussara': '68',
    'messaad': '69',
    'messaâd': '69',
}


def normalize_name(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


def wilaya_code_for_section(title: str) -> str | None:
    norm = normalize_name(title)
    if norm in WIKI_ALIASES:
        return WIKI_ALIASES[norm]
    if norm in WILAYA_BY_NORM:
        return WILAYA_BY_NORM[norm]
    for key, code in WILAYA_BY_NORM.items():
        if norm == key or norm.startswith(key) or key.startswith(norm):
            return code
    for alias, code in WIKI_ALIASES.items():
        if norm == alias or alias in norm or norm in alias:
            return code
    return None


def parse_wilaya_section(text: str) -> list[dict]:
    start = text.find('## Classement par wilaya')
    if start < 0:
        return []
    chunk = text[start:]
    end = chunk.find('## Notes et références')
    if end > 0:
        chunk = chunk[:end]

    current_code = None
    seen: set[tuple[str, str]] = set()
    rows: list[dict] = []

    line_re = re.compile(r'^\*\s*(\d{5})\s+(.+?)\s*$')
    header_re = re.compile(r'^###\s+(.+?)\s*$')

    for line in chunk.splitlines():
        line = line.strip()
        hm = header_re.match(line)
        if hm:
            title = hm.group(1).strip()
            if title.startswith('2.'):
                continue
            current_code = wilaya_code_for_section(title)
            continue
        lm = line_re.match(line)
        if lm and current_code:
            postal = lm.group(1)
            city = lm.group(2).strip()
            key = (current_code, postal)
            if key in seen:
                continue
            seen.add(key)
            rows.append({'wilaya_code': current_code, 'postal_code': postal, 'city': city})

    return rows


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else __file__).resolve()
    if path.suffix != '.md':
        path = Path(__file__).parent / 'algeria_postal_wikipedia.md'
    text = path.read_text(encoding='utf-8')
    rows = parse_wilaya_section(text)
    out = Path(__file__).parent / 'algeria_postal_seed.json'
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=0), encoding='utf-8')
    print(f'Wrote {len(rows)} rows to {out}')


if __name__ == '__main__':
    main()
