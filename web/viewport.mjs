// Camera is presentation only. Simulation coordinates, transaction sizes and speed stay fixed.
export function viewport(width,height,phase,campX=320,campY=235){
 const camp=phase==='camp';
 const scale=camp?Math.max(height/360,width/640):Math.max(width/640,Math.min(height/360,width/320));
 const w=width/scale,h=height/scale;
 const follow=(position,size,limit)=>Math.max(0,Math.min(limit-size,position-size/2));
 return {width:w,height:h,left:camp?follow(campX,w,640):Math.max(0,Math.round(108-w*.25)),top:camp?follow(campY,h,360):0};
}
export function screenToWorld(x,y,rect,view){return {x:view.left+(x-rect.left)/rect.width*view.width,y:view.top+(y-rect.top)/rect.height*view.height};}
export function worldToPercent(x,y,view){return {x:(x-view.left)/view.width*100,y:(y-view.top)/view.height*100};}
