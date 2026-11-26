import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
const root=resolve(import.meta.dirname,'..'),entry='supabase/functions/wondersland/index.ts',files=new Map();
async function collect(name){if(files.has(name))return;const content=await readFile(resolve(root,name),'utf8');files.set(name,content);for(const match of content.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){const path=relative(root,resolve(root,dirname(name),match[1]));if(path.startsWith('..'))throw Error('Dependency outside repository');await collect(path);}}
await collect(entry);await collect('supabase/functions/wondersland/deno.json');
await mkdir(resolve(root,'supabase/.build'),{recursive:true});
await writeFile(resolve(root,'supabase/.build/deploy.json'),JSON.stringify({project_id:'semslmbkllxmnzmgeheo',name:'wondersland',entrypoint_path:entry,import_map_path:'supabase/functions/wondersland/deno.json',verify_jwt:false,files:[...files].map(([name,content])=>({name,content}))}));
console.log('Prepared Supabase server with '+files.size+' shared source files');
