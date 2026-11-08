// Tests click actual world positions through the responsive camera, just like camp input.
export async function clickWorld(page,x,y){
 const p=await page.evaluate(async({x,y})=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const c=document.querySelector('#scene'),b=c.getBoundingClientRect(),v=c.dataset;return {x:b.left+(x-Number(v.viewLeft))/Number(v.viewWidth)*b.width,y:b.top+(y-Number(v.viewTop))/Number(v.viewHeight)*b.height};},{x,y});
 await page.mouse.click(p.x,p.y);
}
