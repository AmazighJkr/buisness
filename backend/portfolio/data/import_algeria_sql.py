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
    post_m = re.search(r"VALUES \(\d+,'(\d{5})'", line)
    if not post_m:
        return None
    wilaya_matches = [m for m in re.finditer(r",'(\d{2})',", line) if int(m.group(1)) <= 58]
    if not wilaya_matches:
        return None
    wilaya_m = wilaya_matches[-1]
    wilaya_code = wilaya_m.group(1)
    chunk = line[: wilaya_m.start()]
    commune_ids = re.findall(r',(\d+),', chunk)
    commune_id = commune_ids[-1] if commune_ids else ''
    tail = line[wilaya_m.end() :]
    name_m = re.match(r"'[^']*','([^']*)'", tail) or re.match(r"'[^']*','(.+?)'\)", tail)
    wilaya_ascii = normalize_wilaya_name(name_m.group(1)) if name_m else wilaya_code
    return {
        'postal_code': post_m.group(1),
        'wilaya_code': wilaya_code,
        'wilaya_name': wilaya_ascii,
        'commune_id': commune_id,
    }


def parse_postcodes(folder: Path, communes: dict[str, str]) -> list[dict]:
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
        city = communes.get(parsed['commune_id'], '')
        rows.append({
            'wilaya_code': parsed['wilaya_code'],
            'postal_code': parsed['postal_code'],
            'city': city or parsed['wilaya_name'],
        })
    return rows


def parse_communes(folder: Path) -> dict[str, str]:
    """commune_id -> commune_name_ascii"""
    communes: dict[str, str] = {}
    for line in (folder / 'algeria_cities.sql').read_text(encoding='utf-8').splitlines():
        if not line.startswith('INSERT'):
            continue
        m = re.search(r"VALUES \((\d+),'[^']*','([^']*)'", line)
        if not m:
            continue
        communes[m.group(1)] = m.group(2).strip()
    return communes


def parse_sql_folder(folder: Path) -> tuple[list[tuple[str, str]], list[dict]]:
    wilayas = parse_cities(folder)
    communes = parse_communes(folder)
    postals = parse_postcodes(folder, communes)
    for row in postals:
        code = row['wilaya_code']
        if code not in wilayas:
            wilayas[code] = normalize_wilaya_name(row['city'])
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
    print(f'Wrote {len(wilayas)} wilayas and {len(postals)} postal codes')


if __name__ == '__main__':
    main()
