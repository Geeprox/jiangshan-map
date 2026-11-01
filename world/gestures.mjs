/** Gesture routing is owned by the stable dock so redrawing rows cannot lose a pinch. */
export function bindTimelineGestures({dock,rail,getRange,setRange,seek,stop,onActive=()=>{}}){
 const points=new Map();let pinch=null,pending=null,usedPinch=false,safari=null,frame=null,nextRange;
 const fraction=x=>{const r=rail.getBoundingClientRect();return Math.max(0,Math.min(1,(x-r.left)/r.width));};
 const flush=()=>{frame=null;if(nextRange){const range=nextRange;nextRange=null;setRange(range);}};
 const schedule=range=>{nextRange=range;if(frame===null)frame=requestAnimationFrame(flush);};
 const active=e=>e.target.closest?.('#scrubber-rail-wrap,.continent-track,#timeline-drag-handle');
 const pair=()=>{const[a,b]=[...points.values()];return{distance:Math.max(4,Math.hypot(a.x-b.x,a.y-b.y)),anchor:fraction((a.x+b.x)/2)};};
 const begin=()=>{const p=pair();pinch={...p,range:[...getRange()]};usedPinch=true;pending=null;stop();onActive(true);};
 dock.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||!active(e))return;e.preventDefault();e.stopPropagation();if(!points.size){usedPinch=false;pending={x:e.clientX,y:e.clientY,moved:false};}points.set(e.pointerId,{x:e.clientX,y:e.clientY});dock.setPointerCapture(e.pointerId);if(points.size===2)begin();},true);
 dock.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;e.preventDefault();e.stopPropagation();points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size>=2){if(!pinch)begin();const p=pair();schedule(zoomTimelineRange(pinch.range,p.distance/pinch.distance,pinch.anchor,p.anchor));}else if(!usedPinch&&pending){if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>6)pending.moved=true;if(pending.moved){stop();seek(fraction(e.clientX));}}},true);
 const end=e=>{if(!points.has(e.pointerId))return;e.stopPropagation();if(e.type!=='pointercancel'&&!usedPinch){stop();seek(fraction(e.clientX));}points.delete(e.pointerId);if(points.size<2)pinch=null;if(!points.size){pending=null;usedPinch=false;onActive(false);if(frame!==null){cancelAnimationFrame(frame);flush();}}};
 dock.addEventListener('pointerup',end,true);dock.addEventListener('pointercancel',end,true);dock.addEventListener('lostpointercapture',e=>{if(points.has(e.pointerId))end({...e,pointerId:e.pointerId,type:'pointercancel',stopPropagation:()=>{}});},true);
 dock.addEventListener('wheel',e=>{if(!active(e))return;const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?rail.clientWidth:1);if(e.ctrlKey){e.preventDefault();stop();schedule(zoomTimelineRange(nextRange||getRange(),Math.exp(Math.max(-1,Math.min(1,-delta*.01))),fraction(e.clientX)));}else if(Math.abs(e.deltaX)>Math.abs(e.deltaY)||e.shiftKey){e.preventDefault();stop();const r=nextRange||getRange();schedule(panTimelineRange(r,(e.deltaX||delta)/rail.clientWidth));}},{passive:false});
 // Safari trackpad pinch uses GestureEvent rather than ctrl+wheel.
 dock.addEventListener('gesturestart',e=>{if(!active(e)||points.size>=2)return;e.preventDefault();stop();safari={range:[...getRange()],anchor:fraction(e.clientX)};onActive(true);},{passive:false});
 dock.addEventListener('gesturechange',e=>{if(!safari||points.size>=2)return;e.preventDefault();schedule(zoomTimelineRange(safari.range,e.scale,safari.anchor));},{passive:false});
 dock.addEventListener('gestureend',e=>{if(!safari)return;e.preventDefault();safari=null;onActive(false);},{passive:false});
}
import{zoomTimelineRange,panTimelineRange}from'./core.mjs?v=20261101-2';
