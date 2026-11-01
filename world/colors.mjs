/** Text colors are measured against each opaque band fill, including inactive tinting. */
const rgb=hex=>hex.replace('#','').match(/../g).map(x=>parseInt(x,16));
const luminance=hex=>rgb(hex).map(v=>{const n=v/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
export function contrastRatio(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function bandColors(hex){const fill='#'+rgb(hex).map((v,i)=>Math.round(v*.78+rgb('#ebe4d6')[i]*.22).toString(16).padStart(2,'0')).join(''),ink=bg=>['#2b2622','#ffffff','#000000'].find(c=>contrastRatio(c,bg)>=4.5);return{fill,ink:ink(fill),activeFill:hex,activeInk:ink(hex)};}
