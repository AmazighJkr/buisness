"""Search Amazon product listings for admin BOM linking (staff-only API)."""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_DOMAIN = 'amazon.com'
USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
)


def _normalize_result(title, url, image_url='', price='', asin=''):
    url = (url or '').strip()
    if url and not url.startswith('http'):
        url = f'https://www.{DEFAULT_DOMAIN}{url}'
    return {
        'title': (title or '').strip(),
        'url': url,
        'image_url': (image_url or '').strip(),
        'price': (price or '').strip(),
        'asin': (asin or '').strip(),
    }


def _rainforest_search(api_key: str, query: str, domain: str, limit: int) -> list[dict]:
    params = urllib.parse.urlencode(
        {
            'api_key': api_key,
            'type': 'search',
            'amazon_domain': domain,
            'search_term': query,
        },
    )
    url = f'https://api.rainforestapi.com/request?{params}'
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode())

    results = []
    for item in (data.get('search_results') or [])[:limit]:
        price_raw = item.get('price')
        if isinstance(price_raw, dict):
            price_raw = price_raw.get('raw') or price_raw.get('value')
        results.append(
            _normalize_result(
                item.get('title'),
                item.get('link'),
                item.get('image'),
                str(price_raw or ''),
                item.get('asin') or '',
            ),
        )
    return [r for r in results if r['url']]


def _scrape_amazon_search(query: str, domain: str, limit: int) -> list[dict]:
    q = urllib.parse.quote_plus(query)
    url = f'https://www.{domain}/s?k={q}'
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': USER_AGENT,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            'Amazon blocked automated search. Set RAINFOREST_API_KEY in server environment.',
        ) from exc
    except OSError as exc:
        raise RuntimeError('Could not reach Amazon. Try again or set RAINFOREST_API_KEY.') from exc

    if 'api-services-support@amazon.com' in html or 'Enter the characters you see below' in html:
        raise RuntimeError(
            'Amazon requires a captcha. Set RAINFOREST_API_KEY in server environment for search.',
        )

    results = []
    seen_asins: set[str] = set()

    for block in re.split(r'data-component-type="s-search-result"', html)[1:]:
        asin_match = re.search(r'data-asin="([A-Z0-9]{10})"', block)
        if not asin_match:
            continue
        asin = asin_match.group(1)
        if not asin or asin in seen_asins:
            continue

        title_match = re.search(
            r'<(?:span|h2)[^>]*class="[^"]*a-text-normal[^"]*"[^>]*>([^<]+)</',
            block,
        )
        title = title_match.group(1).strip() if title_match else asin
        product_url = f'https://www.{domain}/dp/{asin}'

        img_match = re.search(r'<img[^>]+src="([^"]+)"', block)
        image_url = img_match.group(1) if img_match else ''

        price_match = re.search(r'a-price[^>]*>.*?a-offscreen[^>]*>([^<]+)<', block, re.DOTALL)
        price = price_match.group(1).strip() if price_match else ''

        seen_asins.add(asin)
        results.append(_normalize_result(title, product_url, image_url, price, asin))
        if len(results) >= limit:
            break

    if not results:
        raise RuntimeError(
            'No Amazon results parsed. Set RAINFOREST_API_KEY for reliable product search.',
        )
    return results


def search_amazon_products(query: str, domain: str = DEFAULT_DOMAIN, limit: int = 8) -> list[dict]:
    q = (query or '').strip()
    if len(q) < 2:
        return []

    domain = (domain or DEFAULT_DOMAIN).strip().lower().lstrip('www.')
    limit = max(1, min(limit, 12))

    api_key = os.getenv('RAINFOREST_API_KEY', '').strip()
    if api_key:
        return _rainforest_search(api_key, q, domain, limit)
    return _scrape_amazon_search(q, domain, limit)
