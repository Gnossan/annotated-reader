let historik = [];
let systemprompt = "";
let nuvarandeMarkeringId = null;
let nuvarandeMeta = {};

chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== "OPEN_PANEL") return;

    document.getElementById("sp-kategori").textContent = message.kategori.replace("_", " ");
    document.getElementById("sp-fras").textContent = message.fras;
    document.getElementById("sp-beskrivning").textContent = message.beskrivning;
    document.getElementById("sp-sammanfattning").textContent = message.sammanfattning || "";

    nuvarandeMarkeringId = message.markeringId;
    nuvarandeMeta = {
        fras: message.fras,
        kategori: message.kategori,
        beskrivning: message.beskrivning,
        sammanfattning: message.sammanfattning || ""
    };

    systemprompt = `Du är en hjälpsam guide för text som användaren läser.
Texten handlar om: ${message.sammanfattning}
Användaren har markerat frasen "${message.fras}" i kategorin "${message.kategori}".
Beskrivning: ${message.beskrivning}
Hjälp användaren utforska och förstå denna fras i sitt sammanhang.`;

    const meddelandenEl = document.getElementById("meddelanden");
    meddelandenEl.innerHTML = "";
    visaLegende(message.kategorier || []);

    (async () => {
        if (!nuvarandeMarkeringId) { historik = []; return; }
        const sparad = await chrome.storage.session.get(nuvarandeMarkeringId);
        const sparadData = sparad[nuvarandeMarkeringId];
        if (sparadData?.historik?.length > 0) {
            historik = sparadData.historik;
            historik.forEach(msg => {
                if (msg.silent) return;
                const text = typeof msg.content === "string" ? msg.content : msg.content[0]?.text || "";
                laggTillBubbla(msg.role, text, false);
            });
            meddelandenEl.scrollTop = meddelandenEl.scrollHeight;
        } else {
            historik = [];
            await startaKonversation();
        }
    })();
});

async function sparaHistorik() {
    if (!nuvarandeMarkeringId) return;
    await chrome.storage.session.set({
        [nuvarandeMarkeringId]: { ...nuvarandeMeta, historik }
    });
}

document.getElementById("skicka").addEventListener("click", skicka);
document.getElementById("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        skicka();
    }
});

document.getElementById("korsreferera").addEventListener("click", async () => {
    const gammal = document.getElementById("ar-korsref-panel");
    if (gammal) { gammal.remove(); return; }

    const allt = await chrome.storage.session.get(null);
    const andra = Object.entries(allt).filter(
        ([k, v]) => k.startsWith("ar_chat_") && k !== nuvarandeMarkeringId && v.historik?.length > 0
    );

    const panel = document.createElement("div");
    panel.id = "ar-korsref-panel";
    panel.style.cssText = `
        border-top: 1px solid #333;
        background: #1a1610;
        padding: 8px 12px;
        font-size: 12px;
    `;

    if (andra.length === 0) {
        panel.innerHTML = `<div style="opacity:0.6;font-size:12px;padding:4px 0;">Inga andra markeringar med historik.</div>`;
        document.getElementById("input-area").insertAdjacentElement("beforebegin", panel);
        setTimeout(() => panel.remove(), 2000);
        return;
    }

    panel.innerHTML = `<div style="opacity:0.6;margin-bottom:6px;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">Välj markering att korsreferera</div>` +
        andra.map(([k, v]) => `
            <div class="ar-korsref-item" data-key="${k}" style="padding:6px 8px;border-radius:4px;cursor:pointer;margin-bottom:4px;border:1px solid #333;">
                <span style="font-weight:600;">${v.fras}</span>
                <span style="opacity:0.6;"> — ${v.historik.length} meddelanden</span>
            </div>
        `).join("");
    document.getElementById("input-area").insertAdjacentElement("beforebegin", panel);

    panel.querySelectorAll(".ar-korsref-item").forEach(item => {
        item.addEventListener("mouseenter", () => item.style.background = "#2a2218");
        item.addEventListener("mouseleave", () => item.style.background = "");
        item.addEventListener("click", async () => {
            const key = item.dataset.key;
            const sparad = await chrome.storage.session.get(key);
            panel.remove();
            infogeraKorsreferens(sparad[key]);
        });
    });
});

