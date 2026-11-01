/* Additional navigation only; the original China controller and data stay unchanged. */
(function(){'use strict';if(document.documentElement.dataset.portal==='friday'){const u=new URL(location.href);if(u.searchParams.get('lang')!=='en'){u.searchParams.set('lang','zh');history.replaceState(null,'',u);}}const bar=document.querySelector('.control-strip');if(!bar)return;
const link=document.createElement('a');link.className='action-btn subtle';link.id='act-world';link.textContent='世界舆图';link.title='同一年，看看世界各地';bar.prepend(link);
function sync(){const y=Number(new URLSearchParams(location.search).get('year')??-403);link.href='world/?year='+Math.max(-3400,Math.min(2024,y||1));}sync();link.addEventListener('pointerdown',sync);link.addEventListener('focus',sync);
if(document.documentElement.dataset.portal==='friday'){const home=document.createElement('a');home.className='action-btn subtle';home.href='/';home.textContent='← Friday';home.setAttribute('aria-label','返回 Friday 门户');bar.prepend(home);}
})();
