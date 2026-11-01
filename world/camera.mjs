/** Camera math is independent of source coordinates; no geometry is rewritten. */
export function flightZoom(from,to,t,travel){const cruise=travel>.6?Math.min(from,to,1):Math.min(from,to);const p=t<.5?t*2:(t-.5)*2;const eased=p*p*(3-2*p);return t<.5?from+(cruise-from)*eased:cruise+(to-cruise)*eased;}
export function globePointVisible(point,rotation){const rad=Math.PI/180,lon=(point[0]+rotation[0])*rad,lat=point[1]*rad,center=-rotation[1]*rad;return Math.sin(lat)*Math.sin(center)+Math.cos(lat)*Math.cos(center)*Math.cos(lon)>0;}
