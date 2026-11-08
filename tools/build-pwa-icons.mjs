// Regenerate committed install icons from the existing game icon; ImageMagick 7.
import {execFileSync} from 'node:child_process';
for(const size of [180,192,512])execFileSync('magick',['-background','#101d2b','pkgbuild/wondersland-game.svg','-resize',`${size}x${size}`,'-alpha','remove',`web/icons/icon-${size}.png`]);
execFileSync('magick',['-size','512x512','xc:#101d2b','(','-background','#101d2b','pkgbuild/wondersland-game.svg','-resize','352x352','-alpha','remove',')','-gravity','center','-composite','web/icons/maskable-512.png']);