document.getElementById("exportera").addEventListener("click", async () => {
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
        const id = "ar_chat_" + ann.text.trim().toLowerCase().replace(/[^a-z0-9åäö]/g, "_").replace(/_+/g, "_").slice(0, 60);
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
});

async function startaKonversation() {
    historik.push({ role: "user", content: "Förklara detta i sitt sammanhang.", silent: true });
    await sparaHistorik();

    const tänker = visaTänker();
    const svar = await chrome.runtime.sendMessage({ type: "CHAT", systemprompt, historik });
    tänker.remove();

    const assistantText = svar?.result?.content?.[0]?.text || "Något gick fel.";
    laggTillBubbla("assistant", assistantText);
    historik.push({ role: "assistant", content: assistantText });
    await sparaHistorik();
}

function visaTänker() {
    const div = document.createElement("div");
    div.className = "ar-tänker";
    div.innerHTML = "<span></span><span></span><span></span>";
    const container = document.getElementById("meddelanden");
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
}

async function infogeraKorsreferens(annan) {
    const utdrag = annan.historik.slice(-4).map(msg => {
        const roll = msg.role === "user" ? "Du" : "AI";
        const text = typeof msg.content === "string" ? msg.content : msg.content[0]?.text || "";
        return `${roll}: ${text}`;
    }).join("\n");

    const korsrefText = `[Korsreferens till "${annan.fras}"]\n${utdrag}\n\nHur relaterar detta till vår diskussion om "${nuvarandeMeta.fras}"?`;

    laggTillBubbla("user", korsrefText);
    historik.push({ role: "user", content: korsrefText });
    await sparaHistorik();

    const tänker = visaTänker();
    const svar = await chrome.runtime.sendMessage({ type: "CHAT", systemprompt, historik });
    tänker.remove();

    const assistantText = svar?.result?.content?.[0]?.text || "Något gick fel.";
    laggTillBubbla("assistant", assistantText);
    historik.push({ role: "assistant", content: assistantText });
    await sparaHistorik();
}

async function skicka() {
    const input = document.getElementById("input");
    const text = input.value.trim();
    if (!text) return;

    laggTillBubbla("user", text);
    historik.push({ role: "user", content: text });
    input.value = "";
    await sparaHistorik();

    const tänker = visaTänker();
    const svar = await chrome.runtime.sendMessage({ type: "CHAT", systemprompt, historik });
    tänker.remove();

    const assistantText = svar?.result?.content?.[0]?.text || "Något gick fel.";
    laggTillBubbla("assistant", assistantText);
    historik.push({ role: "assistant", content: assistantText });
    await sparaHistorik();
}

function laggTillBubbla(roll, text, skrolla = true) {
    const div = document.createElement("div");
    div.className = `bubbla ${roll}`;
    div.textContent = text;
    const container = document.getElementById("meddelanden");
    container.appendChild(div);
    if (skrolla) container.scrollTop = container.scrollHeight;
}

function visaLegende(kategorier) {
    if (kategorier.length === 0) return;
    const container = document.getElementById("meddelanden");
    const legende = document.createElement("div");
    legende.style.cssText = `
        padding: 8px 0;
        border-bottom: 1px solid #333;
        margin-bottom: 8px;
    `;
    legende.innerHTML = kategorier.map(k => `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="width:12px;height:12px;border-radius:3px;background:${k.farg};flex-shrink:0;"></div>
            <div>
                <span style="font-weight:600;font-size:12px;">${k.namn}</span>
                <span style="opacity:0.6;font-size:11px;"> — ${k.beskrivning}</span>
            </div>
        </div>
    `).join("");
    container.appendChild(legende);
}
