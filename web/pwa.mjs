// Installation is optional; simulation, saves and networking do not depend on it.
export function setupPwa(onChange=()=>{}){
 let pending=null,installed=false;
 const standalone=matchMedia('(display-mode: standalone)');
 const state={get installed(){return installed||standalone.matches||navigator.standalone===true;},get canInstall(){return !!pending&&!this.installed;},async install(){if(!pending||this.installed)return false;const prompt=pending;pending=null;onChange();try{await prompt.prompt();await prompt.userChoice;return true;}catch{return false;}}};
 addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;onChange();});
 addEventListener('appinstalled',()=>{installed=true;pending=null;onChange();});
 standalone.addEventListener('change',onChange);
 if('serviceWorker'in navigator&&isSecureContext)navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
 return state;
}
