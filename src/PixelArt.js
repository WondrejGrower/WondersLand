.pragma library
var cache={}
function character(c,x,y,ch,frame,hands,boots,mode){
 ch=ch||{};frame=Math.floor(frame||0)%6;mode=mode||"idle";
 var key=JSON.stringify([ch,frame,hands,boots,mode]);var pixels=cache[key];
 if(!pixels){
 var grid=new Array(40);for(var j=0;j<40;j++)grid[j]=new Array(24);
 function dot(px,py,col){if(px>=0&&px<24&&py>=0&&py<40)grid[py][px]=col}
 function box(px,py,w,h,col){for(var yy=py;yy<py+h;yy++)for(var xx=px;xx<px+w;xx++)dot(xx,yy,col)}
 function line(ax,ay,bx,by,w,col){var n=Math.max(Math.abs(bx-ax),Math.abs(by-ay));for(var z=0;z<=n;z++)box(Math.round(ax+(bx-ax)*z/Math.max(1,n))-Math.floor(w/2),Math.round(ay+(by-ay)*z/Math.max(1,n)),w,w,col)}
 var skin=ch.skin||"#dfaf87",hair=ch.hair||"#6e493b",shirt=ch.shirt||"#679e86",dark="#253442",shade="#475b63";
 var legs=[[[9,28,6,33,3,36],[15,28,17,33,18,38]],[[9,28,8,34,5,38],[15,28,16,32,19,34]],[[9,28,10,34,9,39],[15,28,15,34,15,39]],[[9,28,12,33,16,38],[15,28,11,33,7,36]],[[9,28,12,32,17,34],[15,28,12,35,10,39]],[[9,28,9,34,9,39],[15,28,15,34,15,39]]];
 var pose=mode==="jump"?[[9,28,6,32,9,34],[15,28,18,31,20,34]]:mode==="run"?legs[frame]:mode==="hit"?[[9,28,5,31,2,33],[15,28,18,31,21,35]]:mode==="land"?[[9,28,6,33,8,37],[15,28,18,33,16,37]]:[[9,28,9,34,9,39],[15,28,15,34,15,39]];
 for(var k=0;k<2;k++){var p=pose[k];line(p[0],p[1],p[2],p[3],4,dark);line(p[2],p[3],p[4],p[5]-2,4,dark);line(p[0],p[1],p[2],p[3],2,k?"#667d8b":"#9eafac");box(p[4]-2,p[5]-2,6,3,boots?"#7ccfd3":"#4a4c46");box(p[4]-1,p[5]-2,3,1,boots?"#dcf0d6":"#a3a48d")}
 box(6,16,13,14,dark);box(7,17,11,11,shirt);box(7,17,3,9,"#476b62");box(10,18,6,2,"#a3bc9a");box(10,23,7,1,"#83a38b");box(7,28,11,2,"#86694b");box(12,28,2,2,"#d3ba75");
 var swing=mode==="run"?[3,1,0,-3,-1,0][frame]:mode==="jump"?-6:mode==="hit"?-9:0;
 line(6,18,4,23+swing,4,dark);line(4,23+swing,6,27+swing,3,skin);line(18,18,20,22-swing,4,dark);line(20,22-swing,20,27-swing,3,skin);
 if(hands){box(4,25+swing,4,4,"#89d2d8");dot(5,25+swing,"#e1f3d9");box(18,25-swing,4,4,"#89d2d8");dot(19,25-swing,"#e1f3d9")}
 box(7,5,12,12,dark);box(8,6,10,10,skin);box(8,12,2,3,"#b27a61");box(15,9,2,2,"#293542");dot(16,9,"#e6d9af");box(13,14,3,1,"#91634e");box(6,8,2,4,skin);
 box(6,3,13,5,hair);box(7,2,10,2,hair);box(7,6,3,4,hair);box(10,3,6,1,"#b18a66");
 var style=ch.hairStyle||0;if(style===1){box(5,6,3,10,hair);box(17,4,3,13,hair)}else if(style===2){box(9,0,3,4,hair);box(14,1,2,3,hair)}else if(style===3){box(5,5,3,3,hair);box(3,8,3,8,hair);box(17,7,4,4,hair)}
 // One-pixel silhouette outline is generated once for each layered pose.
 pixels=[];for(j=0;j<40;j++)for(var i=0;i<24;i++)if(grid[j][i])pixels.push([i,j,grid[j][i]]);
 if(Object.keys(cache).length>256)cache={};cache[key]=pixels;
 }
 for(var n=0;n<pixels.length;n++){var p=pixels[n];c.fillStyle=p[2];c.fillRect(Math.round(x)+p[0],Math.round(y)+p[1],1,1)}
}
function plant(c,p,ground){
 var x=Math.round(p.x),h=p.h,w=p.w,top=ground-h;
 function r(px,py,rw,rh,col){c.fillStyle=col;c.fillRect(Math.round(px),Math.round(py),Math.max(1,Math.round(rw)),Math.max(1,Math.round(rh)))}
 var tree=["birch","pine","oak","sequoia"].indexOf(p.type)>=0;
 var seed=parseInt((p.txid||"0a7d").slice(0,5),16)||127;
 if(tree){
 var trunk=Math.max(4,Math.round(w*.2));r(x+w/2-trunk/2,top,trunk,h,p.type==="birch"?"#c6c6a5":"#78563e");
 for(var iy=Math.max(top,ground-360);iy<ground;iy+=7){r(x+w/2-trunk/2+1,iy,2,4,p.type==="birch"?"#535c52":"#a37a50");if(iy%3===0)r(x+w/2,iy,2,2,"#493f35")}
 for(var j=0;j<7;j++){var branchY=top+h*.12+j*h*.092;var spread=w*(p.type==="pine"||p.type==="sequoia"?.25+j*.08:.8-Math.abs(j-3)*.13);var side=j%2?1:-1;r(x+w/2,branchY,side>0?spread/2:2,3,"#876447");r(x+w/2-spread/2,branchY-7,spread,13,"#2c503c");r(x+w/2-spread/2+2,branchY-8,spread*.65,5,"#5d8050");r(x+w/2-spread/2+5,branchY-6,spread*.25,2,"#9aaf66");for(var a=0;a<7;a++)r(x+w/2-spread/2+((a*7+seed)%Math.max(1,spread)),branchY+(a%3)-3,2,2,"#748e50")}
 r(x+w/2-7,ground-3,14,3,"#67533d");
 }else if(p.type==="cannabis"||p.type==="fern"){
 r(x+w/2,top,2,h,"#7fa34c");for(j=0;j<5;j++){var cy=top+5+j*h*.17;for(var d=-3;d<=3;d++){var dx=d*(w/7);r(x+w/2+dx,cy-Math.abs(d)*2,2,7,"#84b649");r(x+w/2+dx-1,cy+1,3,2,"#b0c765")}}r(x+w/2-1,top,4,7,"#c6bd76");
 }else{r(x+w/2,top+5,2,Math.max(1,h-5),"#67915a");r(x+w/2-5,ground-4,5,2,"#92b263");r(x+w/2+1,ground-7,5,2,"#51794e");var col=p.type==="rose"?"#d58a9b":p.type==="tulip"?"#e6a26d":"#e4d693";r(x+w/2-3,top+2,7,4,col);r(x+w/2-1,top,3,8,col);r(x+w/2,top+3,2,2,"#f4e9c2")}
}
