// Generated from src/ProgressValidation.js; keep in sync.
// Structural validation, not proof of earned progress. Shared by Qt and web.
function validateProgress(input,config){
 function bad(){throw Error('Invalid progress file');}
 function object(x){return x!==null&&typeof x==='object'&&!Array.isArray(x);}
 function number(x,max,integer){return typeof x==='number'&&isFinite(x)&&x>=0&&x<=max&&(!integer||Math.floor(x)===x);}
 function text(x,max){return typeof x==='string'&&x.length<=max&&!/[\u0000-\u001f\u007f]/.test(x);}
 function list(x,max,check){if(!Array.isArray(x)||x.length>max)bad();for(var i=0;i<x.length;i++)if(!check(x[i]))bad();}
 function ids(group){return config[group].map(function(x){return x.id;});}
 function known(x,allowed){return typeof x==='string'&&allowed.indexOf(x)>=0;}
 if(!object(input))bad();
 var budget=100000;
 function tree(x,depth){if(--budget<0||depth>12)bad();if(typeof x==='number'&&!isFinite(x))bad();if(x&&typeof x==='object'){var keys=Object.keys(x);for(var i=0;i<keys.length;i++){if(['__proto__','prototype','constructor'].indexOf(keys[i])>=0)bad();tree(x[keys[i]],depth+1);}}}
 tree(input,0);
 if(input.schemaVersion===undefined){for(var legacy of ['coins','best'])if(input[legacy]!==undefined&&!number(input[legacy],2000000000,true))bad();return true;}
 if([3,4,5].indexOf(input.schemaVersion)<0)bad();
 for(var key of ['coins','seeds','runs','bestDistance','legacyCoins','legacyBest'])if(input[key]!==undefined&&!number(input[key],2000000000,true))bad();
 for(var key of ['totalDistance','lastClock'])if(input[key]!==undefined&&!number(input[key],key==='lastClock'?4102444800:9007199254740991,false))bad();
 for(var key of ['hands','boots'])if(input[key]!==undefined&&typeof input[key]!=='boolean')bad();
 if(input.tier!==undefined&&(!number(input.tier,6,true)||input.tier<1))bad();
 if(input.character!==undefined){var ch=input.character;if(!object(ch))bad();if(Object.keys(ch).length){if(!text(ch.name,24)||!ch.name.trim()||!known(ch['class'],ids('classes')))bad();for(var color of ['hair','skin','shirt'])if(ch[color]!==undefined&&(typeof ch[color]!=='string'||!/^#[0-9a-fA-F]{6}$/.test(ch[color])))bad();if(ch.hairStyle!==undefined&&!number(ch.hairStyle,15,true))bad();}}
 if(input.workshop!==undefined){if(!object(input.workshop))bad();for(var key of Object.keys(input.workshop))if(!known(key,ids('workshop'))||!number(input.workshop[key],50,true))bad();}
 for(var spec of [['owned','items'],['completed','research'],['unlocked','progression'],['announcements','progression'],['recipes','items']])if(input[spec[0]]!==undefined)list(input[spec[0]],128,function(x){return known(x,ids(spec[1]).concat(spec[1]==='progression'?['classes']:[]));});
 if(input.excluded!==undefined&&input.excluded!==''&&!known(input.excluded,ids('skills')))bad();
 if(input.milestones!==undefined)list(input.milestones,128,function(x){return text(x,64)&&/^(T[1-6]:[0-9]{1,8}|distance:[0-9]{1,10})$/.test(x);});
 if(input.paidRuns!==undefined)list(input.paidRuns,128,function(x){return text(x,128)&&x.length>0;});
 if(input.records!==undefined){if(!object(input.records)||Object.keys(input.records).length>2048)bad();for(var key of Object.keys(input.records))if(!text(key,160)||!number(input.records[key],2000000000,true))bad();}
 if(input.research!==undefined)list(input.research,3,function(j){if(!object(j)||!known(j.id,ids('research'))||!number(j.started,4102444800,false)||!number(j.end,4102444800,false))return false;var spec=config.research.filter(function(x){return x.id===j.id;})[0];return Math.abs(j.end-j.started-spec.seconds)<0.001;});
 if(input.schemaVersion===5){if(input.inventory!==undefined)list(input.inventory,128,function(x){return text(x,96);});if(input.equipment!==undefined){if(!object(input.equipment))bad();for(var key of Object.keys(input.equipment))if(Object.keys(config.starterEquipment).indexOf(key)<0||(input.equipment[key]!==null&&!text(input.equipment[key],96)))bad();}}
 if(input.activeRun!==undefined){var r=input.activeRun;if(!object(r))bad();if(Object.keys(r).length){if(!text(r.id,128)||!r.id||!number(r.seconds,86400,false)||!number(r.score,2000000000,true)||!number(r.coins,2000000000,true)||!text(r.mode,96)||!(r.mode==='live'||r.mode.indexOf('replay:')===0)||!known(r['class'],ids('classes'))||!input.character||r['class']!==input.character['class'])bad();if(r.score>Math.floor(config.physics.speed*config.physics.maxSpeedFactor*r.seconds/10)+2||r.coins>Math.ceil(r.seconds*10)+20)bad();}}
 return true;
}

export {validateProgress};
