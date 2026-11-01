import {referenceName,fuzzyMatch} from './names.mjs';
import {WorldTimeline} from './timeline.mjs';
import {MIN_YEAR,MAX_YEAR,CHINA_MIN_YEAR,normalizeYear,formatYear,shardStart,activeRecords,selectChinaSnapshot,protectedPoint} from './core.mjs';
const $=id=>document.getElementById(id),D=window.d3,W=1600,H=880;
const palette=['#a77655','#6f8b78','#9b8067','#a18c55','#7c859a','#b07970','#7f9260','#8e7799','#ad915f','#728d91','#b0937a','#81817a'];
const aliases={'Western Göktürks':'西突厥汗国','Eastern Göktürks':'东突厥汗国','Mayan City-States':'玛雅城邦','Avar Khaganate':'阿瓦尔汗国','Late Pallava Empire':'后期帕拉瓦王朝','Scandinavian minor kingdoms':'斯堪的纳维亚诸王国','Yenisei Kyrgyz':'叶尼塞吉尔吉斯','Roman Empire':'罗马帝国','Eastern Roman Empire':'东罗马帝国','Byzantine Empire':'拜占庭帝国','Western Roman Empire':'西罗马帝国','Roman Republic':'罗马共和国','Parthian Empire':'安息帝国','Sasanian Empire':'萨珊帝国','Sassanid Empire':'萨珊帝国','Abbasid Caliphate':'阿拔斯王朝','Umayyad Caliphate':'倭马亚王朝','Ottoman Empire':'奥斯曼帝国','Achaemenid Empire':'阿契美尼德帝国','Macedonian Empire':'马其顿帝国','Mongol Empire':'蒙古帝国','Kingdom of France':'法兰西王国','France':'法国','United States of America':'美国','United States':'美国','United Kingdom':'英国','British Empire':'大英帝国','Russian Federation':'俄罗斯','French Fifth Republic':'法国','Republic of India':'印度','Republic of Korea':'韩国',"Democratic People's Republic of Korea":'朝鲜','Socialist Republic of Vietnam':'越南','Republic of the Philippines':'菲律宾','Republic of Indonesia':'印度尼西亚','Republic of Italy':'意大利','Kingdom of Great Britain':'英国','Commonwealth of Australia':'澳大利亚','Republic of Brazil':'巴西','Republic of South Africa':'南非','Russian Empire':'俄罗斯帝国','Russia':'俄罗斯','Soviet Union':'苏联','Japan':'日本','Korea':'朝鲜','India':'印度','Maurya Empire':'孔雀帝国','Mauryan Empire':'孔雀帝国','Kushan Empire':'贵霜帝国','Gupta Empire':'笈多帝国','Kingdom of Egypt':'埃及王国','Old Kingdom of Egypt':'古王国埃及','New Kingdom of Egypt':'新王国埃及','Sumerian City-States':'苏美尔城邦','Elam':'埃兰','Holy Roman Empire':'神圣罗马帝国','Kingdom of England':'英格兰王国','Spain':'西班牙','Portugal':'葡萄牙','Inca Empire':'印加帝国','Aztec Empire':'阿兹特克帝国','Spanish Empire':'西班牙帝国','Portuguese Empire':'葡萄牙帝国','Brazil':'巴西','Mexico':'墨西哥','Germany':'德国','Italy':'意大利','Egypt':'埃及','Iran':'伊朗','Indonesia':'印度尼西亚','Mali Empire':'马里帝国','Songhai Empire':'桑海帝国','Kingdom of Aksum':'阿克苏姆王国','Kingdom of Ghana':'加纳王国'};
let timeline,timelineData,translations={entities:{}};
let year=normalizeYear(new URLSearchParams(location.search).get('year')??741),manifest,land,records=[],china,visible=[],selected=null,serial=0,playing=null,currentBucket=null,projection,path,frameTimer;
document.querySelectorAll('button,input').forEach(n=>{if(n.id!=='retry')n.disabled=true;});
const shardCache=new Map(),geometryCache=new WeakMap(),svg=D.select('#world-svg'),camera=D.select('#world-camera');
const modern=window.PROVINCE_OUTLINES.filter(p=>!String(p.code).includes('_JD')).map(p=>({type:'MultiPolygon',coordinates:p.rings}));
// D3 uses clockwise spherical exterior rings; derive orientation without mutating source coordinates.
function orient(g){if(geometryCache.has(g))return geometryCache.get(g);const polys=g.type==='Polygon'?[g.coordinates]:g.coordinates;const out=polys.map(poly=>poly.map((ring,i)=>{const area=D.geoArea({type:'Polygon',coordinates:[ring]});return (i===0?area>2*Math.PI:area<2*Math.PI)?ring.slice().reverse():ring;}));const v={type:'MultiPolygon',coordinates:out};geometryCache.set(g,v);return v;}
function geoPath(g){return path(orient(g))||'';}
const label=f=>referenceName(f,translations.entities,aliases);
function color(f){if(f.source==='jiangshan-map')return f.tint||'#b5452f';let h=0;for(const c of (f.member||f.name))h=(Math.imul(h,31)+c.charCodeAt(0))|0;return palette[(h>>>0)%palette.length];}
function node(tag,props={},text){const n=['path','text','title'].includes(tag)?document.createElementNS('http://www.w3.org/2000/svg',tag):document.createElement(tag);for(const[k,v]of Object.entries(props))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function updateText(){
 timeline?.sync();$('map-year').textContent=formatYear(year);$('sidebar-year').textContent=formatYear(year);
 $('china-link').href='../?year='+Math.max(CHINA_MIN_YEAR,year)+'&lang=zh';$('china-link').setAttribute('aria-label',year<CHINA_MIN_YEAR?'中国舆图从前403年开始':'查看同年中国舆图');
 document.querySelectorAll('[data-year]').forEach(n=>n.classList.toggle('active',Number(n.dataset.year)===year));
 const u=new URL(location.href);u.searchParams.set('year',year);history.replaceState(null,'',u);document.title=formatYear(year)+' · 世界舆图 · 江山时序';
}
async function loadJson(url){const r=await fetch(url);if(!r.ok)throw Error('数据文件暂时无法读取，请重试。');return r.json();}
async function renderYear(next){
 const own=++serial;document.body.dataset.ready='false';year=normalizeYear(next,year);updateText();$('map-error').hidden=true;$('map-status').textContent='正在展开 '+formatYear(year)+' 的舆图…';
 try{
  const k=shardStart(year),spec=manifest.shards.find(s=>s.from===k);if(!spec)throw Error('该年份尚无数据文件。');
  if(!shardCache.has(k))shardCache.set(k,loadJson('data/'+spec.file).catch(e=>{shardCache.delete(k);throw e;}));
  const all=await shardCache.get(k);if(own!==serial)return;
  // Keep only the current and adjacent century in memory on small devices.
  for(const key of shardCache.keys())if(Math.abs(key-k)>100)shardCache.delete(key);
  records=activeRecords(all,year);china=selectChinaSnapshot(window,year);currentBucket=k;
  const cn=china.features.map(f=>({...f,from:china.dynasty.fromYear,to:Math.min(china.dynasty.toYear,MAX_YEAR)}));
  visible=[...cn,...[...records].sort((a,b)=>b.area-a.area).map(f=>({...f,source:'cliopatria'}))];
  if(selected&&!visible.some(f=>f.id===selected.id)){selected=null;$('polity-detail').hidden=true;}
  else if(selected)selected=visible.find(f=>f.id===selected.id);
  draw();renderList();timeline?.sync();if(selected)showDetail(selected,false);
  $('world-summary').textContent=`${records.length} 条全球疆域记录${cn.length?' · '+cn.length+' 个原项目中国政权':''}`;
  $('china-era').textContent=china.dynasty?`中国 · ${china.dynasty.title} · 原项目图层`:'中国 · 前403年以前暂缺原项目图层';
  $('coverage-note').textContent=year<CHINA_MIN_YEAR?'中国早于前403年的图层暂缺，未用其他数据补绘。全球历史疆域按来源有效期显示。':'中国部分保留原项目分期与几何。全球记录可能存在重叠、空白及不同精度。';
  $('map-status').textContent='';document.body.dataset.ready='true';document.body.dataset.year=year;document.body.dataset.chinaSnapshot=china.key||'unavailable';
 }catch(e){if(own!==serial)return;stopPlay();$('map-status').textContent='';$('error-text').textContent=e.message;$('map-error').hidden=false;document.body.dataset.ready='false';}
}
function draw(){
 const cut=$('protected-mask');cut.replaceChildren();for(const g of [...modern,...china.features.map(f=>f.geometry)])cut.append(node('path',{d:geoPath(g),'fill-rule':'evenodd'}));
 const layer=$('world-polities');layer.replaceChildren();for(const f of [...records].sort((a,b)=>b.area-a.area)){const p=node('path',{d:geoPath(f.geometry),fill:color(f),class:'polity'+(selected?.id===f.id?' selected':''),'data-id':f.id,'data-source':'cliopatria','fill-rule':'evenodd'});p.append(node('title',{},label(f)));p.addEventListener('click',e=>{if(e.defaultPrevented)return;select({...f,source:'cliopatria'},false);});layer.append(p);}
 const local=$('china-polities');local.replaceChildren();for(const f of china.features){const p=node('path',{d:geoPath(f.geometry),fill:color(f),class:'polity china-polity'+(selected?.id===f.id?' selected':''),'data-id':f.id,'data-source':'jiangshan-map','fill-rule':'evenodd'});p.append(node('title',{},f.name+' · 原项目中国图层'));p.addEventListener('click',e=>{if(!e.defaultPrevented)select(f,false);});local.append(p);}
 const sea=$('china-maritime');sea.replaceChildren();for(const g of china.maritime)sea.append(node('path',{d:geoPath(g),class:'maritime','data-source':'jiangshan-map','fill-rule':'evenodd'}));
 drawLabels();
}
function drawLabels(){
 const labels=$('world-labels');labels.replaceChildren();const boxes=[],zoom=D.zoomTransform(svg.node()).k;
 const candidates=[...china.features,...[...records].sort((a,b)=>b.area-a.area)].filter(f=>f.point&&f.name&&!f.name.startsWith('('));
 let count=0;for(const f of candidates){const local=f.source==='jiangshan-map'||f.id.startsWith('china:');if(!local&&protectedPoint(window,f.point,china))continue;if(!local&&f.area<170000/zoom)continue;const xy=projection(f.point);if(!xy||!xy.every(Number.isFinite))continue;const text=label(f);if(text.length>34&&!local)continue;const width=(/[\u3400-\u9fff]/.test(text)?text.length*12:text.length*6.2)/zoom+8/zoom,height=17/zoom;const box=[xy[0]-width/2,xy[1]-height/2,xy[0]+width/2,xy[1]+height/2];if(!local&&boxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1]))continue;boxes.push(box);labels.append(node('text',{x:xy[0],y:xy[1],class:'world-label'+(local?' china-label':''),style:`font-size:${13/zoom}px;stroke-width:${3/zoom}px`,'data-source':local?'jiangshan-map':'cliopatria'},text));if(++count>130)break;}
}
function matches(f,q){return fuzzyMatch(q,[f.name,label(f),f.member||'']);}
function renderList(){const q=$('polity-search').value.trim().toLowerCase(),list=$('polity-list');list.replaceChildren();const found=visible.filter(f=>matches(f,q));$('search-count').textContent=q?String(found.length):'';
 if(!found.length){list.append(node('p',{class:'empty-list'},'这一年没有匹配记录。可更换年份，或使用来源中的英文名称。'));return;}
 for(const f of found){const row=node('button',{class:'polity-row'+(selected?.id===f.id?' selected':''),'data-polity-id':f.id,type:'button'});row.append(node('span',{class:'polity-swatch',style:'background:'+color(f)}));const copy=node('span',{class:'polity-copy'});copy.append(node('strong',{},label(f)));copy.append(node('small',{},f.source==='jiangshan-map'?'中国 · 原项目图层':(label(f)!==f.name?f.name:'Cliopatria · '+(f.from<0?'前'+-f.from:f.from)+'—'+(f.to<0?'前'+-f.to:f.to))));row.append(copy,node('span',{class:'arrow','aria-hidden':'true'},'›'));row.addEventListener('click',()=>select(f,true));list.append(row);}}
