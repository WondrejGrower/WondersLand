import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'dist/';
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','style.css','app.mjs','core.mjs','input.mjs','feed.mjs'])await copyFile(root+'web/'+name,out+name);
for(const [a,b]of [['docs/live-recent-sample.json','recorded.json'],['src/balance.json','balance.json'],['src/i18n/cs.json','cs.json'],['pkgbuild/wondersland-game.svg','icon.svg']])await copyFile(root+a,out+b);
let pixels=await readFile(root+'src/PixelArt.js','utf8');await writeFile(out+'pixels.mjs',pixels.replace('.pragma library','')+'\nexport {character,plant};\n');
function paint(source){const start=source.indexOf(' onPaint:{')+11,end=source.indexOf('\n }\n }',start);return source.slice(start,end).replace("var c=getContext('2d');",'').replaceAll('win.trText','wlTranslate').replaceAll('qsTr(','wlTranslate(');}
const camp=paint(await readFile(root+'src/CampView.qml','utf8')),run=paint(await readFile(root+'src/Main.qml','utf8'));
await writeFile(out+'art.mjs',`import * as PixelArt from './pixels.mjs';\nconst Qt={darker:(c,f)=>c,lighter:(c,f)=>c};\nexport function drawCamp(c,s,wlTranslate,width=640,height=360){${camp}}\nexport function drawRun(c,s,wlTranslate,width=640,height=360){const win={sky:s.region.sky,soil:s.region.soil,foliage:s.region.foliage};${run}}\n`);
await writeFile(out+'_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n');
console.log('Browser build ready: dist/ (shared balance, translations and native pixel art)');
