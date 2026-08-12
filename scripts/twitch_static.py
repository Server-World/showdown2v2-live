#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TWITCH_SCRIPT = '<script src="/twitch-site.js" defer></script>'
EXPERIENCE_SCRIPT = '<script src="/experience.js" defer></script>'
PAGES = [
    ROOT / 'index.html', ROOT / 'matches/index.html', ROOT / 'standings/index.html',
    ROOT / 'teams/index.html', ROOT / 'players/index.html', ROOT / 'stats/index.html',
    ROOT / 'history/index.html', ROOT / 'league/index.html', ROOT / 'news/index.html',
    ROOT / '404.html', ROOT / 'watch/index.html'
]

for path in PAGES:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    marker = '<script src="/site-v2.js" defer></script>'
    if TWITCH_SCRIPT not in text:
        if marker in text:
            text = text.replace(marker, marker + TWITCH_SCRIPT, 1)
        else:
            text = text.replace('</head>', TWITCH_SCRIPT + '</head>', 1)
    if EXPERIENCE_SCRIPT not in text:
        if TWITCH_SCRIPT in text:
            text = text.replace(TWITCH_SCRIPT, TWITCH_SCRIPT + EXPERIENCE_SCRIPT, 1)
        elif marker in text:
            text = text.replace(marker, marker + EXPERIENCE_SCRIPT, 1)
        else:
            text = text.replace('</head>', EXPERIENCE_SCRIPT + '</head>', 1)
    path.write_text(text, encoding='utf-8')

sitemap = ROOT / 'sitemap.xml'
if sitemap.exists():
    text = sitemap.read_text(encoding='utf-8')
    if 'https://showdown2v2.live/watch/' not in text:
        entry = '<url><loc>https://showdown2v2.live/watch/</loc><lastmod>2026-08-11</lastmod></url>'
        text = text.replace('</urlset>', entry + '</urlset>', 1)
        sitemap.write_text(text, encoding='utf-8')

watch = (ROOT / 'watch/index.html').read_text(encoding='utf-8')
assert 'GTM-P65S83G6' in watch
assert 'supersonicshowdownleague' in watch
assert '/watch.js' in watch
assert '/twitch-site.js' in watch
assert '/experience.js' in watch

for path in PAGES:
    if path.exists():
        text = path.read_text(encoding='utf-8')
        assert text.count('/twitch-site.js') == 1, f'Twitch integration count failed: {path}'
        assert text.count('/experience.js') == 1, f'Experience integration count failed: {path}'
        assert 'G-N4H6G9T2L2' not in text
