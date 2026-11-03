/** Convert a readable CSS-pixel size into the scaled SVG/canvas coordinate system. */
export function labelMetrics(viewWidth,cssWidth,zoom=1){const css=cssWidth<=680?14:13,unit=viewWidth/Math.max(1,cssWidth)/Math.max(.8,zoom);return{font:css*unit,halo:3*unit,gap:8*unit,height:20*unit};}
