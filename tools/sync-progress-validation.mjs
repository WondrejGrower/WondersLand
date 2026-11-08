import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/ProgressValidation.js',import.meta.url),'utf8');writeFileSync(new URL('../web/progress-validation.mjs',import.meta.url),source.replace('.pragma library','// Generated from src/ProgressValidation.js; keep in sync.')+'\nexport {validateProgress};\n');