function select(f,focus){selected=f;timeline?.renderRows();showDetail(f,focus);renderList();document.querySelectorAll('path.polity').forEach(p=>p.classList.toggle('selected',p.dataset.id===f.id));}
function showDetail(f,focus){$('polity-detail').hidden=false;$('detail-source').textContent=f.source==='jiangshan-map'?'中国原项目 · 原始图层':'Seshat Cliopatria · 全球疆域';$('detail-name').textContent=label(f);$('detail-original').textContent=f.source==='jiangshan-map'?'':f.name+(label(f)!==f.name?' · 原材料名称':' · 暂无中文参考名');$('detail-span').textContent=`来源记录：${formatYear(f.from)} — ${formatYear(f.to)}${f.source==='jiangshan-map'?'（当前阶段见地图）':''}`;$('detail-member').textContent=f.member?'来源所载关联政权：'+f.member:'';$('detail-note').textContent=f.source==='jiangshan-map'?'沿用原项目中国疆域几何与名称。详细州郡、年号、古今地名与人物行迹可在中国舆图查看。':'按来源记录的有效年份显示；重叠可能表示不同层级或附属关系，未据此生成新的精确国界。';$('detail-china').hidden=f.source!=='jiangshan-map';$('detail-china').href='../?year='+Math.max(CHINA_MIN_YEAR,year)+'&lang=zh';if(focus)fitGeometry(f.geometry);}
const zoom=D.zoom().scaleExtent([.8,18]).on('zoom',e=>{camera.attr('transform',e.transform);clearTimeout(frameTimer);frameTimer=setTimeout(()=>{drawLabels();timeline?.renderRows();},120);});
function fitGeometry(g){const b=path.bounds(orient(g)),width=b[1][0]-b[0][0],height=b[1][1]-b[0][1];if(!Number.isFinite(width+height)||width<.001)return;const k=Math.max(.8,Math.min(14,.78/Math.max(width/W,height/H))),x=W/2-k*(b[0][0]+b[1][0])/2,y=H/2-k*(b[0][1]+b[1][1])/2;svg.call(zoom.transform,D.zoomIdentity.translate(x,y).scale(k));}
function region(key){document.querySelectorAll('[data-region]').forEach(n=>n.classList.toggle('chosen',n.dataset.region===key));const boxes={china:[[70,2],[138,57]],europe:[[-15,30],[50,72]],asia:[[20,-5],[80,57]],america:[[-170,-55],[-30,75]]};if(key==='world'){svg.call(zoom.transform,D.zoomIdentity);return;}const b=boxes[key];fitGeometry({type:'Polygon',coordinates:[[[b[0][0],b[0][1]],[b[1][0],b[0][1]],[b[1][0],b[1][1]],[b[0][0],b[1][1]],[b[0][0],b[0][1]]]]});}
function stopPlay(){timeline?.stop();}
function viewportBounds(){const t=D.zoomTransform(svg.node());if(t.k<=1.05)return[[-180,-90],[180,90]];const points=[];for(const x of [0,W/2,W])for(const y of [0,H/2,H]){const p=projection.invert(t.invert([x,y]));if(p&&p.every(Number.isFinite))points.push(p);}return points.length?[[Math.max(-180,Math.min(...points.map(p=>p[0]))),Math.max(-90,Math.min(...points.map(p=>p[1])))],[Math.min(180,Math.max(...points.map(p=>p[0]))),Math.min(90,Math.max(...points.map(p=>p[1])))]]:[[-180,-90],[180,90]];}
function setup(){
 projection=D.geoEqualEarth().fitExtent([[30,65],[W-30,H-25]],{type:'Sphere'});path=D.geoPath(projection);$('world-sphere').setAttribute('d',path({type:'Sphere'}));$('world-graticule').setAttribute('d',path(D.geoGraticule10()));$('world-land').setAttribute('d',path(land));svg.call(zoom).on('dblclick.zoom',null);
 timeline=new WorldTimeline({data:timelineData,getYear:()=>year,setYear:renderYear,getBounds:viewportBounds,getSelected:()=>selected,label,color});
 $('polity-search').addEventListener('input',renderList);
 document.querySelectorAll('[data-region]').forEach(n=>n.addEventListener('click',()=>region(n.dataset.region)));
 $('reset-map').onclick=()=>region('world');$('zoom-in').onclick=()=>svg.call(zoom.scaleBy,1.5);$('zoom-out').onclick=()=>svg.call(zoom.scaleBy,1/1.5);
 $('detail-close').onclick=()=>{selected=null;$('polity-detail').hidden=true;renderList();document.querySelectorAll('path.selected').forEach(p=>p.classList.remove('selected'));};$('sources-open').onclick=()=>$('sources-dialog').showModal();$('retry').onclick=()=>renderYear(year);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay();});window.addEventListener('pagehide',stopPlay);document.addEventListener('keydown',e=>{if(e.defaultPrevented)return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)||$('sources-dialog').open||$('track-picker').open)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();stopPlay();renderYear(year+(e.key==='ArrowLeft'?-1:1));}if(e.key===' '){e.preventDefault();$('act-autoplay').click();}if(e.key==='Escape'){$('detail-close').click();}});
 $('friday-link').hidden=document.documentElement.dataset.portal!=='friday';document.querySelectorAll('button,input').forEach(n=>n.disabled=false);
}
try{[manifest,land,timelineData,translations]=await Promise.all([loadJson('data/manifest.json'),loadJson('data/land.geojson'),loadJson('data/timeline.json'),loadJson('data/translations.json')]);setup();await renderYear(year);}catch(e){$('map-status').textContent='';$('error-text').textContent='舆图数据暂时无法展开。请刷新页面重试。';$('map-error').hidden=false;$('retry').onclick=()=>location.reload();}
