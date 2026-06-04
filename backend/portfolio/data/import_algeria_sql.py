"""Import wilayas + postal codes from algeria_cities.sql / algeria_postcodes.sql.

Usage:
  python -m portfolio.data.import_algeria_sql [path-to-folder]
"""

import json
import re
import sys
from pathlib import Path

# Official French names (58 wilayas, 2019 reform)
WILAYA_NAME_FIX = {
    'El Meghaier': "El M'Ghair",
    'El Menia': 'El Meniaa',
    "M'sila": "M'Sila",
    "M'Sila": "M'Sila",
    'Béjaïa': 'Béjaïa',
    'Béchar': 'Béchar',
    'Tébessa': 'Tébessa',
    'Sétif': 'Sétif',
    'Saïda': 'Saïda',
    'Sidi Bel Abbès': 'Sidi Bel Abbès',
    'Médéa': 'Médéa',
    'Boumerdès': 'Boumerdès',
    'Bordj Bou Arreridj': 'Bordj Bou Arréridj',
    'Aïn Defla': 'Aïn Defla',
    'Aïn Témouchent': 'Aïn Témouchent',
    'Béni Abbès': 'Béni Abbès',
}


def normalize_wilaya_name(raw: str) -> str:
    name = raw.strip()
    return WILAYA_NAME_FIX.get(name, name)


def split_sql_insert_values(line: str) -> list[str]:
    """Parse VALUES (...) from an INSERT line into a list of field strings."""
    start = line.find('VALUES (')
    if start < 0:
        return []
    chunk = line[start + len('VALUES (') :].rstrip().rstrip(');').rstrip(')')
    values: list[str] = []
    i = 0
    while i < len(chunk):
        while i < len(chunk) and chunk[i] in ' \t,':
            i += 1
        if i >= len(chunk):
            break
        if chunk[i] == "'":
            i += 1
            buf: list[str] = []
            while i < len(chunk):
                ch = chunk[i]
                if ch == "'":
                    if i + 1 < len(chunk) and chunk[i + 1] not in (',', ')'):
                        buf.append("'")
                        i += 1
                        continue
                    break
                buf.append(ch)
                i += 1
            values.append(''.join(buf))
            i += 1
        else:
            m = re.match(r'(\d+)', chunk[i:])
            if not m:
                break
            values.append(m.group(1))
            i += m.end()
    return values


def parse_cities(folder: Path) -> dict[str, str]:
    """wilaya_code -> normalized name"""
    wilayas: dict[str, str] = {}
    for line in (folder / 'algeria_cities.sql').read_text(encoding='utf-8').splitlines():
        if not line.startswith('INSERT'):
            continue
        matches = list(re.finditer(r",'(\d{2})',", line))
        if not matches:
            continue
        code = matches[-1].group(1)
        if int(code) > 58:
            continue
        tail = line[matches[-1].end() :]
        name_m = re.match(r"'[^']*','([^']*)'", tail) or re.match(r"'[^']*','(.+)'", tail)
        if name_m:
            wilayas[code] = normalize_wilaya_name(name_m.group(1))
    return wilayas


def parse_post_line(line: str) -> dict | None:
    """
    algeria_postcodes columns:
    id, post_code, post_name, post_name_ascii, post_address, post_address_ascii,
    commune_id, commune_name, commune_name_ascii, daira_name, daira_name_ascii,
    wilaya_code, wilaya_name, wilaya_name_ascii
    """
    values = split_sql_insert_values(line)
    if len(values) < 13:
        return None
    postal_code = values[1].strip()
    if not re.fullmatch(r'\d{5}', postal_code):
        return None
    wilaya_code = values[11].zfill(2)
    if int(wilaya_code) > 58:
        return None
    post_name_ascii = values[3].strip()
    commune_name_ascii = values[8].strip() if len(values) > 8 else ''
    return {
        'postal_code': postal_code,
        'wilaya_code': wilaya_code,
        'post_name': post_name_ascii,
        'commune_name': commune_name_ascii,
    }


def parse_postcodes(folder: Path) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    rows: list[dict] = []
    for line in (folder / 'algeria_postcodes.sql').read_text(encoding='utf-8').splitlines():
        if not line.startswith('INSERT'):
            continue
        parsed = parse_post_line(line)
        if not parsed:
            continue
        key = (parsed['wilaya_code'], parsed['postal_code'])
        if key in seen:
            continue
        seen.add(key)
        label = parsed['post_name'] or parsed['commune_name']
        rows.append({
            'wilaya_code': parsed['wilaya_code'],
            'postal_code': parsed['postal_code'],
            'city': label,
            'post_name': parsed['post_name'],
            'commune_name': parsed['commune_name'],
        })
    return rows


def parse_sql_folder(folder: Path) -> tuple[list[tuple[str, str]], list[dict]]:
    wilayas = parse_cities(folder)
    postals = parse_postcodes(folder)
    for row in postals:
        code = row['wilaya_code']
        if code not in wilayas and row.get('commune_name'):
            wilayas[code] = normalize_wilaya_name(row['commune_name'])
    wilaya_list = sorted(wilayas.items(), key=lambda x: x[0])
    return wilaya_list, postals


def main():
    if len(sys.argv) > 1:
        folder = Path(sys.argv[1]).resolve()
    else:
        folder = Path(__file__).resolve().parents[3] / 'cities and postal codes'
    wilayas, postals = parse_sql_folder(folder)
    data_dir = Path(__file__).parent
    (data_dir / 'algeria_postal_seed.json').write_text(
        json.dumps(postals, ensure_ascii=False, indent=0),
        encoding='utf-8',
    )
    lines = ['# Algerian wilayas (58) — from official postes/cities SQL dataset.\n', 'WILAYAS = [\n']
    for code, name in wilayas:
        lines.append(f"    ('{code}', {name!r}),\n")
    lines.append(']\n')
    (data_dir / 'algeria_wilayas.py').write_text(''.join(lines), encoding='utf-8')
    print(f'Wrote {len(wilayas)} wilayas and {len(postals)} postal codes (post_name_ascii as city)')


if __name__ == '__main__':
    main()
