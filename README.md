# AIuda Reader

Ett Chrome-tillägg som använder Claude AI för att analysera och annotera webbtext — och låter dig utforska innehållet genom konversation, på valfritt språk.
Tilläget fungerar både i Chrome och i Edge.

---

## Vad det gör

AIuda Reader har två huvudfunktioner som fungerar oberoende av varandra:

**Orduppslagning** — alltid aktiv, kräver inget konto. Markera vilket ord som helst på vilken sida som helst, klicka på ?-knappen och få en ordboksdefinition på ditt språk. Klicka 🔊 för att höra ordet uttalas.

**Annotering** — kräver inloggning. Claude analyserar hela sidan, identifierar teman och markerar meningsfulla fraser med färgkodade kategorier. Klicka på en markering för att chatta med AI om just den frasen.

---

## Funktioner

### Orduppslagning (utan konto)
- Markera valfritt ord på valfri sida → ?-knapp dyker upp
- Klicka ? → ordboksdefinition på ditt valda UI-språk
- Klicka 🔊 → ordet uttalas på sidans originalspråk
- 20 gratis uppslagningar per dag utan inloggning
- Obegränsat för inloggade användare

### Annotering
- Claude analyserar texten och skapar 3–5 tematiska kategorier med unika färger
- Fraser markeras direkt på sidan med rätt bakgrundsfärg
- Realtids-progressbar under analysen via streaming
- Klicka på en markering för att se kategori och beskrivning

### Manuell annotering
- Markera valfri text och högerklicka för att välja kategori
- Möjlighet att skapa en egen kategori med valfritt namn och färg

### Sidopanel — chatt per markering
- "Utforska med AI →" öppnar en sidopanel med chattkonversation om vald fras
- AI:n börjar automatiskt med en kontextuell förklaring
- Historiken per markering sparas under sessionen
- Sidopanelen byter automatiskt kontext när du växlar flik

### Klickbara kategorier
- Klicka på en kategori i legendlistan → AI sammanfattar vad sidan säger om just det ämnet
- Legenden sitter fast ovanför chatten och scrollar inte bort

### Chatta om hela sidan
- "Chat about page"-knapp öppnar en chattkonversation om hela artikeln
- Varje sida har sin egen chatthistorik — blandas inte ihop vid flikbyte

### Korsreferens
- Referera till en annan markerings diskussion direkt i chatten
- AI:n kopplar samman de två konversationerna

### Export
- Exportera all chatthistorik som en Markdown-fil
- Tillgänglig via knapp i sidopanelen eller vid sidnavigering

### Inställningar
- Välj AI-modell: Opus 4.7, Sonnet 4.6 eller Haiku 4.5 (beroende på plan)
- Välj svarsspråk: engelska (US/UK), svenska, danska, norska, tyska, franska, spanska, italienska
- Justera textstorlek i sidopanelen
- Ljust och mörkt tema

---

## Installation (beta)

1. Ladda ned zip-filen från [senaste releasen](https://github.com/Gnossan/annotated-reader/releases/latest)
2. Packa upp i en mapp
3. Öppna `chrome://extensions` i Chrome
4. Aktivera **Utvecklarläge** (uppe till höger)
5. Klicka **Ladda okomprimerat tillägg** och välj den uppackade mappen
6. Orduppslagning fungerar direkt — logga in med Google för annotering

---

## Användning

### Orduppslagning
1. Gå till valfri sida
2. Markera ett ord
3. Klicka ? → definition visas
4. Klicka 🔊 → ordet uttalas

### Annotering
1. Navigera till en sida med text du vill läsa
2. Klicka på tilläggsikonen → **Annotate this page**
3. Vänta på analysen — progressbar visas, fraser markeras automatiskt
4. Klicka på en markering → läs beskrivningen
5. Klicka **Utforska med AI →** för att öppna sidopanelen och börja chatta
6. Klicka på en kategori i legenden för att få en sammanfattning per tema

---

## Planer

| Plan | Orduppslagning | Annotering | Modell |
|---|---|---|---|
| Gratis (ej inloggad) | 20/dag | — | — |
| Free (inloggad) | Obegränsat | ✓ | Sonnet |
| Pro | Obegränsat | ✓ | Opus |
| VIP | Obegränsat | ✓ | Opus |

---

## Licens

© 2026 Tomas Hultberg.

*Developed with the assistance of [Claude](https://claude.ai) by Anthropic.*

Denna programvara får användas och distribueras fritt för privat, icke-kommersiellt bruk. Kommersiellt nyttjande är förbjudet utan upphovsmannens uttryckliga skriftliga medgivande.

För licensförfrågningar: tomas@gnossa.se

---

## Tekniskt

| Komponent | Detalj |
|---|---|
| Manifest | V3 |
| Auth | Google Sign-in via Firebase |
| Backend | Vercel serverless (Node.js) |
| AI | Anthropic Claude API |
| Streaming | SSE via chrome.runtime.connect (service worker) |
| Lagring | `chrome.storage.session` + `chrome.storage.local` + Firestore |
| TTS | Web Speech API (inbyggd i webbläsaren) |
| Anonymt | Extension-ID rate limiting via Firestore |
