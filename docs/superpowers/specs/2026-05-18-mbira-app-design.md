# Mbira webová aplikace — návrh

**Datum:** 2026-05-18
**Status:** Návrh (čeká na schválení)

## Cíl

Webová aplikace, která napodobuje tradiční zimbabwskou mbiru (mbira dzavadzimu) v ladění "A". Primárně určená pro mobilní telefon (iPhone 13) v landscape módu. Bez frameworků — pouze HTML, CSS a vanilla JavaScript.

## Reference

Layout a ladění striktně podle přiloženého obrázku `mbira-a-tuning.jpg`. Jakákoli pochybnost o pozici nebo notě jazýčku se řeší podle fotky.

## Rozsah (in scope)

- 22 jazýčků uspořádaných dle fotky (vějířovitý layout, dvě vizuální úrovně)
- Štítky s názvy not přímo na jazýčcích
- Tap/touch přehraje syntetizovaný tón
- Multi-touch — lze hrát akordy (více jazýčků současně)
- Vizuální feedback při stisku (animace)
- Landscape orientace jako primární; portrait zobrazí výzvu k otočení
- Funguje jako statická stránka (bez serveru, bez build kroku)

## Mimo rozsah (out of scope)

- Více ladění (jen "A" z fotky)
- Nahrávání / přehrávání
- Notový zápis nebo lekce
- PWA / offline cache (může přijít později)
- Konfigurace zvuku z UI

## Architektura

### Soubory

```
/index.html       — markup, SVG mbiry, kořenový kontejner
/style.css        — layout, animace, landscape/portrait media queries
/script.js        — audio engine + event handling + state
/mbira-a-tuning.jpg — referenční obrázek (zachovat)
```

Žádné další soubory, žádný build, žádné npm. Otevírá se přímo přes `file://` nebo libovolný statický server.

### Modulární struktura `script.js`

Soubor je malý (odhad < 300 řádků), ale rozdělíme do jasných sekcí:

1. **Audio engine** — inicializace `AudioContext`, funkce `playNote(frequency)` která vytvoří oscilátor + envelope + harmonické a sama se uklidí.
2. **Tine data** — pole 22 jazýčků: `{ id, note, frequency, octave, side: 'left'|'right'|'center', row: 'long'|'short' }`. Definováno jednou na začátku.
3. **Rendering** — buď generování SVG/DOM z `tines` pole, nebo statické v HTML (rozhodne se v plánu — viz alternativy níže).
4. **Input handling** — `pointerdown`/`pointerup` (pokrývá touch i mouse), `touch-action: none` na jazýčcích, prevent default.
5. **Inicializace** — bootstrap při `DOMContentLoaded`, `AudioContext` se však aktivuje až při prvním uživatelském gestu (požadavek prohlížečů).

### Audio engine — detail

Mbira zvuk je kovový, zvonkovitý, s rychlým atakem a pomalým decay. Aproximace:

- 1× `OscillatorNode` typu `sine` na fundamentální frekvenci
- 2–3 další oscilátory na harmonických (2×, 3×, 5×) s nižší amplitudou
- Společný `GainNode` s ADSR envelopem: attack ~5 ms, decay 1.5–2.5 s, lineární nebo exponenciální
- Volitelně lehký detune (±2 cent) pro teplo
- Po doznění (`gain` → 0) všechny nody disconnect, aby se nehromadily

Funkce má signaturu `playNote(frequency: number): void` — bez stavu, idempotentní pro každý stisk.

### Mapování jazýčků na noty

Z fotky `mbira-a-tuning.jpg` (čteno zleva doprava):

**Horní řada (kratší jazýčky, hlavní notové štítky):**
A, G#, F#, D, E, A | (středový jazýček) A | C#, A, B, C#, D, E, F#, G#, A

**Spodní řada (delší jazýčky, štítky vidět pod můstkem):**
B, G#, F#, E, D, C#, A

Přesné oktávy a pořadí 22 jazýčků se finalizuje při implementaci podle fotky. Frekvence z 12-TET (A4 = 440 Hz) — výchozí standard.

> Poznámka: traditional mbira ladění nejsou vždy přesně 12-TET, ale pro webovou aproximaci je 12-TET dostatečně blízké a očekávané uživatelem.

### Vizuální layout

Plocha aplikace = celý viewport. Cíl: iPhone 13 landscape (844 × 390 CSS px, safe area).

```
+----------------------------------------------------+
| [jazýčky horní řady — vějířovité uspořádání]      |
| | | | | | |   |   | | | | | | |                    |
| ╠═══════════════ MŮSTEK ═══════════════╣          |
| | | | | | | |               (oko)                  |
| [jazýčky spodní/delší řady]                       |
| [tělo mbiry — texturované dřevo]                  |
+----------------------------------------------------+
```

