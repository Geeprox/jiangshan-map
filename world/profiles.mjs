import{matchedReference}from'./names.mjs?v=20261103-3';
// Editorial summaries are paraphrases, not copied articles. Dates below describe history, not shard validity.
export const profiles={
 'Nara Japan':{name:'奈良时代',summary:'日本古代以平城京为中心的历史时期。710年迁都平城京，律令制度与天平文化在这一时期发展；784年迁都长冈京，通常作为奈良时代的终点。',note:'历史分期通常为710—784年；地图材料的710—787年是其自身的记录区间，两者并不相同。',sources:[['日本国土交通省 · 平城京','https://www.kkr.mlit.go.jp/asuka/initiatives-heijo/about.html'],['奈良县立万叶文化馆 · 平城京','https://manyo-hyakka.pref.nara.jp/db/detailLink?cls=db_yougo3&pkey=22']]},
 'Warring States Japan':{name:'日本战国时代',summary:'日本诸大名竞争、地方势力分立的历史时期。16世纪后期进入织田信长、丰臣秀吉推动统一的阶段，这一阶段也称安土桃山时代或织丰期。',note:'“Warring States Japan”是地图材料的归类名称，跨越多种历史分期；1583年属于通常所说的安土桃山时期。',sources:[['京都橘大学 · 织丰期与安土桃山时代','https://www.tachibana-u.ac.jp/admission/tcbn/contents/1-4oshita.html'],['国立历史民俗博物馆 · 天下统一与城','https://archive.rekihaku.ac.jp/exhibitions/project/old/001003/kosei.html']]},
 'Habsburg Monarchy':{name:'哈布斯堡君主国',summary:'哈布斯堡家族统治下多个领地与王国的合称。1526年，奥地利、波希米亚与匈牙利诸领地在这一王朝下建立联系，是中欧政治格局的重要转折。',note:'这是复合君主国的概念，不能把地图中的单一色块理解为各地制度、统治程度完全一致。',sources:[['捷克驻奥地利大使馆 · 1526年与哈布斯堡君主国','https://mzv.gov.cz/vienna/cz/zpravy_a_udalosti/x1526_dynastie_monarchie_unie.html']]}
};
export const reviewedNames={...Object.fromEntries(Object.entries(profiles).map(([k,v])=>[k,v.name])),'Mamluk Sultanate':'马穆鲁克苏丹国','Mamluk Dynasty':'德里奴隶王朝'};
export function profileFor(f,entities){
 const key=f.name.replace(/^\(|\)$/g,'');if(profiles[key])return profiles[key];
 const e=matchedReference(f,entities);if(!e?.description)return null;
 return {summary:e.description,sources:[['Wikidata · '+e.qid+'（中文简述）','https://www.wikidata.org/wiki/'+e.qid]],revision:e.revision};
}
