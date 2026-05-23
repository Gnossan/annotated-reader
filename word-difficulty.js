(function () {
    if (window.__arOrdAnalysKör) return;
    window.__arOrdAnalysKör = true;

    const WD_LOCALES = {
        en:      { laddning: "Analysing vocabulary", klar: (n) => `✓ ${n} words identified`, fel: "✗ Error", inga: "No difficult words found", kvotSlut: "⚠ Monthly limit reached", avbryt: "Cancel", tecken: "chars" },
        "en-GB": { laddning: "Analysing vocabulary", klar: (n) => `✓ ${n} words identified`, fel: "✗ Error", inga: "No difficult words found", kvotSlut: "⚠ Monthly limit reached", avbryt: "Cancel", tecken: "chars" },
        sv:      { laddning: "Analyserar ordförråd", klar: (n) => `✓ ${n} ord identifierade`, fel: "✗ Fel", inga: "Inga svåra ord hittades", kvotSlut: "⚠ Månadsgränsen är nådd", avbryt: "Avbryt", tecken: "tecken" },
        da:      { laddning: "Analyserer ordforråd", klar: (n) => `✓ ${n} ord identificeret`, fel: "✗ Fejl", inga: "Ingen svære ord fundet", kvotSlut: "⚠ Månedlig grænse nået", avbryt: "Annullér", tecken: "tegn" },
        no:      { laddning: "Analyserer ordforråd", klar: (n) => `✓ ${n} ord identifisert`, fel: "✗ Feil", inga: "Ingen vanskelige ord funnet", kvotSlut: "⚠ Månedlig grense nådd", avbryt: "Avbryt", tecken: "tegn" },
        de:      { laddning: "Wortschatz wird analysiert", klar: (n) => `✓ ${n} Wörter identifiziert`, fel: "✗ Fehler", inga: "Keine schwierigen Wörter gefunden", kvotSlut: "⚠ Monatliches Limit erreicht", avbryt: "Abbrechen", tecken: "Zeichen" },
        fr:      { laddning: "Analyse du vocabulaire", klar: (n) => `✓ ${n} mots identifiés`, fel: "✗ Erreur", inga: "Aucun mot difficile trouvé", kvotSlut: "⚠ Limite mensuel atteint", avbryt: "Annuler", tecken: "car." },
        es:      { laddning: "Analizando vocabulario", klar: (n) => `✓ ${n} palabras identificadas`, fel: "✗ Error", inga: "No se encontraron palabras difíciles", kvotSlut: "⚠ Límite mensual alcanzado", avbryt: "Cancelar", tecken: "car." },
        it:      { laddning: "Analisi del vocabolario", klar: (n) => `✓ ${n} parole identificate`, fel: "✗ Errore", inga: "Nessuna parola difficile trovata", kvotSlut: "⚠ Limite mensile raggiunto", avbryt: "Annulla", tecken: "car." },
    };

    const ESTIMERAD_MAX = 2500; // ~30 ord × ~80 tecken per definition i JSON

    chrome.storage.local.get(["lang", "arOrdNiva"], async ({ lang = "en", arOrdNiva = "intermediate" }) => {
        const wt = WD_LOCALES[lang] || WD_LOCALES.en;
        const level = arOrdNiva;

        let accumulated = "";
        let streamFel = null;
        let avbrytPort = null;

        const dialog = visaStreamDialog(wt, () => {
            if (avbrytPort) avbrytPort.disconnect();
        });

        await new Promise((resolve) => {
            const port = chrome.runtime.connect({ name: "word-difficulty-stream" });
            avbrytPort = port;

            const text = (document.getElementById("main-text") || document.body).innerText;
            port.postMessage({ text: text.slice(0, 15000), level, lang });

            port.onMessage.addListener((msg) => {
                if (msg.chunk) {
                    accumulated += msg.chunk;
                    dialog.uppdatera(accumulated.length);
                }
                if (msg.error) {
                    streamFel = msg.error;
                    port.disconnect();
                    resolve();
                    return;
                }
                if (msg.done) {
                    port.disconnect();
                    resolve();
                }
            });

            port.onDisconnect.addListener(() => resolve());
        });

        dialog.stäng();
        avbrytPort = null;

        if (streamFel === "quota_exceeded") {
            visaTempStatus(wt.kvotSlut, 4000);
            return;
        }
        if (streamFel || accumulated.length === 0) {
            visaTempStatus(wt.fel, 3000);
            return;
        }

        // Parsa JSON
        let words;
        try {
            const ren = accumulated.replace(/```json/g, "").replace(/```/g, "").trim();
            words = JSON.parse(ren);
        } catch (e) {
            console.error("[AIuda ord] JSON-parsning misslyckades:", e.message);
            visaTempStatus(wt.fel, 3000);
            return;
        }

        if (!words.length) {
            visaTempStatus(wt.inga, 3000);
            return;
        }

        words.forEach(({ word, definition }) => markeraOrd(word, definition));
        visaTempStatus(wt.klar(words.length), 3000);
    });

    // --- Stream-dialog med progressbar ---
    function visaStreamDialog(wt, onAvbryt) {
        const dialog = document.createElement("div");
        dialog.id = "ar-ord-stream-dialog";
        dialog.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: #1a1610; color: #f5f0e8;
            padding: 16px 20px; border-radius: 10px;
            min-width: 280px; max-width: 380px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            z-index: 99998; font-family: sans-serif;
            border: 1px solid #333;
        `;
        dialog.innerHTML = `
            <div style="font-size:12px;opacity:0.7;margin-bottom:10px;">${wt.laddning}</div>
            <div style="background:#2a2218;border-radius:4px;height:6px;overflow:hidden;margin-bottom:8px;">
                <div id="ar-ord-bar" style="height:100%;width:0%;background:#aaaaaa;transition:width 0.3s;border-radius:4px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span id="ar-ord-chars" style="font-size:11px;opacity:0.5;">0 ${wt.tecken}</span>
                <button id="ar-ord-avbryt" style="padding:4px 12px;background:transparent;color:#f5f0e8;border:1px solid #444;border-radius:4px;cursor:pointer;font-size:11px;">${wt.avbryt}</button>
            </div>
        `;
        document.body.appendChild(dialog);

        document.getElementById("ar-ord-avbryt").addEventListener("click", () => {
            dialog.remove();
            if (onAvbryt) onAvbryt();
        });

        return {
            uppdatera(mottagna) {
                const procent = Math.min(95, (mottagna / ESTIMERAD_MAX) * 100);
                const bar = document.getElementById("ar-ord-bar");
                const chars = document.getElementById("ar-ord-chars");
                if (bar) bar.style.width = procent + "%";
                if (chars) chars.textContent = `${mottagna} ${wt.tecken}`;
            },
            stäng() { document.getElementById("ar-ord-stream-dialog")?.remove(); }
        };
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
                if (p.classList.contains("ar-markering") || p.classList.contains("ar-svart-ord")) return NodeFilter.FILTER_REJECT;
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

        const rect = popup.getBoundingClientRect();
        if (rect.right  > window.innerWidth)  popup.style.left = `${x - rect.width - 12}px`;
        if (rect.bottom > window.innerHeight) popup.style.top  = `${y - rect.height - 12}px`;

        setTimeout(() => {
            document.addEventListener("click", () => popup.remove(), { once: true });
        }, 0);
    }
    // --- Manuell ordsökning vid textmarkering ---
    let lookupKnapp = null;

    document.addEventListener("mouseup", (e) => {
        // Ta bort gammal knapp
        lookupKnapp?.remove();
        lookupKnapp = null;

        const urval = window.getSelection();
        if (!urval || urval.isCollapsed) return;
        const text = urval.toString().trim();
        if (!text || text.length > 60 || text.includes("\n")) return;

        const range = urval.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const knapp = document.createElement("button");
        knapp.textContent = "?";
        knapp.style.cssText = `
            position: fixed;
            left: ${Math.min(rect.right + 6, window.innerWidth - 40)}px;
            top: ${rect.top - 4}px;
            background: #1a1610;
            color: #f0c040;
            border: 1px solid #f0c040;
            border-radius: 50%;
            width: 22px;
            height: 22px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            z-index: 99999;
            padding: 0;
            line-height: 1;
            font-family: sans-serif;
        `;
        document.body.appendChild(knapp);
        lookupKnapp = knapp;

        knapp.addEventListener("mousedown", async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            knapp.remove();
            lookupKnapp = null;

            const x = rect.right + 6;
            const y = rect.bottom + 6;

            // Visa laddnings-popup
            document.getElementById("ar-ord-popup")?.remove();
            const laddPopup = document.createElement("div");
            laddPopup.id = "ar-ord-popup";
            laddPopup.style.cssText = `
                position: fixed; left: ${x}px; top: ${y}px;
                background: #1a1610; color: #f5f0e8;
                padding: 10px 14px; border-radius: 8px;
                font-family: sans-serif; font-size: 13px;
                z-index: 99999; box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                border: 1px solid #333; opacity: 0.8;
            `;
            laddPopup.textContent = "…";
            document.body.appendChild(laddPopup);

            const svar = await chrome.runtime.sendMessage({ type: "LOOKUP_WORD", word: text });
            laddPopup.remove();

            if (svar?.definition) {
                visaOrdPopup(x - 12, y - 12, text, svar.definition);
            }
        });
    });

    // Ta bort knappen om man klickar någon annanstans
    document.addEventListener("mousedown", () => {
        lookupKnapp?.remove();
        lookupKnapp = null;
    });
})();
