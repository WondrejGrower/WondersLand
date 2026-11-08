import {mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),out=root+'dist/';
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
for(const name of ['index.html','style.css','app.mjs','core.mjs','input.mjs','feed.mjs','viewport.mjs','leaderboard-client.mjs'])await copyFile(root+'web/'+name,out+name);
for(const [a,b]of [['docs/live-recent-sample.json','recorded.json'],['src/balance.json','balance.json'],['src/i18n/cs.json','cs.json'],['pkgbuild/wondersland-game.svg','icon.svg']])await copyFile(root+a,out+b);
let visual=await readFile(root+'src/PlantVisual.js','utf8');await writeFile(out+'plant-visual.mjs',visual.replace('.pragma library','')+'\nexport {descriptor};\n');
let regions=await readFile(root+'src/EnvironmentRegions.js','utf8');await writeFile(out+'environment-regions.mjs',regions.replace('.pragma library','')+'\nexport {regions};\n');
let environment=await readFile(root+'src/EnvironmentArt.js','utf8');await writeFile(out+'environment.mjs',environment.replace('.pragma library','').replace('.import "PlantVisual.js" as Visual',"import * as Visual from './plant-visual.mjs';").replace('.import "EnvironmentRegions.js" as Data',"import * as Data from './environment-regions.mjs';")+'\nexport {setAtlases,draw,prop,plant,viewport};\n');
let sprites=await readFile(root+'src/CharacterSprites.js','utf8');await writeFile(out+'sprites.mjs',sprites.replace('.pragma library','')+'\nexport {palette,sprites};\n');
let pixels=await readFile(root+'src/PixelArt.js','utf8');await writeFile(out+'pixels.mjs',pixels.replace('.pragma library','').replace('.import "CharacterSprites.js" as Sprites',"import * as Sprites from './sprites.mjs';").replace('.import "EnvironmentArt.js" as Environment',"import * as Environment from './environment.mjs';")+'\nexport {character,plant,prop,wearablePixels,viewport};\n');
function paint(source){const start=source.indexOf(' onPaint:{')+11,end=source.indexOf('\n }\n }',start);return source.slice(start,end).replace("var c=getContext('2d');",'').replaceAll('if(!artReady)return;','').replaceAll('win.trText','wlTranslate').replaceAll('qsTr(','wlTranslate(');}
const camp=paint(await readFile(root+'src/CampView.qml','utf8')),run=paint(await readFile(root+'src/Main.qml','utf8'));
await writeFile(out+'art.mjs',`import * as PixelArt from './pixels.mjs';\nconst Qt={darker:(c,f)=>c,lighter:(c,f)=>c};\nexport function drawCamp(c,s,wlTranslate,width=640,height=360){${camp}}\nexport function drawRun(c,s,wlTranslate,width=640,height=360){const win={sky:s.region.sky,soil:s.region.soil,foliage:s.region.foliage};${run}}\n`);
await mkdir(out+'art',{recursive:true});for(const name of ['customization.png','body-animation.png','camp.png','flora.png'])await copyFile(root+'assets/runtime/'+name,out+'art/'+name);
await writeFile(out+'_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n');
console.log('Browser build ready: dist/ (shared balance, translations and native pixel art)');
