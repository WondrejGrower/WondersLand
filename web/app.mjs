import {drawSkillIcon} from './skill-icons.mjs';
import {clearPreviousPlayerData,playerKey} from './player-epoch.mjs';
import {CloudProgress,localNsecSigner} from './nostr-client.mjs';
import {FrameClock,FixedSimulation,frameRate} from './timing.mjs';
import {VerifiedClient} from './verified-client.mjs';
import {Game,fresh,migrate,plant} from './core.mjs';
import {drawCamp,drawRun} from './art.mjs';
import {descriptor} from './plant-visual.mjs';
import {inputKey} from './input.mjs';
import {readJson} from './limits.mjs';
import {setupPwa} from './pwa.mjs';
import {viewport,screenToWorld,worldToPercent} from './viewport.mjs';
import {LeaderboardClient} from './leaderboard-client.mjs';
import {TransactionFeed} from './feed.mjs';
import {setAtlases} from './environment.mjs';
import * as PixelArt from './pixels.mjs';
const [config,cs]=await Promise.all(['balance.json','cs.json'].map(p=>fetch('./'+p).then(r=>{if(!r.ok)throw Error('Cannot load game assets');return r.json();})));
const environmentImages=await Promise.all(['camp','flora'].map(async name=>{const image=new Image();image.src='./art/'+name+'.png';await image.decode();return image;}));setAtlases(...environmentImages);
const $=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let language=localStorage.getItem('wl-language')||'en';const languageParam=new URL(location.href).searchParams.get('lang');if(['cs','en'].includes(languageParam)){language=languageParam;localStorage.setItem('wl-language',language);const clean=new URL(location.href);clean.searchParams.delete('lang');history.replaceState(null,'',clean);}
const t=(key,...args)=>{let text=language==='cs'?(cs[key]||key):key;args.forEach((value,i)=>text=text.replaceAll('%'+(i+1),String(value)));return text;};
const seedCount=n=>int(n)+' '+(language==='cs'?(n===1?'semeno':n>=2&&n<=4?'semena':'semen'):(n===1?'seed':'seeds'));
const int=n=>new Intl.NumberFormat(language==='cs'?'cs-CZ':'en-US',{maximumFractionDigits:0}).format(typeof n==='string'?BigInt(n):n),coin=n=>int(n)+' '+(language==='cs'?(n===1?'mince':n>=2&&n<=4?'mince':'mincí'):(n===1?'coin':'coins')),btc=amount=>{const [a,b]=amount.split('.');return int(a)+(language==='cs'?',':'.')+b;};
const adminTest=['/test','/test/'].includes(location.pathname),guestProgressKey=playerKey(adminTest?'wl-admin-test-progress':'wl-progress');
if(adminTest)document.querySelector('header strong').textContent='WondersLand · ADMIN TEST';
if(adminTest&&location.hash)history.replaceState(null,'',location.pathname+location.search);
const recorded=new URL(location.href).searchParams.has('recorded');
let progressKey=guestProgressKey,accountAttached=false;
clearPreviousPlayerData(localStorage);
let blocked=false,data;
try{const raw=(localStorage.getItem(progressKey)||(adminTest?localStorage.getItem(playerKey('wl-progress')):null));data=raw?JSON.parse(raw):fresh();if(data.schemaVersion===3)localStorage.setItem(progressKey+'-pre-v4',raw);if([3,4].includes(data.schemaVersion)&&!localStorage.getItem(progressKey+'-pre-v5'))localStorage.setItem(progressKey+'-pre-v5',raw);}catch{blocked=true;data=fresh();}
function savedMine(raw){try{return JSON.stringify(JSON.parse(raw)?.mine??null);}catch{return 'null';}}
let mineVersion=JSON.stringify(data.mine??null);
const persist=p=>{if(blocked)throw Error('Saved progress is damaged. It was not overwritten. Reset requires confirmation.');if(!adminTest&&savedMine(localStorage.getItem(progressKey))!==mineVersion)throw Error(t('The mine changed in another tab. Reload to continue.'));localStorage.setItem(progressKey,JSON.stringify(p));mineVersion=JSON.stringify(p.mine??null);if(accountAttached&&!p.activeRun?.id)cloud.put(p.character.name?{...structuredClone(p),activeRun:{}}:null);};
if(adminTest){data.adminTest=true;data.coins=1000000000;}
let game;try{game=new Game(config,data,persist);if([3,4].includes(data.schemaVersion))game.persist();}catch(e){blocked=true;game=new Game(config,fresh(),()=>{});showError(e.message);}
game.replay=recorded;
let pendingImport=null,creationRole='gardener',selectedItem='';
let camera={left:0,top:0,width:640,height:360},sceneWidth=640,sceneHeight=360,immersiveFallback=false;
const touchMedia=matchMedia('(pointer:coarse)');
const frameClock=new FrameClock(frameRate(localStorage.getItem('wl-frame-rate'))),simulation=new FixedSimulation();
function appHeight(){document.documentElement.style.setProperty('--app-height',Math.round(window.visualViewport?.height||innerHeight)+'px');}
addEventListener('resize',appHeight);window.visualViewport?.addEventListener('resize',appHeight);appHeight();
function syncFullscreen(){const active=!!document.fullscreenElement||immersiveFallback;document.body.classList.toggle('immersive',active);$('leave-fullscreen').hidden=!active;$('fullscreen').setAttribute('aria-pressed',String(active));resize();if($('sheet').hidden)$('scene').focus({preventScroll:true});else focusFirst();}
async function toggleFullscreen(){if(document.fullscreenElement)await document.exitFullscreen();else if(immersiveFallback)immersiveFallback=false;else if(document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();}catch{immersiveFallback=true;}}else immersiveFallback=true;syncFullscreen();}
document.addEventListener('fullscreenchange',syncFullscreen);$('fullscreen').onclick=()=>toggleFullscreen();$('leave-fullscreen').onclick=()=>toggleFullscreen();
let overlay='',lastView='',revision=0,net='connecting',appearance={hair:'#5e3936',skin:'#dfaf87',shirt:'#679e86',hairStyle:0},nameDraft='',lastClock=0;
let boardKind='verified';
let boardMonth='',boardMonthExplicit=false,boardMetric='best',boardData=null,boardLoading=false,boardFailed=false,boardRequest=0;
const pwa=setupPwa(()=>touch());
const board=new LeaderboardClient({storage:{
 getItem:key=>localStorage.getItem(playerKey(key)),
 setItem:(key,value)=>localStorage.setItem(playerKey(key),value)
},onChange:()=>touch()});
const cloud=new CloudProgress(()=>touch());
let authBusy=false,accountAvailable=false,nsecReturn='account',nsecError='';
let localGame=null;const verified=new VerifiedClient(config,()=>cloud.account?null:board.key(),()=>{if(verified.active){game=verified.game;if(verified.fatal)overlay='verified-failed';}touch();});
async function verifiedTask(task){try{await task();touch();renderMenu();}catch(error){showError(error.message);}}
async function leaveVerified(){const confirmed=await verified.leave();game=localGame;localGame=null;overlay='';touch();feed.wake();renderMenu();if(!confirmed)showError('Unsent inputs were not saved. Settle the interrupted run when connected.');}
function bindScores(){game.onLiveRunFinished=result=>board.finish(result);}
bindScores();board.recover(data?.activeRun);board.flush();addEventListener('online',()=>board.flush());
async function loadBoard(){const request=++boardRequest;boardLoading=true;boardFailed=false;touch();try{const result=boardKind==='verified'?await verified.request('leaderboard?'+(boardMonth?'month='+encodeURIComponent(boardMonth)+'&':'')+'metric='+boardMetric):await board.load(boardMonth,boardMetric);if(request===boardRequest){boardData=result;boardMonth=result.month;}}catch{if(request===boardRequest)boardFailed=true;}finally{if(request===boardRequest){boardLoading=false;touch();}}}
function installAccountProgress(progress){
 const data=progress?migrate(progress,config):fresh();
 if(!progress){nameDraft='';creationRole='gardener';}
 progressKey=playerKey('wl-personal:'+cloud.account);
 accountAttached=true;blocked=false;
 localStorage.setItem(progressKey,JSON.stringify(data));
 mineVersion=JSON.stringify(data.mine??null);
 game=new Game(config,data,persist);bindScores();verified.profile=verified.info=null;
}
function attachAccount(account){
 cloud.connect(account);
 verified.profile=verified.info=null;
 if(cloud.conflict||cloud.pending!==undefined){
  installAccountProgress(cloud.pending);
  cloud.schedule();
 }else if(account.progress)installAccountProgress(account.progress);
 else if(!game.p.character.name)installAccountProgress(null);
}
async function accountTask(action,localSigner=null){
 if(authBusy||verified.active||!['creation','camp'].includes(game.phase)){localSigner?.dispose();return;}
 authBusy=true;nsecError='';touch();renderMenu();
 try{
  if(action==='account-login'){
   const opening=overlay==='opening'||(overlay==='nsec'&&nsecReturn==='opening');
   attachAccount(await cloud.login(localSigner||window.nostr));
   overlay=opening&&accountAttached?'':'account';
  }
  else if(action==='account-adopt'){
   const guest={...structuredClone(game.p),activeRun:{}};
   installAccountProgress(guest);cloud.put(guest);await cloud.flush();
  }else if(action==='account-new'){installAccountProgress(null);overlay='';}
  else if(action==='account-cloud' || action==='account-local'){
   const latest=await cloud.request('session');
   if(latest.npub!==cloud.account)throw Error('Sign in with Nostr first');
   const local=cloud.pending;
   cloud.revision=latest.revision;cloud.conflict=false;cloud.pending=undefined;cloud.remember();
   if(action==='account-cloud')installAccountProgress(latest.progress);
   else if(local!==undefined){cloud.put(local);await cloud.flush();}
  }else if(action==='account-retry')await cloud.flush();
  else if(action==='account-logout'){
   await cloud.logout();
   progressKey=guestProgressKey;accountAttached=false;blocked=false;
   const raw=localStorage.getItem(progressKey);
   let guest=fresh();try{if(raw)guest=JSON.parse(raw);guest=migrate(guest,config);}catch{blocked=true;guest=fresh();}
   mineVersion=JSON.stringify(guest.mine??null);game=new Game(config,guest,persist);
   bindScores();verified.profile=verified.info=null;overlay='';
  }
 }catch(error){
  if(localSigner)nsecError=error.message;
  else showError(error.message);
 }finally{localSigner?.dispose();authBusy=false;touch();renderMenu();}
}
function nsecHtml(){
 return '<section class="login-panel">'+title(t('Advanced · NSEC'))+
  p(t('Your browser signs one login request. The private key stays on this device.'))+
  (authBusy?p(t('Connecting to your Nostr account…')):
   '<label for="nsec-key">NSEC</label><input id="nsec-key" type="password" maxlength="63" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">'+
   (nsecError?'<p class="login-error" role="alert">'+escape(t(nsecError))+'</p>':'')+
   button(t('Sign in with NSEC'),'nsec-sign')+button(t('Back'),'back'))+'</section>';
}
function submitNsec(){
 const input=$('nsec-key');
 if(!input||authBusy)return;
 const nsec=input.value.trim();
 input.value='';
 if(!/^nsec1[023456789acdefghjklmnpqrstuvwxyz]{58}$/.test(nsec)){
  nsecError='Enter a valid NSEC.';touch();renderMenu();return;
 }
 try{void accountTask('account-login',localNsecSigner(nsec));}
 catch{nsecError='Local Nostr signing failed. Check your NSEC.';touch();renderMenu();}
}
function openingHtml(){
 return '<section class="login-panel"><div class="opening-brand"><img src="/icons/icon-192.png" alt="" width="56" height="56">'+title('WondersLand')+'</div>'+
  p(t('A forest shaped by live Bitcoin transactions.'))+
  (authBusy?p(t('Connecting to your Nostr account…')):
   button(t('Sign in or register with Nostr'),'account-login')+button(t('Advanced · NSEC'),'nsec-open')+button(t('Play as guest'),'opening-guest'))+'</section>';
}
function accountHtml(){
 let html=title(t('Nostr account'));
 if(authBusy)return html+p(t('Connecting to your Nostr account…'));
 if(!cloud.account)return html+p(t('Sign in with the same Nostr identity on another device to restore your progress.'))+
  button(t('Sign in with Nostr'),'account-login')+button(t('Advanced · NSEC'),'nsec-open')+button(t('Back'),'back');
 html+=p(cloud.account.slice(0,15)+'…'+cloud.account.slice(-6));
 if(!accountAttached)html+=p(t('Choose which character to use with this account.'))+
  button(t('Save this device’s character'),'account-adopt')+button(t('Create a separate character'),'account-new');
 else if(cloud.conflict)html+=p(t('Cloud progress changed on another device'))+
  button(t('Use cloud progress'),'account-cloud')+button(t('Use this device’s progress'),'account-local');
 else html+=p(t(cloud.failed?'Progress is saved on this device. Sync will retry when connected.':cloud.pending!==undefined?'Saving progress…':'Cloud progress is up to date.'));
 if(cloud.failed&&!cloud.conflict)html+=button(t('Try again'),'account-retry');
 return html+button(t('Sign out'),'account-logout')+button(t('Back'),'back');
}
function scoreStatusHtml(){if(adminTest)return p(t('ADMIN TEST · Unlimited coins · No leaderboard'));if(verified.active)return p(t(verified.failed?'Verified sync paused. Reconnecting…':verified.ended?'Server-verified result saved.':'Verified run · server profile'));if(game.demo||game.replay)return '';const status=board.status(game.runId);const labels={readonly:'Personal runs save local progress only. Use Verified runs for the server leaderboard.',connecting:'Connecting to the monthly leaderboard…',queued:'Monthly result queued. It will upload when connected.',submitted:'Monthly result saved.',unranked:'This result could not be added to the monthly leaderboard.'};return labels[status]?p(t(labels[status])):'';}
function boardHtml(){
 const months=boardData?.months||[new Date().toISOString().slice(0,7)];if(boardMonth&&!months.includes(boardMonth))months.push(boardMonth);months.sort().reverse();
 let html=title(t('Monthly leaderboard'))+button(t(boardKind==='verified'?'Show historical unverified results':'Show server-verified results'),'board-kind',boardKind==='verified'?'legacy':'verified')+p(t(boardKind==='verified'?'Server-simulated runs with separate server progress. No paid entry.':'Historical, unverified community results. New submissions are closed.'))+p(t('Names are not verified identities. The player ID distinguishes server profiles and historical browser installations.'))+p(t('Community records from live runs. Training and recorded data do not count.'))+`<label>${t('Month (UTC)')} <select id="board-month">${months.map(m=>`<option value="${m}" ${m===boardMonth?'selected':''}>${m}</option>`).join('')}</select></label><div class="leaderboard-filters">`+[['best','Best run'],['total','Total distance'],['attempts','Attempts']].map(([id,label])=>button(t(label),'board-metric',id,false,boardMetric===id)).join('')+'</div>';
 if(boardLoading)html+=p(t('Loading leaderboard…'));else if(boardFailed)html+=p(t('Leaderboard is temporarily unavailable. Your game progress is safe.'))+button(t('Try again'),'board-refresh');
 else if(!boardData?.rows.length)html+=p(t('No live attempts recorded this month yet.'));
 else html+=`<table class="leaderboard-table"><thead><tr><th>#</th><th>${t('Player')}</th><th>${t('Best run')}</th><th>${t('Total distance')}</th><th>${t('Attempts')}</th></tr></thead><tbody>`+boardData.rows.map(r=>`<tr><td>${r.rank}</td><td>${escape(r.name)}${r.playerId?'<small class=player-id>'+escape(r.playerId)+'</small>':''}</td><td>${int(r.best)} m</td><td>${int(r.total)} m</td><td>${int(r.runs)}</td></tr>`).join('')+'</tbody></table>';
 if(board.acceptingSubmissions&&board.queue.length)html+=p(t('Pending live attempts: %1',board.queue.length))+button(t('Retry upload'),'board-refresh');
 return html+p(t('Names shown in this historical leaderboard are public. Different player IDs may use the same name.'))+button(t('Back'),'back');
}
const palettes={hair:['#5e3936','#d6b96d','#bcc4c5','#302f43','#a65c50'],skin:['#dfaf87','#b97e5f','#82533f','#f0cbb2'],shirt:['#679e86','#9278aa','#c18b65','#638ba9']};
const stationNames={mine:'Block Mine',home:'Hearth & home',portal:'Mempool Gate',training:'Training Grounds',forge:'Runic Workshop',wardrobe:'Wardrobe',library:'Spell Garden'};
function showError(message){$('error').hidden=false;$('error').replaceChildren();const text=document.createElement('span');text.textContent=t(message);$('error').append(text);const b=document.createElement('button');b.textContent=t('Back');b.onclick=()=>$('error').hidden=true;$('error').append(b);}
function setText(id,text){const node=$(id);if(node.textContent!==text)node.textContent=text;}
function touch(){revision++;}
function button(text,action,arg='',disabled=false,selected=false){return `<button data-action="${action}" data-arg="${escape(arg)}" ${disabled?'disabled':''} class="${selected?'selected':''}">${escape(text).replaceAll('\n','<br>')}</button>`;}
function p(text){return '<p>'+escape(text)+'</p>';}
function title(text){return '<h1>'+escape(text)+'</h1>';}
function toggleAppearance(part){const ch=game.phase==='creation'?appearance:game.p.character;if(part==='hairStyle')ch[part]=(ch[part]+1)%16;else ch[part]=palettes[part][(palettes[part].indexOf(ch[part])+1)%palettes[part].length];if(game.phase!=='creation')game.persist();touch();}
function skillText(s){const n=s.effects?.[(s.nextRank||1)-1]||0;return s.id==='coins'?t('Earn %1 gold for this run',config.run.fallbackCoins):s.id==='bitcoin'?t('Collected coins are worth 30% more this run.'):s.id==='leap'?t('Basic Jump height +%1%, capped at 320 px',Math.round(n*100)):s.id==='magnet'?t('Collection range +%1%',Math.round(n*100)):s.id==='aircoins'?t('Airborne coin bonus +%1%',Math.round(n*100)):s.id==='timeslow'?t('Slows expedition time by %1%. Jumps and obstacles slow together.',Math.round(n*100)):s.id==='double'?t('One extra jump every %1 s · %2% impulse. Aerial limit grows with Strength (max 450 px)',s.cooldown,Math.round(n*100)):s.id==='glider'?t('Glide up to %1 s per jump',new Intl.NumberFormat(language,{maximumFractionDigits:1}).format(n)):s.id==='shield'?t('One rescue, at most two granted per run'):t('Jetpack: 3 s fuel for the whole run, hold F');}
function roleDescription(id){return t(id==='gardener'?'Gardener: +10% coins, −10% magnet range.':id==='explorer'?'Explorer: one emergency double jump per run, −5% Basic Jump height.':'Collector: +20% magnet range, +1 s to catch upgrades, −5% Basic Jump height.');}
function skillIcon(skill){
 return '<span class="skill-icon" aria-hidden="true"><canvas width="16" height="16" data-skill-icon="'+escape(skill.id)+'"></canvas></span>';
}
function skillChoices(skills,action){
 return '<div class="skill-choices">'+skills.map((skill,index)=>{
  const arg=action==='verified-start'?skill.id:index;
  const name=t(skill.name);
  const rank=skill.nextRank&&skill.maxRank>1?'<small>'+escape(t('Rank %1',skill.nextRank))+'</small>':'';
  return '<button type="button" class="skill-choice" data-action="'+action+'" data-arg="'+escape(arg)+'"'+
   (action==='verified-start'&&verified.busy?' disabled':'')+'>'+skillIcon(skill)+
   '<span class="skill-copy"><strong>'+escape(name)+'</strong>'+rank+'<span>'+escape(skillText(skill))+'</span></span></button>';
 }).join('')+'</div>';
}
function appearanceButtons(){return ['hairStyle','hair','skin'].map((part,i)=>button(t(i===0?'Hair style %1 · %2':i===1?'Hair color':i===2?'Skin tone':'Clothing color',(game.phase==='creation'?appearance:game.p.character).hairStyle+1,t(config.hairStyles[(game.phase==='creation'?appearance:game.p.character).hairStyle||0]?.name||'')),'appearance',part)).join('');}
const slotLabels={head:'Head',torso:'Torso',legs:'Legs',feet:'Feet',hands:'Hands',belt:'Belt'};
function clothingRarity(item){
 return config.loot.legendary.includes(item.id)?'Legendary':config.loot.rare.includes(item.id)?'Rare':'Common';
}
function inventoryHtml(wardrobe=false){
 const d=game.p,owned=config.clothing.filter(item=>d.inventory.includes(item.id)),chosen=owned.find(item=>item.id===selectedItem);
 const icon={head:'◠',torso:'◆',legs:'Π',feet:'▰',hands:'✋',belt:'▱'};
 const slots=Object.entries(slotLabels).map(([slot,label])=>{
  const item=owned.find(item=>item.id===d.equipment[slot]),description=item?t(item.name):t('Empty');
  return '<div class="gear-slot"><small>'+escape(t(label))+'</small>'+button(item?icon[slot]+' '+description:'—','inspect-clothing',item?.id||'',!item,chosen?.id===item?.id&&!!item)+'</div>';
 }).join('');
 let html=title(t(wardrobe?'Wardrobe':'Inventory'))+'<div class="gear-layout"><div class="gear-portrait"><canvas id="portrait" width="24" height="40"></canvas><h2>'+escape(d.character.name)+'</h2></div><div class="gear-slots">'+slots+'</div></div>';
 html+='<h2>'+t('Owned')+' · '+owned.length+' / '+config.clothing.length+'</h2><div class="gear-grid">';
 for(const item of owned)html+='<div data-rarity="'+clothingRarity(item).toLowerCase()+'">'+button(icon[item.slot]+' '+t(item.name),'inspect-clothing',item.id,false,item.id===selectedItem)+'</div>';
 html+='<span class="empty-gear" aria-hidden="true"></span>'.repeat(config.clothing.length-owned.length)+'</div>';
 if(chosen)html+='<section class="item-detail"><h2>'+escape(t(chosen.name))+'</h2>'+p(t(slotLabels[chosen.slot])+' · '+t(clothingRarity(chosen))+' · '+t('No gameplay bonuses'))+button(t(d.equipment[chosen.slot]===chosen.id?'Unequip':'Equip'),'equip-clothing',chosen.id)+'</section>';
 if(wardrobe){
  html+='<details><summary>'+t('Appearance')+'</summary>'+appearanceButtons()+'</details>';
  for(const item of config.items.filter(item=>d.owned.includes(item.id))){
   const effect=item.id==='hands'?t('Collection range +%1%',Math.round(item.magnet*100)):t('Basic Jump height +%1%, capped at 320 px',Math.round(item.jump*100));
   html+=button(t(item.name)+' · '+t(d[item.id]?'Equipped':'Equip')+'\n'+effect,'equip',item.id,false,d[item.id]);
  }
 }
 return html+p(t('Find clothes in live runs. Clothing changes your appearance.'))+button(t('Back')+' · Esc',wardrobe?'close':'back');
}
function skillBookHtml(){
 const found=config.skills.filter(skill=>game.p.discoveries.includes(skill.id));
 return title(t('Skill book'))+p(t('Skills you collect in live runs appear here.'))+p(t('Luck can attract a Bitcoin Spark during an expedition.'))+
  found.map(skill=>'<section class="skill-entry">'+skillIcon(skill)+'<div><h2>'+escape(t(skill.name))+'</h2><dl>'+
   [...Array(skill.maxRank)].map((_,index)=>'<div><dt>'+escape(t('Rank %1',index+1))+'</dt><dd>'+
    escape(skillText({...skill,nextRank:index+1}))+'</dd></div>').join('')+'</dl></div></section>').join('')+
  button(t('Back')+' · Esc','back');
}
let directory=null,visitor=null,directoryRequest=0;
async function openDirectory(after=''){
 const request=++directoryRequest;
 overlay='directory';directory=null;touch();renderMenu();
 try{
  const page=await verified.request('directory?after='+encodeURIComponent(after));
  if(request===directoryRequest)directory=page;
 }catch(error){if(request===directoryRequest){directory={characters:[],next:null};showError(error.message);}}
 touch();renderMenu();
}
async function openCharacter(id){
 const request=++directoryRequest;
 try{
  const profile=await verified.request('directory?id='+encodeURIComponent(id));
  if(request!==directoryRequest||overlay!=='directory')return;
  visitor=profile;overlay='public-character';touch();renderMenu();
 }catch(error){if(request===directoryRequest&&overlay==='directory')showError(error.message);}
}
function directoryHtml(){
 if(!directory)return title(t('Registered characters'))+p(t('Loading characters…'))+button(t('Back'),'directory-back');
 return title(t('Registered characters'))+
  (directory.characters.length?directory.characters.map(character=>button(character.name+' · '+t(game.find('classes',character.class).name),'view-character',character.playerId)).join(''):p(t('No public characters on this page.')))+
  (directory.next?button(t('Next page'),'directory',directory.next):'')+button(t('Back'),'directory-back');
}
function publicCharacterHtml(){
 const items=config.clothing.filter(item=>visitor.inventory.includes(item.id));
 if(overlay==='public-camp')return title(t('Camp of %1',visitor.character.name))+
  '<canvas id="visited-camp" width="640" height="360" aria-label="'+escape(t('Camp of %1',visitor.character.name))+'"></canvas>'+
  p(t('A visit is for looking around.'))+
  p(config.progression.filter(rule=>visitor.unlocked.includes(rule.id)&&['training','forge','wardrobe','garden'].includes(rule.id)).map(rule=>t(rule.name)).join(' · '))+
  button(t('Inventory'),'view-inventory')+button(t('Back'),'characters-back');
 return title(visitor.character.name)+'<div class="gear-layout"><div class="gear-portrait"><canvas id="visitor-portrait" width="24" height="40"></canvas><h2>'+
  escape(t(game.find('classes',visitor.character.class).name))+'</h2></div><div class="gear-slots">'+
  Object.entries(slotLabels).map(([slot,label])=>'<div class="gear-slot"><small>'+escape(t(label))+'</small><p>'+
   escape(t(items.find(item=>item.id===visitor.equipment[slot])?.name||'Empty'))+'</p></div>').join('')+'</div></div>'+
  '<h2>'+t('Inventory')+'</h2><div class="gear-grid">'+items.map(item=>'<p data-rarity="'+clothingRarity(item).toLowerCase()+'">'+escape(t(item.name))+'</p>').join('')+'</div>'+
  button(t('Visit camp'),'visit-camp')+button(t('Back'),'characters-back');
}
function verifiedHtml(){
 let html=title(t('Verified runs'))+p(t('Separate server progress starts from zero. Your local character, coins and upgrades stay unchanged.'))+p(t('Inputs are simulated on the server using real transactions. This is not paid ranked or proof of a human player.'));
 if(!verified.info)return html+p(t('Loading server profile…'))+button(t('Back'),'back');
 if(!verified.profile)return html+button(t('Create server profile'),'verified-register')+button(t('Back'),'back');
 const g=new Game(config,verified.profile),d=g.p;
 html+=button(t('Registered characters'),'directory')+button(t(d.publicCharacter?'Hide my character':'Publish my character'),'verified-action','publish-character:'+(d.publicCharacter?'off':'on'));
 html+='<h2>'+escape(d.character.name)+' · '+escape(t(g.find('classes',d.character.class).name))+'</h2>'+p(t('Server coins: %1 · best: %2 m · attempts: %3',coin(d.coins),int(d.bestDistance),int(d.runs)))+'<code>'+escape(verified.info.playerId)+'</code>';
 if(verified.info.interruptedRun)return html+p(t('An interrupted run must be settled from its last server-confirmed state. Unsent inputs are not replayed.'))+button(t('Settle interrupted run'),'verified-action','finish:')+button(t('Back'),'back');
 if(d.inventory.length){
  html+='<h2>'+t('Inventory')+'</h2><div class="gear-grid">'+config.clothing.filter(item=>d.inventory.includes(item.id)).map(item=>
   button(t(item.name)+' · '+t(d.equipment[item.slot]===item.id?'Unequip':'Equip'),'verified-action','equip-clothing:'+item.id)).join('')+'</div>';
 }
 html+='<h2>'+t('Choose your starting skill')+'</h2>'+
  skillChoices(config.startingSkills.map(id=>g.available().find(skill=>skill.id===id)).filter(Boolean).map(skill=>({...skill,nextRank:1})),'verified-start');
 if(verified.busy)html+=p(t('Starting the expedition…'));
 html+='<h2>'+t('Permanent character development')+'</h2>';for(const b of config.workshop.filter(b=>g.has(b.id))){const cost=g.price(b.id);html+=p(t(b.name)+' · '+(d.workshop[b.id]||0)+' / 50')+button(cost<0?t('Max'):t('Buy · %1',coin(cost)),'verified-action','buy:'+b.id,cost<0||d.coins<cost);}
 for(const item of config.items.filter(x=>g.has(x.feature)||d.owned.includes(x.id)))html+='<h2>'+escape(t(item.name))+'</h2>'+(d.owned.includes(item.id)?button(t(d[item.id]?'Unequip':'Equip'),'verified-action','equip:'+item.id):button(t('Craft · %1',coin(item.cost)),'verified-action','craft:'+item.id,d.coins<item.cost||!!(item.recipe&&!d.recipes.includes(item.id)&&d.bestDistance<Number(item.recipe.split(':')[1]))));
 if(g.has('garden')){html+='<h2>'+t('Spell Garden')+'</h2>';for(const r of config.research.filter(r=>r.id!=='stable'||g.has('diamond'))){const job=d.research.find(j=>j.id===r.id),done=d.completed.includes(r.id);html+=p(t(r.name)+' · '+coin(r.cost)+' · '+seedCount(r.seeds))+(job?p(t('Remaining: %1 s',Math.max(0,Math.ceil(job.end-Date.now()/1000)))):'')+button(t(done?'Complete':job?'In progress':'Start research'),'verified-action','research:'+r.id,done||!!job||d.coins<r.cost||d.seeds<r.seeds||d.research.length>=1+Number(g.has('research2'))+Number(g.has('research3')));}}
 if(d.completed.includes('stable')){html+=p(t('Exclude one skill (at least three must remain)'));for(const s of config.skills.filter(s=>s.unlock==='base'||d.completed.includes(s.unlock)))html+=button(t(s.name),'verified-action','exclude:'+(d.excluded===s.id?'':s.id),false,d.excluded===s.id);}
 return html+button(t('Back'),'back');
}

