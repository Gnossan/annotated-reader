# AIuda Reader

Ett Chrome-tillägg som använder Claude AI för att analysera och annotera webbtext — och låter dig utforska innehållet genom konversation, på valfritt språk.
Tilläget fungerar både i Chrome och i Edge.

---

## Vad det gör

AIuda Reader läser texten på en webbsida, skickar den till Claude och markerar meningsfulla fraser med färgkodade kategorier. Du kan sedan klicka på en markering för att läsa en förklaring, och öppna en sidopanel för att chatta med AI om just den frasen.

**Läs på vilket språk som helst — chatta på ditt eget.**
Sidan kan vara på engelska, spanska, tyska eller vilket språk som helst. Du väljer själv vilket språk AI:n svarar på.

---

## Funktioner

### Annotering
- Claude analyserar texten och skapar 3–5 tematiska kategorier med unika färger
- Fraser markeras direkt på sidan med rätt bakgrundsfärg
- Klicka på en markering för att se kategori och beskrivning
- Animerad laddningsindikator med tidräknare under analysen

### Manuell annotering
- Markera valfri text och högerklicka för att välja kategori
- Möjlighet att skapa en egen kategori med valfritt namn och färg

### Chatta om sidan
- "Chat about page"-knapp låter dig chatta om hela artikeln utan att markera något
- Perfekt för en snabb sammanfattning eller djupare diskussion

### AI-chatt per markering
- "Utforska med AI" öppnar en sidopanel med en chattkonversation om den valda frasen
- AI:n börjar automatiskt med en kontextuell förklaring
- Historiken per markering sparas under sessionen

### Korsreferens
- Referera till en annan markerings diskussion direkt i chatten
- AI:n kopplar samman de två konversationerna

### Export
- Exportera all chatthistorik som en Markdown-fil
- Tillgänglig via knapp i sidopanelen eller vid sidnavigering

### Avancerade inställningar
- Välj AI-modell: Opus 4.7, Sonnet 4.6 eller Haiku 4.5 (beroende på plan)
- Välj svarsspråk: engelska, svenska, danska, norska, tyska, franska, spanska, italienska
- Justera textstorlek i sidopanelen
- Ljust och mörkt tema

---

## Installation (beta)

1. Ladda ned zip-filen från [senaste releasen](https://github.com/Gnossan/annotated-reader/releases/latest)
2. Packa upp i en mapp
3. Öppna `chrome://extensions` i Chrome
4. Aktivera **Utvecklarläge** (uppe till höger)
5. Klicka **Ladda okomprimerat tillägg** och välj den uppackade mappen
6. Klicka på AIuda Reader-ikonen och logga in med Google

---

## Användning

1. Navigera till en sida med text du vill läsa
2. Klicka på tilläggsikonen → **Annotate this page**
3. Vänta på analysen — fraser markeras automatiskt
4. Klicka på en markering → läs beskrivningen
5. Klicka **Utforska med AI →** för att öppna sidopanelen och börja chatta

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
| Lagring | `chrome.storage.session` + `chrome.storage.local` + Firestore |
| Prompt caching | Ephemeral på systemprompt + sista meddelandet |
