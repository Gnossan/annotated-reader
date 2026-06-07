const status = document.getElementById("status");
let popupT = AR_LOCALES.en; // uppdateras när lang laddas

// --- Consent ---
function visaConsentOmBehövs(token, t) {
    chrome.storage.local.get("consent", ({ consent }) => {
        if (!consent) {
            document.getElementById("huvud-innehall").style.display = "none";
            document.getElementById("consent-dialog").style.display = "block";
            document.getElementById("consent-text").textContent = t.consentText;
            document.getElementById("consent-lank").textContent = t.consentLank;
            document.getElementById("consent-knapp").textContent = t.consentKnapp;
        } else {
            document.getElementById("huvud-innehall").style.display = "block";
        }
    });
}

document.getElementById("consent-knapp").addEventListener("click", () => {
    chrome.storage.local.get(["arToken", "lang"], async ({ arToken, lang = "en" }) => {
        // Spara centralt i Firestore
        if (arToken) {
            await fetch("https://annotated-reader-backend.vercel.app/api/consent", {
                method: "POST",
                headers: { "Authorization": `Bearer ${arToken}` }
            }).catch(() => {});
        }
        // Spara lokalt
        chrome.storage.local.set({ consent: true }, () => {
            document.getElementById("consent-dialog").style.display = "none";
            document.getElementById("huvud-innehall").style.display = "block";
        });
    });
});

// --- Versionskoll ---
async function kollaVersion() {
    try {
        const nuvarande = chrome.runtime.getManifest().version;
        const resp = await fetch("https://api.github.com/repos/Gnossan/annotated-reader/releases/latest");
        if (!resp.ok) return;
        const data = await resp.json();
        const senaste = data.tag_name?.replace(/[^0-9.]/g, "");
        if (senaste && senaste !== nuvarande) {
            document.getElementById("ny-version-text").textContent =
                `Version ${senaste} finns tillgänglig.`;
            document.getElementById("ny-version-lank").textContent = "Ladda ner →";
            document.getElementById("ny-version-lank").href = data.html_url;
            document.getElementById("ny-version").style.display = "block";
        }
    } catch (e) {}
}
kollaVersion();

// --- Auth ---
chrome.storage.local.get(["arUser", "arToken", "modell", "temperature", "lang", "annotationHotkey"], (result) => {
    const lang  = result.lang  || "en";
    const modell = result.modell || "claude-opus-4-8";
    const temp  = result.temperature ?? 1.0;

    popupT = AR_LOCALES[lang] || AR_LOCALES.en;

    document.getElementById("sprak-val").value  = lang;
    document.getElementById("modell-val").value = modell;
    document.getElementById("temp-slider").value = temp;
    document.getElementById("temp-värde").textContent = parseFloat(temp).toFixed(1);
    document.getElementById("genväg-länk")?.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    });

    tillampaSprak(popupT);
    visaAuthState(result.arUser || null);
    if (result.arToken) {
        hämtaKvot(result.arToken);
        visaConsentOmBehövs(result.arToken, popupT);
    } else {
        document.getElementById("huvud-innehall").style.display = "block";
    }
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "AUTH_COMPLETE") {
        chrome.storage.local.get(["arUser", "arToken", "lang"], ({ arUser, arToken, lang = "en" }) => {
            const t = AR_LOCALES[lang] || AR_LOCALES.en;
            visaAuthState(arUser || null);
            if (arToken) {
                hämtaKvot(arToken);
                visaConsentOmBehövs(arToken, t);
            }
        });
    }
});

