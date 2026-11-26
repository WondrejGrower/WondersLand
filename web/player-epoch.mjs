export const playerEpoch='2';
export const epochHeader='x-wl-player-epoch';
export const playerResetMarker='player-reset-v'+playerEpoch;
export const playerKey=key=>'wl-v'+playerEpoch+':'+key;

export function clearPreviousPlayerData(storage){
 const legacy=/^(?:wl-(?:progress|admin-test-progress)(?:$|-)|wl-board-(?:key|outbox)$|wl-(?:personal|cloud-sync):)/;
 const previous=Array.from({length:storage.length},(_,i)=>storage.key(i))
  .filter(key=>legacy.test(key||'')||(/^wl-v[0-9]+:/.test(key||'')&&!key.startsWith('wl-v'+playerEpoch+':')));
 for(const key of previous)storage.removeItem(key);
}
