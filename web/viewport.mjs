// Camera is presentation only. Simulation coordinates, transaction sizes and speed stay fixed.
export function viewport(width,height,phase,campX=320,campY=235){
 const scale=phase==='camp'?Math.min(height/360,width/320):Math.max(width/640,Math.min(height/360,width/320));
 const w=width/scale,h=height/scale;
 return {width:w,height:h,left:phase==='camp'?Math.round(w>=640?(640-w)/2:Math.max(0,Math.min(640-w,campX-w/2))):Math.max(0,Math.round(108-w*.25)),top:phase==='camp'?Math.round((360-h)/2):0};
}
export function screenToWorld(x,y,rect,view){return {x:view.left+(x-rect.left)/rect.width*view.width,y:view.top+(y-rect.top)/rect.height*view.height};}
export function worldToPercent(x,y,view){return {x:(x-view.left)/view.width*100,y:(y-view.top)/view.height*100};}