async function hämtaKvot(token) {
    try {
        const resp = await fetch("https://annotated-reader-backend.vercel.app/api/status", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const data = await resp.json();
        visaKvot(data);
    } catch (e) {}
}

function visaKvot(data) {
    const kvotInfo = document.getElementById("kvot-info");
    const saldo = data.tokenSaldo ?? 0;
    const tomt = saldo <= 0;

    document.getElementById("kvot-text").textContent =
        (popupT.tokenSaldo || "{n} tokens left").replace("{n}", saldo.toLocaleString());
    document.getElementById("kvot-bar").style.width = tomt ? "0%" : "100%";
    document.getElementById("kvot-bar").style.background = tomt ? "#e55" : "#f0c040";

    const gammalVarning = document.getElementById("kvot-varning");
    if (gammalVarning) gammalVarning.remove();
    if (tomt) {
        const varning = document.createElement("div");
        varning.id = "kvot-varning";
        varning.style.cssText = "margin-top:6px;font-size:11px;color:#c00;font-weight:600;";
        varning.textContent = popupT.saldoSlut || "⚠ Your token balance is empty — buy more to continue.";
        document.getElementById("kvot-info").appendChild(varning);
    }
    kvotInfo.style.display = "block";

    visaKöpTokens();
}

async function köpProdukt(produkt) {
    const { arToken } = await new Promise(r => chrome.storage.local.get("arToken", r));
    if (!arToken) return;
    try {
        const resp = await fetch("https://annotated-reader-backend.vercel.app/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${arToken}` },
            body: JSON.stringify({ produkt })
        });
        const data = await resp.json();
        if (data.url) chrome.tabs.create({ url: data.url });
    } catch (e) {}
}

function visaKöpTokens() {
    const panel = document.getElementById("köp-tokens");
    const btn = document.getElementById("köp-tokens-btn");
    panel.style.display = "block";
    btn.textContent = popupT.köpTokens || "Buy 1M tokens — 99 kr";
    btn.onclick = () => köpProdukt("reader_tokens_1m");
}

function visaAuthState(user) {
    const signInBtn   = document.getElementById("sign-in-btn");
    const inloggad    = document.getElementById("inloggad-info");
    const annotateBtn = document.getElementById("annotate-btn");

    if (user) {
        signInBtn.style.display   = "none";
        inloggad.style.display    = "block";
        annotateBtn.style.display = "block";
        document.getElementById("user-name").textContent = user.name || user.email;
        if (user.photo) document.getElementById("user-photo").src = user.photo;
    } else {
        signInBtn.style.display   = "flex";
        inloggad.style.display    = "none";
        annotateBtn.style.display = "none";
    }
}

document.getElementById("sign-in-btn").addEventListener("click", () => {
    const extId = chrome.runtime.id;
    chrome.windows.create({
        url: `https://annotated-reader-backend.vercel.app/auth.html?ext_id=${extId}`,
        type: "popup",
        width: 420,
        height: 480,
        focused: true
    });
    window.close();
});

document.getElementById("sign-out-btn").addEventListener("click", () => {
    chrome.storage.local.remove(["arUser", "arToken"]);
    visaAuthState(null);
});

const MODELLER = {
    "claude-opus-4-8":           { fixedTemp: true },
    "claude-sonnet-4-6":         { fixedTemp: false },
    "claude-haiku-4-5-20251001": { fixedTemp: false }
};

function tillampaSprak(t) {
    popupT = t;
    document.getElementById("annotate-btn").textContent   = t.annoteraSidan;
    document.getElementById("avancerat-btn").textContent  = t.avancerat;
    document.getElementById("sprak-label").textContent    = t.sprakLabel;
    document.getElementById("modell-label").textContent   = t.modellLabel;
    document.getElementById("temp-label").textContent     = t.temperatureLabel;
    document.getElementById("spara-avancerat").textContent = t.spara;

    const modellVal = document.getElementById("modell-val");
    modellVal.options[0].textContent = t.opus;
    modellVal.options[1].textContent = t.sonnet;
    modellVal.options[2].textContent = t.haiku;

    uppdateraTempUI(modellVal.value, t);
}


// --- Annotera ---
document.getElementById("annotate-btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["kryptering.js", "content.js"]
        });
        window.close();
    });
});

// --- Avancerat-panel ---
document.getElementById("avancerat-btn").addEventListener("click", () => {
    const panel = document.getElementById("avancerat-panel");
    panel.style.display = panel.style.display === "none" ? "block" : "none";
});