function mineHtml(){
 const mine=game.p.mine,owned=mine?.owned||0,balance=game.mineBalance();
 let html=title(t('Block Mine'))+p(t('One miner works while you play or are away. Collect the gold here.'));
 if(mine)html+=p(t('Chest: %1 / %2 gold',int(balance.coins),int(balance.capacity)))+button(t('Collect · %1',coin(balance.coins)),'mine-collect','',!balance.coins);
 html+='<div class="item-grid">';
 for(const [index,tier] of config.mine.tiers.entries()){
  const level=index+1,active=mine?.active===level;
  const name=t('Miner %1 · %2 gold/h',level,int(tier.perHour));
  if(level<=owned)html+=button(name+'\n'+t(active?'Mining':'Activate'),'mine-activate',level,active,active);
  else html+=button(name+'\n'+t('Buy · %1',coin(tier.cost)),'mine-buy',level,level!==owned+1||game.p.coins<tier.cost);
 }
 return html+'</div>'+button(t('Back')+' · Esc','close');
}
async function playMineAction(action,tier){
 if(verified.active||!game.canMine()||game.station!=='mine'||overlay)return;
 const current=game;
 const run=()=>{
  if(game!==current||verified.active||game.station!=='mine'||overlay)return;
  game.mineAction(action,Number(tier));
  touch();renderMenu();
 };
 try{
  if(navigator.locks)await navigator.locks.request('wl-mine',run);
  else run();
 }catch(error){showError(error.message);}
}
function menuHtml(){const g=game,d=g.p;
 if(overlay==='leaderboard')return boardHtml();
 if(overlay==='nsec')return nsecHtml();
 if(overlay==='opening')return openingHtml();
 if(overlay==='account')return accountHtml();
 if(overlay==='inventory')return inventoryHtml();
 if(overlay==='skill-book')return skillBookHtml();
 if(overlay==='directory')return directoryHtml();
 if(overlay==='public-character'||overlay==='public-camp')return publicCharacterHtml();
 if(overlay==='import-confirm')return title(t('Replace browser progress with this file?'))+button(t('Cancel'),'settings')+button(t('Import progress'),'import-apply');
 if(overlay==='reset')return title(t('Reset character and all progress?'))+p(t('This erases the character, coins, equipment, research and records.'))+p(t('Public monthly leaderboard entries are kept.'))+button(t('Cancel'),'settings')+button(t('Reset progress'),'reset');
 if(overlay==='verified-failed')return title(t('Verified run stopped'))+p(t(verified.error||'Verified service unavailable'))+button(t('Return to personal camp'),'camp');
 if(overlay==='verified')return verifiedHtml();
 if(overlay==='install')return title(t('Install WondersLand'))+p(t('Add WondersLand to your home screen to open it like an app.'))+(pwa.canInstall?button(t('Install app'),'install-native'):'')+p(t('Desktop: open this site in Chrome or Chromium and choose Install app in the browser menu.'))+p(t('Android: open the browser menu and choose Install app or Add to Home screen.'))+p(t('iPhone / iPad: open this site in Safari, tap Share, then Add to Home Screen. Keep Open as Web App enabled if offered.'))+p(t('An internet connection is needed to open the game and receive live transactions. Your progress is saved on this device.'))+p(t('Before installing, export your progress in Settings. If the installed app opens with a new character, import that file; some browsers keep app storage separate.'))+button(t('Back'),'settings');
 if(overlay==='settings')return title(t('Settings'))+'<h2>'+t('Language')+'</h2>'+button('English','language','en',false,language==='en')+button('Čeština','language','cs',false,language==='cs')+'<h2>'+t('Frame rate')+'</h2><div class="frame-rates">'+[60,144].map(fps=>button(fps+' FPS','frame-rate',String(fps),false,frameClock.fps===fps)).join('')+'</div>'+p(t('144 FPS requires a display with a refresh rate of at least 144 Hz.'))+button(t(pwa.installed?'App installed':'Install app'),'install','',pwa.installed)+button(t('Export progress'),'export')+button(t('Import progress'),'import')+p(t('Import can also transfer progress from the native app. The selected file replaces browser progress after confirmation.'))+button(t('Reset character and all progress?'),'reset-confirm')+button(t('Back'),'back');
 if(overlay==='help')return title(t('A small field guide'))+p(t('MENUS: WASD or arrows to select, E to confirm, Esc to go back. Mouse also works.\nCAMP: WASD or arrows to walk, E at the portal to choose a skill and start from 0 m.\nRUN: Space / W / Up or click to jump; hold for height. F operates an acquired jetpack. P / Esc pauses. B returns to camp. F11 changes fullscreen.\n\nExplore one continuous forest. Systems unlock through live expeditions and distance. Training grants no permanent rewards. Coins are game points, not bitcoin.'))+button(t('Back'),'back');
 if(g.phase==='creation')return title(t('Create your wanderer'))+p(t('One character. Endless expeditions.'))+(blocked?p(t('Saved progress is damaged. It was not overwritten. Reset requires confirmation.')):'')+`<input id="name" type="text" maxlength="24" autocomplete="off" placeholder="${escape(t('Name'))}" value="${escape(nameDraft)}"><div class="appearance"><canvas id="portrait" width="24" height="40"></canvas><div>${appearanceButtons()}</div></div>`+'<h2>'+t('Choose your role')+'</h2><div class="roles">'+config.classes.map(c=>button(t(c.name),'creation-role',c.id,false,creationRole===c.id)).join('')+'</div>'+p(roleDescription(creationRole))+p(t('Your role is permanent. Changing it requires resetting your character and progress.'))+button(t('Make camp'),'create','',!nameDraft.trim()||blocked);
 if(g.phase==='upgrade')return title(t('Choose a skill at %1 m',int(g.nextChoice-config.run.choiceEveryMetres)))+
  skillChoices(g.choices,'choose-upgrade')+
  button(t('Base Camp'),'camp');
 if(g.phase==='select')return title(t('Choose your starting skill'))+skillChoices(g.choices,'skill')+(!g.demo&&!g.replay?p(t('Personal runs save local progress only. Use Verified runs for the server leaderboard.')):'')+'<p class="keyboard-hint">'+escape(t('WASD / arrows · select   E · confirm   Esc · camp'))+'</p>';
 if(['connecting','waiting','countdown'].includes(g.phase))return title(t(g.phase==='connecting'?'Connecting to the forest…':g.phase==='waiting'?'Waiting for real transactions…':'Continue in %1',Math.ceil(g.countdown||0)))+p(t('Expedition time is paused.'))+button(t('Base Camp'),'camp');
 if(['over','paused'].includes(g.phase))return title(t(g.phase==='over'?'Your run ends here.':'Take a breath.'))+p(t('%1 m · %2',int(Math.floor(g.distance)),coin(Math.floor(g.earned))))+(g.phase==='over'?p(t('You hit: %1',t(g.hit.type==='rose'?'Blackberry shrub':g.hit.type||''))+' · '+g.hit.h+' px')+p(t('Output total: %1 BTC',btc(g.hit.btc||'0.00000000'))+'\n'+int(g.hit.sats||'0')+' satoshi')+(!g.demo?'<code>'+escape(g.hit.txid)+'</code>':'')+p(t(g.demo?'Training · coins and score are not saved':g.hit.status==='confirmed'?'Confirmed in a block':g.hit.status==='pending'?'Still in the mempool':'Observed in mempool · current status unverified')):'')+button(t(g.phase==='paused'?'Continue':'Try again'),g.phase==='paused'?'pause':'run',String(g.demo))+button(t(g.phase==='over'?'Return to Base Camp':'Base Camp'),'camp')+(g.phase==='over'&&!g.demo?button(t('View transaction'),'transaction'):'')+(g.phase==='over'?(g.runDrops||[]).map(id=>p(t('Clothing found: %1',t(g.find('clothing',id).name)))).join('')+scoreStatusHtml():'')+(g.phase==='over'?'<p class="keyboard-hint">'+escape(t('WASD / arrows · select   E · confirm   Esc · camp'))+'</p>':'');
 if(g.phase!=='camp')return '';
 if(!g.station&&d.announcements.length)return title(t('New discovery: %1',t(g.find('progression',d.announcements[0]).name)))+button(t('Continue'),'dismiss');
 if(!g.station)return '';
 if(g.station==='mine'&&g.canMine()&&!verified.active)return mineHtml();
 if(g.station==='wardrobe')return inventoryHtml(true);
 let html=title(t(stationNames[g.station]));
 if(g.station==='home')html+=p(t('Your supplies and equipment survive each expedition.'))+p(t('Best run: %1 m · total live distance: %2 m',int(d.bestDistance),int(d.totalDistance)))+button(t('Skill book'),'skill-book');
 if(g.station==='training'){html+='<h2>'+t('Permanent character development')+'</h2>';for(const b of config.workshop.filter(b=>g.has(b.id))){const level=d.workshop[b.id]||0,cost=g.price(b.id);html+=`<div class="row"><div>${escape(t(b.name))} · ${level} / 50<small class="stat-description">${escape(t(b.description))}</small><small>${b.id==='strength'?escape(t('Basic Jump without skills %1 → %2 px',new Intl.NumberFormat(language,{minimumFractionDigits:1,maximumFractionDigits:1}).format(g.jumpHeight(level)),new Intl.NumberFormat(language,{minimumFractionDigits:1,maximumFractionDigits:1}).format(g.jumpHeight(Math.min(50,level+1))))):escape(t(b.id==='agility'?'Time slowdown %1 → %2%':'Effect %1 → %2',new Intl.NumberFormat(language,{maximumFractionDigits:2}).format(g.bonus(b.id)*100),new Intl.NumberFormat(language,{maximumFractionDigits:2}).format(b.effect*(b.curve==='sqrt'?Math.sqrt(Math.min(50,level+1)/50):b.curve==='quadratic'?(Math.min(50,level+1)/50)**2:Math.min(50,level+1)/50)*100)))}${b.id==='agility'||b.id==='strength'?'':' %'}</small></div>${button(cost<0?t('Max'):t('Buy · %1',coin(cost)),'buy',b.id,cost<0||d.coins<cost)}</div>`;}html+='<h2>'+t('Test your build')+'</h2>'+p(t('Choose a model to practice repeatedly, or try them all. Uses your current attributes and equipment, without random skill upgrades. No permanent rewards.'))+button(t('Try all models'),'practice','all')+'<div class="item-grid">'+config.trainingModels.map(m=>'<div><canvas data-training-model="'+m.id+'" width="128" height="100" aria-hidden="true"></canvas>'+button(t('Try %1',t(m.name))+' · '+plant(m.sats,config).h+' px','practice',m.id)+'</div>').join('')+'</div>';}
 if(g.station==='forge'){html+=p(t('Craft equipment for your expeditions.'));for(const item of config.items.filter(i=>g.has(i.feature)||d.owned.includes(i.id)))html+='<h2>'+t(item.name)+'</h2>'+p(t(item.id==='hands'?'Collection range +10%':'Jump height +5%. Recipe: 1,500 m in one live run.'))+button(d.owned.includes(item.id)?t('Owned'):t('Craft · %1',coin(item.cost)),'craft',item.id,d.owned.includes(item.id)||d.coins<item.cost||!!(item.recipe&&!d.recipes.includes(item.id)&&d.bestDistance<Number(item.recipe.split(':')[1])));if(g.has('diamond'))html+=p(t('Diamond Hands Set: equip both pieces for one rescue.'));}
 if(g.station==='library'){const slots=1+Number(g.has('research2'))+Number(g.has('research3'));html+=p(t('Research slots: %1 · seeds: %2',slots,d.seeds))+p(t('Research continues while the application is closed.'));for(const r of config.research.filter(r=>r.id!=='stable'||g.has('diamond'))){const job=d.research.find(j=>j.id===r.id),done=d.completed.includes(r.id);html+='<h2>'+t(r.name)+'</h2>'+p(coin(r.cost)+' · '+seedCount(r.seeds)+' · '+r.seconds/60+' min')+(job?p(t('Remaining: %1 s',Math.max(0,Math.ceil(job.end-d.lastClock)))):'')+button(t(done?'Complete':job?'In progress':'Start research'),'research',r.id,done||!!job||d.coins<r.cost||d.seeds<r.seeds||d.research.length>=slots);}
 if(d.completed.includes('stable')){html+=p(t('Exclude one skill (at least three must remain)'));const available=config.skills.filter(s=>(s.unlock==='base'||d.completed.includes(s.unlock))&&(s.id!=='jetpack'||g.has('diamond')));for(const s of available)html+=button(t(s.name),'exclude',s.id,available.length<=3&&d.excluded!==s.id,d.excluded===s.id);}}
 return html+button(t('Back')+' · Esc','close');
}
function focusFirst(){const el=$('menu').querySelector('button:not([disabled])');el?.focus({preventScroll:true});}
function renderMenu(){const key=JSON.stringify([game.phase,game.station,game.p.announcements[0],overlay,language,revision,Math.ceil(game.countdown||0),game.phase==='upgrade'?game.nextChoice:0,game.station==='mine'?game.mineBalance().coins:0]);if(key===lastView)return;lastView=key;const helpLabel=t('A small field guide');$('help').setAttribute('aria-label',helpLabel);$('help').querySelector('.help-label').textContent=helpLabel;const html=menuHtml();$('sheet').hidden=!html;if(!html){if($('sheet').contains(document.activeElement))document.activeElement.blur();return;}game.moves.clear();game.target=null;const focused=document.activeElement?.dataset?.action,arg=document.activeElement?.dataset?.arg;$('menu').innerHTML=html;
 for(const canvas of $('menu').querySelectorAll('[data-skill-icon]'))drawSkillIcon(canvas.getContext('2d'),canvas.dataset.skillIcon);
 const nsec=$('nsec-key');if(nsec)nsec.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();submitNsec();}};
 const name=$('name');if(name){name.oninput=()=>{nameDraft=name.value;const create=$('menu').querySelector('[data-action=create]');create.disabled=!nameDraft.trim()||blocked;};name.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();$('menu').querySelector('[data-action=appearance]')?.focus();}};}
 for(const canvas of $('menu').querySelectorAll('[data-training-model]')){const model=config.trainingModels.find(m=>m.id===canvas.dataset.trainingModel),p=plant(model.sats,config),ctx=canvas.getContext('2d'),scale=Math.min(1,84/p.h,112/p.w);ctx.imageSmoothingEnabled=false;PixelArt.viewport(0,0,canvas.width,canvas.height);p.visual=descriptor(p.type,p.sats,p.h,'',model.id);PixelArt.plant(ctx,{...p,x:64-p.w*scale/2,w:p.w*scale,h:p.h*scale},92);}
 const portrait=$('portrait');if(portrait)PixelArt.character(portrait.getContext('2d'),0,0,game.phase==='creation'?appearance:game.p.character,0,false,false,'idle',game.phase==='creation'?{}:game.p.equipment);
 const visitorPortrait=$('visitor-portrait');if(visitorPortrait)PixelArt.character(visitorPortrait.getContext('2d'),0,0,visitor.character,0,false,false,'idle',visitor.equipment);
 const camp=$('visited-camp');if(camp)drawCamp(camp.getContext('2d'),{campX:320,campY:235,animation:0,profile:visitor},t);
 if(focused){const el=[...$('menu').querySelectorAll('button')].find(b=>b.dataset.action===focused&&b.dataset.arg===arg&&!b.disabled);if(el){el.focus();return;}}
 focusFirst();}
