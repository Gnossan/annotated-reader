let sammanfattning = "";
let kategorier = [];
let aktivChattIgång = false;
let alleAnnoteringar = [];
let annoteringIgnoreras = false;
let annoteringTimeoutId = null;
const AR_TIMEOUT_MS = 15000;

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

    let md = "# Annotated Reader — Exporterad historik\n\n";
    md += `Exporterad: ${new Date().toLocaleString("sv-SE")}\n\n`;

    const hanterade = new Set();

    for (const ann of annoteringar) {
        const id = frasenTillId(ann.text);
        hanterade.add(id);
        const sess = chattar[id];

        md += `## ${ann.text}\n`;
        md += `**Kategori:** ${ann.kategori}  \n`;
        md += `**Beskrivning:** ${ann.beskrivning}\n\n`;

        if (sess?.historik?.length > 0) {
            for (const msg of sess.historik) {
                if (msg.silent) continue;
                const roll = msg.role === "user" ? "**Du**" : "**AI**";
                const text = typeof msg.content === "string" ? msg.content : msg.content[0]?.text || "";
                md += `${roll}: ${text}\n\n`;
            }
        } else {
            md += `*Ingen chatt*\n\n`;
        }
        md += "---\n\n";
    }

    for (const [id, sess] of Object.entries(chattar)) {
        if (hanterade.has(id) || !sess.historik?.length) continue;
        md += `## ${sess.fras}\n`;
        md += `**Kategori:** ${sess.kategori}  \n`;
        md += `**Beskrivning:** ${sess.beskrivning}\n\n`;
        for (const msg of sess.historik) {
            if (msg.silent) continue;
            const roll = msg.role === "user" ? "**Du**" : "**AI**";
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
            <div style="font-size:15px;font-weight:600;margin-bottom:8px;">Lämna sidan?</div>
            <div style="font-size:13px;opacity:0.8;margin-bottom:20px;line-height:1.5;">Du har aktiva chattar — vill du exportera historiken innan du lämnar?</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button id="ar-exp-exportera" style="padding:10px;background:#f0c040;color:#1a1610;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">Exportera och lämna</button>
                <button id="ar-exp-lämna" style="padding:10px;background:#333;color:#f5f0e8;border:none;border-radius:6px;cursor:pointer;font-size:13px;">Lämna ändå</button>
                <button id="ar-exp-avbryt" style="padding:10px;background:transparent;color:#f5f0e8;border:1px solid #444;border-radius:6px;cursor:pointer;font-size:13px;">Avbryt</button>
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
        <div style="padding:8px 12px;font-size:11px;opacity:0.5;border-bottom:1px solid #333;text-transform:uppercase;letter-spacing:0.06em;">Annotera som...</div>
        ${kategorier.map(k => `
            <div class="ar-meny-val" data-namn="${k.namn}" data-farg="${k.farg}" data-beskrivning="${k.beskrivning}"
                 style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;">
                <div style="width:10px;height:10px;border-radius:2px;background:${k.farg};flex-shrink:0;"></div>
                <span>${k.namn}</span>
            </div>
        `).join("")}
        <div id="ar-anpassad-val" style="padding:9px 12px;cursor:pointer;display:flex;align-items:center;gap:10px;border-top:1px solid #333;opacity:0.7;">
            <div style="width:10px;height:10px;border-radius:2px;border:1px dashed #888;flex-shrink:0;"></div>
            <span>Anpassad kategori...</span>
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
            <div style="padding:10px 12px;font-size:11px;opacity:0.5;border-bottom:1px solid #333;text-transform:uppercase;letter-spacing:0.06em;">Anpassad kategori</div>
            <div style="padding:10px 12px;display:flex;flex-direction:column;gap:8px;">
                <input id="ar-kust-namn" type="text" placeholder="Kategorinamn" style="
                    background:#2a2218;border:1px solid #444;border-radius:4px;
                    color:#f5f0e8;padding:6px 8px;font-size:12px;outline:none;width:100%;
                ">
                <div style="display:flex;align-items:center;gap:8px;">
                    <input id="ar-kust-farg" type="color" value="#a0c4ff" style="
                        width:32px;height:28px;border:1px solid #444;border-radius:4px;
                        background:none;cursor:pointer;padding:2px;
                    ">
                    <span style="font-size:11px;opacity:0.6;">Välj färg</span>
                </div>
                <button id="ar-kust-ok" style="
                    padding:7px;background:#f0c040;color:#1a1610;border:none;
                    border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;
                ">Annotera</button>
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

function visaExportKnapp() {
    const gammal = document.getElementById("ar-export-knapp");
    if (gammal) return;

    const knapp = document.createElement("button");
    knapp.id = "ar-export-knapp";
    knapp.textContent = "↓ Exportera chatt";
    knapp.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1a1610;
        color: #f5f0e8;
        border: 1px solid #444;
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
    knapp.addEventListener("click", async () => {
        knapp.textContent = "⏳ Exporterar...";
        await exporteraHistorik();
        knapp.textContent = "✓ Exporterad";
        setTimeout(() => { knapp.textContent = "↓ Exportera chatt"; }, 2000);
    });
    document.body.appendChild(knapp);
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
        <button id="ar-utforska" style="width:100%;padding:7px;background:#f0c040;color:#1a1610;border:none;border-radius:4px;cursor:pointer;font-weight:600;font-size:12px;">Utforska med AI →</button>
    `;

    document.body.appendChild(popup);

    setTimeout(() => {
        document.addEventListener("click", () => {
            popup.remove();
        }, { once: true });
    }, 0);

    document.getElementById("ar-utforska").addEventListener("click", (e) => {
        e.stopPropagation();
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
        span.style.backgroundColor = kategorifarger[kategori] || "#ccc";
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
        <span>Analyserar</span>
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
            <div style="font-size:15px;font-weight:600;margin-bottom:8px;">Analysen tar tid</div>
            <div style="font-size:13px;opacity:0.8;margin-bottom:20px;line-height:1.5;">
                Texten verkar vara lång (${originalText.length.toLocaleString("sv-SE")} tecken). Vad vill du göra?
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
                <button id="ar-to-vänta" style="padding:10px;background:#2a2218;color:#f5f0e8;border:1px solid #444;border-radius:6px;cursor:pointer;font-size:13px;">Fortsätt vänta</button>
                <button id="ar-to-trunkera" style="padding:10px;background:#f0c040;color:#1a1610;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">Trunkera (~${Math.round(trunkLängd / 1000)}k tecken) och försök igen</button>
                <button id="ar-to-avbryt" style="padding:10px;background:transparent;color:#f5f0e8;border:1px solid #444;border-radius:6px;cursor:pointer;font-size:13px;">Avbryt</button>
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
        overlay.textContent = "✗ Avbruten";
        setTimeout(() => overlay.remove(), 2000);
    });
}

function startAnnotering(text) {
    annoteringIgnoreras = false;
    clearTimeout(annoteringTimeoutId);

    let sekunder = 0;
    visaOverlayAnalyserar(0);

    const räknare = setInterval(() => {
        sekunder++;
        visaOverlayAnalyserar(sekunder);
    }, 1000);

    annoteringTimeoutId = setTimeout(() => visaTimeoutDialog(text), AR_TIMEOUT_MS);

    chrome.runtime.sendMessage(
        { type: "ANNOTATE", text },
        (response) => {
            clearInterval(räknare);
            clearTimeout(annoteringTimeoutId);
            if (annoteringIgnoreras) return;

            if (!response?.result?.content?.[0]?.text) {
                console.log("Inget svar att rita");
                overlay.textContent = "✗ Fel";
                setTimeout(() => overlay.remove(), 2000);
                return;
            }

            let data;
            try {
                const ren = response.result.content[0].text
                    .replace(/```json/g, "")
                    .replace(/```/g, "")
                    .trim();
                data = JSON.parse(ren);
            } catch (e) {
                console.log("Kunde inte parsa JSON:", e);
                return;
            }

            const kategorifarger = {};
            data.kategorier.forEach((k) => {
                kategorifarger[k.namn] = k.farg;
            });

            sammanfattning = data.sammanfattning || "";
            kategorier = data.kategorier || [];

            data.annoteringar
                .sort((a, b) => b.text.length - a.text.length)
                .forEach((a) => {
                    alleAnnoteringar.push({ text: a.text, kategori: a.kategori, beskrivning: a.beskrivning, farg: kategorifarger[a.kategori] || "#ccc" });
                    markeraFras(a.text, a.kategori, a.beskrivning, kategorifarger);
                });
            chrome.storage.session.set({ ar_annoteringar: alleAnnoteringar });

            overlay.textContent = "✓ Klar";
            setTimeout(() => overlay.remove(), 2000);
        }
    );
}

const källelement = document.getElementById("main-text") || document.body;
startAnnotering(källelement.innerText);
