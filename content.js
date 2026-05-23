(function () {
let sammanfattning = "";
let kategorier = [];
let aktivChattIgång = false;
let alleAnnoteringar = [];
let källText = "";
let annoteringIgnoreras = false;
let annoteringTimeoutId = null;
const AR_TIMEOUT_MS = 60000;

const AR_CONTENT = {
    en: {
        chatOmSidan:           "Chat about page",
        redanAnnoterad:        "Page already annotated",
        redanAnnoteradText:    "This will clear all annotations and chat history.",
        annoteraOm:            "Re-annotate",
        analyserar:            "Analyzing",
        fel:               "✗ Error",
        kvotSlut:          "⚠ Monthly limit reached. Upgrade your plan or purchase additional credits.",
        avbruten:          "✗ Cancelled",
        klar:              "✓ Done",
        tecken:            "characters",
        exporteraChatt:    "↓ Export chat",
        exporterar:        "⏳ Exporting...",
        exporterad:        "✓ Exported",
        lamnaSidan:        "Leave page?",
        aktivaChattar:     "You have active chats — do you want to export the history before leaving?",
        exporteraOchLamna: "Export and leave",
        lamnaAnda:         "Leave anyway",
        avbryt:            "Cancel",
        utforskaAI:        "Explore with AI →",
        annoterasom:       "Annotate as...",
        anpassadKat:       "Custom category...",
        anpassadKatRubrik: "Custom category",
        kategorinamn:      "Category name",
        valjFarg:          "Choose color",
        annotera:          "Annotate",
        analysenTarTid:    "Analysis is taking time",
        textenLang:        (n) => `The text seems long (${n.toLocaleString("en-US")} characters). What would you like to do?`,
        fortsattVanta:     "Keep waiting",
        trunkeraForsok:    (k) => `Truncate (~${k}k characters) and try again`,
        exportRubrik:      "AIuda Reader — Exported history",
        exportDatum:       "Exported",
        datumLocale:       "en-US",
        exportKategori:    "Category",
        exportBeskrivning: "Description",
        exportDu:          "You",
        exportIngenChatt:  "*No chat*",
    },
    "en-GB": {
        chatOmSidan:           "Chat about page",
        redanAnnoterad:        "Page already annotated",
        redanAnnoteradText:    "This will clear all annotations and chat history.",
        annoteraOm:            "Re-annotate",
        analyserar:            "Analysing",
        fel:               "✗ Error",
        kvotSlut:          "⚠ Monthly limit reached. Upgrade your plan or purchase additional credits.",
        avbruten:          "✗ Cancelled",
        klar:              "✓ Done",
        exporteraChatt:    "↓ Export chat",
        exporterar:        "⏳ Exporting...",
        exporterad:        "✓ Exported",
        lamnaSidan:        "Leave page?",
        aktivaChattar:     "You have active chats — do you want to export the history before leaving?",
        exporteraOchLamna: "Export and leave",
        lamnaAnda:         "Leave anyway",
        avbryt:            "Cancel",
        utforskaAI:        "Explore with AI →",
        annoterasom:       "Annotate as...",
        anpassadKat:       "Custom category...",
        anpassadKatRubrik: "Custom category",
        kategorinamn:      "Category name",
        valjFarg:          "Choose colour",
        annotera:          "Annotate",
        analysenTarTid:    "Analysis is taking time",
        textenLang:        (n) => `The text seems long (${n.toLocaleString("en-GB")} characters). What would you like to do?`,
        fortsattVanta:     "Keep waiting",
        trunkeraForsok:    (k) => `Truncate (~${k}k characters) and try again`,
        exportRubrik:      "AIuda Reader — Exported history",
        exportDatum:       "Exported",
        datumLocale:       "en-GB",
        exportKategori:    "Category",
        exportBeskrivning: "Description",
        exportDu:          "You",
        exportIngenChatt:  "*No chat*",
    },
    es: {
        chatOmSidan: "Chat sobre la página", redanAnnoterad: "Página ya anotada",
        redanAnnoteradText: "Esto eliminará todas las anotaciones e historial de chat.", annoteraOm: "Volver a anotar",
        analyserar: "Analizando", fel: "✗ Error", kvotSlut: "⚠ Límite mensual alcanzado. Actualiza tu plan o compra créditos adicionales.", avbruten: "✗ Cancelado", klar: "✓ Listo", tecken: "caracteres",
        exporteraChatt: "↓ Exportar chat", exporterar: "⏳ Exportando...", exporterad: "✓ Exportado",
        lamnaSidan: "¿Salir de la página?", aktivaChattar: "Tienes chats activos — ¿quieres exportar el historial antes de salir?",
        exporteraOchLamna: "Exportar y salir", lamnaAnda: "Salir de todas formas", avbryt: "Cancelar",
        utforskaAI: "Explorar con IA →", annoterasom: "Anotar como...", anpassadKat: "Categoría personalizada...",
        anpassadKatRubrik: "Categoría personalizada", kategorinamn: "Nombre de categoría",
        valjFarg: "Elegir color", annotera: "Anotar", analysenTarTid: "El análisis está tardando",
        textenLang: (n) => `El texto parece largo (${n.toLocaleString("es-ES")} caracteres). ¿Qué deseas hacer?`,
        fortsattVanta: "Seguir esperando", trunkeraForsok: (k) => `Truncar (~${k}k caracteres) y reintentar`,
        exportRubrik: "AIuda Reader — Historial exportado", exportDatum: "Exportado", datumLocale: "es-ES",
        exportKategori: "Categoría", exportBeskrivning: "Descripción", exportDu: "Tú", exportIngenChatt: "*Sin chat*",
    },
    fr: {
        chatOmSidan: "Chat sur la page", redanAnnoterad: "Page déjà annotée",
        redanAnnoteradText: "Cela effacera toutes les annotations et l'historique de chat.", annoteraOm: "Ré-annoter",
        analyserar: "Analyse en cours", fel: "✗ Erreur", kvotSlut: "⚠ Limite mensuel atteint. Mettez à niveau votre forfait ou achetez des crédits.", avbruten: "✗ Annulé", klar: "✓ Terminé", tecken: "caractères",
        exporteraChatt: "↓ Exporter le chat", exporterar: "⏳ Export en cours...", exporterad: "✓ Exporté",
        lamnaSidan: "Quitter la page ?", aktivaChattar: "Vous avez des chats actifs — voulez-vous exporter l'historique avant de quitter ?",
        exporteraOchLamna: "Exporter et quitter", lamnaAnda: "Quitter quand même", avbryt: "Annuler",
        utforskaAI: "Explorer avec l'IA →", annoterasom: "Annoter comme...", anpassadKat: "Catégorie personnalisée...",
        anpassadKatRubrik: "Catégorie personnalisée", kategorinamn: "Nom de catégorie",
        valjFarg: "Choisir couleur", annotera: "Annoter", analysenTarTid: "L'analyse prend du temps",
        textenLang: (n) => `Le texte semble long (${n.toLocaleString("fr-FR")} caractères). Que souhaitez-vous faire ?`,
        fortsattVanta: "Continuer à attendre", trunkeraForsok: (k) => `Tronquer (~${k}k caractères) et réessayer`,
        exportRubrik: "AIuda Reader — Historique exporté", exportDatum: "Exporté", datumLocale: "fr-FR",
        exportKategori: "Catégorie", exportBeskrivning: "Description", exportDu: "Vous", exportIngenChatt: "*Pas de chat*",
    },
    de: {
        chatOmSidan: "Chat über die Seite", redanAnnoterad: "Seite bereits annotiert",
        redanAnnoteradText: "Alle Annotierungen und Chatverläufe werden gelöscht.", annoteraOm: "Erneut annotieren",
        analyserar: "Analysiere", fel: "✗ Fehler", kvotSlut: "⚠ Monatliches Limit erreicht. Upgraden Sie Ihren Plan oder kaufen Sie Kredite.", avbruten: "✗ Abgebrochen", klar: "✓ Fertig", tecken: "Zeichen",
        exporteraChatt: "↓ Chat exportieren", exporterar: "⏳ Exportiere...", exporterad: "✓ Exportiert",
        lamnaSidan: "Seite verlassen?", aktivaChattar: "Sie haben aktive Chats — möchten Sie den Verlauf exportieren?",
        exporteraOchLamna: "Exportieren und verlassen", lamnaAnda: "Trotzdem verlassen", avbryt: "Abbrechen",
        utforskaAI: "Mit KI erkunden →", annoterasom: "Annotieren als...", anpassadKat: "Benutzerdefinierte Kategorie...",
        anpassadKatRubrik: "Benutzerdefinierte Kategorie", kategorinamn: "Kategoriename",
        valjFarg: "Farbe wählen", annotera: "Annotieren", analysenTarTid: "Die Analyse dauert",
        textenLang: (n) => `Der Text scheint lang (${n.toLocaleString("de-DE")} Zeichen). Was möchten Sie tun?`,
        fortsattVanta: "Weiter warten", trunkeraForsok: (k) => `Kürzen (~${k}k Zeichen) und erneut versuchen`,
        exportRubrik: "AIuda Reader — Exportierter Verlauf", exportDatum: "Exportiert", datumLocale: "de-DE",
        exportKategori: "Kategorie", exportBeskrivning: "Beschreibung", exportDu: "Sie", exportIngenChatt: "*Kein Chat*",
    },
    it: {
        chatOmSidan: "Chat sulla pagina", redanAnnoterad: "Pagina già annotata",
        redanAnnoteradText: "Verranno eliminate tutte le annotazioni e la cronologia chat.", annoteraOm: "Ri-annotare",
        analyserar: "Analisi in corso", fel: "✗ Errore", kvotSlut: "⚠ Limite mensile raggiunto. Aggiorna il piano o acquista crediti aggiuntivi.", avbruten: "✗ Annullato", klar: "✓ Fatto", tecken: "caratteri",
        exporteraChatt: "↓ Esporta chat", exporterar: "⏳ Esportazione...", exporterad: "✓ Esportato",
        lamnaSidan: "Lasciare la pagina?", aktivaChattar: "Hai chat attive — vuoi esportare la cronologia prima di uscire?",
        exporteraOchLamna: "Esporta ed esci", lamnaAnda: "Esci comunque", avbryt: "Annulla",
        utforskaAI: "Esplora con l'IA →", annoterasom: "Annota come...", anpassadKat: "Categoria personalizzata...",
        anpassadKatRubrik: "Categoria personalizzata", kategorinamn: "Nome categoria",
        valjFarg: "Scegli colore", annotera: "Annota", analysenTarTid: "L'analisi sta richiedendo tempo",
        textenLang: (n) => `Il testo sembra lungo (${n.toLocaleString("it-IT")} caratteri). Cosa vuoi fare?`,
        fortsattVanta: "Continua ad aspettare", trunkeraForsok: (k) => `Tronca (~${k}k caratteri) e riprova`,
        exportRubrik: "AIuda Reader — Cronologia esportata", exportDatum: "Esportato", datumLocale: "it-IT",
        exportKategori: "Categoria", exportBeskrivning: "Descrizione", exportDu: "Tu", exportIngenChatt: "*Nessuna chat*",
    },
    no: {
        chatOmSidan: "Chat om siden", redanAnnoterad: "Siden er allerede annotert",
        redanAnnoteradText: "Dette vil slette alle annoteringer og chat-historikk.", annoteraOm: "Annotér på nytt",
        analyserar: "Analyserer", fel: "✗ Feil", kvotSlut: "⚠ Månedlig grense nådd. Oppgrader planen eller kjøp ekstra kreditter.", avbruten: "✗ Avbrutt", klar: "✓ Ferdig", tecken: "tegn",
        exporteraChatt: "↓ Eksporter chat", exporterar: "⏳ Eksporterer...", exporterad: "✓ Eksportert",
        lamnaSidan: "Forlate siden?", aktivaChattar: "Du har aktive chatter — vil du eksportere historikken?",
        exporteraOchLamna: "Eksporter og forlat", lamnaAnda: "Forlat likevel", avbryt: "Avbryt",
        utforskaAI: "Utforsk med AI →", annoterasom: "Annotér som...", anpassadKat: "Egendefinert kategori...",
        anpassadKatRubrik: "Egendefinert kategori", kategorinamn: "Kategorinavn",
        valjFarg: "Velg farge", annotera: "Annotér", analysenTarTid: "Analysen tar tid",
        textenLang: (n) => `Teksten virker lang (${n.toLocaleString("nb-NO")} tegn). Hva vil du gjøre?`,
        fortsattVanta: "Fortsett å vente", trunkeraForsok: (k) => `Forkort (~${k}k tegn) og prøv igjen`,
        exportRubrik: "AIuda Reader — Eksportert historikk", exportDatum: "Eksportert", datumLocale: "nb-NO",
        exportKategori: "Kategori", exportBeskrivning: "Beskrivelse", exportDu: "Du", exportIngenChatt: "*Ingen chat*",
    },
    da: {
        chatOmSidan: "Chat om siden", redanAnnoterad: "Siden er allerede annoteret",
        redanAnnoteradText: "Dette vil slette alle annoteringer og chathistorik.", annoteraOm: "Annotér igen",
        analyserar: "Analyserer", fel: "✗ Fejl", kvotSlut: "⚠ Månedlig grænse nået. Opgrader din plan eller køb ekstra kreditter.", avbruten: "✗ Afbrudt", klar: "✓ Færdig", tecken: "tegn",
        exporteraChatt: "↓ Eksportér chat", exporterar: "⏳ Eksporterer...", exporterad: "✓ Eksporteret",
        lamnaSidan: "Forlad siden?", aktivaChattar: "Du har aktive chats — vil du eksportere historikken?",
        exporteraOchLamna: "Eksportér og forlad", lamnaAnda: "Forlad alligevel", avbryt: "Annullér",
        utforskaAI: "Udforsk med AI →", annoterasom: "Annotér som...", anpassadKat: "Brugerdefineret kategori...",
        anpassadKatRubrik: "Brugerdefineret kategori", kategorinamn: "Kategorinavn",
        valjFarg: "Vælg farve", annotera: "Annotér", analysenTarTid: "Analysen tager tid",
        textenLang: (n) => `Teksten virker lang (${n.toLocaleString("da-DK")} tegn). Hvad vil du gøre?`,
        fortsattVanta: "Fortsæt med at vente", trunkeraForsok: (k) => `Afkort (~${k}k tegn) og prøv igen`,
        exportRubrik: "AIuda Reader — Eksporteret historik", exportDatum: "Eksporteret", datumLocale: "da-DK",
        exportKategori: "Kategori", exportBeskrivning: "Beskrivelse", exportDu: "Du", exportIngenChatt: "*Ingen chat*",
    },
    sv: {
        chatOmSidan:           "Chatta om sidan",
        redanAnnoterad:        "Sidan är redan annoterad",
        redanAnnoteradText:    "Detta rensar alla annoteringar och chatthistorik.",
        annoteraOm:            "Annotera om",
        analyserar:            "Analyserar",
        fel:               "✗ Fel",
        kvotSlut:          "⚠ Månadsgränsen är nådd. Uppgradera din plan eller köp till krediter.",
        avbruten:          "✗ Avbruten",
        klar:              "✓ Klar",
        tecken:            "tecken",
        exporteraChatt:    "↓ Exportera chatt",
        exporterar:        "⏳ Exporterar...",
        exporterad:        "✓ Exporterad",
        lamnaSidan:        "Lämna sidan?",
        aktivaChattar:     "Du har aktiva chattar — vill du exportera historiken innan du lämnar?",
        exporteraOchLamna: "Exportera och lämna",
        lamnaAnda:         "Lämna ändå",
        avbryt:            "Avbryt",
        utforskaAI:        "Utforska med AI →",
        annoterasom:       "Annotera som...",
        anpassadKat:       "Anpassad kategori...",
        anpassadKatRubrik: "Anpassad kategori",
        kategorinamn:      "Kategorinamn",
        valjFarg:          "Välj färg",
        annotera:          "Annotera",
        analysenTarTid:    "Analysen tar tid",
        textenLang:        (n) => `Texten verkar vara lång (${n.toLocaleString("sv-SE")} tecken). Vad vill du göra?`,
        fortsattVanta:     "Fortsätt vänta",
        trunkeraForsok:    (k) => `Trunkera (~${k}k tecken) och försök igen`,
        exportRubrik:      "AIuda Reader — Exporterad historik",
        exportDatum:       "Exporterad",
        datumLocale:       "sv-SE",
        exportKategori:    "Kategori",
        exportBeskrivning: "Beskrivning",
        exportDu:          "Du",
        exportIngenChatt:  "*Ingen chatt*",
    }
};

let t = AR_CONTENT.en;

// Dessa hanteras av locales.js i HTML-sidor men behövs inline i content.js

if (document.getElementById("ar-overlay")) {
    console.log("Redan igång");
    document.getElementById("ar-overlay").remove();
}

if (!document.getElementById("ar-stil")) {
    const stil = document.createElement("style");
    stil.id = "ar-stil";
    stil.textContent = `
        @keyframes ar-puls { 0%, 60%, 100% { opacity: 0.25; transform: scale(1); } 30% { opacity: 1; transform: scale(1.4); } }
        .ar-punkt { display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #f5f0e8; animation: ar-puls 1.4s infinite ease-in-out; margin: 0 2px; vertical-align: middle; }
        .ar-punkt:nth-child(2) { animation-delay: 0.2s; }
        .ar-punkt:nth-child(3) { animation-delay: 0.4s; }
        .ar-markering { background-color: rgba(var(--ar-r), var(--ar-g), var(--ar-b), 0.3) !important; }
        .ar-markering:hover { background-color: rgba(var(--ar-r), var(--ar-g), var(--ar-b), 0.7) !important; }
    `;
    document.head.appendChild(stil);
}

function frasenTillId(text) {
    return "ar_chat_" + text.trim().toLowerCase()
        .replace(/[^a-z0-9åäö]/g, "_")
        .replace(/_+/g, "_")
        .slice(0, 60);
}

async function exporteraHistorik() {
    const allt = await chrome.storage.session.get(null);
    const annoteringar = allt.ar_annoteringar || [];
    const chattar = {};
    Object.entries(allt).forEach(([k, v]) => {
        if (k.startsWith("ar_chat_")) chattar[k] = v;
    });

    if (annoteringar.length === 0 && Object.keys(chattar).length === 0) return;

    let md = `# ${t.exportRubrik}\n\n`;
    md += `${t.exportDatum}: ${new Date().toLocaleString(t.datumLocale)}\n\n`;

    const hanterade = new Set();

    for (const ann of annoteringar) {
        const id = frasenTillId(ann.text);
        hanterade.add(id);
        const sess = chattar[id];

        md += `## ${ann.text}\n`;
        md += `**${t.exportKategori}:** ${ann.kategori}  \n`;
        md += `**${t.exportBeskrivning}:** ${ann.beskrivning}\n\n`;

        if (sess?.historik?.length > 0) {
            for (const msg of sess.historik) {
                if (msg.silent) continue;
                const roll = msg.role === "user" ? `**${t.exportDu}**` : "**AI**";
                const text = typeof msg.content === "string" ? msg.content : msg.content[0]?.text || "";
                md += `${roll}: ${text}\n\n`;
            }
        } else {
            md += `${t.exportIngenChatt}\n\n`;
        }
        md += "---\n\n";
    }

    for (const [id, sess] of Object.entries(chattar)) {
        if (hanterade.has(id) || !sess.historik?.length) continue;
        md += `## ${sess.fras}\n`;
        md += `**${t.exportKategori}:** ${sess.kategori}  \n`;
        md += `**${t.exportBeskrivning}:** ${sess.beskrivning}\n\n`;
        for (const msg of sess.historik) {
            if (msg.silent) continue;
            const roll = msg.role === "user" ? `**${t.exportDu}**` : "**AI**";
            const text = typeof msg.content === "string" ? msg.content : msg.content[0]?.text || "";
            md += `${roll}: ${text}\n\n`;
        }
        md += "---\n\n";
    }

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annotated-reader-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function visaExportDialog(fortsätt) {
    const gammal = document.getElementById("ar-export-dialog");
    if (gammal) gammal.remove();

    const dialog = document.createElement("div");
    dialog.id = "ar-export-dialog";
    dialog.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 99999;
        display: flex; align-items: center; justify-content: center;
    `;
    dialog.innerHTML = `
        <div style="background:#1a1610;color:#f5f0e8;padding:24px;border-radius:10px;max-width:360px;width:90%;font-family:sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.6);">
            <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${t.lamnaSidan}</div>
            <div style="font-size:13px;opacity:0.8;margin-bottom:20px;line-height:1.5;">${t.aktivaChattar}</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button id="ar-exp-exportera" style="padding:10px;background:#f0c040;color:#1a1610;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">${t.exporteraOchLamna}</button>
                <button id="ar-exp-lämna" style="padding:10px;background:#333;color:#f5f0e8;border:none;border-radius:6px;cursor:pointer;font-size:13px;">${t.lamnaAnda}</button>
                <button id="ar-exp-avbryt" style="padding:10px;background:transparent;color:#f5f0e8;border:1px solid #444;border-radius:6px;cursor:pointer;font-size:13px;">${t.avbryt}</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    document.getElementById("ar-exp-exportera").addEventListener("click", async () => {
        await exporteraHistorik();
        aktivChattIgång = false;
        dialog.remove();
        fortsätt();
    });
    document.getElementById("ar-exp-lämna").addEventListener("click", () => {
        aktivChattIgång = false;
        dialog.remove();
        fortsätt();
    });
    document.getElementById("ar-exp-avbryt").addEventListener("click", () => {
        dialog.remove();
    });
}

document.addEventListener("contextmenu", (e) => {
    const urval = window.getSelection();
    if (!urval || urval.isCollapsed || kategorier.length === 0) return;
    const text = urval.toString().trim();
    if (!text) return;
    e.preventDefault();
    visaKategoriMeny(e.clientX, e.clientY, text, urval.getRangeAt(0).cloneRange());
});

function visaKategoriMeny(x, y, text, range) {
    const gammal = document.getElementById("ar-kategori-meny");
    if (gammal) gammal.remove();

    const meny = document.createElement("div");
    meny.id = "ar-kategori-meny";
    meny.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        background: #1a1610;
        color: #f5f0e8;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 12px;
        z-index: 99999;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        min-width: 190px;
        overflow: hidden;
    `;

    meny.innerHTML = `
        <div style="padding:8px 12px;font-size:11px;opacity:0.5;border-bottom:1px solid #333;text-transform:uppercase;letter-spacing:0.06em;">${t.annoterasom}</div>
        ${kategorier.map(k => `
            <div class="ar-meny-val" data-namn="${k.namn}" data-farg="${k.farg}" data-beskrivning="${k.beskrivning}"
                 style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;">
                <div style="width:10px;height:10px;border-radius:2px;background:${k.farg};flex-shrink:0;"></div>
                <span>${k.namn}</span>
            </div>
        `).join("")}
        <div id="ar-anpassad-val" style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-top:1px solid #333;opacity:0.7;">
            <div style="width:10px;height:10px;border-radius:2px;border:1px dashed #888;flex-shrink:0;"></div>
            <span>${t.anpassadKat}</span>
        </div>
    `;

    document.body.appendChild(meny);

    const rect = meny.getBoundingClientRect();
    if (rect.right > window.innerWidth) meny.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) meny.style.top = `${y - rect.height}px`;

    meny.querySelectorAll(".ar-meny-val").forEach(item => {
        item.addEventListener("mouseenter", () => item.style.background = "#2a2218");
        item.addEventListener("mouseleave", () => item.style.background = "");
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            meny.remove();
            markeraManuellt(text, range, item.dataset.namn, item.dataset.farg, item.dataset.beskrivning);
        });
    });

    document.getElementById("ar-anpassad-val").addEventListener("click", (e) => {
        e.stopPropagation();
        meny.innerHTML = `
            <div style="padding:10px 12px;font-size:11px;opacity:0.5;border-bottom:1px solid #333;text-transform:uppercase;letter-spacing:0.06em;">${t.anpassadKatRubrik}</div>
            <div style="padding:10px 12px;display:flex;flex-direction:column;gap:8px;">
                <input id="ar-kust-namn" type="text" placeholder="${t.kategorinamn}" style="
                    background:#2a2218;border:1px solid #444;border-radius:4px;
                    color:#f5f0e8;padding:6px 8px;font-size:12px;outline:none;width:100%;
                ">
                <div style="display:flex;align-items:center;gap:8px;">
                    <input id="ar-kust-farg" type="color" value="#a0c4ff" style="
                        width:32px;height:28px;border:1px solid #444;border-radius:4px;
                        background:none;cursor:pointer;padding:2px;
                    ">
                    <span style="font-size:11px;opacity:0.6;">${t.valjFarg}</span>
                </div>
                <button id="ar-kust-ok" style="
                    padding:7px;background:#f0c040;color:#1a1610;border:none;
                    border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;
                ">${t.annotera}</button>
            </div>
        `;

        const namnInput = document.getElementById("ar-kust-namn");
        namnInput.focus();

        const bekräfta = () => {
            const namn = namnInput.value.trim();
            const farg = document.getElementById("ar-kust-farg").value;
            if (!namn) return;
            const nyKategori = { namn, farg, beskrivning: namn };
            kategorier.push(nyKategori);
            meny.remove();
            markeraManuellt(text, range, namn, farg, namn);
        };

        document.getElementById("ar-kust-ok").addEventListener("click", (e) => {
            e.stopPropagation();
            bekräfta();
        });
        namnInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.stopPropagation(); bekräfta(); }
            if (e.key === "Escape") meny.remove();
        });
    });

    setTimeout(() => {
        document.addEventListener("click", () => meny.remove(), { once: true });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") meny.remove(); }, { once: true });
    }, 0);
}

let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        alleAnnoteringar.forEach(a => {
            if (!document.querySelector(`[data-markering-id="${frasenTillId(a.text)}"]`)) {
                markeraFras(a.text, a.kategori, a.beskrivning, { [a.kategori]: a.farg });
            }
        });
    }, 150);
});

function markeraManuellt(text, range, kategori, farg, beskrivning) {
    const markeringId = frasenTillId(text);
    const span = document.createElement("span");
    span.dataset.markeringId = markeringId;
    span.style.backgroundColor = farg;
    span.style.cursor = "pointer";
    span.title = beskrivning;
    span.addEventListener("click", (e) => {
        e.stopPropagation();
        visaPopup(e.clientX, e.clientY, text, kategori, beskrivning, markeringId);
    });

    try {
        range.surroundContents(span);
    } catch (_) {
        // Markeringen korsar elementgränser — extrahera och wrappa
        span.appendChild(range.extractContents());
        range.insertNode(span);
    }

    alleAnnoteringar.push({ text, kategori, beskrivning, farg });
    chrome.storage.session.set({ ar_annoteringar: alleAnnoteringar });
    window.getSelection().removeAllRanges();
}

document.addEventListener("click", (e) => {
    if (!aktivChattIgång) return;
    const länk = e.target.closest("a[href]");
    if (!länk) return;
    const href = länk.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    e.preventDefault();
    e.stopPropagation();
    visaExportDialog(() => { window.location.href = länk.href; });
}, true);

window.addEventListener("beforeunload", (e) => {
    if (!aktivChattIgång) return;
    e.preventDefault();
    e.returnValue = "";
});

function görDragBar(knapp) {
    let dragging = false, startX, startY, origTop, origRight;
    knapp.style.cursor = "grab";
    knapp.addEventListener("mousedown", (e) => {
        dragging = false;
        startX = e.clientX;
        startY = e.clientY;
        const rect = knapp.getBoundingClientRect();
        origTop   = rect.top;
        origRight = window.innerWidth - rect.right;
        knapp.style.cursor = "grabbing";

        const onMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (!dragging && Math.abs(dx) + Math.abs(dy) > 4) dragging = true;
            if (!dragging) return;
            knapp.style.top   = `${Math.max(0, origTop + dy)}px`;
            knapp.style.right = `${Math.max(0, origRight - dx)}px`;
        };
        const onUp = () => {
            knapp.style.cursor = "grab";
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
    return () => dragging;
}

function visaHelTextKnapp() {
    const gammal = document.getElementById("ar-heltext-knapp");
    if (gammal) return;

    const knapp = document.createElement("button");
    knapp.id = "ar-heltext-knapp";
    knapp.textContent = t.chatOmSidan;
    knapp.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a1610;
        color: #f0c040;
        border: 1px solid #f0c040;
        border-radius: 6px;
        padding: 8px 14px;
        font-family: sans-serif;
        font-size: 12px;
        cursor: pointer;
        z-index: 9998;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        opacity: 0.85;
    `;
    knapp.addEventListener("mouseenter", () => knapp.style.opacity = "1");
    knapp.addEventListener("mouseleave", () => knapp.style.opacity = "0.85");

    const isDragging = görDragBar(knapp);

    knapp.addEventListener("click", () => {
        if (isDragging()) return;
        if (!aktivChattIgång) {
            aktivChattIgång = true;
            visaExportKnapp();
        }
        chrome.runtime.sendMessage({
            type: "OPEN_SIDEPANEL",
            fras: null,
            markeringId: "ar_chat_hela_sidan",
            helText: källText,
            kategori: "",
            beskrivning: "",
            sammanfattning: sammanfattning,
            kategorier: kategorier
        });
    });
    document.body.appendChild(knapp);
}

function visaExportKnapp() {
    const gammal = document.getElementById("ar-export-knapp");
    if (gammal) return;

    const knapp = document.createElement("button");
    knapp.id = "ar-export-knapp";
    knapp.textContent = t.exporteraChatt;
    knapp.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a1610;
        color: #f0c040;
        border: 1px solid #f0c040;
        border-radius: 6px;
        padding: 8px 14px;
        font-family: sans-serif;
        font-size: 12px;
        z-index: 9998;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        opacity: 0.85;
    `;
    knapp.addEventListener("mouseenter", () => knapp.style.opacity = "1");
    knapp.addEventListener("mouseleave", () => knapp.style.opacity = "0.85");
    document.body.appendChild(knapp);

    const isExportDragging = görDragBar(knapp);

    // Konvertera bottom/right till top/right efter att knappen lagts till i DOM
    const rect = knapp.getBoundingClientRect();
    knapp.style.bottom = "";
    knapp.style.top = `${rect.top}px`;

    knapp.addEventListener("click", async () => {
        if (isExportDragging()) return;
        knapp.textContent = t.exporterar;
        await exporteraHistorik();
        knapp.textContent = t.exporterad;
        setTimeout(() => { knapp.textContent = t.exporteraChatt; }, 2000);
    });
}

function visaPopup(x, y, text, kategori, beskrivning, markeringId) {
    const gammal = document.getElementById("ar-popup");
    if (gammal) gammal.remove();

    const popup = document.createElement("div");
    popup.id = "ar-popup";
    popup.style.cssText = `
        position: fixed;
        left: ${x + 12}px;
        top: ${y + 12}px;
        background: #1a1610;
        color: #f5f0e8;
        padding: 14px 16px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 13px;
        max-width: 280px;
        z-index: 9999;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        line-height: 1.5;
    `;

    popup.innerHTML = `
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.6;margin-bottom:6px;">${kategori.replace("_", " ")}</div>
        <div style="font-weight:500;margin-bottom:8px;">${text}</div>
        <div style="opacity:0.85;margin-bottom:12px;">${beskrivning}</div>
        <button id="ar-utforska" style="width:100%;padding:7px;background:#f0c040;color:#1a1610;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;">${t.utforskaAI}</button>
    `;

    document.body.appendChild(popup);

    setTimeout(() => {
        document.addEventListener("click", () => {
            popup.remove();
        }, { once: true });
    }, 0);

    document.getElementById("ar-utforska").addEventListener("click", (e) => {
        e.stopPropagation();
        popup.remove();
        if (!aktivChattIgång) {
            aktivChattIgång = true;
            visaExportKnapp();
        }
        chrome.runtime.sendMessage({
            type: "OPEN_SIDEPANEL",
            fras: text,
            markeringId: markeringId,
            kategori: kategori,
            beskrivning: beskrivning,
            sammanfattning: sammanfattning,
            kategorier: kategorier
        });
    });
}

function markeraFras(text, kategori, beskrivning, kategorifarger) {
    const markeringId = frasenTillId(text);
    const walker = document.createTreeWalker(
        document.getElementById("main-text") || document.body,
        NodeFilter.SHOW_TEXT
    );

    let nod;
    while ((nod = walker.nextNode())) {
        const normText = text.replace(/»/g, '»').replace(/«/g, '«');
        const index = nod.textContent.indexOf(normText);
        if (index === -1) continue;

        const fore = nod.splitText(index);
        fore.splitText(normText.length);

        const span = document.createElement("span");
        span.textContent = normText;
        span.dataset.markeringId = markeringId;
        span.className = "ar-markering";
        const hex = (kategorifarger[kategori] || "#cccccc").replace("#", "");
        span.style.setProperty("--ar-r", parseInt(hex.slice(0, 2), 16));
        span.style.setProperty("--ar-g", parseInt(hex.slice(2, 4), 16));
        span.style.setProperty("--ar-b", parseInt(hex.slice(4, 6), 16));
        span.style.cursor = "pointer";
        span.title = beskrivning;
        span.addEventListener("click", (e) => {
            e.stopPropagation();
            visaPopup(e.clientX, e.clientY, text, kategori, beskrivning, markeringId);
        });

        fore.parentNode.replaceChild(span, fore);
        return true;
    }
    console.log("Hittade inte:", text);
    return false;
}

const overlay = document.createElement("div");
overlay.id = "ar-overlay";
overlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a1610;
    color: #f5f0e8;
    padding: 10px 16px;
    border-radius: 6px;
    font-family: sans-serif;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 8px;
`;
document.documentElement.appendChild(overlay);

function visaOverlayAnalyserar(sekunder) {
    overlay.innerHTML = `
        <span>${t.analyserar}</span>
        <span class="ar-punkt"></span><span class="ar-punkt"></span><span class="ar-punkt"></span>
        ${sekunder > 0 ? `<span style="opacity:0.5;font-size:12px;">(${sekunder}s)</span>` : ""}
    `;
}

function visaTimeoutDialog(originalText) {
    const gammal = document.getElementById("ar-timeout-dialog");
    if (gammal) gammal.remove();

    const trunkLängd = Math.max(1000, Math.floor(originalText.length / 2));

    const dialog = document.createElement("div");
    dialog.id = "ar-timeout-dialog";
    dialog.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 99999;
        display: flex; align-items: center; justify-content: center;
    `;
    dialog.innerHTML = `
        <div style="background:#1a1610;color:#f5f0e8;padding:24px;border-radius:10px;max-width:360px;width:90%;font-family:sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.6);">
            <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${t.analysenTarTid}</div>
            <div style="font-size:13px;opacity:0.8;margin-bottom:20px;line-height:1.5;">
                ${t.textenLang(originalText.length)}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button id="ar-to-vänta" style="padding:10px;background:#2a2218;color:#f5f0e8;border:1px solid #444;border-radius:6px;cursor:pointer;font-size:13px;">${t.fortsattVanta}</button>
                <button id="ar-to-trunkera" style="padding:10px;background:#f0c040;color:#1a1610;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">${t.trunkeraForsok(Math.round(trunkLängd / 1000))}</button>
                <button id="ar-to-avbryt" style="padding:10px;background:transparent;color:#f5f0e8;border:1px solid #444;border-radius:6px;cursor:pointer;font-size:13px;">${t.avbryt}</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    document.getElementById("ar-to-vänta").addEventListener("click", () => {
        dialog.remove();
        annoteringTimeoutId = setTimeout(() => visaTimeoutDialog(originalText), AR_TIMEOUT_MS);
    });

    document.getElementById("ar-to-trunkera").addEventListener("click", () => {
        annoteringIgnoreras = true;
        dialog.remove();
        startAnnotering(originalText.slice(0, trunkLängd));
    });

    document.getElementById("ar-to-avbryt").addEventListener("click", () => {
        annoteringIgnoreras = true;
        dialog.remove();
        overlay.textContent = t.avbruten;
        setTimeout(() => overlay.remove(), 2000);
    });
}

async function startAnnotering(text) {
    annoteringIgnoreras = false;
    clearTimeout(annoteringTimeoutId);

    // Hämta config och token från background.js
    const config = await new Promise(resolve => {
        chrome.runtime.sendMessage({ type: "GET_ANNOTATE_CONFIG", text }, resolve);
    });
    console.log("[AIuda] GET_ANNOTATE_CONFIG:", config ? "OK" : "SAKNAS");

    if (!config?.token) {
        visaOverlayAnalyserar(0);
        overlay.textContent = t.fel;
        setTimeout(() => overlay.remove(), 2000);
        return;
    }

    // Visa streaming-dialog
    const streamDialog = visaStreamDialog(text.length);

    let accumulated = "";
    let sseBuffer = "";

    try {
        console.log("[AIuda] Startar streaming fetch...");
        const resp = await fetch("https://annotated-reader-backend.vercel.app/api/annotate-stream", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${config.token}`
            },
            body: JSON.stringify({ text, prompt: config.prompt, model: config.model, temperature: config.temperature })
        });

        console.log("[AIuda] Status:", resp.status);

        if (resp.status === 401) {
            // Försök förnya token och försök igen
            const nyConfig = await new Promise(resolve => {
                chrome.runtime.sendMessage({ type: "REFRESH_AND_GET_CONFIG", text }, resolve);
            });
            if (!nyConfig?.token) {
                streamDialog.stäng();
                visaOverlayAnalyserar(0);
                overlay.textContent = t.fel;
                setTimeout(() => overlay.remove(), 2000);
                return;
            }
            config.token = nyConfig.token;
            // Försök igen med ny token
            const resp2 = await fetch("https://annotated-reader-backend.vercel.app/api/annotate-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.token}` },
                body: JSON.stringify({ text, prompt: config.prompt, model: config.model, temperature: config.temperature })
            });
            if (!resp2.ok) {
                streamDialog.stäng();
                return;
            }
            // Ersätt resp med resp2 – bryt ur och kör om
            // (enklast: rekursivt kalla startAnnotering igen)
            streamDialog.stäng();
            startAnnotering(text);
            return;
        }

        if (resp.status === 429) {
            streamDialog.stäng();
            visaOverlayAnalyserar(0);
            overlay.textContent = t.kvotSlut || "⚠ Monthly limit reached.";
            setTimeout(() => overlay.remove(), 4000);
            return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            if (annoteringIgnoreras) { reader.cancel(); break; }
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop(); // behåll ofullständig rad

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.text) {
                        accumulated += data.text;
                        streamDialog.uppdatera(accumulated.length);
                    }
                    if (data.error) console.error("[AIuda] Stream error:", data.error);
                } catch {}
            }
        }
        console.log("[AIuda] Stream klar, tecken:", accumulated.length);
    } catch (err) {
        console.error("[AIuda] Stream fetch fel:", err);
        streamDialog.stäng();
        return;
    }

    streamDialog.stäng();
    if (annoteringIgnoreras) return;

    // Parsa JSON och rita annoteringar
    console.log("[AIuda] Ackumulerat:", accumulated.length, "tecken");
    console.log("[AIuda] Första 200:", accumulated.slice(0, 200));
    console.log("[AIuda] Sista 200:", accumulated.slice(-200));
    let data;
    try {
        const ren = accumulated.replace(/```json/g, "").replace(/```/g, "").trim();
        data = JSON.parse(ren);
    } catch (e) {
        console.error("[AIuda] JSON-parsning misslyckades:", e.message);
        return;
    }

    const kategorifarger = {};
    data.kategorier.forEach((k) => {
        kategorifarger[k.namn] = k.farg;
    });

    sammanfattning = data.sammanfattning || "";
    kategorier = data.kategorier || [];
    källText = text;

    data.annoteringar
        .sort((a, b) => b.text.length - a.text.length)
        .forEach((a) => {
            alleAnnoteringar.push({ text: a.text, kategori: a.kategori, beskrivning: a.beskrivning, farg: kategorifarger[a.kategori] || "#ccc" });
            markeraFras(a.text, a.kategori, a.beskrivning, kategorifarger);
        });
    chrome.storage.session.set({ ar_annoteringar: alleAnnoteringar });

    visaOverlayAnalyserar(0);
    overlay.textContent = t.klar;
    setTimeout(() => {
        overlay.remove();
        visaHelTextKnapp();
    }, 2000);
}

