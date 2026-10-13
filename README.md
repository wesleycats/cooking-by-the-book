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
- Meldingen: elke fout (dezelfde fout per tester max. 1× per 30 min) en elke "Werkt niet"-feedback, plus een stille melding bij een nieuwe tester. Max. 12 per uur.

## Mappen

| Map | Wat |
|---|---|
| `docs/` | De website (GitHub Pages). Wordt gebouwd, niet met de hand aanpassen. |
| `dashboard/` | Bron van het dashboard (+ `vendor/qrcode.js`, MIT). |
| `apps-script/Code.gs` | Het script achter de Google Sheet. Bevat geen geheimen. |
| `tools/` | `build_testversion.py` (bouwen) en `test_testversion.py` (rooktest). |
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
