#!/usr/bin/env python3
"""Fetch public Wikidata reference labels for Cliopatria QIDs (CC0).
Requires opencc-python-reimplemented==0.1.7 for Simplified Chinese display only.
No original source names, geometry or China bundles are modified.
"""
from pathlib import Path
import json,re,urllib.request,urllib.parse,time,concurrent.futures,datetime,sys
from opencc import OpenCC
ROOT=Path(__file__).resolve().parents[1];DEST=ROOT/'world/data/translations.json'
ids=set()
for p in (ROOT/'world/data').glob('clio-*.json'):
 for f in json.loads(p.read_text()):ids.update(re.findall(r'Q\d+',str(f.get('qid',''))))
convert=OpenCC('t2s').convert
existing=json.loads(DEST.read_text())['entities'] if DEST.exists() else {}
needed=sorted([q for q in ids if q not in existing or 'en' not in existing[q] or 'description' not in existing[q]],key=lambda x:int(x[1:]));batches=[needed[i:i+50] for i in range(0,len(needed),50)]
def fetch(batch):
 url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(batch),'props':'labels|aliases|descriptions|info','languages':'zh-hans|zh|zh-cn|en','format':'json','formatversion':'2'})
 for attempt in range(3):
  try:
   request=urllib.request.Request(url,headers={'User-Agent':'JiangshanWorldAtlas/0.1 (https://github.com/Geeprox/jiangshan-map)'})
   with urllib.request.urlopen(request,timeout=25) as reply:data=json.load(reply)
   if 'entities' not in data:raise ValueError('missing_entities')
   out={}
   for q,e in data['entities'].items():
    labels=e.get('labels',{});zh=next((labels[k]['value'] for k in ['zh-hans','zh-cn','zh'] if k in labels),'')
    out[q]={'zh':convert(zh),'en':labels.get('en',{}).get('value',''),'aliasesEn':[a['value'] for a in e.get('aliases',{}).get('en',[])],'revision':e.get('lastrevid'),'description':convert(next((e.get('descriptions',{}).get(k,{}).get('value') for k in ['zh-hans','zh-cn','zh'] if e.get('descriptions',{}).get(k)),'')),'labelLanguage':next((k for k in ['zh-hans','zh-cn','zh'] if k in labels),None)}
   return out
  except Exception:
   if attempt==2:raise
   time.sleep(1+attempt)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for i,result in enumerate(pool.map(fetch,batches)):
  existing.update(result);DEST.write_text(json.dumps({'schema':1,'source':'Wikidata','license':'CC0-1.0','retrieved':datetime.datetime.now(datetime.timezone.utc).isoformat(),'conversion':'OpenCC t2s; original material names retained','entities':existing},ensure_ascii=False,separators=(',',':')))
  print('translation batch',i+1,'/',len(batches),'labels',sum(bool(v['zh']) for v in existing.values()),flush=True)
print(json.dumps({'entities':len(existing),'withChinese':sum(bool(v['zh']) for v in existing.values())}))
