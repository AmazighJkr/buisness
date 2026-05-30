import re


def normalize_simulation_url(value):
    if not value or not str(value).strip():
        return ''
    url = str(value).strip()
    if not url.startswith(('http://', 'https://')):
        url = f'https://{url}'
    return url


def resolve_simulation_embed_url(raw):
    url = normalize_simulation_url(raw)
    if not url:
        return None

    iframe = re.search(r'src=["\']([^"\']+)["\']', url, re.I)
    if iframe:
        url = iframe.group(1)

    wokwi = re.search(
        r'wokwi\.com/(?:projects/([a-zA-Z0-9_-]+)|embed/([a-zA-Z0-9_-]+))',
        url,
        re.I,
    )
    if wokwi:
        project_id = wokwi.group(1) or wokwi.group(2)
        return f'https://wokwi.com/projects/{project_id}/embed'

    embed = re.search(r'tinkercad\.com/embed/([a-zA-Z0-9_-]+)', url, re.I)
    if embed:
        return f'https://www.tinkercad.com/embed/{embed.group(1)}?editbtn=1'

    things = re.search(r'tinkercad\.com/things/([a-zA-Z0-9_-]+)', url, re.I)
    if things:
        return f'https://www.tinkercad.com/embed/{things.group(1)}?editbtn=1'

    return url


def normalize_code_files(raw_list):
    out = []
    for item in raw_list or []:
        if not isinstance(item, dict):
            continue
        title = (item.get('title') or '').strip() or 'untitled'
        code = item.get('code') or ''
        if title or str(code).strip():
            out.append({'title': title, 'code': code})
    return out
