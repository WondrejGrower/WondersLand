# Základní skok · journey-7

Lokální návrh z 9. listopadu 2026 podle Wondrejova hraní: základní skok nové
postavy byl příliš nízký a animace nešikovná. Jde o základní pohyb postavy,
nikoli zvýšení ranku startovní schopnosti Basic Jump.

| Zahradník bez vylepšení | journey-6 | journey-7 |
| --- | ---: | ---: |
| Ideální výška | 31,15 px | 46,67 px |
| Odraz / krátký stisk | 90 px/s | 140 px/s |
| Gravitace při stoupání | 130 px/s² | 210 px/s² |
| Gravitace při klesání | 170 px/s² | 280 px/s² |
| Ideální celý skok | 1,30 s | 1,24 s |
| Síla 50, ideální výška | 311,54 px | 312,67 px |

Vyšší odraz zvedá základ asi o 50 %, pevnější klesání nepřidává plachtění.
Krátké klepnutí zachovává celý základní skok, podržení dál využívá Sílu.
Kvadratická Síla má koeficient 5.7 místo 9; koupené úrovně, ceny, schéma 5,
limity 320/450 px, role a vybavení zůstávají zachované. Gravitace kluzáku
sleduje stoupání (210); kluzák tedy dál brzdí klesání.

Postava používá během letu souvislou pózu: postupně natahuje nohy, u vrcholu
nepřepíná celý obrázek. Vlasům i oblečení se aplikuje stejný pohyb. Dopad má
mělké propružení s chodidly u země po dobu 0,16 s; odstraněný podřep shazoval
hlavu o devět pixelů. Animace neposouvá fyzikální tělo ani kolize.
[Devět fází skoku](browser/jump-feel-journey-7.png).

## Hratelnost a postup

Konečné hledání ideálního odrazu při 120 Hz, úvodní rychlosti a bez schopností:
kapradina má pro Zahradníka 66 platných celočíselných startovních pozic místo
44; u ostatních rolí 61 místo 35. Tréninková bříza o výšce 48 px je na
základu stále nedostupná. První nalezené úrovně Síly jsou bříza 2, borovice 16,
dub 25 a sekvoje 44. Jde o syntetické hranice, nikoli záruku lidské úspěšnosti
ani univerzální hranici druhu. Přesné vzorky: jump-progression.json.

Částky, TXID, šířky, výšky a mempoolová fronta se touto změnou neupravují.
I první živá překážka může být nepřekonatelná sekvoje. Nová mechanika má
samostatný balanceVersion wl-0.3-journey-7; starý postup a historie se nemažou.

## Ověření a doručení

Kontroly fyziky, krátkého stisku, zachování postupu a animace jsou v npm test.
`npm run test:jump-feel` ověřuje skutečnou mezerníkovou událost a vytváří náhled
fází. `npm run test:jump-input` pokrývá 30 desktopových a 24 mobilních pokusů
se skutečnými obsluhami kláves, myši a dotyku. Trénink nepřidává odměny.
Další ověření a stav nasazení: [WEB_PWA_TIMING.md](WEB_PWA_TIMING.md).

Lidské doladění pocitu ze skoku zůstává úkolem dalšího hraní. Wondrej následně požádal o
publikování pro mobilní hraní; aktuální ověření domény uvádí BROWSER_VERIFICATION.md.