function back(){if(authBusy)return;if(overlay==='nsec'){overlay=nsecReturn;touch();return;}if(verified.active&&!overlay&&['over','camp'].includes(game.phase)){verifiedTask(leaveVerified);return;}if(document.activeElement?.tagName==='INPUT'){document.activeElement.blur();$('menu').querySelector('button:not(:disabled)')?.focus();return;}if(overlay==='public-camp'||overlay==='public-character'){overlay='directory';directoryRequest++;}
 else if(overlay==='directory'){overlay='verified';directoryRequest++;}
 else if(overlay==='reset')overlay='settings';else if(overlay)overlay='';else if(game.station)game.station='';else if(game.phase==='camp'&&game.p.announcements.length)game.dismiss();else if(['select','connecting','waiting','over'].includes(game.phase))game.camp();else game.pause();touch();}
function download(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function action(act,arg){try{
 if(authBusy)return;
 if(verified.active&&['settings','install','reset-confirm','reset','import','import-apply','export','inventory','buy','craft','equip','research','exclude','practice','appearance','equip-clothing','take-clothing','inspect-clothing'].includes(act))return;
 if(['mine-buy','mine-activate','mine-collect'].includes(act)){void playMineAction(act.slice(5),arg);return;}
 if(act==='verified'&&!adminTest){if(verified.active)return;overlay='verified';verifiedTask(()=>verified.load());}
 else if(act==='account'&&accountAvailable&&!verified.active&&['creation','camp'].includes(game.phase))overlay='account';
 else if(act==='nsec-open'&&['opening','account'].includes(overlay)&&!cloud.account){nsecReturn=overlay;nsecError='';overlay='nsec';}
 else if(act==='nsec-sign'&&overlay==='nsec'){submitNsec();return;}
 else if(act==='opening-guest'&&overlay==='opening')overlay='';
 else if(act.startsWith('account-')&&['account','opening'].includes(overlay)){void accountTask(act);return;}
 else if(act==='directory'&&!verified.active){void openDirectory(arg);return;}
 else if(act==='view-character'){void openCharacter(arg);return;}
 else if(act==='directory-back'){directoryRequest++;overlay='verified';}
 else if(act==='characters-back'){directoryRequest++;overlay='directory';}
 else if(act==='visit-camp'&&visitor)overlay='public-camp';
 else if(act==='view-inventory'&&visitor)overlay='public-character';
 else if(act==='verified-register'&&!adminTest)verifiedTask(()=>verified.register(game.p.character));
 else if(act==='verified-action'&&!adminTest)verifiedTask(()=>verified.action(arg.split(':')[0],arg.split(':')[1]||''));
 else if(act==='verified-start'&&!adminTest&&!verified.busy)verifiedTask(async()=>{
  verified.busy=true;touch();renderMenu();
  try{const previous=game;const next=await verified.start(arg);localGame=previous;game=next;overlay='';}
  finally{verified.busy=false;touch();renderMenu();}
 });
 else if(act==='leaderboard'||act==='settings'||act==='help'||(act==='inventory'&&game.phase==='camp')){game.moves.clear();game.target=null;if(['running','waiting','countdown'].includes(game.phase))game.pause();overlay=act;if(act==='leaderboard'){if(!boardMonthExplicit)boardMonth='';if(board.acceptingSubmissions&&board.queue.length)board.flush().then(()=>loadBoard());else loadBoard();}}
 else if(act==='frame-rate'&&['60','144'].includes(arg)){frameClock.setRate(Number(arg));localStorage.setItem('wl-frame-rate',arg);}
 else if(act==='install')overlay='install';
 else if(act==='install-native'){pwa.install();}
 else if(act==='board-kind'){boardKind=arg;boardMonth='';loadBoard();}
 else if(act==='board-metric'){boardMetric=arg;loadBoard();}
 else if(act==='board-refresh'){board.flush().then(()=>loadBoard());}
 else if(act==='language'){language=arg;localStorage.setItem('wl-language',arg);document.documentElement.lang=arg;}
 else if(act==='back')back();else if(act==='reset-confirm')overlay='reset';else if(act==='reset'){game.settle();blocked=false;game=new Game(config,fresh(),persist);game.replay=recorded;bindScores();game.persist();nameDraft='';creationRole='gardener';selectedItem='';overlay='';}
 else if(act==='create'){game.create(nameDraft,{...appearance,class:creationRole});}
 else if(act==='creation-role'&&game.phase==='creation'&&config.classes.some(c=>c.id===arg))creationRole=arg;
 else if(act==='skill-book'&&game.phase==='camp')overlay='skill-book';
 else if(act==='choose-upgrade')game.chooseUpgrade(Number(arg));
 else if(act==='inspect-clothing')selectedItem=arg;
 else if(act==='equip-clothing')game.equipClothing(arg);
 else if(act==='practice')game.startPractice(arg);else if(act==='appearance')toggleAppearance(arg);else if(act==='skill'){game.choose(Number(arg));if(game.phase==='running'&&!game.demo&&!game.replay)board.begin({runId:game.runId,name:game.p.character.name,role:game.p.character.class,rules:config.balanceVersion,mode:'live'});}else if(act==='run'){if(verified.active){verifiedTask(async()=>{await leaveVerified();overlay='verified';await verified.load();});return;}if(arg==='true'&&game.practiceModel)game.startPractice(game.practiceModel);else game.start(arg==='true');}else if(act==='camp'){if(verified.active){verifiedTask(leaveVerified);return;}game.camp();}else if(act==='pause')game.pause();else if(act==='close'){game.station='';game.moves.clear();}else if(act==='dismiss')game.dismiss();
 else if(act==='buy')game.buy(arg);else if(act==='craft')game.craft(arg);else if(act==='equip')game.equip(arg);else if(act==='research')game.research(arg);else if(act==='exclude'){game.p.excluded=game.p.excluded===arg?'':arg;game.persist();}
 else if(act==='transaction'&&/^[a-f0-9]{64}$/.test(game.hit.txid))window.open('https://mempool.space/tx/'+game.hit.txid,'_blank','noopener,noreferrer');
 else if(act==='export'){game.saveCheckpoint();download(adminTest?'wondersland-admin-test-progress.json':'wondersland-progress.json',game.p);}
 else if(act==='import-apply'&&pendingImport){localStorage.setItem(progressKey+'-before-import',JSON.stringify(game.p));const replacement=new Game(config,pendingImport,()=>{});replacement.replay=recorded;localStorage.setItem(progressKey,JSON.stringify(replacement.p));mineVersion=JSON.stringify(replacement.p.mine??null);replacement.saveAdapter=persist;blocked=false;game=replacement;if(accountAttached)game.persist();bindScores();pendingImport=null;overlay='settings';}
 else if(act==='import')$('import').click();touch();renderMenu();if(act==='inspect-clothing')$('menu').querySelector('.item-detail button')?.focus();}catch(e){showError(e.message);}}
$('menu').addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(b&&!b.disabled){if($('name'))b.focus({preventScroll:true});action(b.dataset.action,b.dataset.arg);}});$('camp-gate').onclick=()=>{if(game.phase==='camp'&&!overlay&&!game.station){game.moves.clear();game.target={x:540,y:215};}};$('verified').onclick=()=>action('verified');$('leaderboard').onclick=()=>action('leaderboard');$('menu').addEventListener('change',e=>{if(e.target.id==='board-month'){boardMonth=e.target.value;boardMonthExplicit=true;loadBoard();}});$('settings').onclick=()=>action('settings');$('account').onclick=()=>action('account');$('inventory').onclick=()=>action('inventory');$('help').onclick=()=>action('help');$('interact').onclick=()=>{game.interact();touch();};
$('import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>2e6)throw Error('Invalid progress file');const input=JSON.parse(await file.text());if(!adminTest&&input.adminTest)throw Error('Admin test progress cannot be imported into regular play');const next=migrate(input,config);pendingImport=next;overlay='import-confirm';touch();renderMenu();}catch(error){showError(error.message);}finally{e.target.value='';}};
function moveFocus(dx,dy){const list=[...$('menu').querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(e=>e.offsetParent!==null);if(!list.length)return;const current=document.activeElement,index=list.indexOf(current);if(index<0){list[0].focus();return;}const p=current.getBoundingClientRect();let best=null,cost=Infinity;for(const item of list){if(item===current)continue;const q=item.getBoundingClientRect(),x=q.x+q.width/2-p.x-p.width/2,y=q.y+q.height/2-p.y-p.height/2,along=x*dx+y*dy,across=Math.abs(x*dy-y*dx);if(along>2&&along+across*3<cost){best=item;cost=along+across*3;}}(best||list[(index+(dx+dy>0?1:list.length-1))%list.length]).focus();document.activeElement.scrollIntoView({block:'nearest'});}
const directions={w:'up',ArrowUp:'up',s:'down',ArrowDown:'down',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
const headerToggle=$('header-toggle'),headerActions=$('header-actions');
const compactHeader=matchMedia('(max-width: 760px)');
const headerOpen=()=>headerToggle.getAttribute('aria-expanded')==='true';
function setHeaderOpen(open){
 headerToggle.setAttribute('aria-expanded',String(open));
 if(open){game.moves.clear();game.target=null;}
}
headerToggle.onclick=()=>setHeaderOpen(!headerOpen());
compactHeader.addEventListener('change',()=>setHeaderOpen(false));
headerActions.addEventListener('click',e=>{
 if(headerOpen()&&e.target.closest('button'))setHeaderOpen(false);
},true);
document.addEventListener('pointerdown',e=>{
 if(headerOpen()&&!headerToggle.contains(e.target)&&!headerActions.contains(e.target))setHeaderOpen(false);
},true);
document.addEventListener('focusin',e=>{
 if(headerOpen()&&e.target!==headerToggle&&!headerActions.contains(e.target))setHeaderOpen(false);
});
document.addEventListener('keydown',e=>{
 const key=inputKey(e),typing=e.target.matches?.('input,textarea,select');
 if(key==='F11'){e.preventDefault();if(!e.repeat){setHeaderOpen(false);toggleFullscreen();}return;}
 if(key==='Escape'&&headerOpen()){e.preventDefault();setHeaderOpen(false);headerToggle.focus();return;}
 const headerButton=e.target.closest?.('header button');
 if(headerButton&&[' ','Enter'].includes(key))return;
 if(headerOpen()&&key.toLowerCase()==='e'&&headerButton){e.preventDefault();if(!e.repeat)headerButton.click();return;}
 if(headerOpen()&&directions[key]){e.preventDefault();return;}
 if(e.target.closest?.('#touch-controls')&&[' ','Enter'].includes(key)&&$('sheet').hidden)return;if(typing&&key!=='Escape')return;if(key==='F10'){e.preventDefault();if(!e.repeat)action('settings');return;}if(key==='Escape'&&immersiveFallback){e.preventDefault();immersiveFallback=false;syncFullscreen();return;}if(key==='Escape'){e.preventDefault();if(!e.repeat){back();renderMenu();}return;}if(key==='?'&&!e.repeat){e.preventDefault();action('help');return;}
 if(!$('sheet').hidden){if(key===' '){e.preventDefault();return;}if(key==='Enter'){e.preventDefault();if(!e.repeat&&document.activeElement?.matches('#menu button:not(:disabled)'))document.activeElement.click();return;}const dir=directions[key];if(dir){e.preventDefault();moveFocus(dir==='left'?-1:dir==='right'?1:0,dir==='up'?-1:dir==='down'?1:0);}else if(key.toLowerCase()==='e'){e.preventDefault();if(!e.repeat&&document.activeElement?.matches('#menu button:not(:disabled)'))document.activeElement.click();}return;}
 if(key.toLowerCase()==='e'){e.preventDefault();if(!e.repeat){if(document.activeElement?.matches('header button'))document.activeElement.click();else game.interact();renderMenu();}return;}
 if(directions[key]&&game.phase==='camp'){e.preventDefault();openOnArrival=null;game.target=null;game.moves.add(directions[key]);}
 else if([' ','w','ArrowUp'].includes(key)&&game.phase==='running'){e.preventDefault();if(!e.repeat)game.jump();}
 else if(key.toLowerCase()==='f')game.jet=true;else if(key.toLowerCase()==='p'&&!e.repeat){game.pause();renderMenu();}else if(key.toLowerCase()==='b'&&!e.repeat){if(verified.active){verifiedTask(leaveVerified);return;}game.camp();renderMenu();}},true);
document.addEventListener('keyup',e=>{const key=inputKey(e);if(e.target.closest?.('header button, #touch-controls')&&[' ','Enter'].includes(key))return;if(!$('sheet').hidden&&!e.target.matches?.('input,textarea,select')&&[' ','Enter'].includes(key))e.preventDefault();if(directions[key])game.moves.delete(directions[key]);if([' ','w','ArrowUp'].includes(key))game.release();if(key.toLowerCase()==='f')game.jet=false;},true);
let lastCampTap=null,openOnArrival=null;
$('scene').onpointerdown=e=>{
 if(!$('sheet').hidden)return;
 if(game.phase==='running'){game.jump();return;}
 if(game.phase!=='camp'||!e.isPrimary)return;
 const r=e.target.getBoundingClientRect(),point=screenToWorld(e.clientX,e.clientY,r,camera);
 const station=e.pointerType==='touch'?game.stationAt(point.x,point.y):null;
 if(station&&lastCampTap?.game===game&&lastCampTap.id===station.id&&e.timeStamp-lastCampTap.time<=450){
  openOnArrival={game,id:station.id};lastCampTap=null;
  game.target={x:station.x,y:station.y};
 }else{
  openOnArrival=null;lastCampTap=station?{game,id:station.id,time:e.timeStamp}:null;
  game.target={x:Math.max(35,Math.min(605,point.x)),y:Math.max(175,Math.min(320,point.y))};
 }
 game.moves.clear();
};
$('scene').onpointerup=()=>game.release();
$('scene').onpointercancel=()=>{lastCampTap=null;game.release();};

function holdControl(button,down,up){
 let pressed=false;
 const press=()=>{if(game.phase!=='running')return;pressed=true;button.classList.add('pressed');down();};
 const release=()=>{if(!pressed)return;pressed=false;button.classList.remove('pressed');up();};
 button.onpointerdown=e=>{e.preventDefault();e.stopPropagation();button.setPointerCapture(e.pointerId);press();};
 button.onpointerup=button.onpointercancel=button.onlostpointercapture=release;
 button.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)press();}};button.onkeyup=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();release();}};
 button.onclick=e=>{if(e.detail===0){press();release();}};
}
holdControl($('touch-jump'),()=>game.jump(),()=>game.release());holdControl($('touch-fly'),()=>{game.jet=true;},()=>{game.jet=false;});
$('touch-pause').onclick=()=>{game.pause();touch();renderMenu();};
function suspend(){game.moves.clear();game.target=null;if(['running','waiting','countdown'].includes(game.phase))game.pause();game.saveCheckpoint();renderMenu();}
addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});addEventListener('pagehide',()=>{try{game.settle();}catch{}});
function resize(){const r=$('world').getBoundingClientRect();sceneWidth=Math.max(1,r.width);sceneHeight=Math.max(1,r.height);}new ResizeObserver(resize).observe($('world'));resize();
let pendingPaintTime=0;
let last=performance.now(),lastHit='',palette={...config.regions[0]},paletteFrom=palette,paletteId='edge',paletteTime=2.2;
function mixColor(a,b,x){const parse=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));return '#'+parse(a).map((v,i)=>Math.round(v+(parse(b)[i]-v)*x).toString(16).padStart(2,'0')).join('');}const c=$('scene').getContext('2d');
function frame(now){try{const dt=Math.min(.1,(now-last)/1000);last=now;if(adminTest){game.p.coins=1000000000;game.p.adminTest=true;}if(verified.active)game=verified.game;if(!overlay&&!document.hidden){if(verified.active)verified.tick(dt);else simulation.advance(game,dt);}else simulation.reset(game);
 if(openOnArrival){
  if(openOnArrival.game!==game||game.phase!=='camp'||overlay||game.station)openOnArrival=null;
  else if(game.nearby()===openOnArrival.id){openOnArrival=null;game.interact();touch();}
 }
 if(Math.floor(now/1000)!==lastClock){lastClock=Math.floor(now/1000);const count=game.p.completed.length;if(!verified.active)game.updateResearch();if(count!==game.p.completed.length)touch();}
 pendingPaintTime+=dt;
 if(!frameClock.paint(now)){requestAnimationFrame(frame);return;}
 const paintDt=pendingPaintTime;pendingPaintTime=0;
 const touchMode=touchMedia.matches||sceneWidth<700;document.body.classList.toggle('mobile-playing',touchMode&&game.phase==='running'&&!overlay);$('touch-controls').hidden=!touchMode||game.phase!=='running'||!!overlay;setText('touch-pause',t('Pause'));setText('touch-jump',t(game.y>0&&game.skills.double&&game.doubleCooldown<=0&&!game.airUsed?'Double Jump':'Jump'));setText('touch-fly',t('Fly'));$('touch-fly').hidden=!game.skills.jetpack;$('touch-fly').disabled=game.fuel<=0;const state=verified.active?verified.view():simulation.view(game);camera=viewport(sceneWidth,sceneHeight,game.phase,state.campX,state.campY);camera.controls=touchMode;state.viewport=camera;state.mineVisible=game.canMine()&&!verified.active;const logicalWidth=Math.ceil(camera.width),logicalHeight=Math.ceil(camera.height);if($('scene').width!==logicalWidth)$('scene').width=logicalWidth;if($('scene').height!==logicalHeight)$('scene').height=logicalHeight;for(const [key,value]of Object.entries(camera))$('scene').dataset['view'+key[0].toUpperCase()+key.slice(1)]=value;if(state.region.id!==paletteId){paletteFrom={...palette};paletteId=state.region.id;paletteTime=0;}paletteTime=Math.min(2.2,paletteTime+paintDt);for(const key of ['sky','soil','foliage'])palette[key]=mixColor(paletteFrom[key],state.region[key],paletteTime/2.2);state.region={...state.region,...Object.fromEntries(['sky','soil','foliage'].map(key=>[key,palette[key]]))};if(game.phase==='camp')drawCamp(c,state,t,$('scene').width,$('scene').height);else if(game.phase==='creation'){c.reset();c.fillStyle='#101d2b';c.fillRect(0,0,$('scene').width,$('scene').height);}else drawRun(c,state,t,$('scene').width,$('scene').height);
 $('inventory').hidden=game.phase!=='camp';setText('inventory',t('Inventory'));setText('wallet',adminTest?'∞':coin(game.p.coins));$('verified').hidden=adminTest||recorded||game.phase!=='camp'||verified.active||!game.p.character.name;setText('verified',t('Verified runs'));setText('settings',t('Settings'));$('account').hidden=!accountAvailable||verified.active||!['creation','camp'].includes(game.phase);setText('account',t('Nostr account'));$('settings').hidden=verified.active;setText('fullscreen',t('Fullscreen'));setText('leave-fullscreen',t('Exit fullscreen'));setText('leaderboard',t('Leaderboard'));setText('keys',t('WASD / arrows · E · Esc'));setText('hud',game.phase==='camp'?t(adminTest?'ADMIN TEST · Unlimited coins · No leaderboard':'Base Camp'):game.phase==='creation'?'':int(Math.floor(game.distance))+' m · '+t(game.region().name)+'\n'+int(Math.floor(game.time))+' s · '+coin(Math.floor(game.earned))+' · '+t('Rescue')+': '+game.rescues+(game.skills.jetpack?' · '+t(touchMode?'Fuel %1 s · hold Fly':'Fuel %1 s · hold F',new Intl.NumberFormat(language,{minimumFractionDigits:1,maximumFractionDigits:1}).format(game.fuel)):'')+'\n'+(adminTest?t('ADMIN TEST · Unlimited coins · No leaderboard'):verified.active?t(verified.failed?'Verified sync paused. Reconnecting…':'VERIFIED · SERVER PROFILE'):game.demo?t('TRAINING · NO REWARDS'):game.replay?t('RECORDED DATA · NOT LIVE'):t('REAL TRANSACTIONS'))+'\n'+Object.entries(game.skills).map(([id,rank])=>id==='double'?(game.doubleCooldown>0?t('Double Jump · %1 s',Math.ceil(game.doubleCooldown)):t('Double Jump ready')):t(game.find('skills',id).name)+' '+rank).join(' · '));
 const spots=[['home',270,194],['mine',365,310],['forge',112,242],['wardrobe',390,210],['portal',540,242],['library',175,329],['training',465,313]];const labels=game.phase==='camp'?spots.filter(([id])=>['home','portal'].includes(id)||(id==='mine'&&game.canMine()&&!verified.active)||game.has(id==='library'?'garden':id)).map(([id,x,y])=>[id,worldToPercent(x,y,camera)]).filter(([,p])=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100).map(([id,p])=>`<span style="left:${Math.max(10,Math.min(90,p.x))}%;top:${p.y}%">${escape(t(stationNames[id]))}</span>`).join(''):'';if($('stations').innerHTML!==labels)$('stations').innerHTML=labels;
 $('camp-gate').hidden=game.phase!=='camp'||!!overlay||!!game.station||!!game.p.announcements.length||game.nearby()==='portal';setText('camp-gate',t('Walk to gate →'));$('interact').hidden=game.phase!=='camp'||!!game.station||!!game.p.announcements.length||!game.nearby()||!!overlay;setText('interact',t(touchMode?'Open %1':'E · %1',t(stationNames[game.nearby()]||'')));setText('connection',net==='replay'?t('Recorded data · no permanent rewards'):net==='live'?t('Live: recent transactions · %1 available',game.q.pending.length):net==='offline'?t('Source unavailable · waiting for connection'):t('Connecting to mempool.space…'));
 if(game.phase==='over'&&!game.demo&&!game.replay&&game.hit.txid!==lastHit){lastHit=game.hit.txid;const id=lastHit;fetch('/api/tx/'+id+'/status').then(r=>r.ok?readJson(r,16384):null).then(status=>{if(game.hit.txid===id&&typeof status?.confirmed==='boolean'){game.hit.status=status.confirmed?'confirmed':'pending';touch();}}).catch(()=>{});}renderMenu();}catch(e){showError(e.message);}requestAnimationFrame(frame);}requestAnimationFrame(frame);
const feed=new TransactionFeed({recorded,queue:()=>game.q,active:()=>!game.demo&&['running','waiting','connecting','countdown','select'].includes(game.phase),visible:()=>!document.hidden&&!verified.active,receive:rows=>{if(!verified.active)game.receive(rows);},status:value=>{net=value;$('connection').dataset.status=value;}});
feed.start();document.addEventListener('visibilitychange',()=>feed.wake());document.documentElement.lang=language;renderMenu();
if(!adminTest&&!recorded){
 try{
  const account=await cloud.request('session');
  accountAvailable=true;
  if(account.npub)attachAccount(account);
  else if(game.phase==='creation')overlay='opening';
 }catch{}
 addEventListener('online',()=>cloud.flush());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void cloud.flush();});
}
touch();renderMenu();document.body.dataset.ready='true';

if(adminTest){let deadline=0;async function lease(){if(deadline&&Date.now()>=deadline){location.replace('/test');return;}try{const r=await fetch('/api/admin-test/status',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(r.status===403){location.replace('/test');return;}if(r.ok)deadline=(await readJson(r,2048)).expires*1000;}catch{}}lease();setInterval(lease,60000);}
