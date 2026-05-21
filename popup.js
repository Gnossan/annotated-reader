const status = document.getElementById("status");

const MODELLER = {
    "claude-opus-4-7":           { fixedTemp: true },
    "claude-sonnet-4-6":         { fixedTemp: false },
    "claude-haiku-4-5-20251001": { fixedTemp: false }
};

function tillampaSprak(t) {
    document.getElementById("api-key").placeholder        = t.apiPlaceholder;
    document.getElementById("save-btn").textContent       = t.sparaNyckel;
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

// --- Ladda sparade inställningar ---
chrome.storage.local.get(["apiKey", "modell", "temperature", "lang"], (result) => {
    if (result.apiKey) {
        const t = AR_LOCALES[result.lang || "en"] || AR_LOCALES.en;
        document.getElementById("api-key").placeholder = t.nyckelSparad;
        status.textContent = t.nyckelSparad;
    }

    const lang  = result.lang  || "en";
    const modell = result.modell || "claude-opus-4-7";
    const temp  = result.temperature ?? 1.0;

    document.getElementById("sprak-val").value  = lang;
    document.getElementById("modell-val").value = modell;
    document.getElementById("temp-slider").value = temp;
    document.getElementById("temp-värde").textContent = parseFloat(temp).toFixed(1);

    tillampaSprak(AR_LOCALES[lang] || AR_LOCALES.en);
});

// --- API-nyckel ---
document.getElementById("save-btn").addEventListener("click", () => {
    const key = document.getElementById("api-key").value.trim();
    if (!key) return;
    chrome.storage.local.set({ apiKey: key }, () => {
        const t = AR_LOCALES[document.getElementById("sprak-val").value] || AR_LOCALES.en;
        status.textContent = t.sparad;
        document.getElementById("api-key").value = "";
        document.getElementById("api-key").placeholder = t.nyckelSparad;
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
