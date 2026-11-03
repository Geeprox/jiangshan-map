import{selectEarlyChina}from'./early.mjs?v=20261103-3';
/** Pure temporal/source policy. China selection mirrors the pinned upstream controller. */
export const MIN_YEAR=-3400, MAX_YEAR=2024, CHINA_MIN_YEAR=-2070, UPSTREAM_CHINA_MIN_YEAR=-403;
export function normalizeYear(raw,fallback=741){const n=Number(raw);if(!Number.isFinite(n))return fallback;return Math.max(MIN_YEAR,Math.min(MAX_YEAR,Math.round(n)||1));}
export function formatYear(y){return y<0?`公元前 ${Math.abs(y)} 年`:`公元 ${y} 年`;}
export function shardStart(y){return Math.floor(y/100)*100;}
export function activeRecords(records,y){return records.filter(f=>f.from<=y&&y<=f.to);}
export function selectChinaSnapshot(w,y){
 if(y<UPSTREAM_CHINA_MIN_YEAR)return selectEarlyChina(w.EARLY_CHINA_DATA,y)||{key:null,dynasty:null,features:[],evidence:[],maritime:[],regions:[]};
 const d=[...w.DYNASTY_DATA].reverse().find(d=>y>=d.fromYear);
 const ph=d.phases&&(d.phases.find(p=>y<p.until)||d.phases.at(-1));
 const key=ph?ph.snap:`s_${d.key}`,s=w.ATLAS_SNAPSHOTS[key];
 if(!s)throw Error('原项目中国图层缺失：'+key);
 const provinces=w.PROVINCE_OUTLINES.filter(p=>!String(p.code).includes('_JD'));
 const feature=p=>({id:'china:'+key+':'+p.title,name:p.title,from:d.fromYear,to:d.toYear,source:'jiangshan-map',geometry:p.shape,point:p.anchor,tint:p.tint,role:p.role});
 const modern=d.key==='prc';
 const features=modern?[{id:'china:s_prc',name:'中国',source:'jiangshan-map',from:1949,to:MAX_YEAR,point:[104,35],tint:'#b5452f',geometry:{type:'MultiPolygon',coordinates:provinces.flatMap(p=>p.rings)}}]:(s.polities||[]).filter(p=>p.role!=='neighbor').map(feature);
 const reg=s.regions?.length?s.regions:w.ATLAS_SNAPSHOTS[s.regionRef]?.regions||[];
 return {key,dynasty:d,features,caption:s.caption||d.title,note:s.note,regions:modern?provinces.map(p=>({name:p.title,point:p.hub,geometry:{type:'MultiPolygon',coordinates:p.rings}})):reg.map(p=>({name:p.title,point:p.anchor,geometry:p.shape})),maritime:modern?w.PROVINCE_OUTLINES.filter(p=>String(p.code).includes('_JD')).map(p=>({type:'MultiPolygon',coordinates:p.rings})):[]};
}
function inRing(point,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function pointInGeometry(p,g){const ps=g.type==='Polygon'?[g.coordinates]:g.coordinates;return ps.some(r=>inRing(p,r[0])&&!r.slice(1).some(h=>inRing(p,h)));}
export function protectedPoint(w,p,china){return w.PROVINCE_OUTLINES.filter(x=>!String(x.code).includes('_JD')).some(x=>pointInGeometry(p,{type:'MultiPolygon',coordinates:x.rings}))||china.features.some(x=>pointInGeometry(p,x.geometry));}
export const PLAY_SPEED_STEPS=[1,2,.25,.5];
export function nextSpeed(speed){return PLAY_SPEED_STEPS[(PLAY_SPEED_STEPS.indexOf(speed)+1)%PLAY_SPEED_STEPS.length];}
export function progressForYear(year,range){return Math.max(0,Math.min(1,(year-range[0])/(range[1]-range[0])));}
export function yearForProgress(p,range){return normalizeYear(Math.min(range[1]-1,Math.round(range[0]+Math.max(0,Math.min(1,p))*(range[1]-range[0]))));}
export function timelineBand(b,range){const from=Math.max(b.from,range[0]),to=Math.min(b.to,range[1]);return to>from?{...b,from,to,left:(from-range[0])/(range[1]-range[0]),width:(to-from)/(range[1]-range[0])}:null;}
export function currentState(country,year){return country.states.filter(s=>s.from<=year&&year<=s.to).sort((a,b)=>b.area-a.area)[0];}
export function inViewport(point,bounds){return !!point&&(bounds[0][0]<=bounds[1][0]?(point[0]>=bounds[0][0]&&point[0]<=bounds[1][0]):(point[0]>=bounds[0][0]||point[0]<=bounds[1][0]))&&point[1]>=bounds[0][1]&&point[1]<=bounds[1][1]&&(!bounds.contains||bounds.contains(point));}
export function chooseTimelineCountries(countries,{year,bounds,mode='auto',selectedId=null,limit=6}){
 const active=countries.map(c=>({country:c,state:currentState(c,year)})).filter(x=>mode==='history'||x.state);
 const inside=active.filter(x=>inViewport(x.state?.point||x.country.point,bounds));
 const viewportFallback=mode==='auto'&&!inside.length&&active.length>0;
 const ranked=(mode==='all'||mode==='history'||viewportFallback?active:inside).sort((a,b)=>(b.state?.area||b.country.maxArea)-(a.state?.area||a.country.maxArea));
 let chosen=[];
 if(mode==='auto'){
  const continents=new Set();for(const x of ranked){if(chosen.length>=limit)break;if(continents.has(x.country.continent))continue;continents.add(x.country.continent);chosen.push(x);}
  for(const x of ranked){if(chosen.length>=limit)break;if(!chosen.includes(x))chosen.push(x);}
 }else chosen=ranked;
 const selected=countries.find(c=>c.key===selectedId||c.states.some(s=>s.id===selectedId));
 if(selected&&!chosen.some(x=>x.country===selected))chosen.unshift({country:selected,state:currentState(selected,year)});
 return{rows:chosen.map(x=>x.country),hiddenCount:Math.max(0,active.length-chosen.length),outsideCount:active.length-inside.length,activeCount:active.length,viewportFallback};
}

/** Manual choices persist separately from their currently visible projection. */
export function manualTimelineCountries(countries,{year,bounds,checked}){const chosen=countries.filter(c=>checked.has(c.key)),rows=chosen.filter(c=>{const state=currentState(c,year);return state&&inViewport(state.point,bounds);});return {rows,hiddenCount:chosen.length-rows.length,outsideCount:chosen.length-rows.length,activeCount:chosen.length};}

export const MIN_TIMELINE_SPAN=10;
export function boundTimelineRange(range){const span=Math.max(MIN_TIMELINE_SPAN,Math.min(MAX_YEAR+1-MIN_YEAR,range[1]-range[0]));const lo=Math.max(MIN_YEAR,Math.min(MAX_YEAR+1-span,range[0]));return [lo,lo+span];}
/** Positive scale zooms in. A moved center also pans without changing the anchor year. */
export function zoomTimelineRange(range,scale,anchor=.5,newAnchor=anchor){if(!Number.isFinite(scale)||scale<=0)return [...range];const span=Math.max(MIN_TIMELINE_SPAN,Math.min(MAX_YEAR+1-MIN_YEAR,(range[1]-range[0])/scale)),year=range[0]+anchor*(range[1]-range[0]);return boundTimelineRange([year-newAnchor*span,year+(1-newAnchor)*span]);}
export function panTimelineRange(range,fraction){const shift=(range[1]-range[0])*fraction;return boundTimelineRange([range[0]+shift,range[1]+shift]);}

/** Pins are independent of viewport, year and checkbox filters; keep insertion order. */
export function mergePinnedTracks(countries,picked,pinned,selectedId){const byKey=new Map(countries.map(c=>[c.key,c])),selected=countries.find(c=>c.states.some(s=>s.id===selectedId)),fixed=[...(selected?[selected]:[]),...[...pinned].map(k=>byKey.get(k)).filter(Boolean)],seen=new Set();return {...picked,rows:[...fixed,...picked.rows].filter(c=>!seen.has(c.key)&&seen.add(c.key))};}