function visaStreamDialog(inputLength) {
    const ESTIMERAD_MAX = Math.max(6000, Math.round(inputLength * 0.6));
    const dialog = document.createElement("div");
    dialog.id = "ar-stream-dialog";
    dialog.style.cssText = `
        position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
        background: #1a1610; color: #f5f0e8;
        padding: 16px 20px; border-radius: 10px;
        min-width: 320px; max-width: 420px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        z-index: 99998; font-family: sans-serif;
        border: 1px solid #333;
    `;
    dialog.innerHTML = `
        <div style="font-size:12px;opacity:0.7;margin-bottom:10px;">
            ${t.analyserar} ${inputLength.toLocaleString()} ${t.tecken || "characters"}
        </div>
        <div style="background:#2a2218;border-radius:4px;height:6px;overflow:hidden;margin-bottom:8px;">
            <div id="ar-stream-bar" style="height:100%;width:0%;background:#f0c040;transition:width 0.3s;border-radius:4px;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
            <span id="ar-stream-chars" style="font-size:11px;opacity:0.5;">0 ${t.tecken || "chars"} received</span>
            <button id="ar-stream-avbryt" style="padding:4px 12px;background:transparent;color:#f5f0e8;border:1px solid #444;border-radius:4px;cursor:pointer;font-size:11px;">${t.avbryt}</button>
        </div>
    `;
    document.body.appendChild(dialog);

    document.getElementById("ar-stream-avbryt").addEventListener("click", () => {
        annoteringIgnoreras = true;
        dialog.remove();
    });

    return {
        uppdatera(mottagna) {
            const procent = Math.min(95, (mottagna / ESTIMERAD_MAX) * 100);
            const bar = document.getElementById("ar-stream-bar");
            const chars = document.getElementById("ar-stream-chars");
            if (bar) bar.style.width = procent + "%";
            if (chars) chars.textContent = `${mottagna.toLocaleString()} ${t.tecken || "chars"} received`;
        },
        stäng() { document.getElementById("ar-stream-dialog")?.remove(); }
    };
}

