const STOP=new Set('the of and empire kingdom republic dynasty sultanate caliphate principality duchy county city states state old early late great imperial'.split(' '));
function norm(s){return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[_()’']/g,' ').replace(/[^a-z0-9 -]/g,' ').split(/[\s-]+/).filter(w=>w&&!STOP.has(w)).sort().join(' ');}
/** A source QID is not proof that its label names the same historical entity. */
export function referenceName(f,entities,curated={}){
 if(f.source==='jiangshan-map')return f.name;
 const raw=f.name.replace(/^\(|\)$/g,'');if(curated[raw])return curated[raw];
 const q=(String(f.qid||'').match(/Q\d+/)||[])[0],e=q&&entities[q];if(!e?.zh||!e.en)return f.name;
 const candidates=[f.name,f.wiki].map(norm).filter(Boolean),labels=[e.en,...e.aliasesEn||[]].map(norm);
 if(candidates.some(a=>labels.includes(a)))return e.zh;
 return f.name;
}
export function fuzzyMatch(query,values){const q=query.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(!q)return true;return values.some(value=>{const s=String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(s.includes(q))return true;let i=0;for(const ch of s){if(ch===q[i])i++;if(i===q.length)return true;}return false;});}
