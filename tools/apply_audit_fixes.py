#!/usr/bin/env python3
"""Apply the 2026-09-14 presentation audit to a generated review site.

Public source snapshots stay outside the published repository. No network calls.
Run again after rebuilding the migration site, with the matching URL prefix.
"""
from pathlib import Path
from copy import deepcopy
import argparse
import datetime as dt
import email.utils
import json
import re
import urllib.parse
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup


def parse(markup):
    return BeautifulSoup(markup, 'html.parser')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site-root', type=Path, required=True)
    ap.add_argument('--source-root', type=Path, required=True)
    ap.add_argument('--origin', default='https://entry-package.github.io')
    ap.add_argument('--prefix', default='/oecuhobog-prototype')
    args = ap.parse_args()
    root, source = args.site_root, args.source_root
    prefix = args.prefix.rstrip('/')
    base = args.origin.rstrip('/') + prefix
    site_name = '大阪電気通信大学高等学校同窓会'
    pages = {p: parse(p.read_text()) for p in root.rglob('*.html')}
    catalog = json.loads((source / 'public-catalog.json').read_text())
    pinned = {p['path'].rstrip('/') for batch in catalog['pages'] for p in batch['posts'] if p.get('pinned')}
    docs = [json.loads(p.read_text()) for p in (source / 'pages').glob('*.json')]
    articles = sorted((d for d in docs if d['kind'] == 'article'), key=lambda d: d.get('published_at') or '', reverse=True)
    home = pages[root / 'index.html']
    old = pages[root / 'past-notices/index.html']

    # Only the unrelated template footer is removed; source snapshots retain it.
    removed = 0
    for soup in pages.values():
        for footer in soup.select('.original-page #s-footer-section-container'):
            if 'About Us' in footer.get_text() and "We're Hiring!" in footer.get_text():
                assert not footer.select('img, iframe, table'), 'Footer contains unexpected content'
                footer.decompose()
                removed += 1

    # Restore the complete public greeting, preserving its original date.
    if not home.select_one('#president-greeting'):
        heading = next(h for h in old.select('h2,h3') if h.get_text(strip=True) == 'ご挨拶')
        section = heading.find_parent('li')
        greeting = section.select_one('.s-rich-text-wrapper')
        assert greeting and '令和6年3月' in greeting.get_text()
        card = home.new_tag('article', id='president-greeting', attrs={'class': 'president-greeting'})
        title = home.new_tag('h3'); title.string = '会長挨拶'; card.append(title)
        layout = home.new_tag('div', attrs={'class': 'greeting-layout'})
        portrait = deepcopy(section.select_one('img[src]'))
        portrait.attrs = {'src': portrait['src'], 'alt': '会長挨拶に掲載された写真', 'loading': 'lazy', 'class': ['greeting-portrait']}
        layout.append(portrait)
        body = home.new_tag('div', attrs={'class': 'greeting-body'})
        subtitle = home.new_tag('h4'); subtitle.string = section.select_one('h3').get_text(strip=True); body.append(subtitle)
        body.append(deepcopy(greeting)); layout.append(body); card.append(layout)
        home.select_one('#about').append(card)

    # Article covers and list thumbnails come from the actual article body.
    covers = {}
    for doc in articles:
        p = root / urllib.parse.unquote(doc['path']).strip('/') / 'index.html'
        soup = pages[p]
        content = soup.select_one('main > .archive-content:not(.original-page)')
        first = content.select_one('.s-blog-body img[src]') or content.select_one('img[src]')
        src = first['src'] if first else prefix + '/assets/emblem.png'
        covers[doc['path'].rstrip('/')] = src
        cover = soup.select_one('main > .article-cover')
        if not cover:
            cover = soup.new_tag('div', attrs={'class': 'article-cover'})
            soup.select_one('.article-heading').insert_after(cover)
        cover.clear()
        cover['class'] = ['article-cover'] + (['emblem-cover'] if not first else [])
        cover.append(soup.new_tag('img', src=src, alt='', decoding='async'))

    for soup in pages.values():
        for grid in soup.select('.archive-grid, .news-list'):
            for card in grid.select('.archive-card'):
                link = card.select_one('.card-image-link')
                path = urllib.parse.unquote(link['href']).removeprefix(prefix).rstrip('/')
                if path in covers:
                    link.select_one('img')['src'] = covers[path]
                if path in pinned:
                    if not card.select_one('.pinned-label'):
                        label = soup.new_tag('span', attrs={'class': 'pinned-label'}); label.string = '固定のお知らせ'
                        card.select_one('.archive-card-body').insert(0, label)
                    card['data-pinned'] = 'true'
            for card in reversed(grid.select('.archive-card[data-pinned="true"]')):
                grid.insert(0, card.extract())
    grid = home.select_one('.news-list')
    all_cards = pages[root / 'blog/index.html'].select('.archive-grid > .archive-card')
    if grid:
        grid.clear()
        for card in all_cards[:3]: grid.append(deepcopy(card))

    # Retain historical fundraising material while making its end date explicit.
    link = home.select_one(f'#support a[href="{prefix}/2"]')
    if link: link.string = '創立80周年記念事業募金の記録（2022年9月30日 受付終了）'
    donation = pages[root / '2/index.html']
    notice = donation.select_one('.archive-notice')
    notice.clear()
    notice.append(parse(f'<strong>この募金は2022年9月30日で受付を終了しました。</strong> 以下は当時のご案内を保存した記録です。現在の母校支援は<a href="{prefix}/#support">「母校を支える」</a>をご覧ください。'))

    # Working links beside visibly disabled review forms. No new data collection.
    for soup in pages.values():
        for form in soup.select('.site-form'):
            note = form.select_one('.form-note')
            if not note or form.select_one('.review-contact-link'): continue
            kind = form.select_one('input[name="kind"]')
            if kind and kind.get('value') == 'subscription':
                markup = f'<p class="review-contact-link">新しいお知らせは<a href="{prefix}/blog/feed.xml">RSSフィード</a>でもご覧いただけます。</p>'
            else:
                markup = f'<p class="review-contact-link">ご連絡は<a href="{prefix}/#contact">同窓会事務局のお問い合わせ先</a>をご利用ください。</p>'
            note.insert_after(parse(markup))

    # Metadata describes this review URL; production preparation supplies a new origin.
    for path, soup in pages.items():
        rel = path.relative_to(root).as_posix()
        route = '/' if rel == 'index.html' else '/' + (rel[:-10] if rel.endswith('index.html') else rel)
        url = base + urllib.parse.quote(route, safe='/')
        title = soup.title.get_text(strip=True)
        content = soup.select_one('main > .archive-content:not(.original-page)')
        summary = re.sub(r'\s+', ' ', content.get_text(' ', strip=True))[:150] if content else f'{site_name}のご案内。総会・同窓会活動・会報・資料を掲載しています。'
        if path == root / '2/index.html': summary = '創立80周年記念事業募金は2022年9月30日に受付を終了しました。当時のご案内を記録として掲載しています。'
        # The common school image is 1280 x 719, large enough for social cards.
        image = base + '/assets/hero-school.jpg'
        for tag in list(soup.head.select('meta[property^="og:"], meta[name^="twitter:"], meta[name="description"], link[rel="canonical"], link[type="application/rss+xml"]')): tag.decompose()
        soup.head.append(soup.new_tag('meta', attrs={'name':'description', 'content':summary}))
        soup.head.append(soup.new_tag('link', rel='canonical', href=url))
        for key, value in {'og:title':title, 'og:description':summary, 'og:url':url, 'og:type':'article' if content else 'website', 'og:site_name':site_name, 'og:locale':'ja_JP', 'og:image':image, 'og:image:width':'1280', 'og:image:height':'719', 'og:image:alt':site_name + 'の校門', 'twitter:card':'summary_large_image', 'twitter:title':title, 'twitter:description':summary, 'twitter:image':image}.items():
            soup.head.append(soup.new_tag('meta', attrs={'name' if key.startswith('twitter:') else 'property':key, 'content':value}))
        soup.head.append(soup.new_tag('link', rel='alternate', type='application/rss+xml', title=site_name + 'のお知らせ', href=prefix + '/blog/feed.xml'))
        footer = soup.select_one('.archive-footer, .site-footer')
        if footer and not footer.select('a.rss-link'):
            anchor = soup.new_tag('a', href=prefix + '/blog/feed.xml', attrs={'class':'rss-link'}); anchor.string = 'RSSでお知らせを読む'; footer.append(anchor)
        stylesheet = prefix + '/audit-fixes.css'
        for existing in soup.select(f'link[href="{stylesheet}"]'): existing.decompose()
        soup.head.append(soup.new_tag('link', rel='stylesheet', href=stylesheet))
        path.write_text(str(soup))

    # Standard XML endpoint plus the legacy extensionless URL; items stay chronological.
    ET.register_namespace('atom', 'http://www.w3.org/2005/Atom')
    rss = ET.Element('rss', version='2.0'); channel = ET.SubElement(rss, 'channel')
    for key, value in {'title':site_name, 'link':base + '/', 'description':'同窓会と母校からのお知らせ', 'language':'ja'}.items(): ET.SubElement(channel, key).text = value
    ET.SubElement(channel, '{http://www.w3.org/2005/Atom}link', href=base + '/blog/feed.xml', rel='self', type='application/rss+xml')
    for doc in articles:
        item = ET.SubElement(channel, 'item'); url = base + urllib.parse.quote(doc['path'], safe='/')
        ET.SubElement(item, 'title').text = doc['title']
        ET.SubElement(item, 'link').text = url
        ET.SubElement(item, 'guid', isPermaLink='false').text = 'oecuhobog:post:' + str(doc['post_id'])
        ET.SubElement(item, 'description').text = re.sub(r'\s+', ' ', doc['text'])[:300]
        if doc.get('published_at'):
            ET.SubElement(item, 'pubDate').text = email.utils.format_datetime(dt.datetime.fromisoformat(doc['published_at'].replace('Z', '+00:00')))
        for tag in doc.get('tags', []): ET.SubElement(item, 'category').text = str(tag)
    xml = ET.tostring(rss, encoding='utf-8', xml_declaration=True)
    (root / 'blog/feed.xml').write_bytes(xml)
    assert not (root / 'blog/feed').is_dir(), 'Legacy feed path is already a directory'
    (root / 'blog/feed').write_bytes(xml)
    print(json.dumps({'html_pages':len(pages), 'template_footers_removed':removed, 'article_covers':len(covers), 'rss_items':len(articles), 'pinned_paths':sorted(pinned)}, ensure_ascii=False))


if __name__ == '__main__': main()
