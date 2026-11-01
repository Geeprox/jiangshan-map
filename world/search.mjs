import{fuzzyMatch}from'./names.mjs?v=20261101-6';
import{currentState,MIN_YEAR,MAX_YEAR,normalizeYear,formatYear}from'./core.mjs?v=20261101-6';
const plain=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function buildSearchIndex({countries,dynasties,evidence,label,regions=[]}){
 return [...countries.map(c=>({key:c.key,kind:'country',name:label(c),original:c.name,country:c})),
 ...dynasties.map(d=>({key:'era:'+d.key,kind:'china',name:d.title,original:d.title,era:d})),
 ...(evidence?.records||[]).map(r=>({key:'site:'+r.id,kind:'evidence',name:r.name,original:r.place,record:r,epochs:evidence.epochs.filter(e=>r.contexts.includes(e.key))})),
 ...regions.map(r=>({key:'region:'+r.key,kind:'region',name:r.name,original:r.name,region:r.key}))];
}
export function searchAtlas(index,query,year){const q=plain(query);if(!q)return[];
 return index.filter(i=>fuzzyMatch(q,[i.name,i.original,i.record?.entity||''])).map(i=>{
  let active=false,targetYear=year,stateId,from,to;
  if(i.kind==='country'){const c=i.country,current=currentState(c,year),state=current||[...c.states].sort((a,b)=>b.area-a.area||a.from-b.from)[0];active=!!current;targetYear=active?year:normalizeYear(Math.max(MIN_YEAR,state.from));stateId=state.id;from=Math.min(...c.states.map(s=>s.from));to=Math.max(...c.states.map(s=>s.to));}
  if(i.kind==='china'){const d=i.era;active=year>=d.fromYear&&year<d.toYear;targetYear=active?year:normalizeYear(d.focusYear);from=d.fromYear;to=Math.min(MAX_YEAR,d.toYear-1);}
  if(i.kind==='evidence'){const r=i.record,epoch=i.epochs.find(e=>year>=e.fromYear&&year<e.toYear),dateFits=!r.span||(year>=r.span[0]&&year<r.span[1]);active=!!epoch&&dateFits;const e=epoch||i.epochs[0],lo=Math.max(e.fromYear,r.span?.[0]??MIN_YEAR),hi=Math.min(e.toYear,r.span?.[1]??MAX_YEAR+1)-1;targetYear=active?year:Math.max(lo,Math.min(hi,e.focusYear));from=lo;to=hi;}
  const name=plain(i.name),raw=plain(i.original),score=(name===q?1000:raw===q?900:name.startsWith(q)?400:raw.startsWith(q)?350:name.includes(q)?200:100)+(active?20:0);
  return {...i,active,targetYear,stateId,from,to,score};
 }).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'zh-CN'));
}
export function mountAtlasSearch({index,getYear,onSelect}){
 const input=document.getElementById('polity-search'),form=document.getElementById('atlas-search-form'),host=document.getElementById('search-results'),list=document.getElementById('search-result-list'),status=document.getElementById('search-status'),clear=document.getElementById('search-clear'),live=document.getElementById('search-announcement');let results=[],open=false,composing=false,pending=false;
 const close=()=>{open=false;host.hidden=true;};
 const choose=async item=>{if(pending)return;pending=true;form.setAttribute('aria-busy','true');status.textContent='正在前往'+item.name+'…';try{const ok=await onSelect(item);if(ok!==false){input.value=item.name;clear.hidden=false;input.focus({preventScroll:true});close();live.textContent='已前往'+item.name+(item.kind==='region'?'':'，'+formatYear(item.targetYear));}else{status.textContent='地图暂时无法加载，可重新选择此结果重试。';live.textContent=status.textContent;}}finally{pending=false;form.removeAttribute('aria-busy');}};
 const render=()=>{const q=input.value.trim();clear.hidden=!q;if(!q){close();status.textContent='';live.textContent='';return;}results=searchAtlas(index,q,getYear());open=true;host.hidden=false;list.replaceChildren();status.textContent=results.length?`找到 ${results.length} 项${results.length>12?'，显示前12项':''}`:'没有匹配结果，可换个名称或清除搜索。';
  live.textContent=status.textContent;
  for(const item of results.slice(0,12)){const li=document.createElement('li'),button=document.createElement('button'),title=document.createElement('strong'),meta=document.createElement('small');button.type='button';button.className='search-result';button.dataset.searchKey=item.key;title.textContent=item.name;meta.textContent=item.kind==='region'?'地图区域':`${item.active?'当前年份':'前往 '+formatYear(item.targetYear)} · ${item.kind==='china'?'中国历史':item.kind==='evidence'?item.record.place:item.original}`;button.append(title,meta);button.onclick=()=>choose(item);button.onkeydown=e=>{const buttons=[...list.querySelectorAll('button')],at=buttons.indexOf(button);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();if(e.key==='ArrowUp'&&at===0)input.focus();else buttons[Math.max(0,Math.min(buttons.length-1,at+(e.key==='ArrowDown'?1:-1)))].focus();}};li.append(button);list.append(li);}
  if(!results.length){const li=document.createElement('li');li.className='search-empty';li.textContent='试试“罗马帝国”“唐”或“殷墟”。';list.append(li);}
 };
 input.addEventListener('input',render);input.addEventListener('click',()=>{if(input.value.trim())render();});input.addEventListener('focus',()=>{if(input.value.trim())render();});input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>composing=false);
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&!composing){e.preventDefault();e.stopPropagation();if(!open)render();list.querySelector('button')?.focus();}if(e.key==='Enter'&&e.isComposing)e.preventDefault();});
 form.addEventListener('submit',e=>{e.preventDefault();if(composing)return;if(!open)render();if(results[0])choose(results[0]);});
 document.getElementById('atlas-search').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();input.focus();close();}});
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('#atlas-search'))close();});
 document.getElementById('atlas-search').addEventListener('focusout',e=>{if(e.relatedTarget&&!e.currentTarget.contains(e.relatedTarget))close();});
 clear.onclick=()=>{input.value='';render();input.focus();};
 return{refresh(){if(open)render();},close};
}
