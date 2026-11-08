// Physical game controls survive Caps Lock, Shift and keyboard layout changes.
export function inputKey(event){
 if(event.ctrlKey||event.metaKey||event.altKey)return '';
 if(/^Key[WASDEFPB]$/.test(event.code))return event.code.slice(3).toLowerCase();
 return event.key.length===1?event.key.toLowerCase():event.key;
}
