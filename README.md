# Annotated Reader

Ett Chrome-tillägg (Manifest V3) som använder Claude AI för att analysera och annotera webbtext — och låter dig utforska innehållet genom konversation.

---

## Vad det gör

Annotated Reader läser texten på en webbsida, skickar den till Claude och markerar meningsfulla fraser med färgkodade kategorier som Claude själv hittar på utifrån textens tema. Du kan sedan klicka på vilken markering som helst för att läsa en förklaring, och öppna en sidopanel för att chatta med AI om just den frasen.

---

## Funktioner

### Annotering
- Claude analyserar texten och skapar 3–5 tematiska kategorier med unika färger
- Fraser markeras direkt i DOM:en med rätt bakgrundsfärg
- Klicka på en markering för att se kategori och beskrivning i en popup
- Animerad laddningsindikator med tidräknare under analysen

### Manuell annotering
- Markera valfri text och högerklicka för att välja kategori ur listan
- Möjlighet att skapa en helt egen kategori med valfritt namn och färg

### AI-chatt per markering (sidopanel)
- "Utforska med AI" öppnar en sidopanel med en chattkonversation om den valda frasen
- AI:n börjar automatiskt med en kontextuell förklaring — ingen inledande fråga krävs
- Animerade punkter visas medan AI:n genererar svar
- Historiken per markering sparas i `chrome.storage.session` — hoppar du mellan fraser finns konversationerna kvar

### Korsreferens
- I sidopanelen kan du referera till en annan markerings diskussion
- AI:n kopplar samman de två konversationerna och svarar på hur de relaterar till varandra

### Export
- Exportera all chatthistorik som en Markdown-fil — en sektion per markering
- Annoteringar utan chatt listas med *Ingen chatt*
- Tillgänglig via knapp i sidopanelen eller via exportdialogrutan vid sidnavigering

### Navigeringsskydd
- Om du försöker lämna sidan visas en dialog: exportera innan du lämnar, lämna ändå, eller avbryt
- En "↓ Exportera chatt"-knapp visas i sidans nedre hörn så länge en chatt är aktiv

### Timeout-hantering
- Om analysen tar mer än 15 sekunder visas en dialog med tre val:
  - **Fortsätt vänta** — återstartar timern
  - **Trunkera och försök igen** — skickar ungefär halva texten
  - **Avbryt** — avbryter analysen

### Avancerade inställningar
- Välj modell: Opus 4.7, Sonnet 4.6 eller Haiku 4.5
- Justera temperature (0.0–1.0) för modeller som stödjer det
- Opus 4.7 låser temperature till 1.0 automatiskt

---

## Förutsättningar

Du behöver ett konto hos [Anthropic](https://www.anthropic.com) och en aktiv API-nyckel. API-nyckeln genereras på [console.anthropic.com](https://console.anthropic.com) och debiteras per användning baserat på antal tokens.

---

## Installation

1. Klona eller ladda ned repot
2. Öppna `chrome://extensions` i Chrome
3. Aktivera **Utvecklarläge** (uppe till höger)
4. Klicka **Ladda okomprimerat tillägg** och välj projektmappen
5. Klicka på tilläggsikonen, ange din Anthropic API-nyckel och spara

---

## Användning

1. Navigera till en sida med text du vill läsa
2. Klicka på tilläggsikonen → **Annotera den här sidan**
3. Vänta på analysen — fraser markeras automatiskt
4. Klicka på en markering → läs beskrivningen i popupen
5. Klicka **Utforska med AI →** för att öppna sidopanelen och börja chatta

---

## Licens

© 2026 Tomas Hultberg. Alla rättigheter förbehållna.

Denna programvara får användas och distribueras fritt för privat, icke-kommersiellt bruk. Kommersiellt nyttjande — inklusive men inte begränsat till försäljning, licensiering, användning i kommersiella produkter eller tjänster samt användning i verksamhet i vinstsyfte — är förbjudet utan upphovsmannens uttryckliga skriftliga medgivande.

För licensförfrågningar, kontakta: tomas@gnossa.se

---

## Tekniskt

| Komponent | Detalj |
|---|---|
| Manifest | V3 |
| Standard-modell | claude-opus-4-7 |
| Session-lagring | `chrome.storage.session` (nollställs när Chrome stängs) |
| Lokal lagring | `chrome.storage.local` (API-nyckel, modell, temperature) |
| Prompt caching | Ephemeral på systemprompt + sista meddelandet i historiken |
