import test from 'node:test';import assert from 'node:assert/strict';import {viewport,screenToWorld,worldToPercent} from './viewport.mjs';
test('responsive camera fills any aspect ratio uniformly while keeping fixed physics coordinates',()=>{
 for(const [width,height]of [[1280,720],[1920,800],[390,700],[640,440]])for(const phase of ['running','camp']){
  const view=viewport(width,height,phase,320,235);assert.ok(Math.abs(width/view.width-height/view.height)<1e-8);
  const world={x:phase==='camp'?320:108,y:235},p=worldToPercent(world.x,world.y,view),rect={left:17,top:40,width,height};
  const restored=screenToWorld(rect.left+p.x/100*width,rect.top+p.y/100*height,rect,view);assert.ok(Math.abs(restored.x-world.x)<1e-8);assert.ok(Math.abs(restored.y-world.y)<1e-8);
  if(phase==='running'){assert.ok(view.width>=320-1e-8&&view.width<=640+1e-8);assert.ok(view.left+view.width<=680,'new obstacles stay outside the visible edge');assert.ok(p.x>=0&&p.x<100);}
 }
});