// --- Språkbyte ---
document.getElementById("sprak-val").addEventListener("change", (e) => {
    tillampaSprak(AR_LOCALES[e.target.value] || AR_LOCALES.en);
});

// --- Modellbyte ---
document.getElementById("modell-val").addEventListener("change", (e) => {
    const t = AR_LOCALES[document.getElementById("sprak-val").value] || AR_LOCALES.en;
    uppdateraTempUI(e.target.value, t);
});

// --- Temperature slider ---
document.getElementById("temp-slider").addEventListener("input", (e) => {
    document.getElementById("temp-värde").textContent = parseFloat(e.target.value).toFixed(1);
});

// --- Spara avancerat ---
document.getElementById("spara-avancerat").addEventListener("click", () => {
    const lang     = document.getElementById("sprak-val").value;
    const modell   = document.getElementById("modell-val").value;
    const temp     = parseFloat(document.getElementById("temp-slider").value);
    const t = AR_LOCALES[lang] || AR_LOCALES.en;

    chrome.storage.local.set({ lang, modell, temperature: temp }, () => {
        status.textContent = t.installningarSparade;
        setTimeout(() => { status.textContent = ""; }, 2000);
    });
});

// ── Kryptering ─────────────────────────────────────────────────────────────

async function uppdateraKrypteringsStatus() {
    const { arKrypteringsNyckel } = await chrome.storage.session.get("arKrypteringsNyckel");
    const statusEl = document.getElementById("kryptering-status");
    const knappEl  = document.getElementById("kryptering-knapp");
    if (arKrypteringsNyckel) {
        statusEl.textContent = "🔒 Encryption active";
        statusEl.style.color = "#2a7a2a";
        knappEl.textContent = "🔑 Change password…";
    } else {
        statusEl.textContent = "🔓 Not set up";
        statusEl.style.color = "#888";
        knappEl.textContent = "🔑 Set up encryption…";
    }
}

document.getElementById("kryptering-knapp").addEventListener("click", async () => {
    const { arToken, arUser } = await new Promise(r => chrome.storage.local.get(["arToken", "arUser"], r));
    if (!arToken) return;

    const fjärr = await window.AR_KRYPTERING.hämtaKrypteringsnyckelFrånBackend(arToken);
    const { arKrypteringsNyckel } = await chrome.storage.session.get("arKrypteringsNyckel");

    if (fjärr?.wrappedKey && !arKrypteringsNyckel) {
        // Nyckel finns i Firebase men inte upplåst — visa upplåsningsdialog
        visaUppLåsningsDialog(fjärr, arToken);
    } else {
        // Skapa nytt lösenord
        visaNyLösenordDialog(arToken);
    }
});

function visaUppLåsningsDialog(nyckelData, token) {
    const ov = skapaOverlay(`
        <div style="font-weight:600;margin-bottom:10px;color:#f0c040;">🔑 Unlock encryption</div>
        <p style="font-size:11px;opacity:0.8;margin-bottom:10px;">Enter your AIuda Suite password.</p>
        <input id="kryp-lösenord" type="password" placeholder="Password" style="width:100%;padding:7px;background:#2a2218;border:1px solid #555;border-radius:4px;color:#f5f0e8;font-size:12px;margin-bottom:6px;box-sizing:border-box;">
        <div id="kryp-fel" style="color:#ff6b6b;font-size:11px;margin-bottom:6px;display:none;">Wrong password</div>
        <div style="display:flex;gap:6px;">
            <button id="kryp-ok" style="flex:1;padding:7px;background:#f0c040;color:#1a1610;border:none;border-radius:4px;cursor:pointer;font-weight:600;">Unlock</button>
            <button id="kryp-avbryt" style="flex:1;padding:7px;background:transparent;color:#f5f0e8;border:1px solid #555;border-radius:4px;cursor:pointer;">Cancel</button>
        </div>
    `);
    ov.querySelector("#kryp-avbryt").addEventListener("click", () => ov.remove());
    ov.querySelector("#kryp-ok").addEventListener("click", async () => {
        const lösenord = ov.querySelector("#kryp-lösenord").value;
        if (!lösenord) return;
        try {
            await window.AR_KRYPTERING.importeraNyckelMedLösenord(lösenord, nyckelData);
            ov.remove();
            uppdateraKrypteringsStatus();
        } catch {
            ov.querySelector("#kryp-fel").style.display = "block";
        }
    });
    ov.querySelector("#kryp-lösenord").addEventListener("keydown", e => { if (e.key === "Enter") ov.querySelector("#kryp-ok").click(); });
    setTimeout(() => ov.querySelector("#kryp-lösenord").focus(), 50);
}

