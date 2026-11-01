#!/usr/bin/env python3
"""Build century shards from pinned Cliopatria. Requires shapely==2.1.2.
Usage: python scripts/build_world_data.py /path/to/cliopatria.geojson.zip
Chinese source files are read, never rewritten or simplified.
"""
import hashlib,json,math,subprocess,sys,zipfile
from pathlib import Path
from shapely.geometry import shape,mapping
from shapely.ops import unary_union
from shapely import make_valid
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'world/data';DEST.mkdir(parents=True,exist_ok=True)
UPSTREAM='c4afe439e3102addbedb0c9775129b53109cf2d8'
CLIO='5f433377139a6eeaeacbdc894b70f8805b72c8b5'
CHINA_FILES=['js/map_data.js','js/china_geo_data.js','js/atlas_snapshots.js','js/atlas_boot.js','js/app.js','js/lore_data.js','js/i18n_dict.js','js/zh_hant.js']
hash_file=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
js="""const fs=require('fs'),vm=require('vm');let c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('js/china_geo_data.js','utf8'),c);console.log(JSON.stringify({type:'MultiPolygon',coordinates:c.window.PROVINCE_OUTLINES.filter(p=>!String(p.code).includes('_JD')).flatMap(p=>p.rings)}));"""
mask_json=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT,text=True))
mask=unary_union([make_valid(shape({'type':'Polygon','coordinates':p})) for p in mask_json['coordinates']])
source=Path(sys.argv[1]);raw_sha=hash_file(source)
with zipfile.ZipFile(source) as z:
 name=next(x for x in z.namelist() if x.endswith('.geojson'));data=json.loads(z.read(name))
buckets={k:[] for k in range(-3400,2001,100)};dropped=0;clipped=0;repaired=0;china_core=0
# Shards contain original validity intervals. Membership is inclusive; no interpolation.
for i,f in enumerate(data['features']):
 p=f['properties'];a,b=int(p['FromYear']),int(p['ToYear'])
 if p['Type']!='POLITY' or not f.get('geometry'):continue
 g=shape(f['geometry'])
 if not g.is_valid:g=make_valid(g);repaired+=1
 # China-core entities are supplied exclusively by the pinned upstream snapshots.
 if g.intersects(mask) and (mask.covers(g.representative_point()) or g.intersection(mask).area/max(g.area,1e-12)>.5):
  dropped+=1;china_core+=1;continue
 # Foreign data is excluded from the exact upstream modern-China footprint in every era.
 g=g.simplify(0.035,preserve_topology=True)
 if g.intersects(mask):g=g.difference(mask);clipped+=1
 if g.is_empty or g.area<0.000005:dropped+=1;continue
 # The modern Chinese entity and Taiwan are supplied only by the upstream China layer.
 if b>=1949 and p['Name'] in ['China','Republic of China','Taiwan','People\'s Republic of China']:
  dropped+=1;continue
 if g.geom_type=='GeometryCollection':g=unary_union([x for x in g.geoms if x.geom_type in ['Polygon','MultiPolygon']])
 if g.is_empty or g.geom_type not in ['Polygon','MultiPolygon']:continue
 point=g.representative_point();geo=mapping(g)
 # Four decimal places are applied only to Cliopatria, never the China overlay.
 def rounded(x):return [rounded(v) for v in x] if isinstance(x,(list,tuple)) else round(x,4)
 geo['coordinates']=rounded(geo['coordinates'])
 rec={'id':str(i),'name':p['Name'],'from':a,'to':b,'area':round(float(p.get('Area') or 0)),'wiki':p.get('Wikipedia',''),'qid':p.get('Wikidata',''),'member':p.get('MemberOf',''),'point':[round(point.x,4),round(point.y,4)],'geometry':geo}
 for k in range(max(-3400,math.floor(a/100)*100),min(2000,math.floor(b/100)*100)+1,100):buckets[k].append(rec)
index=[]
for year,records in buckets.items():
 file=f'clio-{year}.json';payload=json.dumps(records,ensure_ascii=False,separators=(',',':'));(DEST/file).write_text(payload)
 index.append({'from':year,'to':min(year+99,2024),'file':file,'records':len(records),'sha256':hash_file(DEST/file)})
meta={'schema':1,'upstreamChina':{'repository':'DeanChensj/jiangshan-map','commit':UPSTREAM,'from':-403,'files':{p:hash_file(ROOT/p) for p in CHINA_FILES}},'cliopatria':{'repository':'Seshat-Global-History-Databank/cliopatria','commit':CLIO,'zipSha256':raw_sha,'license':'CC-BY-4.0','originalRecords':len(data['features']),'geometryRepairCount':repaired,'chinaCoreRecordsExcluded':china_core,'clippedAgainstUpstreamChina':clipped,'removedEmptyOrChinaOnly':dropped,'simplificationDegrees':0.035,'sourceUrl':f'https://github.com/Seshat-Global-History-Databank/cliopatria/tree/{CLIO}'},'range':[-3400,2024],'shards':index,'policy':'Original China bundles are immutable. China layers use upstream chronology and geometry. Cliopatria is excluded from the upstream modern-China footprint; overlapping historical China layers take visual priority. Before -403 the protected China region has no supplied historical layer.'}
(DEST/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'original':len(data['features']),'shards':len(index),'totalBytes':sum((DEST/x['file']).stat().st_size for x in index),'maxShardBytes':max((DEST/x['file']).stat().st_size for x in index),'dropped':dropped,'clipped':clipped}))

subprocess.run(['node',str(ROOT/'scripts/build_world_timeline.cjs')],check=True)
