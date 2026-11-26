// Positions are in the 640 × 360 camp world, with y measured at the player's feet.
// Touch bounds are [left, top, width, height], relative to each station's anchor.
export const campStations = [
 {id:'home',x:256,y:177,labelY:185,tap:[-110,-145,173,151]},
 {id:'forge',x:109,y:194,labelY:203,tap:[-40,-74,80,79],unlock:'forge'},
 {id:'portal',x:394,y:171,labelY:179,tap:[-40,-96,80,102]},
 {id:'wardrobe',x:515,y:195,labelY:202,tap:[-39,-65,84,70],unlock:'wardrobe'},
 {id:'library',x:166,y:276,labelY:300,tap:[-47,-69,103,88],unlock:'garden'},
 {id:'training',x:530,y:276,labelY:286,tap:[-34,-48,75,56],unlock:'training'},
 {id:'mine',x:436,y:291,labelY:301,tap:[-35,-34,70,39],unlock:'mine'},
];
export const campPortal=campStations.find(station=>station.id==='portal');
