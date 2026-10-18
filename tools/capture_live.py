"""Capture only public deployment inputs. No API credentials, writes or messages."""
from pathlib import Path
import argparse,datetime,json,hashlib,urllib.request,xml.etree.ElementTree as ET
parser=argparse.ArgumentParser()
parser.add_argument('output',type=Path)
args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=False)
origin='https://www.oecuhobog.org/'
paths=['index.html','receiver.js','receiver-security.json','blog/feed.xml','sitemap.xml','favicon.ico','googlecfdb1606df0f1b08.html']
manifest={'origin':origin,'captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':{}}
for path in paths:
    with urllib.request.urlopen(origin+path,timeout=40) as response:
        if response.geturl().split('/')[2]!='www.oecuhobog.org':raise RuntimeError('Unexpected redirect: '+path)
        data=response.read()
    target=args.output/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    manifest['files'][path]={'size':len(data),'sha256':hashlib.sha256(data).hexdigest()}
config=json.loads((args.output/'receiver-security.json').read_text())
assert set(config)<= {'turnstileSiteKey','status'} and config['turnstileSiteKey'].startswith('0x')
assert len(ET.parse(args.output/'blog/feed.xml').findall('./channel/item'))>0
(args.output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'captured':len(paths),'path':str(args.output)}))