- Jazýčky = vertikální obdélníky nebo lichoběžníky s gradientem (kov)
- Střední část = můstek (vodorovný pruh)
- Pozadí = tmavý dřevěný odstín
- Štítky s notami = malé světlé chips/oválky s textem, nahoře nebo dole na jazýčku podle řady
- Šířka jazýčku ~30–40 px, mezery ~4–6 px — laděné aby všech 22 vlezlo na 844 px šířky

### Vizuální feedback

Při stisku jazýčku:
- `transform: translateY(2–4 px)` (jazýček se „prohne")
- Krátký glow / brightness boost (~150 ms)
- Po uvolnění návrat do klidového stavu

Použijeme CSS transitions na `transform` a `filter` — GPU akcelerované, plynulé i na slabším mobilu.

### Orientace

- `@media (orientation: portrait)` — překryje vše s prosbou „Otoč telefon na šířku" + ikonou
- `@media (orientation: landscape)` — normální zobrazení
- Žádný JS detekční kód, pouze CSS

## Datový tok

```
uživatel: pointerdown na .tine[data-id=5]
   ↓
event handler: e.preventDefault(), addClass('pressed')
   ↓
playNote(tines[5].frequency)
   ↓
AudioContext: oscillator + harmonics + envelope → speakers
   ↓
po 150ms: removeClass('pressed') (na pointerup nebo timer)
```

## Error handling

- **AudioContext nedostupný / suspended** — při prvním pointerdown zavolat `audioCtx.resume()`. Pokud selže, tichý fallback (vizuální feedback funguje dál).
- **Velmi rychlé opakované stisky** — každý nový stisk vytvoří novou instanci oscilátoru, předchozí dohrávají paralelně. Žádný throttling — chceme aby šel rychlý tremolo.
- **Multi-touch** — `pointerdown` se dispatchuje per-pointer; každý dotyk je nezávislý.
- **Žádný server / žádné assets ke stažení** — minimální plocha pro selhání.

## Testování

Vanilla JS bez frameworků = bez automatizovaných unit testů (přidává setup, který přesahuje rozsah). Místo toho:

- **Manuální test plan** v `docs/superpowers/specs/2026-05-18-mbira-app-design.md` (tento dokument, sekce níže) — pokrývá zlatou cestu + edge cases.
- **Testování na iPhone 13** (nebo simulátoru) v Safari, landscape.
- **Testování v desktop Chrome** s DevTools mobile emulation pro rychlejší iteraci.

### Manuální testovací scénáře

1. Otevřít stránku v landscape — všech 22 jazýčků viditelných, žádné scrollování.
2. Tap na každý jazýček zleva doprava — slyšet vzestupnou/sestupnou tóninu odpovídající fotce.
3. Tap dvou jazýčků současně (akord) — oba zní paralelně.
4. Otočit na portrait — zobrazí se výzva k otočení.
5. Otočit zpět na landscape — výzva zmizí, mbira zase funkční.
6. Rychlé opakované tapy na jeden jazýček — žádná latence, žádný drop, plynulé.
7. Po 5 minutách neaktivity — další tap stále zní (AudioContext se nesuspendoval kriticky).

## Alternativy zvažované

### Sound: synthesis vs. samples
**Zvoleno:** Web Audio API syntéza.
- (+) Nulová velikost stažení, žádné CORS, žádná licenční otázka.
- (+) Snadná úprava charakteru zvuku.
- (−) Nezní 100 % autenticky jako nahraná mbira.
- Alternativa: pre-recorded WAV/MP3 samples — autentičtější, ale +1–5 MB, komplikuje deployment, ladění samples musí přesně sedět.

### Rendering: SVG vs. CSS-only DOM
**Zvoleno:** rozhodne se v plánu — preferujeme CSS-only DOM (jazýček = `<div>`) kvůli jednoduchosti event handling a snadné stylizaci. SVG zvážíme pokud se nepodaří dobře dosáhnout vějířovitého tvaru.
- CSS DOM (+) jednoduché event handling, snadné `:active` stavy, žádný extra parsing.
- SVG (+) přesnější geometrie pro vějířovité uspořádání a zaoblené tvary jazýčků.

### Frameworks
**Zvoleno:** žádné. Zadání explicitně říká vanilla. Aplikace je dostatečně malá.

## Otevřené body k řešení v implementaci

- Přesné mapování všech 22 jazýčků na noty s oktávami — bude finalizováno čtením fotky pixel-po-pixelu během implementace
- Přesné rozměry jazýčků pro fit na 844 px (iPhone 13 landscape) bez ořezu
- Fine-tuning ADSR envelopu pro nejlepší „mbira-like" zvuk — iterace poslechem

## Závěr

Jeden HTML soubor, jeden CSS, jeden JS. Web Audio API syntéza, 22 jazýčků dle fotky, landscape-first, multi-touch. Žádný build, žádné dependencies. Implementace odhadem 1–2 hodiny.
