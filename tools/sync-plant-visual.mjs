import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/PlantVisual.js',import.meta.url),'utf8');
writeFileSync(new URL('../web/plant-visual.mjs',import.meta.url),source.replace('.pragma library','// Generated from src/PlantVisual.js by tools/sync-plant-visual.mjs.')+'\nexport {descriptor};\n');
