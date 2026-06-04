"""Parse Wikipedia FR wilaya list → algeria_wilayas.py data.

Usage: python -m portfolio.data.parse_wikipedia_wilayas <path-to.md>
"""

import re
import sys
from pathlib import Path


def parse_wilaya_table(text: str) -> list[tuple[str, str]]:
    rows: list[tuple[str, str]] = []
    pattern = re.compile(
        r'^\|\s*(\d{1,2})\s*\|\s*\[Wilaya d[\'e]([^\]|]+)|'
        r'^\|\s*(\d{1,2})\s*\|\s*\[Wilaya de ([^\]|]+)',
        re.MULTILINE,
    )
    for match in pattern.finditer(text):
        code = match.group(1) or match.group(3)
        name = (match.group(2) or match.group(4) or '').strip()
        if not code or not name:
            continue
        rows.append((code.zfill(2), name))

    # Deduplicate by code, keep first
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for code, name in rows:
        if code in seen:
            continue
        seen.add(code)
        unique.append((code, name))
    return unique


def main():
    path = Path(sys.argv[1] if len(sys.argv) > 1 else __file__).resolve()
    if path.suffix != '.md':
        path = Path(__file__).parent / 'algeria_wilayas_wikipedia.md'
    text = path.read_text(encoding='utf-8')
    rows = parse_wilaya_table(text)
    print(f'Parsed {len(rows)} wilayas')
    for code, name in rows:
        print(f"    ('{code}', '{name}'),")


if __name__ == '__main__':
    main()
