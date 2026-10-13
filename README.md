# Cooking by the Book · Proefkeuken (alpha)

Publieke testversie van de kookapp voor vrienden en familie, plus een testoverzicht voor Wes.

- **App voor testers:** `https://wesleycats.github.io/cooking-by-the-book/` (uitnodigen met `?g=<groep>`, bijv. `?g=vrienden`)
- **Dashboard voor Wes:** `…/dashboard.html`. Open het via de link in de Google Sheet (tabblad Instellingen). Voorbeeld zonder koppeling: `…/dashboard.html?demo`.

## Hoe het werkt

```
telefoon tester ──(events, feedback, fouten)──▶ Apps Script ──▶ Google Sheet
                                                    │
                                                    ├──▶ ntfy ──▶ pushmelding op Wes' telefoon (fout / "Werkt niet")
                                                    └──▶ dashboard.html (alleen met sleutel)
```

- Testers kiezen bij openen een voornaam en krijgen een test-ID (`SANNE-7K3F`). Pas na "Akkoord, starten" gaat er iets van de telefoon af.
- Gemeten: app geopend, pagina's, kookmodus gestart/gesloten, elke kookstap, klaar, sessies (sterren, chips, notitie, timeraanpassingen), feedback en JavaScript-fouten. Zonder internet wacht alles in een wachtrij.
- Meldingen (gratis, binnen de [limieten van ntfy.sh](https://docs.ntfy.sh/publish/#limitations): 250/dag per IP, en Apps Script deelt IP's):
  alles gebundeld. Urgent (fout, "Werkt niet") standaard elke 1 uur, overig elke 6 uur, alleen als er iets is. Zelf aan te passen in
  tabblad Instellingen: B9 (urgent, uren), B10 (overig, uren; 0 = direct), B8 mail: reserve / altijd / nee (zelfde bundels en tijden).
  Eigen dagbudget 60 pushberichten. Optioneel een gratis ntfy.sh-token in B7 (limiet per account i.p.v. gedeeld IP). Diagnose: `testMelding`.

## Onboarding (sinds v49)

Testers krijgen na "Akkoord, starten" drie missies op de startpagina, zodat Wes niets hoeft uit te leggen:

1. **Proefrit**: één recept doorklikken tot het eindscherm (label PROEFRIT, telt nergens mee).
2. **Feedback geven**: met uitleg van de vier soorten (Snap ik niet, Werkt niet, Mooi, Idee).
3. **Eén recept echt koken** binnen 7 dagen.

Plus losse tips op het moment zelf (één tegelijk, "Begrepen" of "Geen tips meer"). **Vangnet:** wie via de gewone startknop
sneller dan de kooktijd-grens (5 min of 40% van de recepttijd) naar het eindscherm tikt, krijgt "Dat ging snel": telt als
proefrit, met de knop "Ik heb echt gekookt". Alles staat in één tabel `ONBOARDING` in `app.js` (hoofdstuk 12c): teksten,
volgorde, scherm en doel-element. Nieuwe tip = één regel met een nieuwe sleutel (werkt ook als "wat is nieuw").

- Opnieuw beginnen op een telefoon: `…/?onboarding=reset` (test-ID en kookgeschiedenis blijven).
- Zelf bekijken in het artifact: Testmenu → *Onboarding bekijken* (demo, stoppen via de missiekaart).
- Dashboard: kaart **Onboarding** (missies per tester), proefritten apart van "keer gekookt", missies in de tijdlijn.
  Alles komt binnen als gewone events (`missie`, `tip`, `proefrit_klaar`, kook-events met `proef:1`): geen nieuwe scriptversie nodig.

## Mappen

| Map | Wat |
|---|---|
| `docs/` | De website (GitHub Pages). Wordt gebouwd, niet met de hand aanpassen. |
| `dashboard/` | Bron van het dashboard (+ `vendor/qrcode.js`, MIT). |
| `apps-script/Code.gs` | Het script achter de Google Sheet. Bevat geen geheimen. |
| `tools/` | `build_testversion.py` (bouwen) en `test_testversion.py` (rooktest, 164 checks incl. onboarding). |
| `config/tester.json` | `{"endpoint": "<Apps Script /exec-URL>"}` |

## Eenmalig instellen

1. **GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / `/docs` → Save.
2. **Google Sheet:** maak een lege Sheet "Testdata - Alpha - Proefkeuken" → Extensies → Apps Script → plak `apps-script/Code.gs` → opslaan.
3. Kies de functie **`setup`** → Uitvoeren → toestemming geven (*Geavanceerd → Ga naar … (onveilig)* is normaal voor je eigen script).
4. **Implementeren → Nieuwe implementatie** → tandwiel → *Web-app* → Uitvoeren als: *ik*; Toegang: *Iedereen* → Implementeren. Kopieer de URL die op `/exec` eindigt.
5. Plak die URL in tabblad **Instellingen**, cel B4. In B5 verschijnt je dashboardlink: bewaar die als bladwijzer op je telefoon.
6. **ntfy:** installeer de app *ntfy* (Play Store) → + → vul het meldingskanaal uit Instellingen B1 in. De testmelding van stap 3 kun je opnieuw sturen door `setup` nog eens uit te voeren.
7. Geef Claude de `/exec`-URL; die komt in `config/tester.json` en de site wordt opnieuw gebouwd.

## Bijwerken

Na een nieuwe app-versie of receptwijziging: Claude haalt de artifact-bestanden en recepten op, draait
`python3 tools/build_testversion.py <src> docs --recipes <recipes.json> --config config/tester.json`
en `tools/test_testversion.py`, en pusht naar `main`.

Na een wijziging in `Code.gs`: Implementeren → Implementaties beheren → potlood → Versie: *Nieuwe versie* (de URL blijft gelijk).
