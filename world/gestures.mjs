import{zoomTimelineRange,panTimelineRange}from'./core.mjs?v=20261103-1';
/** The whole dock owns pinch, including gutters. Single-finger controls/scroll keep their native behavior. */
export function bindTimelineGestures({dock,rail,getRange,setRange,seek,stop,onActive=()=>{}}){
 const points=new Map();let pinch=null,pending=null,usedPinch=false,safari=null,frame=null,nextRange,suppressClickUntil=0;
 const fraction=x=>{const r=rail.getBoundingClientRect();return Math.max(0,Math.min(1,(x-r.left)/r.width));};
 const flush=()=>{frame=null;if(nextRange){const range=nextRange;nextRange=null;setRange(range);}};
 const schedule=range=>{nextRange=range;if(frame===null)frame=requestAnimationFrame(flush);};
 const seekTarget=e=>e.target.closest?.('#scrubber-track,.continent-track,#timeline-drag-handle');
 const pair=()=>{const[a,b]=[...points.values()];return{distance:Math.max(4,Math.hypot(a.x-b.x,a.y-b.y)),anchor:fraction((a.x+b.x)/2)};};
 const begin=()=>{const p=pair();pinch={...p,range:[...getRange()]};usedPinch=true;pending=null;stop();onActive(true);for(const id of points.keys())try{dock.setPointerCapture(id);}catch{}};
 dock.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;if(!points.size){usedPinch=false;pending=seekTarget(e)?{x:e.clientX,y:e.clientY,moved:false}:null;}points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size>=2){e.preventDefault();e.stopPropagation();begin();}else if(pending){e.preventDefault();e.stopPropagation();dock.setPointerCapture(e.pointerId);}},true);
 dock.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(points.size>=2){e.preventDefault();e.stopPropagation();if(!pinch)begin();const p=pair();schedule(zoomTimelineRange(pinch.range,p.distance/pinch.distance,pinch.anchor,p.anchor));}else if(!usedPinch&&pending){e.preventDefault();e.stopPropagation();if(Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>6)pending.moved=true;if(pending.moved){stop();seek(fraction(e.clientX));}}},true);
 const end=e=>{if(!points.has(e.pointerId))return;if(usedPinch||pending)e.stopPropagation();if(e.type!=='pointercancel'&&!usedPinch&&pending){stop();seek(fraction(e.clientX));}if(usedPinch)suppressClickUntil=Date.now()+350;points.delete(e.pointerId);if(points.size<2)pinch=null;if(!points.size){pending=null;usedPinch=false;onActive(false);if(frame!==null){cancelAnimationFrame(frame);flush();}}};
 dock.addEventListener('pointerup',end,true);dock.addEventListener('pointercancel',end,true);dock.addEventListener('lostpointercapture',e=>{if(points.has(e.pointerId))end({pointerId:e.pointerId,type:'pointercancel',stopPropagation(){}});},true);
 dock.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopPropagation();}},true);
 dock.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false});
 dock.addEventListener('wheel',e=>{const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?rail.clientWidth:1);if(e.ctrlKey){e.preventDefault();stop();schedule(zoomTimelineRange(nextRange||getRange(),Math.exp(Math.max(-1,Math.min(1,-delta*.01))),fraction(e.clientX)));}else if(Math.abs(e.deltaX)>Math.abs(e.deltaY)||e.shiftKey){e.preventDefault();stop();const r=nextRange||getRange();schedule(panTimelineRange(r,(e.deltaX||delta)/rail.clientWidth));}},{passive:false});
 // Safari trackpad pinch uses GestureEvent rather than ctrl+wheel.
 dock.addEventListener('gesturestart',e=>{if(points.size>=2)return;e.preventDefault();stop();safari={range:[...getRange()],anchor:fraction(e.clientX)};onActive(true);},{passive:false});
 dock.addEventListener('gesturechange',e=>{if(!safari||points.size>=2)return;e.preventDefault();schedule(zoomTimelineRange(safari.range,e.scale,safari.anchor));},{passive:false});
 dock.addEventListener('gestureend',e=>{if(!safari)return;e.preventDefault();safari=null;onActive(false);},{passive:false});
}
