# Oprava animace chůze při tap-to-move

## Zjištěná příčina

Pohyb po ťuknutí vede postavu přes cestu uloženou v `CharacterController`, zatímco `CharacterAvatar` spouští animaci pouze podle os klávesnice a joysticku. Při automatické chůzi jsou tyto osy nulové, takže model se přesouvá bez animace.

## Úprava

- Přidat do sdíleného řízení postavy jednoduchý per-frame příznak skutečného pohybu.
- V `Player` tento příznak nastavovat podle výsledné chůze bez ohledu na zdroj: tap/click cesta, WASD nebo joystick; při zastavení, otevřeném panelu a dosažení cíle jej vynulovat.
- V `CharacterAvatar` řídit klip `Walking` tímto výsledným stavem místo přímého čtení klávesnice/joysticku.
- Zachovat současné plynulé rozběhnutí, zastavení na neutrálním snímku a idle dýchání.
- Neměnit trasování, rychlost, kameru, mobilní gesta ani ostatní části světa.

## Ověření

- Na mobilním rozměru přepnout ovládání na Tap, ťuknout na zem a vizuálně ověřit běžící animaci během přesunu i klidovou pózu po dojití.
- Ověřit, že animace stále funguje také pro WASD a joystick a zastaví se při otevření panelu.
- Spustit typovou kontrolu, testy a build; stručně zapsat opravu do projektové dokumentace.
