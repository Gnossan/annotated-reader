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
chrome.storage.local.get(["arUser", "arToken", "modell", "temperature", "lang"], (result) => {
    const lang  = result.lang  || "en";
    const modell = result.modell || "claude-opus-4-7";
    const temp  = result.temperature ?? 1.0;

    popupT = AR_LOCALES[lang] || AR_LOCALES.en;

    document.getElementById("sprak-val").value  = lang;
    document.getElementById("modell-val").value = modell;
    document.getElementById("temp-slider").value = temp;
    document.getElementById("temp-värde").textContent = parseFloat(temp).toFixed(1);

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

    // Dölj modellväljaren för free och beta — backenden bestämmer
    const modellRad = document.getElementById("modell-label")?.parentElement;
    if (data.plan === "free" || data.plan === "beta") {
        document.getElementById("modell-label").style.display = "none";
        document.getElementById("modell-val").style.display = "none";
        const info = document.createElement("div");
        info.style.cssText = "font-size:11px;opacity:0.6;margin-bottom:12px;";
        info.innerHTML = `${popupT.modellInfoFree}
            <span id="modell-info-knapp" style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;border:1px solid #999;font-size:9px;cursor:pointer;margin-left:4px;vertical-align:middle;">i</span>`;
        const uppgraderaText = document.createElement("div");
        uppgraderaText.id = "modell-uppgradera";
        uppgraderaText.style.cssText = "display:none;margin-top:6px;padding:6px;background:#fff;border:1px solid #ddd;border-radius:4px;font-size:11px;line-height:1.4;color:#444;";
        uppgraderaText.textContent = popupT.modellUppgradera;
        info.appendChild(uppgraderaText);
        setTimeout(() => {
            document.getElementById("modell-info-knapp")?.addEventListener("click", () => {
                const el = document.getElementById("modell-uppgradera");
                el.style.display = el.style.display === "none" ? "block" : "none";
            });
        }, 0);
        document.getElementById("modell-val").insertAdjacentElement("afterend", info);
    }

    if (data.vip) {
        kvotInfo.style.display = "block";
        document.getElementById("kvot-text").textContent = popupT.vipPlan || "VIP — unlimited";
        document.getElementById("kvot-bar").style.width = "100%";
        document.getElementById("kvot-bar").style.background = "#f0c040";
        const panel = document.getElementById("uppgradera-plan");
        panel.style.display = "block";
        const manageBtn = document.createElement("button");
        manageBtn.textContent = popupT.hanteraPrenumeration || "Manage subscription →";
        manageBtn.style.cssText = "width:100%;padding:7px;background:#eee;border:1px solid #ccc;border-radius:4px;cursor:pointer;font-size:11px;margin-top:8px;";
        manageBtn.onclick = async () => {
            const { arToken } = await new Promise(r => chrome.storage.local.get("arToken", r));
            const resp = await fetch("https://annotated-reader-backend.vercel.app/api/portal", {
                method: "POST",
                headers: { "Authorization": `Bearer ${arToken}` }
            });
            const data = await resp.json();
            if (data.url) chrome.tabs.create({ url: data.url });
        };
        panel.appendChild(manageBtn);
        return;
    }

    const procent = Math.min(100, Math.round((data.kreditAnvänd / data.kreditGräns) * 100));
    const kvarK = Math.round(data.kreditKvar / 1000);
    document.getElementById("kvot-text").textContent =
        `${kvarK}k krediter kvar denna månad (${data.plan})`;
    document.getElementById("kvot-bar").style.width = `${procent}%`;
    document.getElementById("kvot-bar").style.background = procent > 80 ? "#e55" : "#f0c040";

    const gammalVarning = document.getElementById("kvot-varning");
    if (gammalVarning) gammalVarning.remove();
    if (procent > 80) {
        const varning = document.createElement("div");
        varning.id = "kvot-varning";
        varning.style.cssText = "margin-top:6px;font-size:11px;color:#c00;font-weight:600;";
        varning.textContent = popupT.kvotVarning || "⚠ You are approaching your monthly limit.";
        document.getElementById("kvot-info").appendChild(varning);
    }
    kvotInfo.style.display = "block";

    // Uppgraderingsknappar
    visaUppgradera(data.plan);
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

function visaUppgradera(plan) {
    const panel = document.getElementById("uppgradera-plan");
    const proBtn = document.getElementById("uppgradera-pro-btn");
    const vipBtn = document.getElementById("uppgradera-vip-btn");
    const kreditBtns = document.querySelectorAll(".kredit-btn");
    const isFree = plan === "free" || plan === "beta";
    const isPro = plan === "pro";

    panel.style.display = "block";
    document.getElementById("krediter-rubrik").textContent = popupT.köpKrediter || "Buy credits";

    if (isFree) {
        proBtn.style.display = "block";
        proBtn.textContent = popupT.uppgraderaPro || "Upgrade to Pro — €9.99/month";
        proBtn.onclick = () => köpProdukt("pro");
        vipBtn.style.display = "block";
        vipBtn.textContent = popupT.uppgraderaVip || "Upgrade to VIP — €19.99/month";
        vipBtn.onclick = () => köpProdukt("vip");
        const freeProds = ["credits_500k_free", "credits_2m_free", "credits_10m_free"];
        const freeLabels = ["500k €1.99", "2M €11.99", "10M €21.99"];
        kreditBtns.forEach((btn, i) => { btn.textContent = freeLabels[i]; btn.onclick = () => köpProdukt(freeProds[i]); });
    } else if (isPro) {
        vipBtn.style.display = "block";
        vipBtn.textContent = popupT.uppgraderaVip || "Upgrade to VIP — €19.99/month";
        vipBtn.onclick = () => köpProdukt("vip");
        const proProds = ["credits_500k_pro", "credits_2m_pro", "credits_10m_pro"];
        const proLabels = ["500k €0.99", "2M €2.99", "10M €9.99"];
        kreditBtns.forEach((btn, i) => { btn.textContent = proLabels[i]; btn.onclick = () => köpProdukt(proProds[i]); });
    }
}

function visaAuthState(user) {
    const signInBtn   = document.getElementById("sign-in-btn");
    const inloggad    = document.getElementById("inloggad-info");
    const annotateBtn = document.getElementById("annotate-btn");

    if (user) {
        signInBtn.style.display   = "none";
        inloggad.style.display    = "block";
        annotateBtn.style.display = "block";
        document.getElementById("ord-sektion").style.display = "block";
        document.getElementById("user-name").textContent = user.name || user.email;
        if (user.photo) document.getElementById("user-photo").src = user.photo;
    } else {
        signInBtn.style.display   = "flex";
        inloggad.style.display    = "none";
        annotateBtn.style.display = "none";
        document.getElementById("ord-sektion").style.display = "none";
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
    "claude-opus-4-7":           { fixedTemp: true },
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

    document.getElementById("ord-btn").textContent = t.identifieraOrd;
    const nivaVal = document.getElementById("niva-val");
    (t.nivaer || ["Beginner","Intermediate","Advanced","Native speaker"]).forEach((namn, i) => {
        if (nivaVal.options[i]) nivaVal.options[i].textContent = namn;
    });

    uppdateraTempUI(modellVal.value, t);
}


// --- Identifiera svåra ord ---
document.getElementById("ord-btn").addEventListener("click", () => {
    const level = document.getElementById("niva-val").value;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (level) => { window.__arOrdNiva = level; },
            args: [level]
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ["word-difficulty.js"]
            });
        });
        window.close();
    });
});

// --- Annotera ---
document.getElementById("annotate-btn").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ["content.js"]
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
    const lang   = document.getElementById("sprak-val").value;
    const modell = document.getElementById("modell-val").value;
    const temp   = parseFloat(document.getElementById("temp-slider").value);
    const t = AR_LOCALES[lang] || AR_LOCALES.en;

    chrome.storage.local.set({ lang, modell, temperature: temp }, () => {
        status.textContent = t.installningarSparade;
        setTimeout(() => { status.textContent = ""; }, 2000);
    });
});

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
