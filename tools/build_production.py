"""Prepare (never deploy) a production artifact from the reviewed preview sources.
A fresh public snapshot is mandatory: it keeps feed identities, security config,
verification files and old URL coverage tied to the current live site.
"""
from pathlib import Path
from bs4 import BeautifulSoup
import argparse,datetime,json,hashlib,shutil,urllib.parse,xml.etree.ElementTree as ET
p=argparse.ArgumentParser()
p.add_argument('--snapshot',required=True,type=Path)
p.add_argument('--output',required=True,type=Path)
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
manifest=json.loads((a.snapshot/'manifest.json').read_text())
age=datetime.datetime.now(datetime.timezone.utc)-datetime.datetime.fromisoformat(manifest['captured_at'])
if age.total_seconds()<0 or age.total_seconds()>86400:raise SystemExit('Live snapshot must be less than 24 hours old; capture and review changes first.')
for path,entry in manifest['files'].items():
 if hashlib.sha256((a.snapshot/path).read_bytes()).hexdigest()!=entry['sha256']:raise SystemExit('Snapshot changed: '+path)
if a.output.exists():raise SystemExit('Output exists; choose a new directory to preserve previous builds.')
origin='https://www.oecuhobog.org'
preview='https://entry-package.github.io/oecuhobog-prototype'
prefix='/oecuhobog-prototype'
feed=ET.parse(a.snapshot/'blog/feed.xml')
items=feed.findall('./channel/item')
def local_path(url):
 path=urllib.parse.unquote(urllib.parse.urlsplit(url).path)
 file=root/path.lstrip('/')
 if not file.suffix:file=file/'index.html'
 elif path.endswith('/'):file=file/'index.html'
 return file
for item in items:
 if not item.findtext('guid') or not item.findtext('pubDate') or not local_path(item.findtext('link')).is_file():
  raise SystemExit('Live feed article missing/invalid; synchronize content first: '+str(item.findtext('link')))
oldmap=ET.parse(a.snapshot/'sitemap.xml')
for node in oldmap.getroot().iter():
 if node.tag.endswith('}loc') and not local_path(node.text).is_file():
  raise SystemExit('Live route missing: '+node.text)
a.output.mkdir(parents=True)
directories=['assets','blog','_blog','pages','past-notices','past-pages','old-home','questionary00375','2','404']
for name in directories:shutil.copytree(root/name,a.output/name)
for name in ['index.html','404.html','styles.css','archive.css','archive.js','audit-fixes.css','.nojekyll']:
 shutil.copy2(root/name,a.output/name)
for file in a.output.rglob('*.html'):
 text=file.read_text().replace(preview,origin).replace(prefix,'')
 text=text.replace(urllib.parse.quote(preview,safe=''),urllib.parse.quote(origin,safe=''))
 soup=BeautifulSoup(text,'html.parser')
 for meta in soup.select('meta[name=robots]'):meta['content']='index,follow'
 for note in soup.select('.preview-policy-note'):note.decompose()
 for filename in ['form-adapter.js','receiver.js','analytics-consent.js']:
  tag=soup.new_tag('script',src='/'+filename);tag['defer']='';soup.head.append(tag)
 file.write_text(str(soup)+'\n')
# Preserve the current feed byte-for-byte, including count/order/GUID/dates.
shutil.copy2(a.snapshot/'blog/feed.xml',a.output/'blog/feed.xml')
for filename in ['receiver-security.json','favicon.ico','googlecfdb1606df0f1b08.html']:
 shutil.copy2(a.snapshot/filename,a.output/filename)
receiver=(a.snapshot/'receiver.js').read_text()
needle="  const endpoint = "
if needle not in receiver or "message: kind === 'contact' ? value('[aria-label=\"本文\"]')" not in receiver:
 raise SystemExit('Live receiver contract changed; review adapter before building.')
receiver=receiver.replace(needle,"  if (location.origin !== 'https://www.oecuhobog.org') return;\n"+needle,1)
receiver=receiver.replace("message: kind === 'contact' ? value('[aria-label=\"本文\"]')", "message: kind === 'contact' ? (el.dataset.intakeKind === 'address' ? '【住所変更】\\n' : '') + value('[aria-label=\"本文\"]')",1)
(a.output/'receiver.js').write_text(receiver)
for name in ['form-adapter.js','analytics-consent.js']:shutil.copy2(root/'production'/name,a.output/name)
(a.output/'sitemap.xml').write_text((root/'sitemap.xml').read_text().replace(preview,origin))
(a.output/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+origin+'/sitemap.xml\n')
# www stays the existing canonical hostname; CNAME is unchanged from current production.
(a.output/'CNAME').write_text('www.oecuhobog.org\n')
evidence={'prepared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'live_snapshot':manifest,'feed_count':len(items),'feed_byte_identical':True,'files':{}}
for f in sorted(a.output.rglob('*')):
 if f.is_file():evidence['files'][f.relative_to(a.output).as_posix()]=hashlib.sha256(f.read_bytes()).hexdigest()
a.output.with_suffix('.manifest.json').write_text(json.dumps(evidence,indent=2)+'\n')
print(json.dumps({'output':str(a.output),'html':len(list(a.output.rglob('*.html'))),'feed_items':len(items),'files':len(evidence['files'])}))
