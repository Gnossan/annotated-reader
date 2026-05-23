(function () {
    if (window.__arOrdAnalysKör) return;
    window.__arOrdAnalysKör = true;

    const WD_LOCALES = {
        en:      { laddning: "Identifying difficult words…", klar: (n) => `${n} words identified`, fel: "✗ Error", inga: "No difficult words found", kvotSlut: "⚠ Monthly limit reached" },
        "en-GB": { laddning: "Identifying difficult words…", klar: (n) => `${n} words identified`, fel: "✗ Error", inga: "No difficult words found", kvotSlut: "⚠ Monthly limit reached" },
        sv:      { laddning: "Identifierar svåra ord…", klar: (n) => `${n} ord identifierade`, fel: "✗ Fel", inga: "Inga svåra ord hittades", kvotSlut: "⚠ Månadsgränsen är nådd" },
        da:      { laddning: "Identificerer svære ord…", klar: (n) => `${n} ord identificeret`, fel: "✗ Fejl", inga: "Ingen svære ord fundet", kvotSlut: "⚠ Månedlig grænse nået" },
        no:      { laddning: "Identifiserer vanskelige ord…", klar: (n) => `${n} ord identifisert`, fel: "✗ Feil", inga: "Ingen vanskelige ord funnet", kvotSlut: "⚠ Månedlig grense nådd" },
        de:      { laddning: "Schwierige Wörter werden identifiziert…", klar: (n) => `${n} Wörter identifiziert`, fel: "✗ Fehler", inga: "Keine schwierigen Wörter gefunden", kvotSlut: "⚠ Monatliches Limit erreicht" },
        fr:      { laddning: "Identification des mots difficiles…", klar: (n) => `${n} mots identifiés`, fel: "✗ Erreur", inga: "Aucun mot difficile trouvé", kvotSlut: "⚠ Limite mensuel atteint" },
        es:      { laddning: "Identificando palabras difíciles…", klar: (n) => `${n} palabras identificadas`, fel: "✗ Error", inga: "No se encontraron palabras difíciles", kvotSlut: "⚠ Límite mensual alcanzado" },
        it:      { laddning: "Identificazione delle parole difficili…", klar: (n) => `${n} parole identificate`, fel: "✗ Errore", inga: "Nessuna parola difficile trovata", kvotSlut: "⚠ Limite mensile raggiunto" },
    };

    chrome.storage.local.get("lang", async ({ lang = "en" }) => {
        const wt = WD_LOCALES[lang] || WD_LOCALES.en;
        const level = window.__arOrdNiva || "intermediate";

        // Visa laddningsindikator
        const overlayEl = visaStatusOverlay(wt.laddning);

        const text = (document.getElementById("main-text") || document.body).innerText;

        const svar = await chrome.runtime.sendMessage({
            type: "ANALYZE_WORDS",
            text: text.slice(0, 15000),
            level
        });

        overlayEl.remove();

        if (svar?.error === "quota_exceeded") {
            visaTempStatus(wt.kvotSlut, 4000);
            return;
        }
        if (svar?.error || !svar?.words?.length) {
            visaTempStatus(svar?.words?.length === 0 ? wt.inga : wt.fel, 3000);
            return;
        }

        svar.words.forEach(({ word, definition }) => markeraOrd(word, definition));
        visaTempStatus(wt.klar(svar.words.length), 3000);
    });

    // --- Statusvisning ---
    function visaStatusOverlay(text) {
        const div = document.createElement("div");
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: #1a1610; color: #f5f0e8;
            padding: 10px 16px; border-radius: 6px;
            font-family: sans-serif; font-size: 13px;
            z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex; align-items: center; gap: 8px;
        `;
        div.innerHTML = `<span>${text}</span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:#f5f0e8;animation:ar-puls 1.4s infinite ease-in-out;"></span>`;
        document.documentElement.appendChild(div);
        return div;
    }

    function visaTempStatus(text, ms) {
        const div = document.createElement("div");
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: #1a1610; color: #f5f0e8;
            padding: 10px 16px; border-radius: 6px;
            font-family: sans-serif; font-size: 13px;
            z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
        div.textContent = text;
        document.documentElement.appendChild(div);
        setTimeout(() => div.remove(), ms);
    }

    // --- Ordmarkering ---
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function markeraOrd(word, definition) {
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
        const rot = document.getElementById("main-text") || document.body;

        const walker = document.createTreeWalker(rot, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const p = node.parentElement;
                if (!p) return NodeFilter.FILTER_REJECT;
                // Hoppa över redan markerade noder
                if (p.classList.contains("ar-markering") || p.classList.contains("ar-svart-ord")) return NodeFilter.FILTER_REJECT;
                // Hoppa över script/style
                const tag = p.tagName?.toLowerCase();
                if (tag === "script" || tag === "style") return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const noder = [];
        let nod;
        while ((nod = walker.nextNode())) {
            if (regex.test(nod.textContent)) noder.push(nod);
            regex.lastIndex = 0;
        }

        noder.forEach(nod => {
            regex.lastIndex = 0;
            const text = nod.textContent;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }
                const span = document.createElement("span");
                span.className = "ar-svart-ord";
                span.textContent = match[0];
                span.title = definition;
                span.style.cssText = `
                    background: rgba(180,180,180,0.3);
                    border-bottom: 1px dotted #888;
                    border-radius: 2px;
                    cursor: pointer;
                `;
                span.addEventListener("click", (e) => {
                    e.stopPropagation();
                    visaOrdPopup(e.clientX, e.clientY, match[0], definition);
                });
                fragment.appendChild(span);
                lastIndex = regex.lastIndex;
            }

            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            nod.parentNode.replaceChild(fragment, nod);
        });
    }

    // --- Ordbok-popup ---
    function visaOrdPopup(x, y, word, definition) {
        document.getElementById("ar-ord-popup")?.remove();

        const popup = document.createElement("div");
        popup.id = "ar-ord-popup";
        popup.style.cssText = `
            position: fixed;
            left: ${x + 12}px;
            top: ${y + 12}px;
            background: #1a1610;
            color: #f5f0e8;
            padding: 12px 14px;
            border-radius: 8px;
            font-family: sans-serif;
            font-size: 13px;
            max-width: 260px;
            z-index: 99999;
            box-shadow: 0 4px 16px rgba(0,0,0,0.5);
            line-height: 1.5;
            border: 1px solid #333;
        `;
        popup.innerHTML = `
            <div style="font-weight:600;margin-bottom:5px;">${word}</div>
            <div style="opacity:0.85;font-size:12px;">${definition}</div>
        `;
        document.body.appendChild(popup);

        // Justera om popupen hamnar utanför skärmen
        const rect = popup.getBoundingClientRect();
        if (rect.right  > window.innerWidth)  popup.style.left = `${x - rect.width - 12}px`;
        if (rect.bottom > window.innerHeight) popup.style.top  = `${y - rect.height - 12}px`;

        setTimeout(() => {
            document.addEventListener("click", () => popup.remove(), { once: true });
        }, 0);
    }
})();