function rensaAnnoteringar() {
    document.querySelectorAll(".ar-markering").forEach(span => {
        span.replaceWith(document.createTextNode(span.textContent));
    });
    document.getElementById("ar-heltext-knapp")?.remove();
    document.getElementById("ar-export-knapp")?.remove();
    alleAnnoteringar = [];
    aktivChattIgång = false;
    sammanfattning = "";
    kategorier = [];
    källText = "";
    chrome.storage.session.clear();
}

function visaOmAnnoteraDialog(bekräfta) {
    const dialog = document.createElement("div");
    dialog.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        z-index: 99999;
        display: flex; align-items: center; justify-content: center;
    `;
    dialog.innerHTML = `
        <div style="background:#1a1610;color:#f5f0e8;padding:24px;border-radius:10px;max-width:360px;width:90%;font-family:sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.6);">
            <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${t.redanAnnoterad}</div>
            <div style="font-size:13px;opacity:0.8;margin-bottom:20px;line-height:1.5;">${t.redanAnnoteradText}</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button id="ar-om-ja" style="padding:10px;background:#f0c040;color:#1a1610;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">${t.annoteraOm}</button>
                <button id="ar-om-nej" style="padding:10px;background:transparent;color:#f5f0e8;border:1px solid #444;border-radius:6px;cursor:pointer;font-size:13px;">${t.avbryt}</button>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);

    document.getElementById("ar-om-ja").addEventListener("click", () => {
        dialog.remove();
        bekräfta();
    });
    document.getElementById("ar-om-nej").addEventListener("click", () => {
        dialog.remove();
        overlay.remove();
    });
}

const källelement = document.getElementById("main-text") || document.body;
chrome.storage.local.get("lang", ({ lang = "en" }) => {
    t = AR_CONTENT[lang] || AR_CONTENT.en;
    if (document.querySelector(".ar-markering")) {
        visaOmAnnoteraDialog(() => {
            rensaAnnoteringar();
            startAnnotering(källelement.innerText);
        });
    } else {
        startAnnotering(källelement.innerText);
    }
});

})(); // IIFE slut