function visaNyLösenordDialog(token) {
    const ov = skapaOverlay(`
        <div style="font-weight:600;margin-bottom:10px;color:#f0c040;">🔑 Set up encryption</div>
        <p style="font-size:11px;opacity:0.8;margin-bottom:10px;">Choose a password to protect your annotations. Use the same password in all AIuda apps.</p>
        <input id="kryp-lösenord1" type="password" placeholder="Password (min. 8 chars)" style="width:100%;padding:7px;background:#2a2218;border:1px solid #555;border-radius:4px;color:#f5f0e8;font-size:12px;margin-bottom:6px;box-sizing:border-box;">
        <input id="kryp-lösenord2" type="password" placeholder="Confirm password" style="width:100%;padding:7px;background:#2a2218;border:1px solid #555;border-radius:4px;color:#f5f0e8;font-size:12px;margin-bottom:6px;box-sizing:border-box;">
        <div id="kryp-fel" style="color:#ff6b6b;font-size:11px;margin-bottom:6px;display:none;"></div>
        <div style="display:flex;gap:6px;">
            <button id="kryp-ok" style="flex:1;padding:7px;background:#f0c040;color:#1a1610;border:none;border-radius:4px;cursor:pointer;font-weight:600;">Save</button>
            <button id="kryp-avbryt" style="flex:1;padding:7px;background:transparent;color:#f5f0e8;border:1px solid #555;border-radius:4px;cursor:pointer;">Cancel</button>
        </div>
    `);
    ov.querySelector("#kryp-avbryt").addEventListener("click", () => ov.remove());
    ov.querySelector("#kryp-ok").addEventListener("click", async () => {
        const l1 = ov.querySelector("#kryp-lösenord1").value;
        const l2 = ov.querySelector("#kryp-lösenord2").value;
        const felEl = ov.querySelector("#kryp-fel");
        if (l1.length < 8) { felEl.textContent = "Min. 8 characters"; felEl.style.display = "block"; return; }
        if (l1 !== l2)     { felEl.textContent = "Passwords don't match"; felEl.style.display = "block"; return; }
        await window.AR_KRYPTERING.genereraNyNyckel();
        const nyckelData = await window.AR_KRYPTERING.exporteraNyckelMedLösenord(l1);
        await window.AR_KRYPTERING.sparaKrypteringsnyckelTillBackend(token, nyckelData);
        ov.remove();
        uppdateraKrypteringsStatus();
    });
    setTimeout(() => ov.querySelector("#kryp-lösenord1").focus(), 50);
}

function skapaOverlay(innerHtml) {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;";
    ov.innerHTML = `<div style="background:#1a1610;border:1px solid #555;border-radius:8px;padding:18px;width:230px;font-family:'DM Mono',monospace;font-size:12px;color:#f5f0e8;line-height:1.5;">${innerHtml}</div>`;
    document.body.appendChild(ov);
    return ov;
}

uppdateraKrypteringsStatus();

function uppdateraTempUI(modell, t) {
    const slider = document.getElementById("temp-slider");
    const not    = document.getElementById("temp-not");
    const fixad  = MODELLER[modell]?.fixedTemp ?? false;

    if (fixad) {
        slider.value = 1.0;
        slider.disabled = true;
        document.getElementById("temp-värde").textContent = "1.0";
        not.textContent = t.opusTempNot;
    } else {
        slider.disabled = false;
        not.textContent = "";
    }
}
