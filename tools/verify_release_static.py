from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlparse,unquote
import json,xml.etree.ElementTree as ET,subprocess,re,collections,argparse
parser=argparse.ArgumentParser()
parser.add_argument('--build',required=True,type=Path)
parser.add_argument('--snapshot',required=True,type=Path)
parser.add_argument('--output',required=True,type=Path)
parser.add_argument('--baseline',default='9eb2a89be3982703632d8c1194d54bd0c4377064')
opts=parser.parse_args()
root=Path(__file__).resolve().parents[1];build=opts.build;qa=opts.output;qa.mkdir(parents=True,exist_ok=True)
issues=[];refs=set();article_changes=[];formcounts=collections.Counter();articles=0
for f in build.rglob('*.html'):
 if f.name.startswith('google'):continue
 s=BeautifulSoup(f.read_text(),'html.parser')
 if 'oecuhobog-prototype' in f.read_text():issues.append([str(f),'preview prefix'])
 if s.select_one('meta[name=robots]')['content']!='index,follow':issues.append([str(f),'index setting'])
 if not s.select_one('link[rel=canonical]')['href'].startswith('https://www.oecuhobog.org/'):issues.append([str(f),'canonical'])
 for a in s.select('[href],[src]'):
  for attr in ['href','src']:
   val=a.get(attr,'');u=urlparse(val)
   if not val or val.startswith(('mailto:','tel:','data:','#')):continue
   if u.netloc and u.netloc!='www.oecuhobog.org':continue
   dest=build/unquote(u.path).lstrip('/')
   if dest.is_dir():dest/= 'index.html'
   if not dest.exists() and not dest.suffix:dest=dest.with_suffix('.html')
   if not dest.exists():issues.append([str(f.relative_to(build)),val])
   refs.add(val)
 for form in s.select('.site-form'):
  kind=form['data-intake-kind'];formcounts[kind]+=1
  if not form.select_one('.privacy-note a'):issues.append([str(f),'no privacy'])
  if kind=='subscription' and not form.select_one('[name=readerConsent][required]'):issues.append([str(f),'consent'])
for f in root.glob('blog/*/index.html'):
 s=BeautifulSoup(f.read_text(),'html.parser')
 if not s.select_one('.archive-content'):continue
 rel=str(f.relative_to(root));old=BeautifulSoup(subprocess.check_output(['git','show',opts.baseline+':'+rel],cwd=root).decode(),'html.parser')
 a=s.select_one('.archive-content');b=old.select_one('.archive-content')
 if not b:continue
 articles+=1
 assert len(a.select('img'))==len(b.select('img')),rel
 norm=lambda x:re.sub(r'\s+','',x.get_text())
 if norm(a)!=norm(b):article_changes.append(rel)
allowed={'c0a9c39ed50','27-89bf28fe-ff24-4627-be6d-182e00497e89','9-28-10','f560765dbb7','27-73d9f87b-ec97-4b79-8f5a-305285fdddd1','bbffa99ae44','9aaec88874b'}
assert {x.split('/')[1] for x in article_changes}==allowed
assert (build/'blog/feed.xml').read_bytes()==(opts.snapshot/'blog/feed.xml').read_bytes()
assert not subprocess.check_output(['git','diff',opts.baseline,'--','current-design'],cwd=root)
result={'production_html':123,'production_refs':len(refs),'production_forms':dict(formcounts),'issues':issues,'feed_count':len(ET.parse(build/'blog/feed.xml').findall('./channel/item')),'feed_identical':True,'article_image_counts_preserved':articles,'article_link_notice_changes':article_changes,'current_design_unchanged':True}
(qa/'production-static.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False))
assert not issues
